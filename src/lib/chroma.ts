/**
 * Background removal for generated assets: flood-fills from the image border,
 * clearing every connected pixel close to the sampled background colour, then
 * feathers the edge. Works for any flat background (white, green, grey).
 */
export function removeFlatBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance = 36,
): Uint8ClampedArray {
  const total = width * height;
  const at = (p: number, c: number) => data[p * 4 + c] ?? 0;

  // Sample border colour (average of the four edges).
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (p: number) => {
    r += at(p, 0); g += at(p, 1); b += at(p, 2); n++;
  };
  for (let x = 0; x < width; x++) {
    sample(x);
    sample((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    sample(y * width);
    sample(y * width + width - 1);
  }
  const bg = [r / n, g / n, b / n] as const;
  const dist = (p: number) =>
    Math.hypot(at(p, 0) - bg[0], at(p, 1) - bg[1], at(p, 2) - bg[2]);

  const removed = new Uint8Array(total);
  const stack: number[] = [];
  const push = (p: number) => {
    if (!removed[p] && dist(p) <= tolerance) {
      removed[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (p >= width) push(p - width);
    if (p < total - width) push(p + width);
  }

  for (let p = 0; p < total; p++) {
    if (removed[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    // Feather pixels touching the removed area.
    const x = p % width;
    const edge =
      (x > 0 && removed[p - 1]) ||
      (x < width - 1 && removed[p + 1]) ||
      (p >= width && removed[p - width]) ||
      (p < total - width && removed[p + width]);
    if (edge) {
      const d = dist(p);
      if (d < tolerance * 2) {
        data[p * 4 + 3] = Math.round((at(p, 3) * (d - tolerance)) / tolerance);
      }
    }
  }
  return data;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

/** Converts a generated image (data URL) into a transparent PNG blob. */
export async function toTransparentPng(dataUrl: string): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  removeFlatBackground(frame.data, canvas.width, canvas.height);
  ctx.putImageData(frame, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao exportar PNG"))), "image/png"),
  );
}
