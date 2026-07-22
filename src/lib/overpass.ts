// Overpass API integration — completely free OpenStreetMap-based business search.
// Returns local businesses with contact info; we infer "missing website" status.

export interface LocalBusiness {
  osmId: string;
  businessName: string;
  category: string;
  address: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  websiteStatus: "none" | "basic" | "outdated";
  lat: number | null;
  lng: number | null;
}

// Map OSM amenity/shop tags → human category
function categorize(tags: Record<string, string>): string {
  if (tags.shop) return prettify(tags.shop);
  if (tags.amenity) return prettify(tags.amenity);
  if (tags.office) return prettify(tags.office);
  if (tags.tourism) return prettify(tags.tourism);
  if (tags.leisure) return prettify(tags.leisure);
  if (tags.healthcare) return prettify(tags.healthcare);
  if (tags.craft) return prettify(tags.craft);
  return "Business";
}

function prettify(s: string): string {
  return s
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags["addr:housenumber"] || tags["addr:street"]) {
    if (tags["addr:housenumber"] && tags["addr:street"]) {
      parts.push(`${tags["addr:street"]}, ${tags["addr:housenumber"]}`);
    } else if (tags["addr:street"]) {
      parts.push(tags["addr:street"]);
    } else if (tags["addr:housenumber"]) {
      parts.push(tags["addr:housenumber"]);
    }
  }
  if (tags["addr:suburb"]) parts.push(tags["addr:suburb"]);
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  return parts.join(", ");
}

function inferWebsiteStatus(website: string | null): "none" | "basic" | "outdated" {
  if (!website) return "none";
  // crude heuristic — social media / directory listings count as "no real website"
  const w = website.toLowerCase();
  if (
    w.includes("facebook.com") ||
    w.includes("instagram.com") ||
    w.includes("wa.me") ||
    w.includes("linkedin.com") ||
    w.includes("tiktok") ||
    w.includes("youtube")
  ) {
    return "none";
  }
  return "basic";
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  // Sri Lankan numbers often start with 0; convert to +94 form
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+94" + cleaned.slice(1);
  }
  return cleaned || null;
}

function deriveWhatsApp(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d]/g, "");
  if (cleaned.length >= 10) return cleaned;
  return null;
}

export interface SearchParams {
  // Bounding box: south, west, north, east
  bbox?: [number, number, number, number];
  // OR a center point + radius (meters)
  center?: { lat: number; lng: number; radiusM?: number };
  // Optional category filter — matches OSM amenity/shop/office tags
  category?: string;
  // Free text query (used as a name regex filter)
  query?: string;
  // Limit results
  limit?: number;
}

// Default: Dehiwala, Sri Lanka (the agency's home turf)
export const DEHIWALA_CENTER = { lat: 6.8539, lng: 79.8657 };

export async function searchLocalBusinesses(
  params: SearchParams
): Promise<LocalBusiness[]> {
  const limit = Math.min(params.limit || 60, 200);

  // Build a bounding-box string for Overpass
  let bboxStr: string;
  if (params.bbox) {
    const [s, w, n, e] = params.bbox;
    bboxStr = `${s},${w},${n},${e}`;
  } else if (params.center) {
    const { lat, lng, radiusM = 5000 } = params.center;
    const dLat = radiusM / 111000;
    const dLng = radiusM / (111000 * Math.cos((lat * Math.PI) / 180));
    bboxStr = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
  } else {
    // Default: 5km around Dehiwala
    const { lat, lng } = DEHIWALA_CENTER;
    const dLat = 5000 / 111000;
    const dLng = 5000 / (111000 * Math.cos((lat * Math.PI) / 180));
    bboxStr = `${lat - dLat},${lng - dLng},${lat + dLat},${lng + dLng}`;
  }

  // Build Overpass QL — collect any tagged shop/amenity/office node/way in bbox
  const nameFilter = params.query
    ? `["name"~"${escapeRegex(params.query)}",i]`
    : "";

  const categoryFilter = params.category
    ? buildCategoryFilter(params.category)
    : "";

  const query = `
[out:json][timeout:25];
(
  nwr["shop"]${nameFilter}${categoryFilter}(${bboxStr});
  nwr["amenity"~"restaurant|cafe|fast_food|pharmacy|clinic|dentist|doctors|bank|atm|fuel|car_repair|beauty|hairdresser|bar|pub"]${nameFilter}(${bboxStr});
  nwr["office"]${nameFilter}(${bboxStr});
  nwr["tourism"~"hotel|guest_house|motel|hostel|attraction"]${nameFilter}(${bboxStr});
  nwr["healthcare"]${nameFilter}(${bboxStr});
  nwr["craft"]${nameFilter}(${bboxStr});
);
out center tags 200;
`.trim();

  // Use a primary + fallback endpoint
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  ];

  let lastErr: unknown = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
        // @ts-ignore — timeout not in standard fetch types but supported by Node
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        lastErr = new Error(`Overpass HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        elements?: Array<{
          id: number;
          type: string;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const elements = data.elements || [];
      const results: LocalBusiness[] = [];

      for (const el of elements) {
        const tags = el.tags || {};
        if (!tags.name) continue;

        const phone = normalizePhone(tags.phone || tags["contact:phone"] || null);
        const email =
          tags.email || tags["contact:email"] || null;
        const website =
          tags.website ||
          tags["contact:website"] ||
          tags.url ||
          null;

        const lat = el.lat ?? el.center?.lat ?? null;
        const lng = el.lon ?? el.center?.lon ?? null;

        results.push({
          osmId: `${el.type}/${el.id}`,
          businessName: tags.name,
          category: categorize(tags),
          address: inferAddress(tags),
          phone,
          email,
          whatsapp: deriveWhatsApp(phone),
          website,
          websiteStatus: inferWebsiteStatus(website),
          lat,
          lng,
        });
      }

      // Prioritize businesses WITHOUT a real website — that's the whole point
      results.sort((a, b) => {
        if (a.websiteStatus === "none" && b.websiteStatus !== "none") return -1;
        if (a.websiteStatus !== "none" && b.websiteStatus === "none") return 1;
        if (a.websiteStatus === "basic" && b.websiteStatus === "outdated")
          return -1;
        if (a.websiteStatus === "outdated" && b.websiteStatus === "basic")
          return 1;
        // Businesses with phone/email ranked higher
        const aContact = (a.phone ? 1 : 0) + (a.email ? 1 : 0);
        const bContact = (b.phone ? 1 : 0) + (b.email ? 1 : 0);
        return bContact - aContact;
      });

      return results.slice(0, limit);
    } catch (err) {
      lastErr = err;
      continue;
    }
  }

  throw new Error(
    `All Overpass endpoints failed. Last error: ${
      lastErr instanceof Error ? lastErr.message : "unknown"
    }`
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCategoryFilter(cat: string): string {
  // Allow user-supplied category as a tag regex
  const safe = escapeRegex(cat);
  return `["~"~"^(shop|amenity|office|tourism|healthcare|craft)$"]["v"~"${safe}",i]`;
}
