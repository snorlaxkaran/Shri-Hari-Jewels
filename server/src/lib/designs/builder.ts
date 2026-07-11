import {
  DesignBuilderStage as DbDesignBuilderStage,
} from "@prisma/client";
import { prisma } from "../db.js";
import { DesignError, toDesign } from "./service.js";
import {
  nextBuilderStage,
  toApiDesignBuilderStage,
  toDbDesignBuilderStage,
  type DesignBuilderStage,
  type UpdateDesignBuilderInput,
} from "./builder-stages.js";
import type { Design } from "../../types.js";

type Actor = { id: string; name: string };

type DesignForValidation = {
  code: string;
  metal: string | null;
  purity: string | null;
  cadReady: boolean;
  cadNotes: string | null;
  cadFileUrl: string | null;
  moldPhotoUrl: string | null;
  moldNotes: string | null;
  finishedPhotoUrl: string | null;
  finishedPhotoUrls?: string[];
  elements: unknown[];
  builderStage: DbDesignBuilderStage;
};

export const saveAndAdvanceDesignBuilderStage = async (
  designId: string,
  fields: UpdateDesignBuilderInput | undefined,
  _actor: Actor,
): Promise<{ design: Design; nextStage: DesignBuilderStage | null }> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });
  if (!design) throw new DesignError("Design not found.", 404);

  const current = toApiDesignBuilderStage(design.builderStage);

  const merged: DesignForValidation = {
    ...design,
    cadReady:
      fields?.cadReady !== undefined ? fields.cadReady : design.cadReady,
    cadNotes:
      fields?.cadNotes !== undefined ? fields.cadNotes : design.cadNotes,
    cadFileUrl:
      fields?.cadFileUrl !== undefined ? fields.cadFileUrl : design.cadFileUrl,
    moldNotes:
      fields?.moldNotes !== undefined ? fields.moldNotes : design.moldNotes,
    moldPhotoUrl:
      fields?.moldPhotoUrl !== undefined
        ? fields.moldPhotoUrl
        : design.moldPhotoUrl,
    finishedPhotoUrl:
      fields?.finishedPhotoUrl !== undefined
        ? fields.finishedPhotoUrl
        : design.finishedPhotoUrl,
    finishedPhotoUrls:
      fields?.finishedPhotoUrls !== undefined
        ? (fields.finishedPhotoUrls ?? [])
        : design.finishedPhotoUrls,
  };

  validateStageComplete(merged, current);

  const next = nextBuilderStage(current);
  if (!next) {
    throw new DesignError("Design builder is already complete.", 400);
  }

  const now = new Date();
  const data: {
    builderStage: DbDesignBuilderStage;
    cadReady?: boolean;
    cadNotes?: string | null;
    cadFileUrl?: string | null;
    moldNotes?: string | null;
    moldPhotoUrl?: string | null;
    finishedPhotoUrl?: string | null;
    finishedPhotoUrls?: string[];
    cadCompletedAt?: Date;
    moldCompletedAt?: Date;
    builderCompletedAt?: Date;
  } = {
    builderStage: toDbDesignBuilderStage(next),
  };

  if (fields?.cadReady !== undefined) data.cadReady = fields.cadReady;
  if (fields?.cadNotes !== undefined) data.cadNotes = fields.cadNotes ?? null;
  if (fields?.cadFileUrl !== undefined) data.cadFileUrl = fields.cadFileUrl;
  if (fields?.moldNotes !== undefined) data.moldNotes = fields.moldNotes;
  if (fields?.moldPhotoUrl !== undefined) data.moldPhotoUrl = fields.moldPhotoUrl;
  if (fields?.finishedPhotoUrl !== undefined) {
    data.finishedPhotoUrl = fields.finishedPhotoUrl;
  }
  if (fields?.finishedPhotoUrls !== undefined) {
    data.finishedPhotoUrls = fields.finishedPhotoUrls ?? [];
  }

  if (current === "CAD") data.cadCompletedAt = now;
  if (current === "Mold Making") data.moldCompletedAt = now;
  if (current === "Photo") data.builderCompletedAt = now;

  const updated = await prisma.design.update({
    where: { id: designId },
    data,
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });

  return {
    design: toDesign(updated),
    nextStage: next,
  };
};

export const advanceDesignBuilderStage = async (
  designId: string,
  actor: Actor,
): Promise<{ design: Design; nextStage: DesignBuilderStage | null }> =>
  saveAndAdvanceDesignBuilderStage(designId, undefined, actor);

export const updateDesignBuilderFields = async (
  designId: string,
  input: UpdateDesignBuilderInput,
): Promise<Design> => {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new DesignError("Design not found.", 404);

  const updated = await prisma.design.update({
    where: { id: designId },
    data: {
      cadReady: input.cadReady === undefined ? undefined : input.cadReady,
      cadNotes: input.cadNotes === undefined ? undefined : input.cadNotes,
      cadFileUrl:
        input.cadFileUrl === undefined ? undefined : input.cadFileUrl,
      moldNotes: input.moldNotes === undefined ? undefined : input.moldNotes,
      moldPhotoUrl:
        input.moldPhotoUrl === undefined ? undefined : input.moldPhotoUrl,
      finishedPhotoUrl:
        input.finishedPhotoUrl === undefined
          ? undefined
          : input.finishedPhotoUrl,
      finishedPhotoUrls:
        input.finishedPhotoUrls === undefined
          ? undefined
          : (input.finishedPhotoUrls ?? []),
    },
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });

  return toDesign(updated);
};

const validateStageComplete = (
  design: DesignForValidation,
  stage: DesignBuilderStage,
): void => {
  switch (stage) {
    case "SKU":
      if (!design.metal || !design.purity) {
        throw new DesignError("Metal and purity are required before continuing.");
      }
      break;
    case "CAD":
      if (!design.cadReady) {
        throw new DesignError(
          "Please confirm that the CAD is ready before continuing.",
          400,
        );
      }
      break;
    case "Mold Making":
      if (!design.moldPhotoUrl && !design.moldNotes?.trim()) {
        throw new DesignError(
          "Add mold notes or a photo before continuing.",
        );
      }
      break;
    case "Motifs":
      if (design.elements.length === 0) {
        throw new DesignError("Attach at least one motif before continuing.");
      }
      break;
    case "Photo":
      if (
        !design.finishedPhotoUrl &&
        !(design.finishedPhotoUrls && design.finishedPhotoUrls.length > 0)
      ) {
        throw new DesignError(
          "Upload a finished piece photo before completing.",
        );
      }
      break;
    default:
      break;
  }
};
