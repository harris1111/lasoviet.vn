import * as THREE from "three";

import { troiNamAsset } from "../troi-nam-assets";
import { applyAnisotropy, loadWorldTexture } from "./troi-nam-world-textures";

/**
 * W07 (mat-nuoc-tinh-phan-chieu-vang): a painted still-water plate with its
 * own gold reflection streak already in the artwork, not a procedurally
 * drawn one — the old version computed the streak in the fragment shader
 * because there was no photo to sample. A small vertex-shader ripple is all
 * that's left to do live; `update(dt)` only advances a time uniform, no
 * per-frame CPU work.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec3 pos = position;
    pos.z += sin(pos.x * 0.8 + uTime * 0.6) * 0.035 + sin(pos.y * 1.3 - uTime * 0.4) * 0.02;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uNightWeight;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    // The sun's reflection in the painting fades and cools toward a flat
    // moonlit tone as night rises — the same move the karst layers make.
    vec3 nightTone = tex.rgb * vec3(0.22, 0.26, 0.4) * 0.6;
    vec3 color = mix(tex.rgb, nightTone, uNightWeight);
    gl_FragColor = vec4(color, tex.a);
  }
`;

export type Water = {
  mesh: THREE.Mesh;
  update(dt: number): void;
  setNightWeight(weight: number): void;
  dispose(): void;
};

export function createWater(scene: THREE.Scene, { quality, renderer }: { quality: "low" | "high"; renderer: THREE.WebGLRenderer }): Water {
  const segments = quality === "high" ? 48 : 16;
  const asset = troiNamAsset("W07");
  const texture = loadWorldTexture(asset.src);
  applyAnisotropy(texture, renderer); // the one plane viewed at a shallow angle

  // Plane geometry is authored in XY (not XZ) so the shader above can work
  // in the plane's own local space before the mesh is rotated flat.
  const geometry = new THREE.PlaneGeometry(100, 40, segments, segments);
  const uniforms = {
    uTime: { value: 0 },
    uMap: { value: texture },
    uNightWeight: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  // z/position chosen so the painted plate's own fading top 15% (see
  // phase-03's "W07 gần như đục" note) lands on the painted-layers'
  // waterline instead of hard-cutting against the karst bases.
  mesh.position.set(0, -1.3, -6);
  mesh.renderOrder = 7;
  scene.add(mesh);

  return {
    mesh,
    update(dt: number) {
      uniforms.uTime.value += dt;
    },
    setNightWeight(weight: number) {
      uniforms.uNightWeight.value = weight;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
