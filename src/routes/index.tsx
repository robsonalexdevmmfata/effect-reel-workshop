import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import JSZip from "jszip";
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  ImageIcon,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  Timer,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/hub/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_KINDS,
  STYLES,
  buildAssetPrompt,
  slugify,
  type AssetKind,
  type StyleId,
} from "@/lib/asset-presets";
import { generateAssetImage } from "@/lib/assets.functions";
import { toTransparentPng } from "@/lib/chroma";
import { getHub, setHub, updateAsset, useHub, type Asset } from "@/lib/hub-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gerador de Assets para Filtros · TikTok AutoHub" },
      {
        name: "description",
        content: "Gere artes e texturas PNG transparentes para filtros do Effect House com IA gratuita.",
      },
      { property: "og:title", content: "Gerador de Assets para Filtros · TikTok AutoHub" },
      {
        property: "og:description",
        content: "Gere artes e texturas PNG transparentes para filtros do Effect House com IA gratuita.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetsPage,
});

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fileNameFor(a: Asset) {
  return `${slugify(a.idea)}_${a.kind}_${a.seed}.png`;
}

function AssetsPage() {
  const assets = useHub((s) => s.assets);
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<StyleId>("vector2d");
  const [kinds, setKinds] = useState<AssetKind[]>(["main", "frame"]);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [preview, setPreview] = useState<Asset | null>(null);
  const generate = useServerFn(generateAssetImage);

  const ready = assets.filter((a) => a.status === "ready");

  async function runOne(asset: Asset): Promise<boolean> {
    // The free tier allows ~1 image every 45s, so wait and retry automatically.
    for (let attempt = 0; attempt < 5; attempt++) {
      updateAsset(asset.id, { status: "loading", error: undefined, waitUntil: undefined });
      try {
        const res = await generate({
          data: { prompt: asset.prompt, seed: asset.seed, width: 1024, height: 1024 },
        });
        if (res.dataUrl) {
          const blob = await toTransparentPng(res.dataUrl);
          updateAsset(asset.id, { status: "ready", blob, url: URL.createObjectURL(blob) });
          setHub((s) => ({ ...s, imagesGenerated: s.imagesGenerated + 1 }));
          return true;
        }
        if (res.retryAfter) {
          const waitMs = (res.retryAfter + 1) * 1000;
          updateAsset(asset.id, { status: "waiting", waitUntil: Date.now() + waitMs });
          await sleep(waitMs);
          continue;
        }
        updateAsset(asset.id, { status: "error", error: res.error ?? "Falha na geração" });
        return false;
      } catch {
        updateAsset(asset.id, { status: "error", error: "Falha de conexão" });
        return false;
      }
    }
    updateAsset(asset.id, { status: "error", error: "Fila gratuita ocupada. Tente de novo." });
    return false;
  }

  async function handleGenerate() {
    if (idea.trim().length < 3) {
      toast.error("Descreva a ideia do filtro", { description: "Use pelo menos 3 caracteres." });
      return;
    }
    if (!kinds.length) {
      toast.error("Escolha pelo menos um tipo de asset");
      return;
    }
    setBusy(true);
    const seedBase = Math.floor(Math.random() * 1_000_000_000);
    const batch: Asset[] = ASSET_KINDS.filter((k) => kinds.includes(k.kind)).map((k, i) => ({
      id: crypto.randomUUID(),
      kind: k.kind,
      label: k.label,
      style,
      idea: idea.trim(),
      prompt: buildAssetPrompt(idea, style, k.kind),
      seed: seedBase + i,
      status: "waiting",
    }));
    setHub((s) => ({ ...s, assets: [...batch, ...s.assets] }));
    toast(`Gerando ${batch.length} asset(s)…`, {
      description: "Pollinations gratuito: 1 imagem a cada ~45s. Pode sair desta aba.",
    });

    let ok = 0;
    for (const a of batch) if (await runOne(a)) ok++;
    setBusy(false);

    if (ok === batch.length)
      toast.success("Pacote pronto!", { description: `${ok} PNG(s) transparentes gerados.` });
    else if (ok > 0) toast.warning(`${ok} de ${batch.length} assets gerados`, { description: "Use “Tentar de novo” nos que falharam." });
    else toast.error("Não foi possível gerar os assets", { description: "O serviço gratuito pode estar ocupado. Tente novamente." });
  }

  async function handleRetry(a: Asset) {
    const ok = await runOne({ ...a, seed: a.seed + 7 });
    if (ok) toast.success(`${a.label} gerado`);
    else toast.error(`${a.label} falhou de novo`);
  }

  async function handleZip() {
    const list = getHub().assets.filter((a) => a.status === "ready" && a.blob);
    if (!list.length) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const root = zip.folder("effect-house-assets")!;
      const textures = root.folder("Textures")!;
      list.forEach((a) => textures.file(fileNameFor(a), a.blob!));
      root.file(
        "manifest.json",
        JSON.stringify(
          list.map((a) => ({
            file: `Textures/${fileNameFor(a)}`,
            type: a.label,
            style: STYLES.find((s) => s.id === a.style)?.label,
            idea: a.idea,
            seed: a.seed,
            size: "1024x1024",
            transparent: true,
          })),
          null,
          2,
        ),
      );
      root.file(
        "LEIA-ME.txt",
        "Como usar no Effect House:\n1. Abra seu projeto no Effect House.\n2. Arraste a pasta Textures para o painel Assets.\n3. Use as molduras em Face Mask / Image e as partículas como overlay 2D.\n",
      );
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `effect-house-pack_${slugify(list[0]?.idea ?? "filtro")}.zip`);
      toast.success("ZIP baixado", { description: `${list.length} texturas prontas para o Effect House.` });
    } catch {
      toast.error("Falha ao montar o ZIP");
    } finally {
      setZipping(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 01 · Effect House"
        title="Gerador de Assets para Filtros"
        description="Descreva a ideia do filtro, escolha o estilo e receba artes e texturas em PNG com fundo transparente, prontas para importar."
      />

      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="idea" className="text-sm font-semibold">
              Prompt da Ideia / Tema do Filtro
            </Label>
            <Textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Ex.: Máscara de gato astronauta com capacete de vidro e estrelas"
              className="min-h-[148px] resize-none bg-background/60 text-base"
              maxLength={300}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy) handleGenerate();
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ctrl + Enter para gerar</span>
              <span className="font-mono">{idea.length}/300</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Estilo visual</Label>
            <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
              {STYLES.map((s) => {
                const active = s.id === style;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      active
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border bg-background/40 hover:border-primary/50",
                    )}
                  >
                    <p className={cn("text-sm font-semibold", active && "text-primary")}>{s.label}</p>
                    <p className="mt-1 text-xs leading-snug text-muted-foreground">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Tipos de asset</p>
            <div className="flex flex-wrap gap-2">
              {ASSET_KINDS.map((k) => {
                const on = kinds.includes(k.kind);
                return (
                  <button
                    key={k.kind}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setKinds((prev) => (on ? prev.filter((x) => x !== k.kind) : [...prev, k.kind]))
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      on
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on && <Check className="size-3" />}
                    {k.label}
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="size-3.5" />
              Tempo estimado: ~{Math.max(1, Math.ceil((kinds.length * 45) / 60))} min no plano gratuito
            </p>
          </div>
          <Button variant="neon" size="lg" onClick={handleGenerate} disabled={busy} className="h-12 px-6">
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {busy ? "Gerando artes…" : "Gerar Artes e Texturas (PNG Transparent)"}
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Layers className="size-5 text-primary" />
            <h2 className="text-xl font-bold">Resultados</h2>
            <Badge variant="secondary" className="font-mono">
              {ready.length} prontos
            </Badge>
          </div>
          <div className="flex gap-2">
            {assets.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setHub((s) => ({ ...s, assets: [] }));
                  toast("Resultados limpos");
                }}
              >
                <Trash2 /> Limpar
              </Button>
            )}
            <Button variant="outline" onClick={handleZip} disabled={!ready.length || zipping}>
              {zipping ? <Loader2 className="animate-spin" /> : <Package />}
              Baixar Pacote ZIP para o Effect House
            </Button>
          </div>
        </div>

        {assets.length === 0 ? (
          <EmptyGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {assets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onPreview={() => setPreview(a)}
                onDownload={() => {
                  if (a.blob) {
                    downloadBlob(a.blob, fileNameFor(a));
                    toast.success("PNG baixado", { description: fileNameFor(a) });
                  }
                }}
                onRetry={() => handleRetry(a)}
                busy={busy}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.label}</DialogTitle>
          </DialogHeader>
          {preview?.url && (
            <div className="space-y-4">
              <div className="bg-checker overflow-hidden rounded-xl border border-border">
                <img src={preview.url} alt={`${preview.label}: ${preview.idea}`} className="mx-auto max-h-[60vh] w-auto" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  1024×1024 · PNG transparente · seed <span className="font-mono">{preview.seed}</span>
                </p>
                <Button
                  onClick={() => {
                    if (preview.blob) downloadBlob(preview.blob, fileNameFor(preview));
                    toast.success("PNG baixado");
                  }}
                >
                  <Download /> Baixar PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyGrid() {
  return (
    <div className="relative grid grid-cols-2 gap-4 md:grid-cols-4">
      {ASSET_KINDS.map((k) => (
        <div
          key={k.kind}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/30 p-4 text-center"
        >
          <ImageIcon className="size-7 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
        </div>
      ))}
      <p className="col-span-full text-center text-sm text-muted-foreground">
        <Sparkles className="mr-1 inline size-4 text-primary" />
        Escreva uma ideia acima e gere seu primeiro pacote de texturas.
      </p>
    </div>
  );
}

function AssetCard({
  asset,
  onPreview,
  onDownload,
  onRetry,
  busy,
}: {
  asset: Asset;
  onPreview: () => void;
  onDownload: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  const styleLabel = STYLES.find((s) => s.id === asset.style)?.label;
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50">
      <div className="bg-checker relative aspect-square">
        {asset.status === "waiting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-4 text-center">
            <Timer className="size-6 text-warning" />
            {asset.waitUntil ? (
              <>
                <Countdown until={asset.waitUntil} />
                <p className="text-[11px] text-muted-foreground">Fila do plano gratuito</p>
              </>
            ) : (
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Na fila</p>
            )}
          </div>
        )}
        {asset.status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden bg-background/70">
            <div className="absolute inset-x-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-primary/15 to-transparent" />
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Renderizando</p>
          </div>
        )}
        {asset.status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-4 text-center">
            <AlertTriangle className="size-6 text-destructive" />
            <p className="text-xs text-muted-foreground">{asset.error}</p>
            <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
              <RefreshCw /> Tentar de novo
            </Button>
          </div>
        )}
        {asset.status === "ready" && asset.url && (
          <>
            <img
              src={asset.url}
              alt={`${asset.label}: ${asset.idea}`}
              className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-background/90 via-transparent p-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <Button size="icon" variant="secondary" onClick={onPreview} aria-label="Visualizar">
                <Eye />
              </Button>
              <Button size="icon" onClick={onDownload} aria-label="Baixar PNG">
                <Download />
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="truncate text-sm font-semibold">{asset.label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {styleLabel} · {asset.idea}
        </p>
      </div>
    </div>
  );
}

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return <p className="font-mono text-lg font-bold text-warning">{left}s</p>;
}
