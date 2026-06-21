"use client";

import { Download, FileSpreadsheet, FileText, Images } from "lucide-react";
import type { ProductionRun, ProductionRunStage } from "@/lib/types";
import {
  downloadStageCsv,
  downloadStageExcel,
  downloadStageImageFolderCsv,
  downloadStagePrintPack,
} from "@/lib/production-runs/export-stage-worksheet";

type StageWorksheetToolbarProps = {
  run: ProductionRun;
  stage: ProductionRunStage;
};

export default function StageWorksheetToolbar({
  run,
  stage,
}: StageWorksheetToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => downloadStageCsv(run, stage)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <FileText size={14} />
        CSV Worksheet
      </button>
      <button
        type="button"
        onClick={() => downloadStageExcel(run, stage)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <FileSpreadsheet size={14} />
        Excel Worksheet
      </button>
      <button
        type="button"
        onClick={() => downloadStagePrintPack(run, stage)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <Download size={14} />
        Print Pack (images)
      </button>
      <button
        type="button"
        onClick={() => downloadStageImageFolderCsv(run, stage)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50"
      >
        <Images size={14} />
        CSV + embedded images
      </button>
    </div>
  );
}
