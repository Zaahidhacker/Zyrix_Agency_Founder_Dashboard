"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Plus,
  Sparkles,
  Copy,
  Check,
  Building2,
  ExternalLink,
} from "lucide-react";
import { DEHIWALA_CENTER } from "@/lib/overpass";

interface LocalBusiness {
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

const CATEGORIES = [
  { value: "any", label: "Any business" },
  { value: "restaurant", label: "Restaurants & Cafes" },
  { value: "shop", label: "Shops & Retail" },
  { value: "salon", label: "Salons & Beauty" },
  { value: "clinic", label: "Clinics & Healthcare" },
  { value: "office", label: "Offices & Services" },
  { value: "hotel", label: "Hotels & Hospitality" },
  { value: "auto", label: "Auto & Repair" },
];

export function LeadDiscovery() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("any");
  const [radius, setRadius] = useState("5000");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalBusiness[]>([]);
  const [searched, setSearched] = useState(false);

  const [outreachLead, setOutreachLead] = useState<LocalBusiness | null>(null);
  const [outreachChannel, setOutreachChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [outreachBusy, setOutreachBusy] = useState(false);
  const [outreachContent, setOutreachContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query || undefined,
          category: category === "any" ? undefined : category,
          lat: DEHIWALA_CENTER.lat,
          lng: DEHIWALA_CENTER.lng,
          radiusM: Number(radius),
          limit: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.businesses || []);
      toast.success(`Found ${data.count} businesses near Dehiwala.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(b: LocalBusiness) {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: b.businessName,
          category: b.category,
          address: b.address,
          phone: b.phone,
          email: b.email,
          whatsapp: b.whatsapp,
          websiteStatus: b.websiteStatus,
          osmId: b.osmId,
          lat: b.lat,
          lng: b.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed.");
      setSavedIds((s) => new Set(s).add(b.osmId));
      toast.success(
        data.dedupe
          ? `${b.businessName} was already in your pipeline.`
          : `${b.businessName} added to pipeline.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    }
  }

  async function handleGenerateOutreach() {
    if (!outreachLead) return;
    setOutreachBusy(true);
    setOutreachContent(null);
    try {
      // Save the lead first if not saved
      if (!savedIds.has(outreachLead.osmId)) {
        await handleSave(outreachLead);
      }
      // Find the lead by osmId
      const leadRes = await fetch("/api/leads");
      const leadData = await leadRes.json();
      const lead = (leadData.leads || []).find(
        (l: { osmId: string; id: string }) => l.osmId === outreachLead.osmId
      );
      if (!lead) throw new Error("Lead not found after save.");

      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, channel: outreachChannel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setOutreachContent(data.content);
      toast.success(`${outreachChannel === "email" ? "Email" : "WhatsApp"} draft ready.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setOutreachBusy(false);
    }
  }

  function copyContent() {
    if (!outreachContent) return;
    navigator.clipboard.writeText(outreachContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function resetOutreach() {
    setOutreachContent(null);
    setOutreachLead(null);
    setCopied(false);
  }

  function openWhatsApp(b: LocalBusiness) {
    if (!b.whatsapp) {
      toast.error("No WhatsApp number available for this business.");
      return;
    }
    window.open(`https://wa.me/${b.whatsapp}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      {/* Search panel */}
      <div className="bg-white rounded-2xl border border-zyrix-line p-6 sm:p-8 shadow-warm">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-zyrix-ink">
              Find businesses without a website
            </h2>
            <p className="text-sm text-zyrix-ink-soft mt-1.5 max-w-xl">
              Powered by the free OpenStreetMap Overpass API. Results are
              pre-sorted to surface businesses with no real website first.
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-zyrix-cream border-zyrix-tan/40 text-zyrix-brown"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Dehiwala, Sri Lanka
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
              Search term
            </Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. bakery, salon, gym"
              className="h-11 bg-zyrix-cream/40 border-zyrix-line"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 bg-zyrix-cream/40 border-zyrix-line">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-zyrix-brown">
              Radius
            </Label>
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger className="h-11 bg-zyrix-cream/40 border-zyrix-line">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2000">2 km</SelectItem>
                <SelectItem value="5000">5 km</SelectItem>
                <SelectItem value="10000">10 km</SelectItem>
                <SelectItem value="20000">20 km</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-11 bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-zyrix-line p-12 text-center">
          <Building2 className="w-12 h-12 text-zyrix-tan mx-auto mb-4" />
          <p className="font-display text-xl text-zyrix-ink mb-2">
            No businesses found
          </p>
          <p className="text-sm text-zyrix-ink-soft">
            Try a broader search term, larger radius, or different category.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-zyrix-line overflow-hidden shadow-warm">
          <div className="px-6 py-4 border-b border-zyrix-line flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-display text-lg text-zyrix-ink">
                {results.length} businesses found
              </p>
              <p className="text-xs text-zyrix-ink-soft mt-0.5">
                Sorted by website gap (no website first) and contact richness.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-zyrix-ink-soft">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                No website
              </span>
              <span className="flex items-center gap-1.5 text-zyrix-ink-soft">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Basic / social only
              </span>
            </div>
          </div>

          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-zyrix-line/60">
              {results.map((b, i) => (
                <motion.div
                  key={b.osmId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="px-6 py-4 hover:bg-zyrix-cream/40 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-zyrix-ink truncate">
                          {b.businessName}
                        </h3>
                        <WebsiteBadge status={b.websiteStatus} />
                        {b.category && (
                          <Badge
                            variant="outline"
                            className="bg-zyrix-cream-deep/60 border-zyrix-line text-zyrix-ink-soft text-[10px]"
                          >
                            {b.category}
                          </Badge>
                        )}
                      </div>
                      {b.address && (
                        <p className="text-sm text-zyrix-ink-soft mt-1 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zyrix-brown/60" />
                          {b.address}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap text-xs">
                        {b.phone && (
                          <span className="flex items-center gap-1 text-zyrix-ink-soft">
                            <Phone className="w-3 h-3" />
                            {b.phone}
                          </span>
                        )}
                        {b.email && (
                          <span className="flex items-center gap-1 text-zyrix-ink-soft truncate">
                            <Mail className="w-3 h-3" />
                            {b.email}
                          </span>
                        )}
                        {b.website && (
                          <a
                            href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-zyrix-brown hover:text-zyrix-green link-underline"
                          >
                            <Globe className="w-3 h-3" />
                            Visit site
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {b.whatsapp && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWhatsApp(b)}
                          className="h-9 border-zyrix-line text-zyrix-green hover:bg-zyrix-green hover:text-zyrix-cream"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                          WhatsApp
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          resetOutreach();
                          setOutreachLead(b);
                        }}
                        disabled={savedIds.has(b.osmId)}
                        className="h-9 border-zyrix-brown/40 text-zyrix-brown hover:bg-zyrix-brown hover:text-zyrix-cream"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        {savedIds.has(b.osmId) ? "Saved" : "Draft outreach"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(b)}
                        disabled={savedIds.has(b.osmId)}
                        className="h-9 bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {savedIds.has(b.osmId) ? "Added" : "Save"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Outreach dialog */}
      <Dialog
        open={Boolean(outreachLead)}
        onOpenChange={(v) => !v && resetOutreach()}
      >
        <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight text-zyrix-ink">
              Draft outreach
            </DialogTitle>
            <DialogDescription>
              Gemini reads the lead context and drafts a personalized
              first-contact message. Always review before sending.
            </DialogDescription>
          </DialogHeader>

          {outreachLead && (
            <div className="bg-zyrix-cream-deep/60 border border-zyrix-line rounded-lg px-4 py-3">
              <p className="font-medium text-zyrix-ink">
                {outreachLead.businessName}
              </p>
              <p className="text-xs text-zyrix-ink-soft mt-0.5">
                {outreachLead.category}
                {outreachLead.address ? ` · ${outreachLead.address}` : ""}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={outreachChannel === "whatsapp" ? "default" : "outline"}
              onClick={() => {
                setOutreachChannel("whatsapp");
                setOutreachContent(null);
              }}
              disabled={outreachBusy}
              className={
                outreachChannel === "whatsapp"
                  ? "bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
                  : "border-zyrix-line text-zyrix-ink-soft"
              }
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp
            </Button>
            <Button
              size="sm"
              variant={outreachChannel === "email" ? "default" : "outline"}
              onClick={() => {
                setOutreachChannel("email");
                setOutreachContent(null);
              }}
              disabled={outreachBusy}
              className={
                outreachChannel === "email"
                  ? "bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
                  : "border-zyrix-line text-zyrix-ink-soft"
              }
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={handleGenerateOutreach}
              disabled={outreachBusy}
              className="bg-zyrix-brown hover:bg-zyrix-brown/90 text-zyrix-cream"
            >
              {outreachBusy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {outreachContent ? "Regenerate" : "Generate draft"}
                </>
              )}
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {outreachContent ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="h-full flex flex-col"
                >
                  <Textarea
                    value={outreachContent}
                    onChange={(e) => setOutreachContent(e.target.value)}
                    className="h-full min-h-[280px] bg-zyrix-cream/30 border-zyrix-line font-mono text-sm leading-relaxed resize-none"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[280px] flex items-center justify-center text-center bg-zyrix-cream/20 rounded-lg border border-dashed border-zyrix-line"
                >
                  <div>
                    <Sparkles className="w-8 h-8 text-zyrix-tan mx-auto mb-3" />
                    <p className="text-sm text-zyrix-ink-soft max-w-xs">
                      Click <strong>Generate draft</strong> and Gemini will
                      write a {outreachChannel === "email" ? "cold email" : "WhatsApp message"}{" "}
                      mentioning Zyrix, Dehiwala, and our LKR 5,000 minimum
                      pricing.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={resetOutreach}
              className="border-zyrix-line"
            >
              Close
            </Button>
            {outreachContent && (
              <Button
                onClick={copyContent}
                className="bg-zyrix-green hover:bg-zyrix-green-deep text-zyrix-cream"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to clipboard
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebsiteBadge({ status }: { status: "none" | "basic" | "outdated" }) {
  if (status === "none") {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px]">
        No website
      </Badge>
    );
  }
  if (status === "basic") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
        Basic / social
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
      Has website
    </Badge>
  );
}
