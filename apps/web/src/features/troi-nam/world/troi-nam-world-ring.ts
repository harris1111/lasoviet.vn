import * as THREE from "three";
import { troiNamAsset } from "../troi-nam-assets";
import type { WorldChartTarget } from "./troi-nam-world-types";
import type { WorldTextures } from "./troi-nam-world-textures";

// The painted gold circle occupies 86% of the square P05 plate.
export const PAINTED_RING_RADIUS = 0.43;
export function createChartProjection() {
  return { targets: new Float32Array(36), corners: new Float32Array(12), point: new THREE.Vector3() };
}
export type ChartProjection = ReturnType<typeof createChartProjection>;

/** Camera-facing plane at a fixed view depth: preserves a square in screen pixels even under camera tilt. */
export function projectChartRing(camera: THREE.PerspectiveCamera, rect: WorldChartTarget, width: number, height: number, output: ChartProjection): void {
  camera.updateMatrixWorld(true);
  const side = Math.min(rect.width, rect.height);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const depth = output.point.set(0, 0, -8).applyMatrix4(camera.matrixWorld).project(camera).z;
  const write = (x: number, y: number, values: Float32Array, i: number) => {
    output.point.set(x / width * 2 - 1, 1 - y / height * 2, depth).unproject(camera).toArray(values, i * 3);
  };
  write(cx - side / 2, cy + side / 2, output.corners, 0);
  write(cx + side / 2, cy + side / 2, output.corners, 1);
  write(cx - side / 2, cy - side / 2, output.corners, 2);
  write(cx + side / 2, cy - side / 2, output.corners, 3);
  for (let i = 0; i < 12; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 6;
    write(cx + Math.cos(angle) * side * PAINTED_RING_RADIUS, cy + Math.sin(angle) * side * PAINTED_RING_RADIUS, output.targets, i);
  }
}

export function createChartRing(scene: THREE.Scene, textures: WorldTextures) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(12), 3);
  geometry.setAttribute("position", position);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  const material = new THREE.MeshBasicMaterial({ map: textures.load(troiNamAsset("P05").src), transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 31;
  scene.add(mesh);
  return {
    setProjection(projection: ChartProjection) { position.array.set(projection.corners); position.needsUpdate = true; },
    setWeight(weight: number) { material.opacity = weight; mesh.visible = weight > 0; },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); },
  };
}
