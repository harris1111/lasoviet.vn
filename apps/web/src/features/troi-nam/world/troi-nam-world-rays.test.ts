import { expect, it } from "vitest";
import * as THREE from "three";
import { createWorldRays } from "./troi-nam-world-rays";
import { createDawnLight } from "./troi-nam-world-light";
import { createPaintedWorld } from "./troi-nam-world-layers";
import { createWorldTextures } from "./troi-nam-world-textures";
import { troiNamAsset } from "../troi-nam-assets";

it("keeps one linear base target and final material across positive, zero, behind-camera and cutoff strengths", () => {
  const rays = createWorldRays([]);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1.6, 0.1, 100);
  camera.updateMatrixWorld(true);
  let target: THREE.WebGLRenderTarget | null = null;
  const draws: Array<{ target: THREE.WebGLRenderTarget | null; scene: THREE.Scene }> = [];
  const renderer = {
    setRenderTarget: (value: THREE.WebGLRenderTarget | null) => { target = value; },
    render: (value: THREE.Scene) => { draws.push({ target, scene: value }); },
  } as unknown as THREE.WebGLRenderer;
  try {
    rays.render(renderer, scene, camera, new THREE.Vector3(0, 0, -10), 0.15, false);
    expect(draws).toHaveLength(4);
    const baseTarget = draws[2]!.target!;
    const finalScene = draws[3]!.scene;
    const finalMaterial = (finalScene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    expect(baseTarget.texture.colorSpace).toBe(THREE.NoColorSpace);
    expect(finalMaterial.uniforms.uStrength!.value).toBeGreaterThan(0);
    for (const [progress, z] of [[0.15, 10], [0.6, -10], [0.600001, -10]]) {
      draws.length = 0;
      rays.render(renderer, scene, camera, new THREE.Vector3(0, 0, z), progress!, false);
      expect(draws).toEqual([{ target: baseTarget, scene }, { target: null, scene: finalScene }]);
      expect(finalMaterial.uniforms.uScene!.value).toBe(baseTarget.texture);
      expect(finalMaterial.uniforms.uStrength!.value).toBe(0);
      expect(finalMaterial.uniforms.uMaskOnly!.value).toBe(0);
    }
    draws.length = 0;
    rays.render(renderer, scene, camera, new THREE.Vector3(0, 0, -10), 0.599999, false);
    expect(draws.slice(-2)).toEqual([{ target: baseTarget, scene }, { target: null, scene: finalScene }]);
    expect(finalMaterial.uniforms.uStrength!.value).toBeLessThan(1e-8);
  } finally { rays.dispose(); }
});

it("draws every sky plate before all painted layers while keeping T07 visible at full dusk", () => {
  const scene = new THREE.Scene();
  const textures = createWorldTextures({ load: (url) => {
    const texture = new THREE.Texture<HTMLImageElement>(); texture.name = url; return texture;
  } });
  const light = createDawnLight(scene, textures);
  const painted = createPaintedWorld(scene, { quality: "high", textures });
  try {
    const sky = light.group.children as THREE.Mesh[];
    const layers = painted.group.children as THREE.Mesh[];
    const firstLayer = Math.min(...layers.map((layer) => layer.renderOrder));
    for (const plate of sky) expect(plate.renderOrder).toBeLessThan(firstLayer);
    expect(sky.map((plate) => plate.renderOrder)).toEqual([...sky.map((plate) => plate.renderOrder)].sort((a, b) => a - b));
    painted.setPhase({ dusk: 1, night: 0 }); painted.setProgress(0.5);
    light.setPhase({ dusk: 1, night: 0 });
    const cloud = layers.find((layer) => (layer.material as THREE.MeshBasicMaterial).map?.name === troiNamAsset("T07").src)!;
    expect(cloud.visible).toBe(true);
    expect((cloud.material as THREE.MeshBasicMaterial).opacity).toBe(0.14);
    expect((sky[1]!.material as THREE.MeshBasicMaterial).opacity).toBe(1);
    painted.setPhase({ dusk: 1, night: 1 }); light.setPhase({ dusk: 1, night: 1 });
    for (const mountain of painted.occluders) expect(mountain.mesh.renderOrder).toBeGreaterThan(sky[2]!.renderOrder);
  } finally { painted.dispose(); light.dispose(); textures.dispose(); }
});
