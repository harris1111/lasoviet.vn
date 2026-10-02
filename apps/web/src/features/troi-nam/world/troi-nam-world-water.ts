import * as THREE from "three";

import { worldThemeConfig, type WorldThemeConfig } from "./troi-nam-world-theme-config";
import { applyAnisotropy, loadWorldTexture, type WorldTextures } from "./troi-nam-world-textures";

/**
 * W07 (mat-nuoc-tinh-phan-chieu-vang): a painted still-water plate with its
 * own gold reflection streak already in the artwork, not a procedurally
 * drawn one — the old version computed the streak in the fragment shader
 * because there was no photo to sample. A small vertex-shader ripple is all
 * that's left to do live; `update(time)` only advances a time uniform, no
 * per-frame CPU work. `time` is derived from scroll progress (not wall-clock
 * delta), so the same scroll position always reproduces the same ripple.
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
  uniform float uLight;
  uniform vec3 uPhaseTone;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    // The sun's reflection in the painting fades and cools toward a flat
    // moonlit tone as night rises — the same move the karst layers make.
    vec3 nightTone = tex.rgb * vec3(0.22, 0.26, 0.4) * 0.6;
    vec3 color = mix(tex.rgb, mix(nightTone, uPhaseTone, uLight), uNightWeight * mix(1.0, 0.08, uLight));
    // With flipY=true, vUv.y=1 samples the authored top edge.
    float seam = mix(1.0, smoothstep(0.0, 0.15, 1.0 - vUv.y), uLight);
    gl_FragColor = vec4(color, tex.a * seam);
    // A custom ShaderMaterial bypasses the automatic sRGB output conversion
    // that MeshBasicMaterial applies to the surrounding painted layers —
    // without this, W07 renders too dark/washed relative to them.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type Water = {
  mesh: THREE.Mesh;
  update(time: number): void;
  setNightWeight(weight: number): void;
  dispose(): void;
};

export function createWater(scene: THREE.Scene, { quality, renderer, textures, config = worldThemeConfig("dark", quality) }: { quality: "low" | "high"; renderer: THREE.WebGLRenderer; textures: WorldTextures; config?: WorldThemeConfig }): Water {
  const segments = quality === "high" ? 48 : 16;
  const asset = config.asset("W07");
  const texture = loadWorldTexture(asset.src, textures);
  applyAnisotropy(texture, renderer); // the one plane viewed at a shallow angle

  // Plane geometry is authored in XY (not XZ) so the shader above can work
  // in the plane's own local space before the mesh is rotated flat.
  const geometry = new THREE.PlaneGeometry(100, 40, segments, segments);
  const uniforms = {
    uTime: { value: 0 },
    uMap: { value: texture },
    uNightWeight: { value: 0 },
    uLight: { value: config.theme === "light" ? 1 : 0 },
    uPhaseTone: { value: new THREE.Color(config.phaseTone) },
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
    update(time: number) {
      uniforms.uTime.value = time;
    },
    setNightWeight(weight: number) {
      uniforms.uNightWeight.value = weight;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      // texture is owned and disposed by the shared WorldTextures scope.
    },
  };
}
