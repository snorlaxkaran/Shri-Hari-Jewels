"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageStorefront } from "@/lib/auth/permissions";
import {
  fetchStorefrontAdminSettings,
  updateStorefrontDomain,
  type UpdateStorefrontSettingsInput,
} from "@/lib/api/storefront-admin";
import { getApiErrorMessage } from "@/lib/api/client";
import { useStorefrontSettingsAutosave } from "@/lib/hooks/use-storefront-settings-autosave";
import { padBannerSlots, BANNER_SLOT_COUNT } from "@/lib/storefront/banner-crop";
import type { StorefrontAdminSettings } from "@/lib/storefront/types";
import BannerCarouselEditor from "./BannerCarouselEditor";
import StorefrontLivePreview, { draftFromSettings } from "./StorefrontLivePreview";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-sm block mb-1.5 text-zinc-600 font-medium";

function SaveStatusBadge({
  status,
  lastSavedAt,
}: {
  status: string;
  lastSavedAt: Date | null;
}) {
  if (status === "saving" || status === "pending") {
    return <span className="text-sm text-blue-700">Saving…</span>;
  }
  if (status === "error") {
    return <span className="text-sm text-red-600">Save failed</span>;
  }
  if (status === "saved" && lastSavedAt) {
    return (
      <span className="text-sm text-emerald-700">
        Saved {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  return <span className="text-sm text-zinc-500">Edits save automatically</span>;
}

export default function StorefrontSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !canManageStorefront(user.role)) {
      router.replace("/storefront");
    }
  }, [user, router]);

  if (user && !canManageStorefront(user.role)) {
    return null;
  }

  return <StorefrontSettingsStudio />;
}

function StorefrontSettingsStudio() {
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  const [enabled, setEnabled] = useState(false);
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#b8860b");
  const [accentColor, setAccentColor] = useState("#1a1a1a");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrls, setBannerUrls] = useState<string[]>(() => Array(BANNER_SLOT_COUNT).fill(""));
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  const applySaved = useCallback((updated: StorefrontAdminSettings) => {
    setSettings(updated);
    setBannerUrls(padBannerSlots(updated.bannerUrls, updated.bannerUrl));
    setPreviewKey((k) => k + 1);
  }, []);

  const { status, error, lastSavedAt, markReady, scheduleSave, saveNow } =
    useStorefrontSettingsAutosave(applySaved);

  const buildPayload = useCallback((): UpdateStorefrontSettingsInput => ({
    enabled,
    tagline: tagline.trim() || null,
    heroTitle: heroTitle.trim() || null,
    heroSubtitle: heroSubtitle.trim() || null,
    aboutText: aboutText.trim() || null,
    primaryColor,
    accentColor,
    logoUrl: logoUrl.trim() || null,
    bannerUrls: bannerUrls.map((url) => url.trim()).filter(Boolean).slice(0, BANNER_SLOT_COUNT),
    contactEmail: contactEmail.trim() || null,
    contactPhone: contactPhone.trim() || null,
    instagramUrl: instagramUrl.trim() || null,
    facebookUrl: facebookUrl.trim() || null,
    whatsappNumber: whatsappNumber.trim() || null,
    shippingNote: shippingNote.trim() || null,
    returnPolicy: returnPolicy.trim() || null,
  }), [
    enabled,
    tagline,
    heroTitle,
    heroSubtitle,
    aboutText,
    primaryColor,
    accentColor,
    logoUrl,
    bannerUrls,
    contactEmail,
    contactPhone,
    instagramUrl,
    facebookUrl,
    whatsappNumber,
    shippingNote,
    returnPolicy,
  ]);

  const persist = useCallback(
    (debounceMs?: number) => {
      const payload = buildPayload();
      if (debounceMs === 0) {
        void saveNow(payload).then((updated) => {
          if (updated) applySaved(updated);
        });
      } else {
        scheduleSave(payload, debounceMs ?? 600);
      }
    },
    [buildPayload, saveNow, scheduleSave, applySaved],
  );

  useEffect(() => {
    fetchStorefrontAdminSettings()
      .then((s) => {
        setSettings(s);
        setEnabled(s.enabled);
        setTagline(s.tagline ?? "");
        setHeroTitle(s.heroTitle ?? "");
        setHeroSubtitle(s.heroSubtitle ?? "");
        setAboutText(s.aboutText ?? "");
        setPrimaryColor(s.primaryColor);
        setAccentColor(s.accentColor);
        setLogoUrl(s.logoUrl ?? "");
        setBannerUrls(padBannerSlots(s.bannerUrls, s.bannerUrl));
        setContactEmail(s.contactEmail ?? "");
        setContactPhone(s.contactPhone ?? "");
        setInstagramUrl(s.instagramUrl ?? "");
        setFacebookUrl(s.facebookUrl ?? "");
        setWhatsappNumber(s.whatsappNumber ?? "");
        setShippingNote(s.shippingNote ?? "");
        setReturnPolicy(s.returnPolicy ?? "");
        setCustomDomain(s.customDomain ?? "");
        markReady();
      })
      .catch((err) => setLoadError(getApiErrorMessage(err, "Could not load settings.")))
      .finally(() => setLoading(false));
  }, [markReady]);

  const previewDraft = useMemo(() => {
    if (!settings) {
      return null;
    }
    return draftFromSettings(settings, {
      enabled,
      tagline,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
      accentColor,
      logoUrl,
      bannerUrls,
    });
  }, [
    settings,
    enabled,
    tagline,
    heroTitle,
    heroSubtitle,
    aboutText,
    primaryColor,
    accentColor,
    logoUrl,
    bannerUrls,
  ]);

  const handleDomainBlur = async () => {
    if (!settings) return;
    const next = customDomain.trim();
    if (next === (settings.customDomain ?? "")) return;
    try {
      const withDomain = await updateStorefrontDomain(next || null);
      setSettings(withDomain);
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Could not update domain."));
    }
  };

  if (loading) return <PageSkeleton />;

  const shopPreviewUrl =
    settings?.storeUrl && enabled ? `${settings.storeUrl}?_=${previewKey}` : null;

  return (
    <div className="page-content">
      <PageHeader
        title="Shop design studio"
        subtitle="Edit branding, banners, and contact — preview updates instantly; your shop refreshes as soon as changes save"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusBadge status={status} lastSavedAt={lastSavedAt} />
            {settings?.storeUrl ? (
              <a
                href={`${settings.storeUrl}?_=${previewKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                <ExternalLink size={15} />
                Open shop
              </a>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/storefront" className="text-sm text-zinc-500 hover:underline">
          ← Back to Online Store
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
          onClick={() => persist(0)}
        >
          <RefreshCw size={14} />
          Save now
        </button>
      </div>

      {(loadError || error) && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {loadError || error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6 max-w-3xl">
          <div className="surface-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Store status</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  persist(0);
                }}
              />
              <span className="text-sm">Online store is live (customers can visit the shop URL)</span>
            </label>
            {settings?.storeUrl && (
              <p className="text-sm text-zinc-500 font-mono break-all">{settings.storeUrl}</p>
            )}
          </div>

          <div className="surface-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Homepage & branding</h3>
            <div>
              <label className={labelClass}>Tagline</label>
              <input
                className={fieldClass}
                value={tagline}
                onChange={(e) => {
                  setTagline(e.target.value);
                  persist();
                }}
                placeholder="Fine handcrafted jewellery"
              />
            </div>
            <div>
              <label className={labelClass}>Hero title</label>
              <input
                className={fieldClass}
                value={heroTitle}
                onChange={(e) => {
                  setHeroTitle(e.target.value);
                  persist();
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Hero subtitle</label>
              <input
                className={fieldClass}
                value={heroSubtitle}
                onChange={(e) => {
                  setHeroSubtitle(e.target.value);
                  persist();
                }}
              />
            </div>
            <div>
              <label className={labelClass}>About text</label>
              <textarea
                className={fieldClass}
                rows={4}
                value={aboutText}
                onChange={(e) => {
                  setAboutText(e.target.value);
                  persist();
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Primary (gold) colour</label>
                <input
                  type="color"
                  className="h-11 w-full cursor-pointer"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    persist(300);
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Accent colour</label>
                <input
                  type="color"
                  className="h-11 w-full cursor-pointer"
                  value={accentColor}
                  onChange={(e) => {
                    setAccentColor(e.target.value);
                    persist(300);
                  }}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Logo image URL</label>
              <input
                className={fieldClass}
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  persist();
                }}
                placeholder="https://… or paste after uploading elsewhere"
              />
            </div>
            <div>
              <label className={labelClass}>Hero carousel banners</label>
              <BannerCarouselEditor
                banners={bannerUrls}
                onChange={(next) => {
                  setBannerUrls(next);
                  persist(1200);
                }}
                heroTitle={heroTitle || settings?.businessName}
                heroSubtitle={heroSubtitle || tagline || undefined}
              />
            </div>
          </div>

          <div className="surface-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Contact & social</h3>
            {[
              { label: "Contact email", value: contactEmail, set: setContactEmail, type: "email" },
              { label: "Contact phone", value: contactPhone, set: setContactPhone },
              { label: "WhatsApp number", value: whatsappNumber, set: setWhatsappNumber },
              { label: "Instagram URL", value: instagramUrl, set: setInstagramUrl },
              { label: "Facebook URL", value: facebookUrl, set: setFacebookUrl },
            ].map((field) => (
              <div key={field.label}>
                <label className={labelClass}>{field.label}</label>
                <input
                  className={fieldClass}
                  type={field.type ?? "text"}
                  value={field.value}
                  onChange={(e) => {
                    field.set(e.target.value);
                    persist();
                  }}
                />
              </div>
            ))}
          </div>

          <div className="surface-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Policies</h3>
            <div>
              <label className={labelClass}>Shipping note</label>
              <textarea
                className={fieldClass}
                rows={2}
                value={shippingNote}
                onChange={(e) => {
                  setShippingNote(e.target.value);
                  persist();
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Return policy</label>
              <textarea
                className={fieldClass}
                rows={3}
                value={returnPolicy}
                onChange={(e) => {
                  setReturnPolicy(e.target.value);
                  persist();
                }}
              />
            </div>
          </div>

          <div className="surface-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Custom domain</h3>
            <p className="text-sm text-zinc-500">
              Point your domain CNAME to your deployment, then enter it here (saved when you leave the
              field).
            </p>
            <input
              className={fieldClass}
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              onBlur={() => void handleDomainBlur()}
              placeholder="shop.example.com"
            />
          </div>
        </div>

        <aside className="xl:sticky xl:top-[calc(var(--topbar-height)+12px)] space-y-4">
          {previewDraft ? <StorefrontLivePreview draft={previewDraft} /> : null}

          {shopPreviewUrl ? (
            <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
              <div className="px-3 py-2 text-xs font-medium text-zinc-600 border-b border-zinc-200 flex justify-between">
                <span>Live shop (saved)</span>
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setPreviewKey((k) => k + 1)}
                >
                  Refresh
                </button>
              </div>
              <iframe
                title="Store preview"
                src={shopPreviewUrl}
                className="w-full h-[420px] border-0 bg-zinc-100"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Turn on the online store to preview the real shop page here. The mock preview above still
              shows your colours and hero while you edit.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
