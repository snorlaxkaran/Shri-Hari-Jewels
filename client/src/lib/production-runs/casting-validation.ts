import type { ProductionRunItem } from "@/lib/types";

export function getCastingReceivedError(
  item: ProductionRunItem,
  draft: {
    metalLotId: string;
    metalWeightGrams: string;
    stoneLotId: string;
    czWeight: string;
  },
): string | null {
  if (item.rawMaterialDeducted || item.castingReceived) return null;

  const needsMetalLot = item.elementType === "Casting";
  const needsStoneLot =
    item.elementType === "Stone" || item.elementType === "Motif";

  if (needsMetalLot) {
    const missingLot = draft.metalLotId === "";
    const missingWeight =
      draft.metalWeightGrams === "" || parseFloat(draft.metalWeightGrams) <= 0;
    if (missingLot && missingWeight) {
      return "Select a metal lot and enter metal weight (g) before marking casting received.";
    }
    if (missingLot) return "Select a metal lot before marking casting received.";
    if (missingWeight) return "Enter metal weight (g) before marking casting received.";
    return null;
  }

  if (needsStoneLot) {
    const missingLot = draft.stoneLotId === "";
    const missingWeight = draft.czWeight === "" || parseFloat(draft.czWeight) <= 0;
    if (missingLot && missingWeight) {
      return "Select a stone lot and enter CZ weight (ct) before marking casting received.";
    }
    if (missingLot) return "Select a stone lot before marking casting received.";
    if (missingWeight) return "Enter CZ weight (ct) before marking casting received.";
    return null;
  }

  return null;
}
