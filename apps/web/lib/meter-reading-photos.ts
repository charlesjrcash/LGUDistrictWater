import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_METER_READING_PHOTO_BYTES = 5 * 1024 * 1024;

const imageTypes = {
  "image/jpeg": { extension: ".jpg", signature: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: ".png", signature: (bytes: Uint8Array) => bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a },
  "image/webp": { extension: ".webp", signature: (bytes: Uint8Array) => bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
} as const;

export type MeterReadingPhotoMimeType = keyof typeof imageTypes;

function isInside(base: string, target: string) {
  const relative = path.relative(base, target);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

export function meterReadingPhotoStorageRoot() {
  return path.resolve(process.env.METER_READING_PHOTO_STORAGE_PATH || path.join(process.cwd(), "storage"));
}

export function meterReadingPhotoDirectory() {
  return path.join(meterReadingPhotoStorageRoot(), "meter-reading-photos");
}

export function photoTypeForUpload(file: File, bytes: Uint8Array): MeterReadingPhotoMimeType | null {
  if (!(file.type in imageTypes)) return null;
  const mimeType = file.type as MeterReadingPhotoMimeType;
  return imageTypes[mimeType].signature(bytes) ? mimeType : null;
}

export function mimeTypeForStoredPhoto(filePath: string): MeterReadingPhotoMimeType | null {
  const extension = path.extname(filePath).toLowerCase();
  return (Object.entries(imageTypes).find(([, value]) => value.extension === extension)?.[0] as MeterReadingPhotoMimeType | undefined) ?? null;
}

export async function storeMeterReadingPhoto(readingId: string, mimeType: MeterReadingPhotoMimeType, bytes: Uint8Array) {
  const now = new Date();
  const folder = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  const fileName = `reading-${readingId}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${randomUUID()}${imageTypes[mimeType].extension}`;
  const filePath = path.join(meterReadingPhotoDirectory(), folder, fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" });
  return { fileName, filePath, storageReference: path.posix.join("meter-reading-photos", ...folder.split(path.sep), fileName) };
}

export async function removeStoredMeterReadingPhoto(filePath: string) {
  if (!isInside(meterReadingPhotoDirectory(), path.resolve(filePath))) return;
  try { await unlink(filePath); } catch (error: unknown) { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error; }
}

export async function readStoredMeterReadingPhoto(storageReference: string) {
  const allowedDirectory = meterReadingPhotoDirectory();
  const normalizedReference = storageReference.replace(/\\/g, "/");
  if (!normalizedReference.startsWith("meter-reading-photos/")) return null;
  const filePath = path.resolve(meterReadingPhotoStorageRoot(), normalizedReference);
  if (!isInside(allowedDirectory, filePath)) return null;
  const mimeType = mimeTypeForStoredPhoto(filePath);
  if (!mimeType) return null;
  return { bytes: await readFile(filePath), mimeType };
}
