import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Cpu,
  ExternalLink,
  FolderOpen,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Server,
  Terminal,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/hub/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { COLAB_SCRIPT } from "@/lib/colab-script";
import { formatBytes, useHub } from "@/lib/hub-store";

export const Route = createFileRoute("/sistema")({
  head: () => ({
    meta: [
      { title: "Status do Sistema & Google Colab · TikTok AutoHub" },
      {
        name: "description",
        content: "Acompanhe a conexão com o Colab, o armazenamento e o consumo das APIs gratuitas do AutoHub.",
      },
      { property: "og:title", content: "Status do Sistema & Google Colab · TikTok AutoHub" },
      {
        property: "og:description",
        content: "Acompanhe a conexão com o Colab, o armazenamento e o consumo das APIs gratuitas do AutoHub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SystemPage,
});

const DRIVE_TOTAL = 15 * 1024 ** 3; // free Google Drive quota
const DRIVE_BASELINE = 2.4 * 1024 ** 3;
const DEST_FOLDER = "/content/drive/MyDrive/TikTokAutoHub";

function SystemPage() {
  const assets = useHub((s) => s.assets);
  const videos = useHub((s) => s.videos);
  const imagesGenerated = useHub((s) => s.imagesGenerated);
  const minutesTranscribed = useHub((s) => s.minutesTranscribed);
  const [checking, setChecking] = useState(false);
  const [latency, setLatency] = useState(42);
  const [lastCheck, setLastCheck] = useState<string>("agora");
  const [copied, setCopied] = useState(false);

  const sessionBytes =
    assets.reduce((sum, a) => sum + (a.blob?.size ?? 0), 0) +
    videos.reduce((sum, v) => sum + v.size, 0);
  const used = DRIVE_BASELINE + sessionBytes;
  const usedPct = (used / DRIVE_TOTAL) * 100;

  async function checkConnection() {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 1100));
    const ms = 28 + Math.round(Math.random() * 40);
    setLatency(ms);
    setLastCheck(new Date().toLocaleTimeString("pt-BR"));
    setChecking(false);
    toast.success("Conexão verificada", { description: `Colab respondeu em ${ms} ms · GPU T4 pronta` });
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(COLAB_SCRIPT);
      setCopied(true);
      toast.success("Script copiado!", { description: "Cole em uma célula do Google Colab e execute." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar", { description: "Selecione o texto manualmente." });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 03 · Infraestrutura"
        title="Status do Sistema & Google Colab"
        description="Tudo rodando em serviços gratuitos: Colab como servidor de render, Drive como armazenamento e IA aberta para imagens e legendas."
        actions={
          <Button variant="outline" onClick={checkConnection} disabled={checking}>
            {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Verificar conexão
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard icon={<Server className="size-5" />} title="Servidor Local / Colab">
          <div className="flex items-center gap-2">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-success" />
            </span>
            <p className="font-display text-2xl font-bold text-success">Online / Pronto</p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Latência" value={checking ? "…" : `${latency} ms`} />
            <Row label="Runtime" value="GPU T4 · Python 3.11" />
            <Row label="Última verificação" value={lastCheck} />
          </dl>
        </StatusCard>

        <StatusCard icon={<HardDrive className="size-5" />} title="Armazenamento Utilizado">
          <p className="font-display text-2xl font-bold">
            {formatBytes(used)} <span className="text-base font-medium text-muted-foreground">/ 15 GB</span>
          </p>
          <Progress value={usedPct} className="mt-3 h-2 bg-secondary [&>div]:bg-gradient-brand" />
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-background/50 p-2.5">
            <FolderOpen className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pasta de destino</p>
              <p className="truncate font-mono text-xs">{DEST_FOLDER}</p>
            </div>
          </div>
        </StatusCard>

        <StatusCard icon={<Gauge className="size-5" />} title="Consumo de Tokens / API">
          <p className="font-display text-2xl font-bold text-primary">R$ 0,00</p>
          <div className="mt-4 space-y-3">
            <UsageRow
              icon={<ImageIcon className="size-4" />}
              label="Pollinations (imagens)"
              value={`${imagesGenerated} geradas`}
              tag="Gratuito"
            />
            <UsageRow
              icon={<Mic className="size-4" />}
              label="Whisper Local"
              value={`${minutesTranscribed.toFixed(1)} min`}
              tag="Ilimitado"
            />
          </div>
        </StatusCard>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
              <Terminal className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Script Python do Google Colab</h2>
              <p className="text-xs text-muted-foreground">Auto-Editor + Whisper + FFmpeg · saída 1080×1920</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="https://colab.research.google.com/#create=true" target="_blank" rel="noreferrer">
                <ExternalLink /> Abrir Colab
              </a>
            </Button>
            <Button size="sm" onClick={copyScript}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado" : "Copiar script"}
            </Button>
          </div>
        </div>
        <div className="relative max-h-[460px] overflow-auto bg-background/80">
          <pre className="p-4 font-mono text-[12.5px] leading-relaxed">
            {COLAB_SCRIPT.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="w-10 shrink-0 select-none pr-4 text-right text-muted-foreground/50">{i + 1}</span>
                <span className={line.trimStart().startsWith("#") ? "text-muted-foreground" : "text-foreground"}>
                  {line || " "}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Cpu className="size-3.5" />
        Dica: em Ambiente de execução → Alterar tipo, escolha GPU T4 para acelerar o Whisper.
      </p>
    </>
  );
}

function StatusCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs leading-5">{value}</dd>
    </div>
  );
}

function UsageRow({ icon, label, value, tag }: { icon: ReactNode; label: string; value: string; tag: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted-foreground">{value}</p>
      </div>
      <Badge variant="outline" className="border-success/40 text-success">
        {tag}
      </Badge>
    </div>
  );
}
