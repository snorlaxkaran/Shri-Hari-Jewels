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

export const advanceDesignBuilderStage = async (
  designId: string,
  actor: Actor,
): Promise<{ design: Design; nextStage: DesignBuilderStage | null }> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });
  if (!design) throw new DesignError("Design not found.", 404);

  const current = toApiDesignBuilderStage(design.builderStage);
  validateStageComplete(design, current);

  const next = nextBuilderStage(current);
  if (!next) {
    throw new DesignError("Design builder is already complete.", 400);
  }

  const now = new Date();
  const stageData: Partial<{
    builderStage: DbDesignBuilderStage;
    cadCompletedAt: Date;
    moldCompletedAt: Date;
    builderCompletedAt: Date;
  }> = {
    builderStage: toDbDesignBuilderStage(next),
  };

  if (current === "CAD") stageData.cadCompletedAt = now;
  if (current === "Mold Making") stageData.moldCompletedAt = now;
  if (current === "Photo") stageData.builderCompletedAt = now;

  const updated = await prisma.design.update({
    where: { id: designId },
    data: stageData,
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });

  return {
    design: toDesign(updated),
    nextStage: next,
  };
};

export const updateDesignBuilderFields = async (
  designId: string,
  input: UpdateDesignBuilderInput,
): Promise<Design> => {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new DesignError("Design not found.", 404);

  const updated = await prisma.design.update({
    where: { id: designId },
    data: {
      cadFileUrl:
        input.cadFileUrl === undefined ? undefined : input.cadFileUrl,
      moldNotes: input.moldNotes === undefined ? undefined : input.moldNotes,
      moldPhotoUrl:
        input.moldPhotoUrl === undefined ? undefined : input.moldPhotoUrl,
      finishedPhotoUrl:
        input.finishedPhotoUrl === undefined
          ? undefined
          : input.finishedPhotoUrl,
    },
    include: { elements: { orderBy: { sortOrder: "asc" } } },
  });

  return toDesign(updated);
};

const validateStageComplete = (
  design: {
    code: string;
    metal: string | null;
    purity: string | null;
    cadFileUrl: string | null;
    moldPhotoUrl: string | null;
    moldNotes: string | null;
    finishedPhotoUrl: string | null;
    elements: unknown[];
    builderStage: DbDesignBuilderStage;
  },
  stage: DesignBuilderStage,
): void => {
  switch (stage) {
    case "SKU":
      if (!design.metal || !design.purity) {
        throw new DesignError("Metal and purity are required before continuing.");
      }
      break;
    case "CAD":
      if (!design.cadFileUrl) {
        throw new DesignError("Upload a CAD file or render before continuing.");
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
      if (!design.finishedPhotoUrl) {
        throw new DesignError(
          "Upload a finished piece photo before completing.",
        );
      }
      break;
    default:
      break;
  }
};
