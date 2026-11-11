import { useSyncExternalStore } from "react";
import type { AssetKind, StyleId } from "./asset-presets";

export type Asset = {
  id: string;
  kind: AssetKind;
  label: string;
  style: StyleId;
  idea: string;
  prompt: string;
  seed: number;
  status: "loading" | "ready" | "error";
  error?: string;
  url?: string;
  blob?: Blob;
};

export type VideoOptions = { removeSilence: boolean; captions: boolean; vertical: boolean };

export type VideoJob = {
  id: string;
  name: string;
  size: number;
  duration: number; // seconds
  fileUrl: string;
  options: VideoOptions;
  status: "queued" | "processing" | "done";
  progress: number;
  stage: string;
  outputName: string;
  savedSeconds: number;
  finishedAt?: number;
};

type HubState = {
  assets: Asset[];
  videos: VideoJob[];
  imagesGenerated: number;
  minutesTranscribed: number;
};

let state: HubState = { assets: [], videos: [], imagesGenerated: 0, minutesTranscribed: 0 };
const listeners = new Set<() => void>();

export function setHub(update: (s: HubState) => HubState) {
  state = update(state);
  listeners.forEach((l) => l());
}

export function getHub() {
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useHub<T>(selector: (s: HubState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function updateAsset(id: string, patch: Partial<Asset>) {
  setHub((s) => ({ ...s, assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

export function updateVideo(id: string, patch: Partial<VideoJob>) {
  setHub((s) => ({ ...s, videos: s.videos.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
