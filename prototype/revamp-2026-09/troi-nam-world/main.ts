import { createTroiNamWorld } from "../../../apps/web/src/features/troi-nam/world/troi-nam-world-scene";
import type { WorldHandle } from "../../../apps/web/src/features/troi-nam/world/troi-nam-world-types";

const canvas = document.querySelector<HTMLCanvasElement>("#world-canvas")!;
const stage = document.querySelector<HTMLDivElement>("#stage")!;
const statsEl = document.querySelector<HTMLDivElement>("#stats")!;
const progressInput = document.querySelector<HTMLInputElement>("#progress")!;
const activeButton = document.querySelector<HTMLButtonElement>("#toggle-active")!;
const reinitButton = document.querySelector<HTMLButtonElement>("#reinit")!;

// Guards the "dispose requested while init is still pending" race: if a
// newer generation starts before an older one's promise resolves, the
// stale handle must be disposed immediately instead of left running.
// This is the exact idempotent-disposal path Task 1 asks to be proven live.
let generation = 0;
let handle: WorldHandle | null = null;
let active = true;

function setStats(message: string) {
  statsEl.textContent = message;
}

async function boot() {
  const myGeneration = ++generation;
  setStats("initializing…");

  const nextHandle = await createTroiNamWorld(canvas, {
    quality: "high",
    seed: 1,
    onFailure: () => setStats("WebGL init failed — static fallback would show here."),
  }).catch((error: unknown) => {
    setStats(`init rejected: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

  if (myGeneration !== generation) {
    // A newer boot() already started (or this one was disposed) while we
    // awaited; don't let a late handle leak in.
    nextHandle?.dispose();
    return;
  }

  handle = nextHandle;
  if (handle) {
    resize();
    setStats("ready");
  }
}

function resize() {
  if (!handle) return;
  const { width, height } = stage.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  handle.resize(width, height, pixelRatio);
}

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(stage);

progressInput.addEventListener("input", () => {
  handle?.setProgress(Number(progressInput.value));
});

function setCapture(p: number) {
  progressInput.value = String(p);
  handle?.setProgress(p);
}
document.querySelector("#capture-0")!.addEventListener("click", () => setCapture(0));
document.querySelector("#capture-375")!.addEventListener("click", () => setCapture(0.375));
document.querySelector("#capture-625")!.addEventListener("click", () => setCapture(0.625));
document.querySelector("#capture-1")!.addEventListener("click", () => setCapture(1));

activeButton.addEventListener("click", () => {
  active = !active;
  handle?.setActive(active);
  activeButton.textContent = active ? "Pause" : "Resume";
});

reinitButton.addEventListener("click", () => {
  generation++; // invalidate any pending boot() before disposing the live handle
  handle?.dispose();
  handle = null;
  active = true;
  activeButton.textContent = "Pause";
  void boot();
});

void boot();
