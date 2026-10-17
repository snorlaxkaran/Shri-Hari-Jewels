"use client";

import type { StorefrontAdminSettings } from "@/lib/storefront/types";

type PreviewDraft = {
  enabled: boolean;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  bannerUrls: string[];
  businessName: string;
};

export default function StorefrontLivePreview({ draft }: { draft: PreviewDraft }) {
  const banners = draft.bannerUrls.map((url) => url.trim()).filter(Boolean);
  const heroImage = banners[0];
  const heroStyle = heroImage
    ? undefined
    : {
        background: `linear-gradient(135deg, ${draft.accentColor} 0%, ${draft.primaryColor}99 100%)`,
      };

  return (
    <div
      className="sf-store-preview rounded-xl border border-zinc-200 overflow-hidden bg-[#faf9f7] shadow-sm"
      style={
        {
          "--store-primary": draft.primaryColor,
          "--store-accent": draft.accentColor,
        } as React.CSSProperties
      }
    >
      <div className="sf-store-preview-bar px-3 py-2 text-xs font-medium text-zinc-600 bg-white border-b border-zinc-200 flex items-center justify-between">
        <span>Live preview</span>
        <span className={draft.enabled ? "text-emerald-600" : "text-amber-600"}>
          {draft.enabled ? "Store on" : "Store off"}
        </span>
      </div>

      <div className="sf-store-preview-header px-4 py-3 flex items-center gap-3 bg-[var(--store-accent)] text-white">
        {draft.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.logoUrl} alt="" className="h-8 w-auto max-w-[120px] object-contain" />
        ) : (
          <span className="text-sm font-semibold truncate">{draft.businessName}</span>
        )}
        <span className="ml-auto text-[11px] opacity-80 hidden sm:inline">{draft.tagline || "Tagline"}</span>
      </div>

      <div
        className="relative min-h-[200px] flex items-end p-5 text-white"
        style={heroStyle}
      >
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgb(0 0 0 / 0.15) 0%, rgb(0 0 0 / 0.55) 100%)",
          }}
        />
        <div className="relative z-10 max-w-full">
          <p className="text-[10px] uppercase tracking-widest text-white/70 mb-1">Fine jewellery</p>
          <h2 className="text-lg font-semibold leading-tight">
            {draft.heroTitle || draft.businessName}
          </h2>
          <p className="text-xs text-white/85 mt-1 line-clamp-2">
            {draft.heroSubtitle || draft.tagline || "Hero subtitle appears here"}
          </p>
          <span
            className="inline-block mt-3 rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: draft.primaryColor }}
          >
            Shop collection
          </span>
        </div>
      </div>

      {draft.aboutText ? (
        <div className="px-4 py-3 text-xs text-zinc-600 border-t border-zinc-200 bg-white line-clamp-3">
          {draft.aboutText}
        </div>
      ) : null}

      <p className="px-4 py-2 text-[11px] text-zinc-500 bg-zinc-50 border-t border-zinc-100">
        Changes save automatically and appear on your shop after refresh.
      </p>
    </div>
  );
}

export function draftFromSettings(
  settings: StorefrontAdminSettings,
  overrides: Partial<PreviewDraft>,
): PreviewDraft {
  return {
    enabled: overrides.enabled ?? settings.enabled,
    tagline: overrides.tagline ?? settings.tagline ?? "",
    heroTitle: overrides.heroTitle ?? settings.heroTitle ?? "",
    heroSubtitle: overrides.heroSubtitle ?? settings.heroSubtitle ?? "",
    aboutText: overrides.aboutText ?? settings.aboutText ?? "",
    primaryColor: overrides.primaryColor ?? settings.primaryColor,
    accentColor: overrides.accentColor ?? settings.accentColor,
    logoUrl: overrides.logoUrl ?? settings.logoUrl ?? "",
    bannerUrls: overrides.bannerUrls ?? settings.bannerUrls ?? [],
    businessName: settings.businessName,
  };
}
