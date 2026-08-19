import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl, getSiteUrl } from "./site";

export const softwareApplicationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: getSiteUrl(),
  description: DEFAULT_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "2-month free trial, no credit card required",
  },
  featureList: [
    "Piece-level jewellery inventory",
    "HUID and hallmark tracking",
    "GST billing and e-invoice ready",
    "Karigar production floor",
    "Multi-branch stock transfers",
    "Synced online storefront",
  ],
});

export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: getSiteUrl(),
  logo: absoluteUrl("/onboarding/dashboard.png"),
  description: DEFAULT_DESCRIPTION,
  areaServed: {
    "@type": "Country",
    name: "India",
  },
});

export const faqPageSchema = (items: readonly { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
});

export const localBusinessJaipurSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `${SITE_NAME} — Jewellery ERP for Jaipur`,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: absoluteUrl("/onboarding/jewellery-erp-jaipur"),
  description:
    "Cloud jewellery ERP for Jaipur showrooms, manufacturers, and wholesalers — GST billing, HUID tracking, production floor, and online store.",
  areaServed: [
    { "@type": "City", name: "Jaipur" },
    { "@type": "State", name: "Rajasthan" },
  ],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "2-month free trial for Jaipur jewellers",
  },
});
