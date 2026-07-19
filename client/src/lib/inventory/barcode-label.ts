export const LABEL_WIDTH_MM = 91;
export const LABEL_HEIGHT_MM = 12;

export type BarcodeLabelData = {
  itemCode: string;
  name: string;
  weightGrams: number;
  huid?: string;
};
