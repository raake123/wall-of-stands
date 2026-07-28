// Phone photos land at 2-5MB each. On Supabase's free 1GB of storage that is
// roughly 300 photos before uploads start failing, so every image is resized
// and re-encoded in the browser before it is uploaded. A typical photo drops to
// ~200-300KB with no visible loss, which is about 10x more capacity.

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
// Below this an image isn't worth re-encoding.
const SKIP_UNDER_BYTES = 300 * 1024;


function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

/**
 * Shrink an image file for upload. Anything that isn't a compressible image —
 * video, an unexpected format, a browser that can't decode it — is returned
 * untouched rather than blocking the post.
 */
export async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) return file;
  if (file.size <= SKIP_UNDER_BYTES) return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // HEIC and other formats the canvas can't decode fall through unchanged.
    return file;
  }
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  return Math.round(bytes / 1024) + "KB";
}
