import * as THREE from "three";

import { clampProgress } from "../troi-nam-motion-math";
import type { WorldHandle, WorldOptions } from "./troi-nam-world-types";

/**
 * Task 1 harness only: a lit ground plane standing in for the karst/water
 * scene, just to prove the factory's render/resize/active/dispose lifecycle
 * is clean before any real geometry lands (Task 2+). `quality`/`seed` from
 * `WorldOptions` and `setChartTarget` are part of the contract but stay
 * unused here — nothing is seeded or chart-projected yet.
 */
export function createTroiNamWorld(
  canvas: HTMLCanvasElement,
  { onFailure }: WorldOptions,
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
    camera.position.set(0, 1.4, 6);
    camera.lookAt(0, 0, 0);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a140a, roughness: 1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const sun = new THREE.DirectionalLight(0xf2dca0, 2.2);
    sun.position.set(-4, 3, 2);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xc9a44d, 0.35));

    let disposed = false;
    let active = true;
    let rafId: number | null = null;
    let progress = 0;

    const renderFrame = () => {
      // Placeholder motion proving `progress` reaches the scene end-to-end;
      // Task 2/3 replace this with real phase-driven camera/scene changes.
      ground.rotation.z = progress * (Math.PI / 24);
      renderer.render(scene, camera);
    };

    const loop = () => {
      rafId = null;
      if (disposed || !active) return;
      renderFrame();
      rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handle: WorldHandle = {
      setProgress(value: number) {
        if (disposed) return;
        progress = clampProgress(value);
      },
      setChartTarget() {
        // No projection target until Task 3's star buffer exists.
      },
      resize(width: number, height: number, pixelRatio: number) {
        if (disposed || width <= 0 || height <= 0) return;
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (active) renderFrame();
      },
      setActive(next: boolean) {
        if (disposed || active === next) return;
        active = next;
        if (active) {
          stopLoop();
          rafId = requestAnimationFrame(loop);
        } else {
          stopLoop();
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        stopLoop();
        groundGeometry.dispose();
        groundMaterial.dispose();
        renderer.dispose();
      },
    };

    // First-frame readiness: render once synchronously so the Promise only
    // resolves after a real frame exists, then start the RAF loop.
    try {
      renderFrame();
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
