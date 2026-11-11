export type StyleId = "vector2d" | "cyberpunk" | "roleta" | "glowup";

export const STYLES: { id: StyleId; label: string; hint: string; descriptor: string }[] = [
  {
    id: "vector2d",
    label: "Vector 2D Transparent",
    hint: "Flat, contornos limpos, cores chapadas",
    descriptor:
      "flat 2D vector illustration, bold clean outlines, solid flat colors, sticker style, crisp edges",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk Mask",
    hint: "Neon ciano e rosa, peças metálicas",
    descriptor:
      "cyberpunk face mask, futuristic chrome and holographic plates, neon cyan and hot pink lights, high detail",
  },
  {
    id: "roleta",
    label: "Funny Roleta",
    hint: "Roleta de cartas, cores vibrantes",
    descriptor:
      "funny cartoon randomizer wheel game element, playful bold colors, thick outlines, comic style",
  },
  {
    id: "glowup",
    label: "Glow-up Effect",
    hint: "Brilhos, sparkles e partículas",
    descriptor:
      "beauty glow-up sparkles, golden and pink shimmering light particles, soft bloom, magical aesthetic",
  },
];

export type AssetKind = "main" | "frame" | "sticker" | "particles";

export const ASSET_KINDS: { kind: AssetKind; label: string; extra: string }[] = [
  { kind: "main", label: "Arte Principal", extra: "main hero element, single centered subject" },
  {
    kind: "frame",
    label: "Moldura de Rosto",
    extra: "decorative face frame border around an empty center, symmetric",
  },
  {
    kind: "sticker",
    label: "Sticker / Ícone",
    extra: "small cute sticker icon with thick white outline, single centered object",
  },
  {
    kind: "particles",
    label: "Textura de Partículas",
    extra: "scattered decorative particles and small shapes overlay, evenly spread",
  },
];

export function buildAssetPrompt(idea: string, style: StyleId, kind: AssetKind): string {
  const s = STYLES.find((x) => x.id === style)!;
  const k = ASSET_KINDS.find((x) => x.kind === kind)!;
  return [
    idea.trim(),
    s.descriptor,
    k.extra,
    "isolated game asset for an AR face filter",
    "flat solid pure chroma green background #00FF00, no green in the subject, no shadow, no text",
  ].join(", ");
}

export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "filtro"
  );
}
