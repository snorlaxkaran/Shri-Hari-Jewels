import type { ProductionRunStage } from "./stages.js";

export type StageWorksheetMode =
  | "wax"
  | "casting"
  | "stone-setting"
  | "checkoff"
  | "confirm";

export type StageWorksheetConfig = {
  mode: StageWorksheetMode;
  instructions: string;
  checkoffStage?: ProductionRunStage;
  exportHint: string;
};

export const STAGE_WORKSHEET_CONFIG: Record<
  ProductionRunStage,
  StageWorksheetConfig
> = {
  "Wax Pattern": {
    mode: "wax",
    instructions:
      "Enter wax mould counts for each element. Reference motif images and quantities before sending to casting.",
    exportHint: "Wax mould worksheet with motif references",
  },
  Casting: {
    mode: "casting",
    instructions:
      "Assign metal/stone lots and mark casting elements as received. Motif images show what each piece should look like.",
    exportHint: "Casting worksheet with lot assignments",
  },
  Cleaning: {
    mode: "checkoff",
    checkoffStage: "Cleaning",
    instructions:
      "Sprue cut and clean each element. Check off every row when the piece is ready for assembly.",
    exportHint: "Cleaning checklist with motif images",
  },
  Assembly: {
    mode: "checkoff",
    checkoffStage: "Assembly",
    instructions:
      "Solder, file, and assemble each element. Mark complete when the piece matches the motif reference.",
    exportHint: "Assembly checklist with motif images",
  },
  Prepolish: {
    mode: "checkoff",
    checkoffStage: "Prepolish",
    instructions:
      "Prepolish each element to remove tool marks. Check off when surface prep is done.",
    exportHint: "Prepolish checklist with motif images",
  },
  "Stone Setting": {
    mode: "stone-setting",
    instructions:
      "Record CZ stone counts and weights for stone/motif elements using the reference images.",
    exportHint: "Stone setting worksheet with motif images",
  },
  "Final Polishing": {
    mode: "checkoff",
    checkoffStage: "Final Polishing",
    instructions:
      "Final polish each element to showroom finish. Check off when lustre matches the finished reference.",
    exportHint: "Final polish checklist with motif images",
  },
  Plating: {
    mode: "checkoff",
    checkoffStage: "Plating",
    instructions:
      "Plate each element as required. Mark complete when plating passes visual inspection.",
    exportHint: "Plating checklist with motif images",
  },
  "Quality Check": {
    mode: "checkoff",
    checkoffStage: "Quality Check",
    instructions:
      "Inspect each element against the motif and finished design photos. Check off approved pieces.",
    exportHint: "QC checklist with motif and design references",
  },
  Packaging: {
    mode: "checkoff",
    checkoffStage: "Packaging",
    instructions:
      "Pack each element for dispatch. Check off when labelled and protected for storage or shipment.",
    exportHint: "Packaging checklist with motif images",
  },
};

export const CHECKOFF_STAGES: ProductionRunStage[] = (
  Object.entries(STAGE_WORKSHEET_CONFIG) as Array<
    [ProductionRunStage, StageWorksheetConfig]
  >
)
  .filter(([, cfg]) => cfg.mode === "checkoff" && cfg.checkoffStage)
  .map(([, cfg]) => cfg.checkoffStage!);
