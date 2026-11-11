import { describe, expect, it } from "vitest";
import { removeFlatBackground } from "@/lib/chroma";
import { OUTPUT_VERTICAL, buildStages, outputFileName } from "@/lib/video-pipeline";

describe("transparent PNG background removal", () => {
  // 5x5 white image with a 1px red subject in the centre.
  function image() {
    const px = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    const c = (2 * 5 + 2) * 4;
    px[c + 1] = 0;
    px[c + 2] = 0;
    return px;
  }

  it("makes the flat background fully transparent", () => {
    const px = removeFlatBackground(image(), 5, 5);
    expect(px[3]).toBe(0);
    expect(px[(4 * 5 + 4) * 4 + 3]).toBe(0);
  });

  it("keeps the subject opaque", () => {
    const px = removeFlatBackground(image(), 5, 5);
    expect(px[(2 * 5 + 2) * 4 + 3]).toBe(255);
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
