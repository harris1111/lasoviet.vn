import * as THREE from "three";

import { clampProgress, scenePhases } from "../troi-nam-motion-math";
import { cameraFraming } from "./troi-nam-world-chapters";
import { createDawnLight, followCamera } from "./troi-nam-world-light";
import { createPaintedWorld } from "./troi-nam-world-layers";
import { createWorldParticles } from "./troi-nam-world-particles";
import { createWorldRays } from "./troi-nam-world-rays";
import { createChartProjection, createChartRing, projectChartRing } from "./troi-nam-world-ring";
import { chartCanvasOpacity, createWorldScheduler } from "./troi-nam-world-runtime";
import { createStars } from "./troi-nam-world-stars";
import { createWorldTextures } from "./troi-nam-world-textures";
import { createWater } from "./troi-nam-world-water";
import type { WorldChartTarget, WorldDebug, WorldHandle, WorldOptions } from "./troi-nam-world-types";

/** Largest sky dimming while text is on screen. Kept light on purpose: at 0.55 the whole scene sank; contrast now comes from the glass reading panels, this only evens the brightest dusk mist. */
const SKY_TEXT_DIM = 0.18;

// Matches --lacquer-950 (tokens.css): the canvas's own backdrop is only ever
// visible for a frame before the first real paint, or briefly through gaps
// between painted layers — it must read as the same warm lacquer-black as
// the rest of the page, not a cool navy (found in the 2026-10-01 review).
const SCENE_BACKGROUND = 0x080706;

export async function createTroiNamWorld(canvas: HTMLCanvasElement, { quality, seed, onFailure, onOpacity, signal, diagnostics = false }: WorldOptions): Promise<WorldHandle> {
  if (signal?.aborted) throw new Error("World initialization cancelled");
  const resources: Array<{ dispose(): void }> = [];
  const textures = createWorldTextures();
  let renderer: THREE.WebGLRenderer | undefined;
  let disposed = false;
  let failed = false;
  let rafId: number | null = null;
  let active = true;
  let lastFrame: number | null = null;
  let abortPending: (() => void) | undefined;
  const scheduler = createWorldScheduler(quality);

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastFrame = null;
    scheduler.reset();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopLoop();
    signal?.removeEventListener("abort", onAbort);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    for (const resource of resources.reverse()) resource.dispose();
    textures.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss?.();
  }
  function fail() {
    if (failed || disposed) return;
    failed = true;
    dispose();
    onFailure();
  }
  function onAbort() { abortPending?.(); dispose(); }
  function onContextLost(event: Event) { event.preventDefault(); fail(); abortPending?.(); }
  signal?.addEventListener("abort", onAbort, { once: true });
  canvas.addEventListener("webglcontextlost", onContextLost);

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const glRenderer = renderer;
    glRenderer.outputColorSpace = THREE.SRGBColorSpace;
    glRenderer.toneMapping = THREE.NoToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BACKGROUND);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const painted = createPaintedWorld(scene, { quality, textures }); resources.push(painted);
    const light = createDawnLight(scene, textures); resources.push(light);
    const water = createWater(scene, { quality, renderer: glRenderer, textures }); resources.push(water);
    const stars = createStars(scene, { quality, seed, textures }); resources.push(stars);
    const ring = createChartRing(scene, textures); resources.push(ring);
    const particles = createWorldParticles(scene, textures, seed, quality); resources.push(particles);
    // Water has no alpha cutout (map: null) but must still read as "not open
    // sky" in the ray mask — see troi-nam-world-layers.ts's RayOccluder doc
    // comment for why leaving it out washed the whole lake in flat light.
    const rayOccluders = [...painted.occluders, { mesh: water.mesh, map: null }];
    const rays = quality === "high" ? createWorldRays(rayOccluders) : null;
    if (rays) resources.push(rays);

    const projection = createChartProjection();
    const bufferSize = new THREE.Vector2();
    let progress = 0;
    let textDim = 0;
    let aspect = 1;
    let canvasWidth = 1;
    let canvasHeight = 1;
    let requestedRatio = 1;
    let chartRect: WorldChartTarget | null = null;
    let dirty = true;
    let projected = false;
    let debug: WorldDebug = { rays: true, mask: false };
    let frameCpuMs = 0;
    let opacity = 1;
    let raysEnabled = false;

    function resize(width: number, height: number, ratio: number) {
      if (disposed || width <= 0 || height <= 0) return;
      canvasWidth = width; canvasHeight = height; aspect = width / height;
      requestedRatio = ratio;
      glRenderer.setPixelRatio(scheduler.tier === "high" ? Math.min(ratio, 1.5) : 1);
      glRenderer.setSize(width, height, false);
      stars.setPixelRatio(glRenderer.getPixelRatio());
      rays?.resize(glRenderer);
      painted.resize(aspect); light.resize(aspect);
      dirty = true;
    }
    function applyPose() {
      const phases = scenePhases(progress);
      if (dirty) {
        const { fov, pose } = cameraFraming(aspect, phases);
        camera.fov = fov; camera.aspect = aspect;
        camera.position.copy(pose.position); camera.lookAt(pose.look);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        followCamera(light, camera);
        // A missing DOM target must not invent a substitute chart location.
        if (phases.chart > 0 && chartRect) {
          projectChartRing(camera, chartRect, canvasWidth, canvasHeight, projection);
          ring.setProjection(projection); stars.setTargets(projection.targets);
          projected = true;
        }
        painted.setPhase(phases); painted.setProgress(progress);
        light.setPhase(phases);
        // Text on screen eases the sky down a little (less as the chart takes over).
        light.setExposure(1 - SKY_TEXT_DIM * textDim * (1 - phases.chart));
        water.setNightWeight(phases.night); water.update(progress * 60);
        stars.setNightWeight(phases.night); stars.setChartWeight(chartRect ? phases.chart : 0); stars.update(progress * 60);
        ring.setWeight(chartRect && projected ? phases.chart : 0);
        particles.setProgress(progress);
        opacity = chartCanvasOpacity(phases.chart);
        onOpacity?.(opacity);
        dirty = false;
      }
    }
    function renderFrame(now: number, measure = true) {
      const started = performance.now();
      applyPose();
      raysEnabled = scheduler.tier === "high" && debug.rays !== false && progress < 0.6;
      if (rays && scheduler.tier === "high") rays.render(glRenderer, scene, camera, painted.sun, progress, debug.mask === true, raysEnabled);
      else { glRenderer.setRenderTarget(null); glRenderer.render(scene, camera); }
      frameCpuMs = performance.now() - started;
      if (measure) {
        const previous = scheduler.tier;
        scheduler.recordFrame(now, lastFrame === null ? 0 : now - lastFrame);
        lastFrame = now;
        if (scheduler.tier === "static") { fail(); return; }
        if (previous !== scheduler.tier) {
          painted.setQuality("low"); particles.setQuality("low"); stars.setQuality("low");
          resize(canvasWidth, canvasHeight, requestedRatio);
        }
      }
    }
    function loop(now: number) {
      rafId = null;
      if (disposed || !active) return;
      if (scheduler.shouldRender(now)) {
        try { renderFrame(now); } catch { fail(); return; }
      }
      if (!disposed && active) rafId = requestAnimationFrame(loop);
    }

    const handle: WorldHandle = {
      setProgress(value) { if (!disposed) { const next = clampProgress(value); if (next !== progress) { progress = next; dirty = true; } } },
      setTextDim(value) {
        if (disposed) return;
        const next = clampProgress(value);
        if (Math.abs(next - textDim) < 0.004) return;
        textDim = next;
        dirty = true;
      },
      setChartTarget(rect) {
        if (disposed) return;
        if (rect?.x === chartRect?.x && rect?.y === chartRect?.y && rect?.width === chartRect?.width && rect?.height === chartRect?.height) return;
        chartRect = rect ? { ...rect } : null;
        dirty = true;
      },
      resize(width, height, ratio) {
        try { resize(width, height, ratio); if (!disposed && active) renderFrame(performance.now(), false); } catch { fail(); }
      },
      setActive(next) {
        if (disposed || active === next) return;
        active = next; stopLoop();
        if (active) rafId = requestAnimationFrame(loop);
      },
      dispose,
    };
    if (diagnostics) {
      handle.setDebug = (next) => { debug = { ...debug, ...next }; };
      handle.getDiagnostics = () => {
        glRenderer.getDrawingBufferSize(bufferSize);
        return { tier: scheduler.tier, progress, chartWeight: scenePhases(progress).chart, opacity, targetUploads: stars.targetUploads, drawingBuffer: { width: bufferSize.x, height: bufferSize.y }, rayBuffer: rays?.dimensions ?? null, raysEnabled, frameCpuMs, rayPipelineCpuMs: raysEnabled || debug.mask ? rays?.cpuMs ?? 0 : 0, chartRect, ringCorners: Array.from(projection.corners), ringTargets: Array.from(projection.targets) };
      };
    }

    // Wait for actual asset decoding, not TextureLoader's synchronous placeholder return.
    await Promise.race([textures.ready(), new Promise<never>((_resolve, reject) => { abortPending = () => reject(new Error("World initialization cancelled")); })]);
    abortPending = undefined;
    if (disposed || signal?.aborted) throw new Error("World initialization cancelled");
    resize(Math.max(1, canvas.clientWidth || 1), Math.max(1, canvas.clientHeight || 1), 1);
    renderFrame(performance.now(), false);
    rafId = requestAnimationFrame(loop);
    return handle;
  } catch (error) {
    if (!disposed) fail();
    throw error instanceof Error ? error : new Error("World initialization failed");
  }
}
