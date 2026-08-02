import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { MarketingFooter } from "../../_components/MarketingFooter";
import { MarketingHeader } from "../../_components/MarketingHeader";
import { AnnouncementBanner } from "../../_components/AnnouncementBanner";
import {
  SHOWCASE_MODULES,
  getShowcaseModule,
} from "@/lib/onboarding/modules-showcase";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SHOWCASE_MODULES.map((m) => ({ slug: m.id }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const mod = getShowcaseModule(slug);
  if (!mod) return { title: "Module not found" };
  return {
    title: `${mod.label} — Shri Hari Jewels`,
    description: mod.detail.intro,
  };
}

export default async function ModuleDetailPage({ params }: Props) {
  const { slug } = await params;
  const mod = getShowcaseModule(slug);
  if (!mod) notFound();

  const Icon = mod.icon;
  const currentIndex = SHOWCASE_MODULES.findIndex((m) => m.id === mod.id);
  const prev = currentIndex > 0 ? SHOWCASE_MODULES[currentIndex - 1] : null;
  const next =
    currentIndex < SHOWCASE_MODULES.length - 1
      ? SHOWCASE_MODULES[currentIndex + 1]
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f5f7]">
      <AnnouncementBanner />
      <MarketingHeader />

      <article className="erp-marketing-shell py-12 lg:py-16 flex-1">
        <Link href="/onboarding#modules" className="erp-back-link">
          <ArrowLeft size={14} />
          Back to all modules
        </Link>

        <div className="flex items-start gap-4 mb-6 mt-4">
          <span className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-[#fff5f4] text-[#e74c3c] shrink-0">
            <Icon size={24} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#e74c3c]">
              {mod.processLabel}
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-[#171717] mt-1">{mod.label}</h1>
            <p className="mt-2 text-lg text-[#525252] max-w-2xl">{mod.detail.headline}</p>
          </div>
        </div>

        <p className="text-[#404040] leading-relaxed max-w-3xl mb-10">{mod.detail.intro}</p>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="erp-marketing-card">
            <h2 className="font-semibold text-lg mb-4">Key capabilities</h2>
            <ul className="space-y-3">
              {mod.detail.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-sm text-[#404040]">
                  <Check size={16} className="text-[#e74c3c] shrink-0 mt-0.5" strokeWidth={2.5} />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div className="erp-marketing-card">
            <h2 className="font-semibold text-lg mb-4">{mod.detail.example.title}</h2>
            <dl className="space-y-0 text-sm">
              {mod.detail.example.rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex justify-between py-2.5 ${
                    i < mod.detail.example.rows.length - 1
                      ? "border-b border-dashed border-[#e5e7eb]"
                      : ""
                  }`}
                >
                  <dt className="text-[#6b7280]">{row.label}</dt>
                  <dd className="font-medium text-[#171717] text-right tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <h2 className="font-semibold text-xl mb-2">Screenshots</h2>
        <p className="text-sm text-[#6b7280] mb-6">Real screens from the app with sample data.</p>
        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {mod.detail.screenshots.map((shot) => (
            <figure key={shot.src} className="erp-marketing-card p-0 overflow-hidden">
              <Image
                src={shot.src}
                alt={shot.caption}
                width={960}
                height={600}
                className="w-full h-auto"
              />
              <figcaption className="px-4 py-3 text-sm text-[#6b7280] border-t border-[#e5e7eb]">
                {shot.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-8 border-t border-[#e5e7eb]">
          {prev ? (
            <Link href={prev.knowMoreHref} className="erp-btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              {prev.label}
            </Link>
          ) : (
            <span />
          )}
          <Link href="/onboarding/start" className="erp-btn-primary w-auto px-8 py-2.5">
            Start free trial
          </Link>
          {next ? (
            <Link
              href={next.knowMoreHref}
              className="erp-btn-secondary inline-flex items-center gap-2 sm:ml-auto"
            >
              {next.label}
              <ArrowRight size={16} />
            </Link>
          ) : null}
        </div>
      </article>

      <MarketingFooter />
    </div>
  );
}
