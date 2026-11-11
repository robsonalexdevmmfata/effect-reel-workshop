import { describe, expect, it } from "vitest";
import { removeGreenBackground } from "@/lib/chroma";
import { OUTPUT_VERTICAL, buildStages, outputFileName } from "@/lib/video-pipeline";

describe("transparent PNG chroma key", () => {
  it("makes pure green background pixels fully transparent", () => {
    const px = new Uint8ClampedArray([0, 255, 0, 255]);
    removeGreenBackground(px);
    expect(px[3]).toBe(0);
  });

  it("keeps non-green subject pixels opaque", () => {
    const px = new Uint8ClampedArray([254, 44, 85, 255]);
    removeGreenBackground(px);
    expect(px[3]).toBe(255);
  });
});

describe("video output", () => {
  it("vertical output is 1080x1920", () => {
    expect(OUTPUT_VERTICAL).toMatchObject({ width: 1080, height: 1920 });
  });

  it("includes silence removal and Whisper captions only when enabled", () => {
    const off = buildStages({ removeSilence: false, captions: false, vertical: true });
    expect(off.some((s) => s.includes("Auto-Editor"))).toBe(false);
    expect(off.some((s) => s.includes("Whisper"))).toBe(false);
    const on = buildStages({ removeSilence: true, captions: true, vertical: true });
    expect(on.some((s) => s.includes("Auto-Editor"))).toBe(true);
    expect(on.some((s) => s.includes("Whisper"))).toBe(true);
  });

  it("names the exported file as mp4 with the 9x16 tag", () => {
    expect(outputFileName("gravacao.mov", { removeSilence: true, captions: true, vertical: true })).toBe(
      "gravacao_autohub_cut_legendas_9x16.mp4",
    );
  });
});
