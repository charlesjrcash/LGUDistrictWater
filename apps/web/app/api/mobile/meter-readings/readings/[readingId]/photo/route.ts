import { db } from "@/lib/db";
import { decimal, fail, id, localTimestamp, localTimestampValue, text } from "@/lib/mobile-meter-readings";
import { MAX_METER_READING_PHOTO_BYTES, photoTypeForUpload, removeStoredMeterReadingPhoto, storeMeterReadingPhoto } from "@/lib/meter-reading-photos";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

type Context = { params: Promise<{ readingId: string }> };

function invalidCoordinates(latitude: string | null, longitude: string | null) {
  return (latitude !== null && (Number(latitude) < -90 || Number(latitude) > 90)) || (longitude !== null && (Number(longitude) < -180 || Number(longitude) > 180));
}

export async function POST(request: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_EDIT");
  if (auth.response) return auth.response;
  const readingId = id((await params).readingId);
  if (!readingId) return fail("READING_NOT_FOUND", 404);

  let form: FormData;
  try { form = await request.formData(); } catch { return fail("Invalid multipart photo upload.", 400); }
  const photo = form.get("photo");
  if (!(photo instanceof File)) return fail("A meter photo is required.", 400);
  if (photo.size > MAX_METER_READING_PHOTO_BYTES) return fail("PHOTO_TOO_LARGE", 413);
  const photoType = text(form.get("photoType"), 30).toUpperCase() || "METER";
  if (photoType !== "METER") return fail("UNSUPPORTED_PHOTO_TYPE", 400);
  const capturedAtInput = form.get("capturedAt");
  const capturedAt = capturedAtInput === null || capturedAtInput === "" ? null : localTimestamp(capturedAtInput);
  if (capturedAtInput !== null && capturedAtInput !== "" && !capturedAt) return fail("capturedAt must be a local timestamp.", 400);
  const latitudeInput = form.get("latitude"), longitudeInput = form.get("longitude");
  const latitude = latitudeInput === null || latitudeInput === "" ? null : decimal(latitudeInput, { allowNegative: true });
  const longitude = longitudeInput === null || longitudeInput === "" ? null : decimal(longitudeInput, { allowNegative: true });
  if ((latitudeInput !== null && latitudeInput !== "" && !latitude) || (longitudeInput !== null && longitudeInput !== "" && !longitude) || invalidCoordinates(latitude, longitude)) return fail("Photo GPS coordinates are invalid.", 400);

  const exists = await db.query("SELECT 1 FROM meter_readings WHERE reading_id=$1", [readingId]);
  if (!exists.rows[0]) return fail("READING_NOT_FOUND", 404);
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const mimeType = photoTypeForUpload(photo, bytes);
  if (!mimeType) return fail("UNSUPPORTED_PHOTO_TYPE", 400);

  let saved: Awaited<ReturnType<typeof storeMeterReadingPhoto>> | null = null;
  try {
    saved = await storeMeterReadingPhoto(readingId, mimeType, bytes);
    const result = await db.query(`INSERT INTO meter_reading_photos(reading_id,photo_type,file_name,file_path,captured_at,latitude,longitude,created_by)
      VALUES($1,$2,$3,$4,$5::timestamp without time zone,$6::numeric,$7::numeric,$8)
      RETURNING reading_photo_id::text AS "readingPhotoId",reading_id::text AS "readingId",photo_type AS "photoType",file_name AS "fileName",captured_at AS "capturedAt",latitude::text AS latitude,longitude::text AS longitude,uploaded_at AS "uploadedAt"`,
      [readingId, photoType, saved.fileName, saved.storageReference, capturedAt, latitude, longitude, auth.user.userId]);
    const row = result.rows[0];
    return Response.json({ success: true, data: { ...row, capturedAt: localTimestampValue(row.capturedAt), uploadedAt: localTimestampValue(row.uploadedAt) } }, { status: 201 });
  } catch (error) {
    if (saved) { try { await removeStoredMeterReadingPhoto(saved.filePath); } catch (cleanupError) { console.error("Unable to remove failed meter photo upload:", cleanupError); } }
    console.error("Unable to save meter reading photo:", error);
    return fail("Unable to save meter photo.", 500);
  }
}
