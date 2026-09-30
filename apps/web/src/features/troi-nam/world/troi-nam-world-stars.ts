import * as THREE from "three";

import { mulberry32 } from "./troi-nam-world-rng";

/**
 * A fixed-size star buffer that morphs (on the GPU, via `uChartWeight`)
 * from a scattered night starfield toward a decorative twelve-cell motif —
 * the effects contract's "P01/P05-inspired intermediate ring... project
 * toward Explore's rectangular grid target when supplied". Positions are
 * precomputed once at creation/`setTargets`; the render loop only advances
 * a time uniform, so revisiting the same seed/p/viewport always reproduces
 * the same composition.
 *
 * The twelve targets mirror the real `.tn-explore .hv3-chart` layout: a
 * 4×4 grid with the center 2×2 empty (12 outer "palace" cells), not a
 * circle — `setTargets(null)` uses a centered version of that same layout
 * as the fallback when no chart rect has been measured yet.
 */

export type Stars = {
  points: THREE.Points;
  setNightWeight(weight: number): void;
  setChartWeight(weight: number): void;
  setTargets(worldPositions: Float32Array | null): void;
  update(dt: number): void;
  dispose(): void;
};

const vertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;
  attribute float aPhase;
  attribute float aSize;
  uniform float uChartWeight;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vec3 pos = mix(aStart, aTarget, uChartWeight);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(aSize * (90.0 / max(-mvPosition.z, 0.1)), 1.0, 9.0);
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform float uNightWeight;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float alpha = smoothstep(0.5, 0.0, length(uv)) * uNightWeight * vTwinkle;
    if (alpha <= 0.002) discard;
    gl_FragColor = vec4(0.97, 0.87, 0.62, alpha);
  }
`;

/** 12 outer cells of a centered 4x4 grid (skipping the middle 2x2) — the
 * decorative fallback used until a real chart rect is measured. */
function fallbackGridTargets(): Float32Array {
  const positions = new Float32Array(12 * 3);
  const cellW = 0.95;
  const cellH = 0.78;
  const originX = (-3 / 2) * cellW;
  const originY = 3.4 + (3 / 2) * cellH;
  let i = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (row >= 1 && row <= 2 && col >= 1 && col <= 2) continue;
      positions[i * 3 + 0] = originX + col * cellW;
      positions[i * 3 + 1] = originY - row * cellH;
      positions[i * 3 + 2] = -3;
      i++;
    }
  }
  return positions;
}

export function createStars(scene: THREE.Scene, { quality, seed }: { quality: "low" | "high"; seed: number }): Stars {
  const count = quality === "high" ? 1200 : 400;
  // A different subsequence than terrain's rng (same seed would otherwise
  // correlate star scatter with ridge shape) but still deterministic.
  const rng = mulberry32(seed * 2 + 7);

  const aStart = new Float32Array(count * 3);
  const aTarget = new Float32Array(count * 3);
  const aPhase = new Float32Array(count);
  const aSize = new Float32Array(count);
  const jitter = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    aStart[i * 3 + 0] = (rng() - 0.5) * 50;
    aStart[i * 3 + 1] = 2 + rng() * 16;
    aStart[i * 3 + 2] = -4 - rng() * 34;
    aPhase[i] = rng() * Math.PI * 2;
    aSize[i] = 1 + rng() * 2.2;
    jitter[i * 3 + 0] = (rng() - 0.5) * 0.56;
    jitter[i * 3 + 1] = (rng() - 0.5) * 0.46;
    jitter[i * 3 + 2] = (rng() - 0.5) * 0.3;
  }

  const fallback = fallbackGridTargets();
  const applyTargets = (base: Float32Array) => {
    for (let i = 0; i < count; i++) {
      const cell = i % 12; // 0..11: always in bounds for a 12-cell (36-value) base buffer
      aTarget[i * 3 + 0] = base[cell * 3 + 0]! + jitter[i * 3 + 0]!;
      aTarget[i * 3 + 1] = base[cell * 3 + 1]! + jitter[i * 3 + 1]!;
      aTarget[i * 3 + 2] = base[cell * 3 + 2]! + jitter[i * 3 + 2]!;
    }
  };
  applyTargets(fallback);

  const geometry = new THREE.BufferGeometry();
  const targetAttribute = new THREE.BufferAttribute(aTarget, 3);
  // Three's non-indexed draw call reads its vertex count from the
  // "position" attribute even though this shader never reads it directly
  // (it mixes aStart/aTarget instead) — without it here, nothing draws.
  geometry.setAttribute("position", new THREE.BufferAttribute(aStart, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(aStart, 3));
  geometry.setAttribute("aTarget", targetAttribute);
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));

  const uniforms = {
    uChartWeight: { value: 0 },
    uNightWeight: { value: 0 },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // no "position" attribute to derive bounds from
  points.renderOrder = 30;
  scene.add(points);

  return {
    points,
    setNightWeight(weight: number) {
      uniforms.uNightWeight.value = weight;
    },
    setChartWeight(weight: number) {
      uniforms.uChartWeight.value = weight;
    },
    setTargets(worldPositions: Float32Array | null) {
      applyTargets(worldPositions && worldPositions.length === 36 ? worldPositions : fallback);
      targetAttribute.needsUpdate = true;
    },
    update(dt: number) {
      uniforms.uTime.value += dt;
    },
    dispose() {
      scene.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
