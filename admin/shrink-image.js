// Downscale and re-encode a photo in the browser before it is uploaded, so the
// repository and the public page never carry camera-original file sizes.
// Drafted by the local Ollama fleet (qwen2.5-coder:7b), reviewed and fixed here.
export async function shrinkImage(file, { maxDimension = 2000, quality = 0.82, keepIfUnderBytes = 600 * 1024 } = {}) {
  if (!file?.type?.startsWith('image/')) return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // formats the browser cannot decode go up unchanged; the server caps the size
  }
  const { width, height } = bitmap;
  const scale = Math.min(maxDimension / Math.max(width, height), 1);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  if (newWidth === width && newHeight === height && file.size <= keepIfUnderBytes) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, newWidth, newHeight);
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size >= file.size) resolve(file);
      else resolve(new File([blob], file.name.replace(/\.[^./]*$/, '') + '.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', quality);
  });
}
