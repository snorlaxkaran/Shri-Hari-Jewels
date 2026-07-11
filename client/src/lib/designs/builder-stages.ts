import type { DesignBuilderStage } from "@/lib/types";

export const DESIGN_BUILDER_STEPS = [
  { slug: "cad", label: "CAD / Prototype", stage: "CAD" as DesignBuilderStage },
  { slug: "motifs", label: "Choose Motifs", stage: "Motifs" as DesignBuilderStage },
  { slug: "mold", label: "Mold / WAX", stage: "Mold Making" as DesignBuilderStage },
  { slug: "photo", label: "Finished Photo", stage: "Photo" as DesignBuilderStage },
] as const;

export type DesignBuilderStepSlug = (typeof DESIGN_BUILDER_STEPS)[number]["slug"];

export const designBuilderStepHref = (designId: string, slug: DesignBuilderStepSlug) =>
  `/designs/${designId}/builder/${slug}`;

export const isDesignBuilderStepAccessible = (
  builderStage: DesignBuilderStage,
  targetStage: DesignBuilderStage,
): boolean => {
  const order: DesignBuilderStage[] = [
    "SKU",
    "CAD",
    "Motifs",
    "Mold Making",
    "Photo",
    "Complete",
  ];
  const currentIdx = order.indexOf(builderStage);
  const targetIdx = order.indexOf(targetStage);
  return targetIdx <= currentIdx;
};
