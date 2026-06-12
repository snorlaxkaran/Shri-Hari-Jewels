export const MAX_PRODUCT_IMAGES = 6;
export const MAX_IMAGE_SIZE_MB = 5;
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

/** Resize and compress for localStorage-friendly storage */
export const processImageFile = async (file: File): Promise<string> => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Each image must be under ${MAX_IMAGE_SIZE_MB}MB.`);
  }

  const dataUrl = await readFile(file);
  const img = await loadImage(dataUrl);

  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
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
