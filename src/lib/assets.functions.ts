import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(3).max(900),
  seed: z.number().int().min(0).max(2_000_000_000),
  width: z.number().int().min(256).max(1280),
  height: z.number().int().min(256).max(1280),
});

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Fetches a free Pollinations image server-side (the service blocks browser-origin requests). */
export const generateAssetImage = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ dataUrl: string | null; error: string | null }> => {
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(data.prompt)}` +
      `?width=${data.width}&height=${data.height}&seed=${data.seed}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (AutoHub)" },
        signal: AbortSignal.timeout(110_000),
      });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) {
        console.error("pollinations failed", res.status, (await res.text()).slice(0, 200));
        return {
          dataUrl: null,
          error: res.status === 429 ? "Limite gratuito atingido, tente em instantes." : "Serviço de imagem indisponível.",
        };
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      return { dataUrl: `data:${type};base64,${toBase64(bytes)}`, error: null };
    } catch (err) {
      console.error("pollinations error", err);
      return { dataUrl: null, error: "Tempo esgotado ao gerar a imagem." };
    }
  });
