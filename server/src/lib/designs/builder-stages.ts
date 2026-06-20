import { DesignBuilderStage as DbDesignBuilderStage } from "@prisma/client";

export const DESIGN_BUILDER_STAGES = [
  "SKU",
  "CAD",
  "Mold Making",
  "Motifs",
  "Photo",
  "Complete",
] as const;

export type DesignBuilderStage = (typeof DESIGN_BUILDER_STAGES)[number];

const DB_TO_API: Record<DbDesignBuilderStage, DesignBuilderStage> = {
  [DbDesignBuilderStage.SKU]: "SKU",
  [DbDesignBuilderStage.CAD]: "CAD",
  [DbDesignBuilderStage.MoldMaking]: "Mold Making",
  [DbDesignBuilderStage.Motifs]: "Motifs",
  [DbDesignBuilderStage.Photo]: "Photo",
  [DbDesignBuilderStage.Complete]: "Complete",
};

const API_TO_DB: Record<DesignBuilderStage, DbDesignBuilderStage> = {
  SKU: DbDesignBuilderStage.SKU,
  CAD: DbDesignBuilderStage.CAD,
  "Mold Making": DbDesignBuilderStage.MoldMaking,
  Motifs: DbDesignBuilderStage.Motifs,
  Photo: DbDesignBuilderStage.Photo,
  Complete: DbDesignBuilderStage.Complete,
};

export const DESIGN_BUILDER_STAGE_SLUGS = [
  "sku",
  "cad",
  "mold",
  "motifs",
  "photo",
] as const;

export type DesignBuilderStageSlug = (typeof DESIGN_BUILDER_STAGE_SLUGS)[number];

const SLUG_TO_STAGE: Record<DesignBuilderStageSlug, DesignBuilderStage> = {
  sku: "SKU",
  cad: "CAD",
  mold: "Mold Making",
  motifs: "Motifs",
  photo: "Photo",
};

export const stageToSlug = (stage: DesignBuilderStage): DesignBuilderStageSlug | null => {
  const entry = Object.entries(SLUG_TO_STAGE).find(([, s]) => s === stage);
  return entry ? (entry[0] as DesignBuilderStageSlug) : null;
};

export const slugToStage = (slug: string): DesignBuilderStage | null =>
  SLUG_TO_STAGE[slug as DesignBuilderStageSlug] ?? null;

export const nextBuilderStage = (
  stage: DesignBuilderStage,
): DesignBuilderStage | null => {
  const idx = DESIGN_BUILDER_STAGES.indexOf(stage);
  if (idx < 0 || idx >= DESIGN_BUILDER_STAGES.length - 1) return null;
  return DESIGN_BUILDER_STAGES[idx + 1];
};

export const toApiDesignBuilderStage = (
  stage: DbDesignBuilderStage,
): DesignBuilderStage => DB_TO_API[stage];

export const toDbDesignBuilderStage = (
  stage: DesignBuilderStage,
): DbDesignBuilderStage => API_TO_DB[stage];

export type UpdateDesignBuilderInput = {
  cadFileUrl?: string | null;
  moldNotes?: string | null;
  moldPhotoUrl?: string | null;
  finishedPhotoUrl?: string | null;
  finishedPhotoUrls?: string[] | null;
};
