import { db } from "@/lib/db";
import { fail, id } from "@/lib/mobile-meter-readings";
import { readStoredMeterReadingPhoto } from "@/lib/meter-reading-photos";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
type Context = { params: Promise<{ photoId: string }> };

export async function GET(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_READING_VIEW");
  if (auth.response) return auth.response;
  const photoId = id((await params).photoId);
  if (!photoId) return fail("PHOTO_NOT_FOUND", 404);
  try {
    const result = await db.query<{ file_path: string }>("SELECT file_path FROM meter_reading_photos WHERE reading_photo_id=$1", [photoId]);
    if (!result.rows[0]) return fail("PHOTO_NOT_FOUND", 404);
    let photo;
    try { photo = await readStoredMeterReadingPhoto(result.rows[0].file_path); } catch { return fail("PHOTO_FILE_MISSING", 500); }
    if (!photo) return fail("PHOTO_FILE_MISSING", 500);
    return new Response(photo.bytes, { headers: { "Content-Type": photo.mimeType, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { console.error("Unable to load meter reading photo:", error); return fail("Unable to load meter photo.", 500); }
}
