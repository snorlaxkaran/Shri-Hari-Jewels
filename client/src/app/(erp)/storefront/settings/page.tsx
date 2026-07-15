"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import {
  fetchStorefrontAdminSettings,
  updateStorefrontAdminSettings,
  updateStorefrontDomain,
} from "@/lib/api/storefront-admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type { StorefrontAdminSettings } from "@/lib/storefront/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function StorefrontSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !canManageSettings(user.role)) {
      router.replace("/storefront");
    }
  }, [user, router]);

  if (user && !canManageSettings(user.role)) {
    return null;
  }

  return <StorefrontSettingsForm />;
}

function StorefrontSettingsForm() {
  const [settings, setSettings] = useState<StorefrontAdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [enabled, setEnabled] = useState(false);
  const [tagline, setTagline] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#b8860b");
  const [accentColor, setAccentColor] = useState("#1a1a1a");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [customDomain, setCustomDomain] = useState("");

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
        setBannerUrl(s.bannerUrl ?? "");
        setContactEmail(s.contactEmail ?? "");
        setContactPhone(s.contactPhone ?? "");
        setInstagramUrl(s.instagramUrl ?? "");
        setFacebookUrl(s.facebookUrl ?? "");
        setWhatsappNumber(s.whatsappNumber ?? "");
        setShippingNote(s.shippingNote ?? "");
        setReturnPolicy(s.returnPolicy ?? "");
        setCustomDomain(s.customDomain ?? "");
      })
      .catch(() => setError("Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateStorefrontAdminSettings({
        enabled,
        tagline: tagline.trim() || null,
        heroTitle: heroTitle.trim() || null,
        heroSubtitle: heroSubtitle.trim() || null,
        aboutText: aboutText.trim() || null,
        primaryColor,
        accentColor,
        logoUrl: logoUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        facebookUrl: facebookUrl.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        shippingNote: shippingNote.trim() || null,
        returnPolicy: returnPolicy.trim() || null,
      });
      setSettings(updated);

      if (customDomain.trim() !== (settings?.customDomain ?? "")) {
        const withDomain = await updateStorefrontDomain(customDomain.trim() || null);
        setSettings(withDomain);
      }

      setSuccess("Store settings saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Store Settings"
        subtitle="Configure your online jewellery store"
      />

      <div className="mb-4">
        <Link href="/storefront" className="text-sm text-zinc-500 hover:underline">← Back to Online Store</Link>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">{error}</div>}
      {success && <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-green-200 bg-green-50 text-green-700">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="surface-card p-5 space-y-4">
          <h3 className="font-medium">Store Status</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="text-sm">Enable online store (make it publicly accessible)</span>
          </label>
          {settings?.storeUrl && (
            <p className="text-xs text-zinc-500">Store URL: <span className="font-mono">{settings.storeUrl}</span></p>
          )}
        </div>

        <div className="surface-card p-5 space-y-4">
          <h3 className="font-medium">Branding</h3>
          <div><label className={labelClass}>Tagline</label><input className={fieldClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Fine handcrafted jewellery" /></div>
          <div><label className={labelClass}>Hero Title</label><input className={fieldClass} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} /></div>
          <div><label className={labelClass}>Hero Subtitle</label><input className={fieldClass} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} /></div>
          <div><label className={labelClass}>About Text</label><textarea className={fieldClass} rows={4} value={aboutText} onChange={(e) => setAboutText(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Primary Color</label><input type="color" className="h-10 w-full" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} /></div>
            <div><label className={labelClass}>Accent Color</label><input type="color" className="h-10 w-full" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} /></div>
          </div>
          <div><label className={labelClass}>Logo URL</label><input className={fieldClass} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
          <div><label className={labelClass}>Banner URL</label><input className={fieldClass} value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://..." /></div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h3 className="font-medium">Contact & Social</h3>
          <div><label className={labelClass}>Contact Email</label><input className={fieldClass} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
          <div><label className={labelClass}>Contact Phone</label><input className={fieldClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
          <div><label className={labelClass}>WhatsApp Number</label><input className={fieldClass} value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="10-digit number" /></div>
          <div><label className={labelClass}>Instagram URL</label><input className={fieldClass} value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /></div>
          <div><label className={labelClass}>Facebook URL</label><input className={fieldClass} value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} /></div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h3 className="font-medium">Policies</h3>
          <div><label className={labelClass}>Shipping Note</label><textarea className={fieldClass} rows={2} value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} /></div>
          <div><label className={labelClass}>Return Policy</label><textarea className={fieldClass} rows={3} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} /></div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h3 className="font-medium">Custom Domain</h3>
          <p className="text-xs text-zinc-500">Point your domain CNAME to your deployment, then enter it here (e.g. shop.yourbrand.com)</p>
          <input className={fieldClass} value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="shop.example.com" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary px-6 py-2 text-sm">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
