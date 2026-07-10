"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import DesignBuilderShell from "@/app/(components)/designs/DesignBuilderShell";
import MotifCard from "@/app/(components)/designs/MotifCard";
import MotifImageUpload from "@/app/(components)/motifs/MotifImageUpload";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageDesigns } from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import {
  advanceDesignBuilder,
  replaceDesignElements,
} from "@/lib/api/designs";
import { fetchMotifs } from "@/lib/api/motifs";
import { designMetalToMotifMetal } from "@/lib/motifs/constants";
import { DESIGN_BUILDER_STEPS } from "@/lib/designs/builder-stages";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  Design,
  Motif,
  NewDesignElementInput,
  UpdateDesignBuilderInput,
} from "@/lib/types";

const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";
const inputClass = "input-field w-full px-3 py-2 text-sm";

export default function DesignBuilderStepPage() {
  const params = useParams();
  const router = useRouter();
  const designId = params.id as string;
  const step = params.step as string;
  const { user } = useAuth();
  const canManage = user ? canManageDesigns(user.role) : false;
  const { designs, hydrated, refresh } = useDesigns();

  const design = useMemo(
    () => designs.find((d) => d.id === designId) ?? null,
    [designs, designId],
  );

  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [motifQuantities, setMotifQuantities] = useState<Record<string, number>>({});
  const [cadFileUrl, setCadFileUrl] = useState<string | undefined>();
  const [moldNotes, setMoldNotes] = useState("");
  const [moldPhotoUrl, setMoldPhotoUrl] = useState<string | undefined>();
  const [finishedPhotoUrls, setFinishedPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user && !canManage) router.replace("/designs");
  }, [user, canManage, router]);

  useEffect(() => {
    fetchMotifs().then(setMotifs).catch(() => setMotifs([]));
  }, []);

  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [moldNotes]);

  const syncFromDesign = useCallback((d: Design) => {
    setCadFileUrl(d.cadFileUrl);
    setMoldNotes(d.moldNotes ?? "");
    setMoldPhotoUrl(d.moldPhotoUrl);
    setFinishedPhotoUrls(
      d.finishedPhotoUrls?.length
        ? d.finishedPhotoUrls
        : d.finishedPhotoUrl
          ? [d.finishedPhotoUrl]
          : [],
    );
    const filterMetal = designMetalToMotifMetal(d.metal ?? "");
    const quantities: Record<string, number> = {};
    d.elements
      .filter((e) => e.type === "Motif")
      .forEach((m) => {
        if (m.motifId) quantities[m.motifId] = m.qtyPerSet;
        else {
          const match = motifs.find(
            (motif) =>
              motif.name === m.name &&
              (!filterMetal || motif.metal === filterMetal) &&
              (!d.purity || motif.purity === d.purity),
          );
          if (match) quantities[match.id] = m.qtyPerSet;
        }
      });
    setMotifQuantities(quantities);
  }, [motifs]);

  useEffect(() => {
    if (design) syncFromDesign(design);
  }, [design, syncFromDesign]);

  const filteredMotifs = useMemo(() => {
    if (!design?.metal || !design.purity) return [];
    const motifMetal = designMetalToMotifMetal(design.metal);
    if (!motifMetal) return [];
    return motifs.filter(
      (m) => m.metal === motifMetal && m.purity === design.purity,
    );
  }, [motifs, design]);

  const motifSummary = useMemo(() => {
    let totalQty = 0;
    let totalWeight = 0;
    for (const [motifId, qty] of Object.entries(motifQuantities)) {
      if (qty < 1) continue;
      const motif = motifs.find((m) => m.id === motifId);
      if (!motif) continue;
      totalQty += qty;
      if (motif.weightGrams != null) totalWeight += motif.weightGrams * qty;
    }
    return { totalQty, totalWeight };
  }, [motifQuantities, motifs]);

  const stepIndex = DESIGN_BUILDER_STEPS.findIndex((s) => s.slug === step);
  const nextStep = stepIndex >= 0 ? DESIGN_BUILDER_STEPS[stepIndex + 1] : null;

  const saveMotifs = async () => {
    if (!design) return;
    const elements: NewDesignElementInput[] = [];
    for (const [motifId, qty] of Object.entries(motifQuantities)) {
      if (qty < 1) continue;
      const motif = motifs.find((m) => m.id === motifId);
      if (!motif) continue;
      elements.push({
        name: motif.name,
        type: "Motif",
        motifId: motif.id,
        qtyPerSet: qty,
        unitValue: motif.price,
        weightGramsPerPc: motif.weightGrams,
      });
    }
    await replaceDesignElements(design.id, elements, "Design builder motifs step");
    await refresh();
  };

  const handleNext = () => {
    setError("");
    if (step === "cad" && !cadFileUrl) {
      setError("Please upload a CAD render or file before continuing.");
      return;
    }
    if (step === "mold" && !moldPhotoUrl && !moldNotes.trim()) {
      setError("Please add mold notes or a photo before continuing.");
      return;
    }
    if (step === "motifs" && Object.keys(motifQuantities).length === 0) {
      setError("Please attach at least one motif before continuing.");
      return;
    }
    if (step === "photo" && finishedPhotoUrls.length === 0) {
      setError("Please upload a finished piece photo before completing.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!design) return;
    setSubmitting(true);
    setError("");
    try {
      let fields: UpdateDesignBuilderInput | undefined;

      if (step === "cad") {
        fields = { cadFileUrl: cadFileUrl ?? null };
      } else if (step === "mold") {
        fields = {
          moldNotes: moldNotes.trim() || null,
          moldPhotoUrl: moldPhotoUrl ?? null,
        };
      } else if (step === "motifs") {
        await saveMotifs();
      } else if (step === "photo") {
        fields = {
          finishedPhotoUrls: finishedPhotoUrls.length ? finishedPhotoUrls : null,
        };
      }

      const { design: updated, nextStage } = await advanceDesignBuilder(
        design.id,
        fields,
      );
      await refresh();

      if (nextStage === "Complete" || step === "photo") {
        router.push(`/designs?selected=${updated.id}`);
        return;
      }

      if (nextStep) {
        router.push(`/designs/${design.id}/builder/${nextStep.slug}`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save and continue."));
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (!hydrated || !design) {
    return <PageSkeleton />;
  }

  const setMotifQuantity = (motifId: string, qty: number) => {
    const nextQty = Math.max(0, Math.floor(qty));
    setMotifQuantities((prev) => {
      const next = { ...prev };
      if (nextQty === 0) delete next[motifId];
      else next[motifId] = nextQty;
      return next;
    });
  };

  return (
    <div className="page-content">
      <DesignBuilderShell design={design}>
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {step === "cad" && (
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">CAD / Prototype</h2>
          <p className="text-sm text-zinc-500">
            Upload a CAD render or file to record that this stage is complete.
          </p>
          <MotifImageUpload
            imageUrl={cadFileUrl}
            onChange={setCadFileUrl}
            disabled={!canManage}
          />
        </div>
      )}

      {step === "mold" && (
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Mold Making</h2>
          <p className="text-sm text-zinc-500">
            Add notes and/or a photo from the mold-making stage.
          </p>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              ref={notesRef}
              value={moldNotes}
              onChange={(e) => setMoldNotes(e.target.value)}
              className={`${inputClass} min-h-[100px] resize-none overflow-hidden`}
              disabled={!canManage}
            />
          </div>
          <MotifImageUpload
            imageUrl={moldPhotoUrl}
            onChange={setMoldPhotoUrl}
            disabled={!canManage}
          />
        </div>
      )}

      {step === "motifs" && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Choose Motifs</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Attach motifs matching {design.metal} / {design.purity}. Set quantity per set for each.
            </p>
            <Link
              href="/motifs"
              className="inline-block mt-2 text-xs text-blue-600 hover:underline"
            >
              Create a new motif in the library →
            </Link>
          </div>
          {motifSummary.totalQty > 0 && (
            <div className="surface-card p-3 flex items-center gap-6 text-sm">
              <span className="text-zinc-500">
                Selected:{" "}
                <span className="font-medium text-zinc-900">
                  {motifSummary.totalQty} pc
                </span>
              </span>
              {motifSummary.totalWeight > 0 && (
                <span className="text-zinc-500">
                  Est. weight:{" "}
                  <span className="font-medium text-zinc-900">
                    {motifSummary.totalWeight.toFixed(2)} g
                  </span>
                </span>
              )}
            </div>
          )}
          {filteredMotifs.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No motifs for this metal and purity yet. Create one in the motif library first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMotifs.map((motif) => (
                <MotifCard
                  key={motif.id}
                  name={motif.name}
                  subtitle={`${motif.subCategory}${motif.weightGrams != null ? ` · ${motif.weightGrams}g` : ""}`}
                  price={motif.price}
                  imageUrl={motif.imageUrl}
                  quantity={motifQuantities[motif.id] ?? 0}
                  onQuantityChange={(qty) => setMotifQuantity(motif.id, qty)}
                  disabled={!canManage}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {step === "photo" && (
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Finished Piece Photos</h2>
          <p className="text-sm text-zinc-500">
            Upload up to 3 photos of the finished piece (front, side, clasp detail, etc.).
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <p className="text-xs text-zinc-400 mb-1">
                Photo {i + 1}
                {i === 0 ? " *" : " (optional)"}
              </p>
              <MotifImageUpload
                imageUrl={finishedPhotoUrls[i]}
                onChange={(url) => {
                  const next = [...finishedPhotoUrls];
                  if (url) next[i] = url;
                  else next.splice(i, 1);
                  setFinishedPhotoUrls(next.filter(Boolean));
                }}
                disabled={!canManage}
              />
            </div>
          ))}
        </div>
      )}

      {!["cad", "mold", "motifs", "photo"].includes(step) && (
        <p className="text-sm text-zinc-500">Unknown builder step.</p>
      )}

      {canManage && ["cad", "mold", "motifs", "photo"].includes(step) && (
        <div className="flex gap-3 mt-6">
          {stepIndex > 0 && (
            <Link
              href={`/designs/${designId}/builder/${DESIGN_BUILDER_STEPS[stepIndex - 1].slug}`}
              className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center"
            >
              Back
            </Link>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="btn-primary flex-1 px-4 py-2.5 text-sm"
          >
            {step === "photo" ? "Complete Design" : "Next"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        message={
          step === "photo"
            ? "Complete the design builder? You can still edit pricing on the design page."
            : "Save this step and continue to the next stage?"
        }
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
        loading={submitting}
      />
    </DesignBuilderShell>
    </div>
  );
}
