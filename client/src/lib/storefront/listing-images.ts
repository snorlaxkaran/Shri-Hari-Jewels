import { processImageFile } from "@/lib/inventory/images";

export const MAX_LISTING_IMAGES_PER_SKU = 8;
export const MIN_LISTING_IMAGES_TO_PUBLISH = 1;

const LISTING_IMAGE_NAME = /^([A-Za-z0-9][A-Za-z0-9._-]*)_([1-8])\.(jpe?g|png)$/i;

export type ParsedListingImageFile = {
  sku: string;
  slot: number;
  file: File;
};

export const parseListingImageFileName = (fileName: string): { sku: string; slot: number } | null => {
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const match = base.match(LISTING_IMAGE_NAME);
  if (!match) return null;
  return { sku: match[1], slot: Number(match[2]) };
};

export const groupListingImageFiles = (
  files: File[],
): { parsed: ParsedListingImageFile[]; invalid: string[] } => {
  const parsed: ParsedListingImageFile[] = [];
  const invalid: string[] = [];
  const slotBySku = new Map<string, Set<number>>();

  for (const file of files) {
    const info = parseListingImageFileName(file.name);
    if (!info) {
      invalid.push(file.name);
      continue;
    }
    const key = info.sku.toLocaleLowerCase();
    const slots = slotBySku.get(key) ?? new Set<number>();
    if (slots.has(info.slot)) {
      invalid.push(`${file.name} (duplicate slot)`);
      continue;
    }
    if (slots.size >= MAX_LISTING_IMAGES_PER_SKU) {
      invalid.push(`${file.name} (max ${MAX_LISTING_IMAGES_PER_SKU} per SKU)`);
      continue;
    }
    slots.add(info.slot);
    slotBySku.set(key, slots);
    parsed.push({ sku: info.sku, slot: info.slot, file });
  }

  return { parsed, invalid };
};

export const buildListingImagePayload = async (
  files: ParsedListingImageFile[],
): Promise<Array<{ sku: string; slot: number; url: string; name: string }>> => {
  const out: Array<{ sku: string; slot: number; url: string; name: string }> = [];
  for (const item of files) {
    const url = await processImageFile(item.file);
    out.push({
      sku: item.sku,
      slot: item.slot,
      url,
      name: `${item.sku}_${item.slot}`,
    });
  }
  return out;
};
