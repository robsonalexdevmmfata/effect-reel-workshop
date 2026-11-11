import type { VideoOptions } from "./hub-store";

export const OUTPUT_VERTICAL = { width: 1080, height: 1920, label: "Vertical 9:16 · 1080x1920" };

export function buildStages(options: VideoOptions): string[] {
  const stages = ["Analisando áudio e vídeo"];
  if (options.removeSilence) stages.push("Removendo silêncios (Auto-Editor)");
  if (options.captions) stages.push("Transcrevendo com Whisper", "Aplicando legendas estilo CapCut");
  if (options.vertical) stages.push(`Reenquadrando para ${OUTPUT_VERTICAL.width}x${OUTPUT_VERTICAL.height}`);
  stages.push("Exportando MP4");
  return stages;
}

export function outputFileName(original: string, options: VideoOptions): string {
  const base = original.replace(/\.[^.]+$/, "");
  const tags = [options.removeSilence && "cut", options.captions && "legendas", options.vertical && "9x16"]
    .filter(Boolean)
    .join("_");
  return `${base}_autohub${tags ? `_${tags}` : ""}.mp4`;
}

/** Estimated seconds cut by silence removal (~18% of a typical screen recording). */
export function estimateSavedSeconds(duration: number, removeSilence: boolean): number {
  return removeSilence ? Math.round(duration * 0.18) : 0;
}
