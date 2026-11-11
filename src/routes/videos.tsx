import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clapperboard,
  Download,
  FileVideo,
  History,
  Loader2,
  Play,
  Scissors,
  Smartphone,
  Subtitles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/hub/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  formatBytes,
  formatDuration,
  getHub,
  setHub,
  updateVideo,
  useHub,
  type VideoJob,
  type VideoOptions,
} from "@/lib/hub-store";
import { cn } from "@/lib/utils";
import {
  OUTPUT_VERTICAL,
  buildStages,
  estimateSavedSeconds,
  outputFileName,
} from "@/lib/video-pipeline";

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: [
      { title: "Processador de Vídeos & Legendas · TikTok AutoHub" },
      {
        name: "description",
        content: "Corte silêncios, gere legendas estilo CapCut e exporte vídeos verticais 1080x1920 automaticamente.",
      },
      { property: "og:title", content: "Processador de Vídeos & Legendas · TikTok AutoHub" },
      {
        property: "og:description",
        content: "Corte silêncios, gere legendas estilo CapCut e exporte vídeos verticais 1080x1920 automaticamente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideosPage,
});

function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : 60);
    v.onerror = () => resolve(60);
    v.src = url;
  });
}

let running = false;

// Simulated pipeline: runs at module level so it keeps going when switching pages.
async function runQueue() {
  if (running) return;
  running = true;
  for (;;) {
    const job = getHub().videos.find((v) => v.status === "queued");
    if (!job) break;
    await simulateJob(job);
  }
  running = false;
}

function simulateJob(job: VideoJob): Promise<void> {
  const stages = buildStages(job.options);
  const totalMs = 1400 * stages.length;
  const tick = 120;
  updateVideo(job.id, { status: "processing", progress: 0, stage: stages[0] });
  return new Promise((resolve) => {
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += tick;
      const progress = Math.min(100, (elapsed / totalMs) * 100);
      const stage = stages[Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))];
      updateVideo(job.id, { progress, stage });
      if (progress >= 100) {
        clearInterval(timer);
        updateVideo(job.id, { status: "done", stage: "Concluído", finishedAt: Date.now() });
        if (job.options.captions) {
          setHub((s) => ({ ...s, minutesTranscribed: s.minutesTranscribed + job.duration / 60 }));
        }
        toast.success("Vídeo pronto!", { description: job.outputName });
        resolve();
      }
    }, tick);
  });
}

function VideosPage() {
  const videos = useHub((s) => s.videos);
  const [options, setOptions] = useState<VideoOptions>({
    removeSilence: true,
    captions: true,
    vertical: true,
  });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const queued = videos.filter((v) => v.status !== "done");
  const done = videos.filter((v) => v.status === "done");
  const pending = videos.filter((v) => v.status === "queued");
  const processing = videos.some((v) => v.status === "processing");

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((f) => f.type.startsWith("video/"));
    if (!files.length) {
      toast.error("Formato não suportado", { description: "Envie arquivos de vídeo (MP4, MOV, WEBM)." });
      return;
    }
    for (const file of files) {
      const fileUrl = URL.createObjectURL(file);
      const duration = await readDuration(fileUrl);
      const job: VideoJob = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        duration,
        fileUrl,
        options,
        status: "queued",
        progress: 0,
        stage: "Aguardando",
        outputName: outputFileName(file.name, options),
        savedSeconds: estimateSavedSeconds(duration, options.removeSilence),
      };
      setHub((s) => ({ ...s, videos: [...s.videos, job] }));
    }
    toast.success(`${files.length} vídeo(s) adicionados à fila`);
  }

  function handleProcess() {
    if (!pending.length) {
      toast.error("Nenhum vídeo na fila", { description: "Arraste suas gravações para a área acima." });
      return;
    }
    // Apply the current settings to everything still waiting.
    setHub((s) => ({
      ...s,
      videos: s.videos.map((v) =>
        v.status === "queued"
          ? {
              ...v,
              options,
              outputName: outputFileName(v.name, options),
              savedSeconds: estimateSavedSeconds(v.duration, options.removeSilence),
            }
          : v,
      ),
    }));
    toast(`Processando ${pending.length} vídeo(s)…`);
    runQueue();
  }

  function removeJob(id: string) {
    setHub((s) => ({ ...s, videos: s.videos.filter((v) => v.id !== id) }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 02 · Auto-Editor + Whisper"
        title="Processador de Vídeos & Legendas"
        description="Envie as gravações de tela usando seus filtros. O AutoHub corta pausas, legenda automaticamente e entrega no formato vertical do TikTok."
        actions={
          <Badge variant="outline" className="w-fit gap-1.5 border-warning/40 text-warning">
            <span className="size-1.5 rounded-full bg-warning" /> Modo demonstração
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all",
            dragging
              ? "border-primary bg-primary/10 shadow-glow"
              : "border-border bg-card/40 hover:border-primary/60 hover:bg-card/60",
          )}
        >
          <div className="grid size-16 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <UploadCloud className="size-8 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold">
              {dragging ? "Solte para adicionar" : "Arraste seus vídeos brutos aqui"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ou clique para selecionar · MP4, MOV, WEBM · vários arquivos
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="glass-card flex flex-col rounded-2xl p-5">
          <h2 className="text-base font-bold">Configurações</h2>
          <div className="mt-4 space-y-3">
            <OptionRow
              icon={<Scissors className="size-4" />}
              title="Remover silêncios e pausas"
              desc="Auto-Editor corta trechos sem fala"
              checked={options.removeSilence}
              onChange={(v) => setOptions((o) => ({ ...o, removeSilence: v }))}
            />
            <OptionRow
              icon={<Subtitles className="size-4" />}
              title="Legendas automáticas estilo CapCut"
              desc="Whisper local, palavra por palavra"
              checked={options.captions}
              onChange={(v) => setOptions((o) => ({ ...o, captions: v }))}
            />
            <OptionRow
              icon={<Smartphone className="size-4" />}
              title="Formato de saída"
              desc={OUTPUT_VERTICAL.label}
              checked={options.vertical}
              onChange={(v) => setOptions((o) => ({ ...o, vertical: v }))}
            />
          </div>
          <Button
            variant="neon"
            size="lg"
            className="mt-5 h-12"
            onClick={handleProcess}
            disabled={processing && !pending.length}
          >
            {processing ? <Loader2 className="animate-spin" /> : <Play />}
            {processing ? "Processando…" : "Processar Vídeos"}
            {pending.length > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-2 font-mono text-xs">
                {pending.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      <section className="mt-8">
        <SectionTitle icon={<Clapperboard className="size-5 text-primary" />} title="Fila de processamento" count={queued.length} />
        {queued.length === 0 ? (
          <EmptyRow text="Nenhum vídeo na fila." />
        ) : (
          <div className="space-y-3">
            {queued.map((v) => (
              <div key={v.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary">
                    <FileVideo className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(v.size)} · {formatDuration(v.duration)}
                    </p>
                  </div>
                  {v.status === "queued" ? (
                    <>
                      <Badge variant="secondary">Na fila</Badge>
                      <Button size="icon" variant="ghost" onClick={() => removeJob(v.id)} aria-label="Remover">
                        <X />
                      </Button>
                    </>
                  ) : (
                    <span className="font-mono text-sm font-bold text-primary">{Math.round(v.progress)}%</span>
                  )}
                </div>
                {v.status === "processing" && (
                  <div className="mt-3 space-y-1.5">
                    <Progress value={v.progress} className="h-1.5 bg-secondary [&>div]:bg-gradient-brand" />
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> {v.stage}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle icon={<History className="size-5 text-primary" />} title="Prontos para download" count={done.length} />
        {done.length === 0 ? (
          <EmptyRow text="Os vídeos processados aparecem aqui." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            {done
              .slice()
              .reverse()
              .map((v, i) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex flex-col gap-3 bg-card p-4 sm:flex-row sm:items-center",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <CheckCircle2 className="hidden size-5 shrink-0 text-success sm:block" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.outputName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {v.options.removeSilence && (
                        <Badge variant="outline" className="font-normal">−{v.savedSeconds}s de pausas</Badge>
                      )}
                      {v.options.captions && <Badge variant="outline" className="font-normal">Legendas</Badge>}
                      {v.options.vertical && <Badge variant="outline" className="font-normal">1080×1920</Badge>}
                      <Badge variant="outline" className="font-normal">
                        {formatDuration(Math.max(1, v.duration - v.savedSeconds))}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm">
                      <a href={v.fileUrl} download={v.outputName}>
                        <Download /> Baixar
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="size-8" onClick={() => removeJob(v.id)} aria-label="Remover do histórico">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );
}

function OptionRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
          checked ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function SectionTitle({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      {icon}
      <h2 className="text-lg font-bold">{title}</h2>
      <Badge variant="secondary" className="font-mono">
        {count}
      </Badge>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
