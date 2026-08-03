import { ACCEPTED_IMAGE_TYPES } from "@/lib/inventory/images";

export const BANNER_SLOT_COUNT = 4;
export const HERO_BANNER_ASPECT = 2.5;
export const HERO_BANNER_EXPORT_WIDTH = 1920;
export const HERO_BANNER_EXPORT_HEIGHT = Math.round(
  HERO_BANNER_EXPORT_WIDTH / HERO_BANNER_ASPECT,
);
export const MAX_BANNER_FILE_MB = 8;

export type BannerCropState = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const readFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const loadBannerImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });

export const readBannerFile = async (file: File): Promise<string> => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }
  if (file.size > MAX_BANNER_FILE_MB * 1024 * 1024) {
    throw new Error(`Each banner must be under ${MAX_BANNER_FILE_MB}MB.`);
  }
  return readFile(file);
};

export const getCoverScale = (
  imgWidth: number,
  imgHeight: number,
  frameWidth: number,
  frameHeight: number,
): number => Math.max(frameWidth / imgWidth, frameHeight / imgHeight);

export const createInitialCropState = (
  img: HTMLImageElement,
  frameWidth: number,
  frameHeight: number,
  zoom = 1,
): BannerCropState => {
  const scale = getCoverScale(img.width, img.height, frameWidth, frameHeight) * zoom;
  const offsetX = (frameWidth - img.width * scale) / 2;
  const offsetY = (frameHeight - img.height * scale) / 2;
  return clampCropOffset(img.width, img.height, scale, frameWidth, frameHeight, offsetX, offsetY);
};

export const clampCropOffset = (
  imgWidth: number,
  imgHeight: number,
  scale: number,
  frameWidth: number,
  frameHeight: number,
  offsetX: number,
  offsetY: number,
): BannerCropState => {
  const displayWidth = imgWidth * scale;
  const displayHeight = imgHeight * scale;

  const minX = Math.min(0, frameWidth - displayWidth);
  const minY = Math.min(0, frameHeight - displayHeight);

  return {
    scale,
    offsetX: Math.min(0, Math.max(minX, offsetX)),
    offsetY: Math.min(0, Math.max(minY, offsetY)),
  };
};

export const applyZoom = (
  img: HTMLImageElement,
  frameWidth: number,
  frameHeight: number,
  current: BannerCropState,
  zoom: number,
): BannerCropState => {
  const baseScale = getCoverScale(img.width, img.height, frameWidth, frameHeight);
  const nextScale = baseScale * zoom;
  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;
  const imageCenterX = centerX - current.offsetX;
  const imageCenterY = centerY - current.offsetY;
  const ratio = nextScale / current.scale;
  const nextOffsetX = centerX - imageCenterX * ratio;
  const nextOffsetY = centerY - imageCenterY * ratio;
  return clampCropOffset(
    img.width,
    img.height,
    nextScale,
    frameWidth,
    frameHeight,
    nextOffsetX,
    nextOffsetY,
  );
};

export const exportBannerCrop = (
  img: HTMLImageElement,
  frameWidth: number,
  frameHeight: number,
  crop: BannerCropState,
): string => {
  const sourceX = -crop.offsetX / crop.scale;
  const sourceY = -crop.offsetY / crop.scale;
  const sourceWidth = frameWidth / crop.scale;
  const sourceHeight = frameHeight / crop.scale;

  const canvas = document.createElement("canvas");
  canvas.width = HERO_BANNER_EXPORT_WIDTH;
  canvas.height = HERO_BANNER_EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare banner export.");

  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    HERO_BANNER_EXPORT_WIDTH,
    HERO_BANNER_EXPORT_HEIGHT,
  );

  return canvas.toDataURL("image/jpeg", 0.88);
};

export const padBannerSlots = (
  urls: string[] | undefined | null,
  legacyUrl?: string | null,
): string[] => {
  const filled =
    urls && urls.length > 0
      ? urls.filter(Boolean)
      : legacyUrl?.trim()
        ? [legacyUrl.trim()]
        : [];
  return [...filled, ...Array(BANNER_SLOT_COUNT).fill("")].slice(0, BANNER_SLOT_COUNT) as string[];
};
