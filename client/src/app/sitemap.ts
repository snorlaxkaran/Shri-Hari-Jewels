import type { MetadataRoute } from "next";
import { SHOWCASE_MODULES } from "@/lib/onboarding/modules-showcase";
import { absoluteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/onboarding"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/onboarding/jewellery-erp-jaipur"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/onboarding/start"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/shop/shree-hari-jewels"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const moduleRoutes: MetadataRoute.Sitemap = SHOWCASE_MODULES.map((mod) => ({
    url: absoluteUrl(`/onboarding/modules/${mod.id}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...moduleRoutes];
}
