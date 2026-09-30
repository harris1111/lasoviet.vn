import * as THREE from "three";

import { clampProgress, scenePhases } from "../troi-nam-motion-math";
import { createKarstLayers } from "./troi-nam-world-terrain";
import { createDawnLight } from "./troi-nam-world-light";
import { createStars } from "./troi-nam-world-stars";
import { createWater } from "./troi-nam-world-water";
import type { WorldChartTarget, WorldHandle, WorldOptions } from "./troi-nam-world-types";

type Pose = { position: THREE.Vector3; look: THREE.Vector3 };

/**
 * Four keyframe poses (dawn/dusk/night/chart), nested-lerped in temporal
 * order by the exact same `scenePhases(p)` weights that drive every other
 * scroll-scrubbed effect on this page — so the camera reaching a given p
 * always reproduces the same composition for a given aspect ratio. FOV and
 * distance also widen for narrow/close phone framing (a fixed FOV cropped
 * the range down to one peak on 390×844; fine at 1440×900).
 */
function cameraPose(aspect: number, phases: { dusk: number; night: number; chart: number }): { fov: number; pose: Pose } {
  const t = THREE.MathUtils.clamp((aspect - 0.45) / (1.6 - 0.45), 0, 1);
  const y = (narrow: number, wide: number) => THREE.MathUtils.lerp(narrow, wide, t);

  const dawn: Pose = { position: new THREE.Vector3(0, y(1.1, 1.4), y(10, 6)), look: new THREE.Vector3(0, 0.4, -6) };
  const dusk: Pose = { position: new THREE.Vector3(0, y(1.5, 1.8), y(9.5, 6.5)), look: new THREE.Vector3(0, 2.6, -9) };
  const night: Pose = { position: new THREE.Vector3(0, y(1.9, 2.2), y(9, 7)), look: new THREE.Vector3(0, 6.5, -16) };
  const chart: Pose = { position: new THREE.Vector3(0, y(2.6, 3), y(6.5, 5)), look: new THREE.Vector3(0, 3.2, -3) };

  const position = dawn.position.clone().lerp(dusk.position, phases.dusk).lerp(night.position, phases.night).lerp(chart.position, phases.chart);
  const look = dawn.look.clone().lerp(dusk.look, phases.dusk).lerp(night.look, phases.night).lerp(chart.look, phases.chart);
  const fov = THREE.MathUtils.lerp(66, 40, t);
  return { fov, pose: { position, look } };
}

/** Screen-space ray from the camera through NDC (x,y), intersected with the world plane z = planeZ. */
function unprojectToPlane(camera: THREE.PerspectiveCamera, ndcX: number, ndcY: number, planeZ: number): THREE.Vector3 {
  const near = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera);
  const far = new THREE.Vector3(ndcX, ndcY, 1).unproject(camera);
  const direction = far.sub(near);
  const t = direction.z === 0 ? 0 : (planeZ - near.z) / direction.z;
  return near.add(direction.multiplyScalar(t));
}

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

    const karst = createKarstLayers(scene, { quality, seed });
    const light = createDawnLight(scene, { quality });
    const water = createWater(scene, { quality });
    const stars = createStars(scene, { quality, seed });

    let disposed = false;
    let active = true;
    let rafId: number | null = null;
    let lastFrameTime = 0;
    let progress = 0;
    let aspect = 1;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let requestedPixelRatio = 1;

    // Active-only degradation: high -> low (halve target FPS, drop DPR to 1)
    // -> static, each step gated on ~2s of sustained bad frame times so a
    // single GC pause doesn't trip it. `slowSince` resets whenever a frame
    // comes in under budget, and again after each step so the *next* tier
    // gets its own 2s to prove itself before degrading further.
    let qualityStep: 0 | 1 = 0;
    let slowSince: number | null = null;
    let frameParity = 0;

    const disposeInternal = () => {
      if (disposed) return;
      disposed = true;
      stopLoop();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      karst.dispose();
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
      const { fov, pose } = cameraPose(aspect, phases);
      camera.fov = fov;
      camera.aspect = aspect;
      camera.position.copy(pose.position);
      camera.lookAt(pose.look);
      camera.updateProjectionMatrix();

      karst.setNightWeight(phases.night);
      light.setPhase({ dusk: phases.dusk, night: phases.night });
      water.setNightWeight(phases.night);
      stars.setNightWeight(phases.night);
      stars.setChartWeight(phases.chart);
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
      // The "low" quality step also halves the target frame rate (skip
      // every other RAF) instead of only dropping DPR.
      frameParity ^= 1;
      if (qualityStep === 0 || frameParity === 0) renderFrame(now);
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastFrameTime = 0; // next resume starts with dt=0 instead of a large jump
      slowSince = null; // don't judge the next tier's first frames on a pre-pause streak
      frameParity = 0;
    };

    const handle: WorldHandle = {
      setProgress(value: number) {
        if (disposed) return;
        progress = clampProgress(value);
      },
      setChartTarget(rect: WorldChartTarget | null) {
        if (disposed) return;
        if (!rect || canvasWidth <= 0 || canvasHeight <= 0) {
          stars.setTargets(null);
          return;
        }
        stars.setTargets(projectChartTarget(camera, rect, canvasWidth, canvasHeight));
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
        if (active) renderFrame(performance.now());
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
