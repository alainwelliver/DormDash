// dormdash/lib/api/storage.ts
import { supabase } from "../supabase";

/** Infer extension from a local URI (handles querystrings). */
function guessExt(uri: string) {
  const m = uri.match(/\.(\w+)(?:\?|$)/);
  return (m ? m[1] : "jpg").toLowerCase();
}

/** Map common extensions to MIME. */
function guessMime(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

/**
 * Upload a local image to Supabase Storage and return a URL.
 * Assumes a PUBLIC bucket named "listings". If your bucket is private,
 * switch to createSignedUrl where indicated.
 */
export async function uploadImage(
  localUri: string,
  listingId: number,
  ix: number,
) {
  const ext = guessExt(localUri);
  const contentType = guessMime(ext);
  const key = `${listingId}/${Date.now()}_${ix}.${ext}`;
  const BUCKET = "listings"; // must match your bucket id exactly

  // In Expo, fetch(file://...) -> blob works. If using non-file URIs that fail,
  // switch to FileSystem.readAsStringAsync + Blob creation.
  const res = await fetch(localUri);
  const blob = await res.blob();

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(key, blob, { upsert: false, contentType });
  if (upErr) throw upErr;

  // PUBLIC bucket:
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return pub.publicUrl;
}
