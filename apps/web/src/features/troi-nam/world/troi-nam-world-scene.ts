import * as THREE from "three";

import { clampProgress, scenePhases } from "../troi-nam-motion-math";
import { cameraFraming, unprojectToPlane } from "./troi-nam-world-chapters";
import { createDawnLight, followCamera } from "./troi-nam-world-light";
import { createPaintedWorld } from "./troi-nam-world-layers";
import { createStars } from "./troi-nam-world-stars";
import { createWater } from "./troi-nam-world-water";
import type { WorldChartTarget, WorldHandle, WorldOptions } from "./troi-nam-world-types";

/** The 12 outer cells of `rect`'s 4x4 grid (its center 2x2 skipped), projected onto a fixed-depth world plane — mirrors `.tn-explore .hv3-chart`. */
function projectChartTarget(
  camera: THREE.PerspectiveCamera,
  rect: WorldChartTarget,
  canvasWidth: number,
  canvasHeight: number,
): Float32Array {
  const planeZ = -3;
  const positions = new Float32Array(12 * 3);
  let i = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (row >= 1 && row <= 2 && col >= 1 && col <= 2) continue;
      const px = rect.x + ((col + 0.5) / 4) * rect.width;
      const py = rect.y + ((row + 0.5) / 4) * rect.height;
      const ndcX = (px / canvasWidth) * 2 - 1;
      const ndcY = -((py / canvasHeight) * 2 - 1);
      const world = unprojectToPlane(camera, ndcX, ndcY, planeZ);
      positions[i * 3 + 0] = world.x;
      positions[i * 3 + 1] = world.y;
      positions[i * 3 + 2] = planeZ;
      i++;
    }
  }
  return positions;
}

/**
 * Task 3 scope: dawn → dusk → night → stars-approaching-chart choreography
 * on top of Task 2's dawn composition. `setProgress` now actually drives
 * the scene; `setChartTarget` projects toward the real Explore grid (or the
 * stars' centered fallback motif when null/not yet measured).
 */
export function createTroiNamWorld(
  canvas: HTMLCanvasElement,
  { quality, seed, onFailure }: WorldOptions,
): Promise<WorldHandle> {
  return new Promise((resolve, reject) => {
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (error) {
      onFailure();
      reject(error instanceof Error ? error : new Error("WebGL renderer init failed"));
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    // Definite-assignment assertions: every path past this try/catch either
    // returns (the catch block) or has assigned all four, so later code
    // (disposeInternal/applyPose/renderFrame) can use them unconditionally.
    let painted!: ReturnType<typeof createPaintedWorld>;
    let light!: ReturnType<typeof createDawnLight>;
    let water!: ReturnType<typeof createWater>;
    let stars!: ReturnType<typeof createStars>;
    {
      // Partial builders (created before one throws) still hold live GPU
      // resources — a throw mid-sequence must not leak them.
      let partialPainted: ReturnType<typeof createPaintedWorld> | undefined;
      let partialLight: ReturnType<typeof createDawnLight> | undefined;
      let partialWater: ReturnType<typeof createWater> | undefined;
      let partialStars: ReturnType<typeof createStars> | undefined;
      try {
        partialPainted = createPaintedWorld(scene, { quality });
        partialLight = createDawnLight(scene);
        partialWater = createWater(scene, { quality, renderer });
        partialStars = createStars(scene, { quality, seed });
        painted = partialPainted;
        light = partialLight;
        water = partialWater;
        stars = partialStars;
      } catch (error) {
        partialPainted?.dispose();
        partialLight?.dispose();
        partialWater?.dispose();
        partialStars?.dispose();
        renderer.dispose();
        onFailure();
        reject(error instanceof Error ? error : new Error("World builder init failed"));
        return;
      }
    }

    let disposed = false;
    let active = true;
    let rafId: number | null = null;
    let lastFrameTime = 0;
    let progress = 0;
    let aspect = 1;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let requestedPixelRatio = 1;
    // Fix #3: the chart's on-screen rect, re-projected into world space every
    // frame (inside `applyPose`, after the camera has moved) instead of once
    // at call time — scrolling changes both the camera pose and the chart's
    // viewport position, and nothing fires `setChartTarget` again while the
    // user is just scrolling (ResizeObserver doesn't see that).
    let chartRect: WorldChartTarget | null = null;

    // Active-only degradation: high -> low (halve target FPS, drop DPR to 1)
    // -> static, each step gated on ~2s of sustained bad frame times so a
    // single GC pause doesn't trip it. `slowSince` resets whenever a frame
    // comes in under budget, and again after each step so the *next* tier
    // gets its own 2s to prove itself before degrading further.
    // Fix: a caller-requested "low" quality (coarse pointer) must start
    // capped at 30fps immediately — the old code always started at tier 0
    // (uncapped) and only reached the cap after a sustained slow-frame
    // streak degraded it there, so low-tier devices briefly rendered at full
    // refresh rate before the scheduler caught up.
    let qualityStep: 0 | 1 = quality === "low" ? 1 : 0;
    let slowSince: number | null = null;
    // Fix #4: the low tier's 30fps cap must be an elapsed-time gate, not
    // "skip every other RAF" — the latter yields 30fps only on a 60Hz
    // display and ~60fps on a 120Hz one, since it's counting RAF callbacks,
    // not time.
    let lastRenderTime = 0;
    const MIN_FRAME_MS: Record<0 | 1, number> = { 0: 0, 1: 1000 / 30 };

    const disposeInternal = () => {
      if (disposed) return;
      disposed = true;
      stopLoop();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      painted.dispose();
      light.dispose();
      water.dispose();
      stars.dispose();
      renderer.dispose();
    };

    function degradeToStatic() {
      disposeInternal();
      onFailure();
    }

    // Context loss: stop touching the (now invalid) GL context and hand
    // back to the static plates. No automatic retry — `webglcontextrestored`
    // is intentionally inert; recovering means remounting the stage.
    function onContextLost(event: Event) {
      event.preventDefault();
      degradeToStatic();
    }
    function onContextRestored() {
      // Deliberately does nothing — see the comment above.
    }
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const applyPose = () => {
      const phases = scenePhases(progress);
      const { fov, pose } = cameraFraming(aspect, phases);
      camera.fov = fov;
      camera.aspect = aspect;
      camera.position.copy(pose.position);
      camera.lookAt(pose.look);
      camera.updateProjectionMatrix();
      followCamera(light, camera);

      painted.setPhase({ dusk: phases.dusk, night: phases.night });
      light.setPhase({ dusk: phases.dusk, night: phases.night });
      water.setNightWeight(phases.night);
      stars.setNightWeight(phases.night);
      stars.setChartWeight(phases.chart);

      // Re-project the chart target now that the camera is in its final
      // pose for this frame (see the `chartRect` comment above).
      if (chartRect && canvasWidth > 0 && canvasHeight > 0) {
        stars.setTargets(projectChartTarget(camera, chartRect, canvasWidth, canvasHeight));
      } else if (!chartRect) {
        stars.setTargets(null);
      }
    };

    const renderFrame = (now: number) => {
      const frameMs = lastFrameTime ? now - lastFrameTime : 0;
      const dt = lastFrameTime ? Math.min(frameMs / 1000, 0.1) : 0;
      lastFrameTime = now;
      applyPose();
      water.update(dt);
      stars.update(dt);
      renderer.render(scene, camera);

      // Active-only degradation budget (effects contract: step high->low
      // after ~2s sustained >50ms frames, then low->static after another
      // ~2s). `frameMs` is 0 on the very first frame after a resume/resize,
      // which correctly never counts toward a slow streak.
      if (frameMs > 50) {
        if (slowSince === null) slowSince = now;
        else if (now - slowSince > 2000) {
          if (qualityStep === 0) {
            qualityStep = 1;
            renderer.setPixelRatio(1);
            slowSince = now; // give the reduced tier its own 2s before judging it
          } else {
            degradeToStatic();
          }
        }
      } else {
        slowSince = null;
      }
    };

    const loop = (now: number) => {
      rafId = null;
      if (disposed || !active) return;
      // The "low" quality step also caps the target frame rate at 30fps,
      // gated on elapsed time rather than RAF count so it holds on both a
      // 60Hz and a 120Hz display.
      if (now - lastRenderTime >= MIN_FRAME_MS[qualityStep]) {
        lastRenderTime = now;
        // Fix #6: a render error at any point (not just the first frame)
        // must drop back to the static plate, not keep looping on a
        // half-broken scene.
        try {
          renderFrame(now);
        } catch {
          degradeToStatic();
          return;
        }
      }
      // `renderFrame` can itself call `degradeToStatic` (the sustained-slow
      // -frame budget) without throwing — re-check before re-arming the RAF
      // loop so a disposed scene never schedules another frame.
      if (disposed) return;
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastFrameTime = 0; // next resume starts with dt=0 instead of a large jump
      slowSince = null; // don't judge the next tier's first frames on a pre-pause streak
      lastRenderTime = 0;
    };

    const handle: WorldHandle = {
      setProgress(value: number) {
        if (disposed) return;
        progress = clampProgress(value);
      },
      setChartTarget(rect: WorldChartTarget | null) {
        if (disposed) return;
        // Store the rect only; `applyPose` (run every frame) does the actual
        // projection, after the camera has moved for that frame.
        chartRect = rect;
      },
      resize(width: number, height: number, pixelRatio: number) {
        if (disposed || width <= 0 || height <= 0) return;
        requestedPixelRatio = pixelRatio;
        // Once degraded to the low tier, stay at DPR 1 even across a resize
        // — don't let a new caller-supplied ratio silently undo the step.
        renderer.setPixelRatio(qualityStep === 1 ? 1 : requestedPixelRatio);
        renderer.setSize(width, height, false);
        canvasWidth = width;
        canvasHeight = height;
        aspect = width / height;
        painted.resize(aspect); // re-derive plane footprints for the new fov/aspect (Luật 1/2)
        light.resize(aspect);
        if (active) {
          try {
            renderFrame(performance.now());
          } catch {
            degradeToStatic();
          }
        }
      },
      setActive(next: boolean) {
        if (disposed || active === next) return;
        active = next;
        stopLoop();
        if (active) rafId = requestAnimationFrame(loop);
      },
      dispose: disposeInternal,
    };

    // First-frame readiness: render once synchronously so the Promise only
    // resolves after a real frame exists, then start the RAF loop.
    try {
      renderFrame(performance.now());
    } catch (error) {
      handle.dispose();
      onFailure();
      reject(error instanceof Error ? error : new Error("First frame render failed"));
      return;
    }

    rafId = requestAnimationFrame(loop);
    resolve(handle);
  });
}
