import { Link, useRouterState } from "@tanstack/react-router";
import { Clapperboard, Cpu, Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Gerador de Assets", short: "Assets", icon: Sparkles, desc: "Effect House" },
  { to: "/videos", label: "Processador de Vídeos", short: "Vídeos", icon: Clapperboard, desc: "Cortes + legendas" },
  { to: "/sistema", label: "Status & Colab", short: "Sistema", icon: Cpu, desc: "Servidor e consumo" },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 place-items-center rounded-xl bg-gradient-brand shadow-glow">
        <Zap className="size-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-bold tracking-tight">TikTok Effect</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          & Video AutoHub
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none fixed -top-40 left-1/3 size-[520px] rounded-full bg-neon-cyan/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-40 right-0 size-[480px] rounded-full bg-neon-pink/10 blur-[120px]" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar/80 p-5 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="mt-10 flex flex-col gap-1.5">
          <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Módulos
          </p>
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-brand" />
                )}
                <item.icon className={cn("size-5", active && "text-primary")} />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Colab / Servidor</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Online
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Custo mensal</span>
            <span className="font-mono text-xs font-bold text-primary">R$ 0,00</span>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-success">
          <span className="size-1.5 rounded-full bg-success" /> Online
        </span>
      </header>

      <main className="relative z-10 px-4 pb-28 pt-6 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-[11px] font-semibold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}
