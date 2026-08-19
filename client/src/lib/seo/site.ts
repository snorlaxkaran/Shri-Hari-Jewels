const DEFAULT_SITE_URL = "https://shri-hari-jewels.vercel.app";

export const SITE_NAME = "Shri Hari Jewels";
export const SITE_TAGLINE = "Jewellery ERP + Online Store";
export const DEFAULT_DESCRIPTION =
  "Piece-level inventory, karigar production, GST billing, HUID tracking, and a synced online store — built for Indian jewellers in Jaipur, Rajasthan, and across India.";

/** Public marketing origin — set NEXT_PUBLIC_SITE_URL when you connect a custom domain. */
export const getSiteUrl = (): string => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return DEFAULT_SITE_URL;
};

export const absoluteUrl = (path: string): string => {
  const base = getSiteUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
};

export const DEFAULT_OG_IMAGE = "/onboarding/dashboard.png";
