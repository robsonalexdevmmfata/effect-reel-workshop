/**
 * Removes a pure-green chroma background from RGBA pixel data in place.
 * Pixels whose green channel dominates red/blue become transparent; edge
 * pixels get partial alpha and green spill removed.
 */
export function removeGreenBackground(data: Uint8ClampedArray): Uint8ClampedArray {
  const HARD = 70; // green dominance that becomes fully transparent
  const SOFT = 28; // dominance where feathering starts
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const maxRB = Math.max(r, b);
    const diff = g - maxRB;
    if (diff >= HARD && g > 90) {
      data[i + 3] = 0;
    } else if (diff > SOFT) {
      const t = (diff - SOFT) / (HARD - SOFT);
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      data[i + 1] = maxRB; // despill
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

/** Converts a data URL on a green background into a transparent PNG blob. */
export async function toTransparentPng(dataUrl: string): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  removeGreenBackground(frame.data);
  ctx.putImageData(frame, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao exportar PNG"))), "image/png"),
  );
}
