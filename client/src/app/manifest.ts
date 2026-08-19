import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description:
      "Jewellery ERP with piece-level inventory, GST billing, HUID tracking, and online store.",
    start_url: "/onboarding",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#1a1a1a",
    lang: "en-IN",
    categories: ["business", "finance"],
  };
}
