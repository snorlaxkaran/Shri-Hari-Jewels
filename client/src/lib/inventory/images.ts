export const MAX_PRODUCT_IMAGES = 8;
export const MAX_IMAGE_SIZE_MB = 5;
export const TARGET_IMAGE_WIDTH = 1200;
export const TARGET_IMAGE_HEIGHT = 1810;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PendingImage = {
  id: string;
  name: string;
  url: string;
  file?: File;
};

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Fit image into 1200×1810 (cover) and export JPEG for catalogue use. */
export const processImageFile = async (file: File): Promise<string> => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Each image must be under ${MAX_IMAGE_SIZE_MB}MB.`);
  }

  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_IMAGE_WIDTH;
  canvas.height = TARGET_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  const scale = Math.max(
    TARGET_IMAGE_WIDTH / img.width,
    TARGET_IMAGE_HEIGHT / img.height,
  );
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const offsetX = (TARGET_IMAGE_WIDTH - drawWidth) / 2;
  const offsetY = (TARGET_IMAGE_HEIGHT - drawHeight) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_IMAGE_WIDTH, TARGET_IMAGE_HEIGHT);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", 0.82);
};

export const validateImageCount = (
  current: number,
  adding: number,
): string | null => {
  if (current + adding > MAX_PRODUCT_IMAGES) {
    return `You can upload up to ${MAX_PRODUCT_IMAGES} photos per product.`;
  }
  return null;
};

/** Matches SKU0001_1.jpg — index 1–8, SKU is everything before the last _index. */
export const SKU_IMAGE_FILENAME =
  /^(.+)_([1-8])\.(jpe?g|png|webp)$/i;

export const parseSkuImageFilename = (
  filename: string,
): { sku: string; index: number } | null => {
  const base = filename.split(/[/\\]/).pop()?.trim() ?? "";
  const match = base.match(SKU_IMAGE_FILENAME);
  if (!match) return null;
  const sku = match[1].trim().toUpperCase();
  const index = Number(match[2]);
  if (!sku || index < 1 || index > MAX_PRODUCT_IMAGES) return null;
  return { sku, index };
};
