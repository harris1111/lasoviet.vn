import * as THREE from "three";

import { mulberry32 } from "./troi-nam-world-rng";

/**
 * Layered karst silhouettes (Tràng An reference: L01/L03/L13) — flat,
 * unlit ridge shapes stacked front-to-back with atmospheric-perspective
 * color/opacity, not modeled rock. Cheap (one draw call per layer, no
 * lighting), and matches the lacquer/gold art direction better than a
 * photoreal attempt would in this budget.
 */

export type KarstLayers = {
  group: THREE.Group;
  setNightWeight(weight: number): void;
  dispose(): void;
};

type LayerSpec = {
  z: number;
  baseY: number;
  amplitude: number;
  color: THREE.Color;
  opacity: number;
};

function ridgeShape(rng: () => number, width: number, spec: LayerSpec): THREE.Shape {
  const segments = 48;
  // A few random sine components make a wandering ridge line; raising a
  // secondary component to a fractional power sharpens it into the
  // pointed karst-spire silhouette instead of a smooth rolling hill.
  const components = Array.from({ length: 4 }, () => ({
    freq: 1.5 + rng() * 4,
    amp: 0.4 + rng() * 0.6,
    phase: rng() * Math.PI * 2,
  }));
  const spikeFreq = 3 + rng() * 5;
  const spikePhase = rng() * Math.PI * 2;

  const heightAt = (u: number): number => {
    let h = 0;
    for (const c of components) h += Math.sin(u * c.freq * Math.PI * 2 + c.phase) * c.amp;
    const spike = Math.pow(Math.abs(Math.sin(u * spikeFreq * Math.PI * 2 + spikePhase)), 0.6);
    return spec.baseY + (h * 0.5 + spike * 0.7) * spec.amplitude;
  };

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -20);
  shape.lineTo(-width / 2, heightAt(0));
  for (let i = 0; i <= segments; i++) {
    const u = i / segments; // 0..1
    shape.lineTo((u - 0.5) * width, heightAt(u));
  }
  shape.lineTo(width / 2, -20);
  shape.closePath();
  return shape;
}

export function createKarstLayers(scene: THREE.Scene, { quality, seed }: { quality: "low" | "high"; seed: number }): KarstLayers {
  const rng = mulberry32(seed);
  const layerCount: number = quality === "high" ? 5 : 3;
  const width = 40;

  // Near layers read as near-black lacquer silhouettes; far layers lift
  // toward the hazy dawn horizon color and fade — the reference photo's
  // atmospheric perspective.
  const near = new THREE.Color(0x120d08);
  const far = new THREE.Color(0x7a5a3a);

  const nightColor = new THREE.Color(0x060812);

  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshBasicMaterial[] = [];
  const layers: Array<{ material: THREE.MeshBasicMaterial; baseColor: THREE.Color; baseOpacity: number }> = [];

  for (let i = 0; i < layerCount; i++) {
    const t = layerCount === 1 ? 0 : i / (layerCount - 1); // 0 near .. 1 far
    const spec: LayerSpec = {
      z: -6 - t * 22,
      baseY: -1 + t * 0.6,
      amplitude: 3.2 - t * 1.1,
      color: near.clone().lerp(far, t),
      opacity: 1 - t * 0.35,
    };
    const shape = ridgeShape(rng, width + t * 20, spec);
    const geometry = new THREE.ShapeGeometry(shape, 1);
    const material = new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: spec.opacity,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = spec.z;
    mesh.renderOrder = layerCount - i; // paint far-to-near regardless of depthWrite
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
    layers.push({ material, baseColor: spec.color, baseOpacity: spec.opacity });
  }

  scene.add(group);

  return {
    group,
    setNightWeight(weight: number) {
      // Ridges recede and cool toward a moonlit near-silhouette as night
      // rises, but never fully vanish — the horizon stays readable.
      for (const layer of layers) {
        layer.material.opacity = layer.baseOpacity * (1 - weight * 0.55);
        layer.material.color.copy(layer.baseColor).lerp(nightColor, weight * 0.85);
      }
    },
    dispose() {
      scene.remove(group);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
