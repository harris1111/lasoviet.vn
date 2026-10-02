import * as THREE from "three";
import { troiNamAsset } from "../troi-nam-assets";
import { mulberry32 } from "./troi-nam-world-rng";
import type { WorldTextures } from "./troi-nam-world-textures";

const vertexShader = /* glsl */ `
  attribute vec3 aTarget;
  attribute float aPhase;
  attribute float aSize;
  attribute float aVariant;
  uniform float uChartWeight;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vTwinkle;
  varying float vVariant;
  void main() {
    vec3 pos = mix(position, aTarget, uChartWeight);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(aSize * (100.0 / max(-mvPosition.z, 0.1)), 2.0, 14.0) * uPixelRatio;
    vTwinkle = 0.65 + 0.35 * sin(uTime * 1.6 + aPhase);
    vVariant = aVariant;
  }
`;
const fragmentShader = /* glsl */ `
  uniform sampler2D uStar0;
  uniform sampler2D uStar1;
  uniform sampler2D uStar2;
  uniform sampler2D uStar3;
  uniform sampler2D uStar4;
  uniform sampler2D uStar5;
  uniform float uNightWeight;
  varying float vTwinkle;
  varying float vVariant;
  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    vec4 art;
    if (vVariant < 0.5) art = texture2D(uStar0, uv);
    else if (vVariant < 1.5) art = texture2D(uStar1, uv);
    else if (vVariant < 2.5) art = texture2D(uStar2, uv);
    else if (vVariant < 3.5) art = texture2D(uStar3, uv);
    else if (vVariant < 4.5) art = texture2D(uStar4, uv);
    else art = texture2D(uStar5, uv);
    gl_FragColor = vec4(art.rgb, art.a * uNightWeight * vTwinkle);
    if (gl_FragColor.a < 0.002) discard;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createStars(scene: THREE.Scene, { quality, seed, textures }: { quality: "low" | "high"; seed: number; textures: WorldTextures }) {
  const count = quality === "high" ? 1200 : 400;
  const rng = mulberry32(seed * 2 + 7);
  const start = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const variant = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    start[i * 3] = (rng() - 0.5) * 50;
    start[i * 3 + 1] = 2 + rng() * 16;
    start[i * 3 + 2] = -4 - rng() * 34;
    phase[i] = rng() * Math.PI * 2;
    size[i] = 1 + rng() * 2.2;
    variant[i] = i % 6;
  }
  targets.set(start);
  const geometry = new THREE.BufferGeometry();
  const targetAttribute = new THREE.BufferAttribute(targets, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", new THREE.BufferAttribute(start, 3));
  geometry.setAttribute("aTarget", targetAttribute);
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aVariant", new THREE.BufferAttribute(variant, 1));
  const uniforms = {
    uChartWeight: { value: 0 }, uNightWeight: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: 1 },
    ...Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`uStar${i}`, { value: textures.load(troiNamAsset(`W11.hat-sao-${i + 1}`).src) }])),
  };
  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 30;
  scene.add(points);
  let targetUploads = 0;
  return {
    points,
    get targetUploads() { return targetUploads; },
    setQuality(tier: "high" | "low") { geometry.setDrawRange(0, tier === "low" ? Math.min(400, count) : count); },
    setNightWeight(weight: number) { uniforms.uNightWeight.value = weight; points.visible = weight > 0; },
    setChartWeight(weight: number) { uniforms.uChartWeight.value = weight; },
    setPixelRatio(ratio: number) { uniforms.uPixelRatio.value = ratio; },
    setTargets(base: Float32Array) {
      for (let i = 0; i < count; i++) {
        const target = (i % 12) * 3;
        targets[i * 3] = base[target]!;
        targets[i * 3 + 1] = base[target + 1]!;
        targets[i * 3 + 2] = base[target + 2]!;
      }
      targetAttribute.needsUpdate = true;
      targetUploads++;
    },
    update(time: number) { uniforms.uTime.value = time; },
    dispose() { scene.remove(points); geometry.dispose(); material.dispose(); },
  };
}
export type Stars = ReturnType<typeof createStars>;
