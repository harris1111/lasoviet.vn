import * as THREE from "three";

import { clampProgress } from "../troi-nam-motion-math";
import { createKarstLayers } from "./troi-nam-world-terrain";
import { createDawnLight } from "./troi-nam-world-light";
import { createWater } from "./troi-nam-world-water";
import type { WorldHandle, WorldOptions } from "./troi-nam-world-types";

/**
 * A fixed FOV/position frames the mountain range well on a wide desktop
 * viewport but crops it down to one peak on a narrow phone portrait — so
 * FOV and camera distance interpolate with aspect ratio instead of staying
 * constant. Tuned by eye at 390×844 and 1440×900 per the effects contract.
 */
function applyResponsiveFraming(camera: THREE.PerspectiveCamera, aspect: number): void {
  const t = THREE.MathUtils.clamp((aspect - 0.45) / (1.6 - 0.45), 0, 1);
  camera.fov = THREE.MathUtils.lerp(66, 40, t);
  camera.position.z = THREE.MathUtils.lerp(10, 6, t);
  camera.position.y = THREE.MathUtils.lerp(1.1, 1.4, t);
  camera.aspect = aspect;
  camera.lookAt(0, 0.4, -6);
  camera.updateProjectionMatrix();
}

/**
 * Task 2 scope: the dawn composition (karst silhouettes + water + sun rays
 * + mist), matched against L01/L03/L13. Camera/phase transitions (dusk →
 * night → stars→chart) are Task 3 — `setProgress`/`setChartTarget` are
 * accepted and clamped per the WorldHandle contract but don't drive
 * anything visual yet; the scene always renders its dawn pose.
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
    applyResponsiveFraming(camera, 1);

    const karst = createKarstLayers(scene, { quality, seed });
    const light = createDawnLight(scene, { quality });
    const water = createWater(scene, { quality });

    let disposed = false;
    let active = true;
    let rafId: number | null = null;
    let lastFrameTime = 0;

    const renderFrame = (now: number) => {
      const dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.1) : 0;
      lastFrameTime = now;
      water.update(dt);
      renderer.render(scene, camera);
    };

    const loop = (now: number) => {
      rafId = null;
      if (disposed || !active) return;
      renderFrame(now);
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastFrameTime = 0; // next resume starts with dt=0 instead of a large jump
    };

    const handle: WorldHandle = {
      setProgress(value: number) {
        // No phase-driven scene state to update until Task 3; still clamp so
        // a non-finite caller value can never reach this handle unnoticed.
        if (disposed) return;
        clampProgress(value);
      },
      setChartTarget() {
        // No projection target until Task 3's star buffer exists.
      },
      resize(width: number, height: number, pixelRatio: number) {
        if (disposed || width <= 0 || height <= 0) return;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        applyResponsiveFraming(camera, width / height);
        if (active) renderFrame(performance.now());
      },
      setActive(next: boolean) {
        if (disposed || active === next) return;
        active = next;
        stopLoop();
        if (active) rafId = requestAnimationFrame(loop);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        stopLoop();
        karst.dispose();
        light.dispose();
        water.dispose();
        renderer.dispose();
      },
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
