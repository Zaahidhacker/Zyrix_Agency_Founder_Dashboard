// Master prompt builder — combines Gemini-extracted client requirements
// with the mandatory skill workflow requested by the Zyrix founder.

export interface ExtractedRequirements {
  businessName: string;
  businessCategory: string;
  websiteGoals: string;
  requiredFeatures: string[];
  targetAudience: string;
  designPreferences: string;
  contentSections: string[];
  contactInfo: string;
  specialInstructions: string;
}

// The skill repositories the AI developer MUST clone and read before writing code.
// Sourced from the founder's specification.
export const REQUIRED_SKILL_REPOS: Array<{
  name: string;
  repo: string;
  purpose: string;
}> = [
  {
    name: "frontend-design (Anthropic)",
    repo: "https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design",
    purpose:
      "Force distinct design directions and avoid generic AI defaults — type pairings, asymmetric layouts, color systems that don't look templated.",
  },
  {
    name: "shadcn/ui Skill & MCP",
    repo: "https://github.com/shadcn/ui",
    purpose:
      "Standard component rules, accessibility primitives, and Radix-based interaction patterns.",
  },
  {
    name: "dashboard (bergside)",
    repo: "https://github.com/bergside/awesome-design-md-skills",
    purpose:
      "Clean analytics and data visualization layouts — KPI grids, chart panels, filter rails.",
  },
  {
    name: "ui-ux-pro-max-skill",
    repo: "https://github.com/ui-ux-pro-max-skill",
    purpose:
      "Category-specific color palettes, typography, and UX patterns matched to the client's industry.",
  },
  {
    name: "gsap-skills",
    repo: "https://github.com/gsap/gsap-skills",
    purpose:
      "Performance-optimized scroll animations — reveal, parallax, and scroll-triggered sequences.",
  },
  {
    name: "Taste Presets",
    repo: "https://github.com/leonxlnx/taste-skill",
    purpose:
      "Style direction (minimalist, brutalist, luxury) — pick a preset matching the client's brand.",
  },
  {
    name: "mobile-app-ui-design",
    repo: "https://github.com/ceorkm/mobile-app-ui-design",
    purpose:
      "Mobile typography, spacing, and thumb-zone rules for responsive breakpoints.",
  },
  {
    name: "material3-skill",
    repo: "https://github.com/material-3-skill",
    purpose:
      "Material You components and dynamic theming — color roles, elevation tokens, motion.",
  },
  {
    name: "swiftui-skills",
    repo: "https://github.com/swiftui-skills",
    purpose:
      "Apple Human Interface Guidelines and Liquid Glass styling — for any cross-platform UI.",
  },
  {
    name: "expo-skills",
    repo: "https://github.com/expo/expo",
    purpose:
      "Cross-platform mobile architecture — for any companion app requirements.",
  },
  {
    name: "impeccable",
    repo: "https://github.com/pbakaus/impeccable",
    purpose:
      "Design guidance for AI coding agents — 23 commands and 58 deterministic detector rules. Use /impeccable audit / polish / critique / distill before shipping.",
  },
];

export function buildMasterPrompt(
  req: ExtractedRequirements,
  leadContext: {
    businessName: string;
    category: string;
    address: string;
    phone: string;
    email: string;
    whatsapp: string;
  }
): string {
  const featureList = req.requiredFeatures.length
    ? req.requiredFeatures.map((f) => `  - ${f}`).join("\n")
    : "  - Home / Hero with value proposition\n  - Services / Products listing\n  - About the business\n  - Contact form (sends email)\n  - WhatsApp click-to-chat button\n  - Mobile responsive layout\n  - SEO-optimized meta tags";

  const sectionList = req.contentSections.length
    ? req.contentSections.map((s) => `  - ${s}`).join("\n")
    : "  - Hero with CTA\n  - Services / Product catalog\n  - About / Story\n  - Testimonials (if available)\n  - Contact form with map\n  - Footer with NAP and social links";

  const skillList = REQUIRED_SKILL_REPOS.map(
    (s) =>
      `  - ${s.name} — ${s.repo}\n    Purpose: ${s.purpose}\n    git clone --depth 1 ${s.repo}`
  ).join("\n");

  return `# Master Build Prompt — ${leadContext.businessName}

You are an elite AI web developer building a production-grade website for **${leadContext.businessName}**, a ${req.businessCategory || leadContext.category} business located at ${leadContext.address || "Dehiwala, Sri Lanka"}. This site is being delivered by **Zyrix**, a web agency in Dehiwala, Sri Lanka.

---

## MANDATORY PRE-BUILD WORKFLOW (DO NOT SKIP)

Before writing **a single line of code**, you MUST:

1. **Clone every skill repository below into the project folder** under \`/skills/\`:
${skillList}

2. **Read every file in every cloned skill repository, end-to-end.** Do not skim. Do not skip. Each skill file exists because previous builds failed without it — typography choices, color systems, accessibility rules, motion patterns, and component conventions are all encoded there.

3. **Derive the following from the skill files before any implementation:**
   - Typography pairings (display font + body font — NOT Inter + Inter)
   - A category-specific color palette (use ui-ux-pro-max-skill to match the industry)
   - Component conventions (use shadcn/ui rules — Radix primitives, never reinvent)
   - Motion patterns (use gsap-skills for scroll-triggered reveals — never generic fade-in)
   - Mobile breakpoints and thumb-zone layout (use mobile-app-ui-design)
   - A style direction (use taste-skill — pick minimalist, brutalist, or luxury matching the brand)

4. **Run the impeccable commands** after the first build pass:
   - \`/impeccable audit\` — technical quality (a11y, responsive, performance)
   - \`/impeccable critique\` — UX design review
   - \`/impeccable typeset\` — fix font hierarchy
   - \`/impeccable layout\` — fix spacing and rhythm
   - \`/impeccable polish\` — final pass before shipping
   - \`/impeccable distill\` — strip anything that isn't earning its place

   Fix every issue flagged before delivering.

---

## CLIENT REQUIREMENTS (extracted from conversation screenshots)

### Business Identity
- **Name:** ${req.businessName || leadContext.businessName}
- **Category:** ${req.businessCategory || leadContext.category}
- **Location:** ${leadContext.address}
- **Phone:** ${leadContext.phone || "—"}
- **Email:** ${leadContext.email || "—"}
- **WhatsApp:** ${leadContext.whatsapp || "—"}

### Website Goals
${req.websiteGoals || "Establish a credible online presence that converts visitors into customers. Showcase services/products clearly and make it effortless to contact the business."}

### Target Audience
${req.targetAudience || "Local customers in Sri Lanka searching for this category of business online. Primary age 25-55, mobile-first users, value trust signals and easy contact."}

### Design Preferences
${req.designPreferences || "Clean, professional, and modern. Should feel locally rooted but internationally competitive. Use Sri Lankan context cues where natural (currency in LKR, local place names, etc.)."}

### Required Features
${featureList}

### Required Page Sections
${sectionList}

### Special Instructions
${req.specialInstructions || "Site must be fast (LCP under 2.5s on 4G mobile), SEO-optimized for local search, and include structured data for local business schema."}

### Contact Information Capture
The site MUST make it trivial for visitors to:
- Call the business with one tap (mobile)
- Open WhatsApp chat with one tap
- Send an email via contact form
- Find the business on Google Maps

---

## TECHNICAL STACK (NON-NEGOTIABLE)

- **Framework:** Next.js 16 with App Router (TypeScript)
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York style)
- **Database (if needed):** Prisma ORM with SQLite
- **Animations:** GSAP for scroll-triggered motion
- **Images:** next/image with proper aspect ratios and lazy loading
- **Forms:** react-hook-form + zod validation
- **SEO:** next/metadata, JSON-LD structured data, sitemap.xml, robots.txt

---

## QUALITY BAR (ZERO BUGS, ZERO ERRORS)

Before declaring complete:
1. \`bun run lint\` passes with zero errors
2. \`bun run build\` succeeds
3. Every interactive element has a loading state
4. Every form has validation + error states
5. Every page is mobile-first responsive (test at 375px, 768px, 1440px)
6. Lighthouse score ≥ 90 on all four metrics (Performance, Accessibility, Best Practices, SEO)
7. No console errors or hydration warnings
8. All images use next/image with explicit width/height
9. All links have proper aria-labels
10. Color contrast meets WCAG AA

---

## DELIVERY

Deliver a single Next.js project that runs with \`bun install && bun run dev\` and renders a polished, production-ready website for ${leadContext.businessName}. The site must feel custom-designed — NOT like a generic AI-generated template. Every section should justify its existence. Every interaction should feel intentional.

Begin by cloning the skill repositories listed above. Do not write any code until you have read every file in every skill folder.`;
}
