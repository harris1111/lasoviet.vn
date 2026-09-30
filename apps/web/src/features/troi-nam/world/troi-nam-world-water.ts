import * as THREE from "three";

/**
 * One broad water plane: a small vertex-shader ripple plus a stylized gold
 * reflection streak in the fragment shader, not a real planar-reflection
 * render pass (budget in the effects contract explicitly rules that out as
 * the default). `update(dt)` only advances a time uniform — the shader has
 * no per-frame CPU/JS work.
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  uniform float uTime;
  void main() {
    vec3 pos = position;
    pos.z += sin(pos.x * 0.8 + uTime * 0.6) * 0.035 + sin(pos.y * 1.3 - uTime * 0.4) * 0.02;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vWorldPos;
  uniform float uTime;
  uniform vec3 uColorDeep;
  uniform vec3 uColorGold;
  uniform float uNightWeight;

  void main() {
    // A soft reflection path under the sun, narrow far away and wider near
    // the camera (world z close to the camera's +z) — a stylized stand-in
    // for a mirrored sun path, not a real reflection. Broken into ripple
    // segments along its length instead of one solid triangle of light.
    // The sun's gone by night, so uNightWeight fades the streak out.
    float streakCenter = 1.6;
    float bandWidth = clamp(0.22 + (vWorldPos.z + 22.0) * 0.045, 0.18, 1.4);
    float dist = abs(vWorldPos.x - streakCenter);
    float streak = smoothstep(bandWidth, 0.0, dist);
    float ripple = smoothstep(0.1, 0.9, 0.5 + 0.5 * sin(vWorldPos.z * 14.0 + uTime * 1.8));
    streak *= mix(0.12, 1.0, ripple) * (1.0 - uNightWeight * 0.9);

    vec3 horizonGlow = vec3(0.42, 0.26, 0.11);
    float nearHorizon = smoothstep(-8.0, -22.0, vWorldPos.z);
    vec3 base = mix(uColorDeep, horizonGlow, nearHorizon * 0.4 * (1.0 - uNightWeight));
    vec3 nightBase = vec3(0.02, 0.025, 0.05);
    base = mix(base, nightBase, uNightWeight);

    vec3 color = mix(base, uColorGold, clamp(streak, 0.0, 1.0) * 0.85);
    float fade = smoothstep(-24.0, -4.0, vWorldPos.z);
    gl_FragColor = vec4(color, mix(0.55, 0.92, fade));
  }
`;

export type Water = {
  mesh: THREE.Mesh;
  update(dt: number): void;
  setNightWeight(weight: number): void;
  dispose(): void;
};

export function createWater(scene: THREE.Scene, { quality }: { quality: "low" | "high" }): Water {
  const segments = quality === "high" ? 48 : 16;
  // Plane geometry is authored in XY (not XZ) so the shaders above can work
  // in the plane's own local space before the mesh is rotated flat.
  // Deep and wide enough that its near edge still reaches past the camera
  // on a narrow/close phone framing (see applyResponsiveFraming) instead of
  // leaving a gap of bare canvas at the bottom of the frame.
  const geometry = new THREE.PlaneGeometry(100, 50, segments, segments);
  const uniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(0x0c0b12) },
    uColorGold: { value: new THREE.Color(0xf2dca0) },
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
  mesh.position.set(0, -1, -8);
  mesh.renderOrder = 100;
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
    },
  };
}
