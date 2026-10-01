import * as THREE from "three";

import type { RayOccluder } from "./troi-nam-world-layers";

const fullscreenVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const rayFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMask;
  uniform vec2 uSun;
  uniform vec2 uResolution;
  void main() {
    vec2 stepUv = (uSun - vUv) / 28.0;
    vec2 sampleUv = vUv;
    float light = 0.0;
    float weight = 1.0;
    float normalization = 0.0;
    for (int i = 0; i < 28; i++) {
      sampleUv += stepUv;
      // Sampling outside the viewport must not extend its last white texel indefinitely.
      float inside = step(0.0, sampleUv.x) * step(sampleUv.x, 1.0) * step(0.0, sampleUv.y) * step(sampleUv.y, 1.0);
      vec2 safeUv = clamp(sampleUv, 0.5 / uResolution, 1.0 - 0.5 / uResolution);
      light += texture2D(uMask, safeUv).r * weight * inside;
      normalization += weight;
      weight *= 0.95;
    }
    float radial = 1.0 - smoothstep(0.0, 1.25, distance(vUv, uSun));
    gl_FragColor = vec4(vec3(light / normalization * radial), 1.0);
  }
`;
const compositeFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uRays;
  uniform sampler2D uMask;
  uniform float uStrength;
  uniform float uMaskOnly;
  void main() {
    vec4 scene = texture2D(uScene, vUv);
    vec3 light = vec3(0.0);
    if (uStrength > 0.0) {
      float mask = texture2D(uMask, vUv).r;
      // Opaque rocks/leaves retain their contrast; rays remain mostly in open sky.
      light = vec3(1.0, 0.68, 0.28) * texture2D(uRays, vUv).r * uStrength * mix(0.035, 1.0, mask);
    }
    // Disabled rays may have uninitialized targets; never sample them for the base colour.
    gl_FragColor = vec4(scene.rgb + light, scene.a);
    if (uMaskOnly > 0.5) gl_FragColor = vec4(vec3(texture2D(uMask, vUv).r), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function projectedSun(camera: THREE.PerspectiveCamera, source: THREE.Vector3, progress: number, scratch: THREE.Vector3, uv: THREE.Vector2): number {
  if (progress >= 0.6) return 0;
  scratch.copy(source).applyMatrix4(camera.matrixWorldInverse);
  if (scratch.z >= -camera.near) return 0;
  scratch.copy(source).project(camera);
  uv.set(scratch.x * 0.5 + 0.5, scratch.y * 0.5 + 0.5);
  const edgeFade = 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(scratch.x), Math.abs(scratch.y)), 1, 1.4);
  return 0.2 * (1 - THREE.MathUtils.smoothstep(progress, 0.3, 0.6)) * edgeFade;
}

/**
 * All intermediate values are linear. Only the final screen pass converts
 * output colour. `occluders` carries one entry per mesh that should read as
 * "not open sky" in the mask pass — karst/foreground layers with their real
 * alpha cutout (`map`), and the water plane with `map: null` (no cutout: the
 * whole plane occludes). Water was originally left out of this list, which
 * made the mask pass treat its entire visible area as open sky and wash the
 * whole lake in flat additive light instead of real mountain-cut rays (found
 * in the Phase 4/5 integration review, 2026-10-01).
 */
export function createWorldRays(occluders: RayOccluder[]) {
  // `samples` restores MSAA for the ray-composited path: rendering the scene
  // to an unmultisampled target (the only option before this) silently lost
  // the renderer's own antialias:true on every high-tier frame with rays on.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 });
  const maskTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const rayTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const maskScene = new THREE.Scene();
  maskScene.background = new THREE.Color(0xffffff);
  const maskMeshes = occluders.map(({ mesh: source, map }) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, map: map ?? undefined, alphaTest: map ? 0.1 : 0, depthTest: false, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(source.geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    maskScene.add(mesh);
    return { source, mesh };
  });
  const camera = new THREE.Camera();
  const quadScene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const rayUniforms = { uMask: { value: maskTarget.texture }, uSun: { value: new THREE.Vector2() }, uResolution: { value: new THREE.Vector2(1, 1) } };
  const rayMaterial = new THREE.ShaderMaterial({ vertexShader: fullscreenVertex, fragmentShader: rayFragment, uniforms: rayUniforms, depthTest: false, depthWrite: false });
  const compositeUniforms = { uScene: { value: sceneTarget.texture }, uRays: { value: rayTarget.texture }, uMask: { value: maskTarget.texture }, uStrength: { value: 0 }, uMaskOnly: { value: 0 } };
  const compositeMaterial = new THREE.ShaderMaterial({ vertexShader: fullscreenVertex, fragmentShader: compositeFragment, uniforms: compositeUniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(geometry, rayMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const bufferSize = new THREE.Vector2();
  const scratch = new THREE.Vector3();
  let width = 1;
  let height = 1;
  let lastCpuMs = 0;
  return {
    get dimensions() { return { width, height }; },
    get cpuMs() { return lastCpuMs; },
    resize(renderer: THREE.WebGLRenderer) {
      renderer.getDrawingBufferSize(bufferSize);
      sceneTarget.setSize(bufferSize.x, bufferSize.y);
      width = Math.max(1, Math.floor(bufferSize.x / 2));
      height = Math.max(1, Math.floor(bufferSize.y / 2));
      maskTarget.setSize(width, height);
      rayTarget.setSize(width, height);
      rayUniforms.uResolution.value.set(width, height);
    },
    render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, view: THREE.PerspectiveCamera, sun: THREE.Vector3, progress: number, maskOnly: boolean, enabled = true) {
      const started = performance.now();
      const strength = enabled && !maskOnly ? projectedSun(view, sun, progress, scratch, rayUniforms.uSun.value) : 0;
      if (strength > 0 || maskOnly) {
        for (const { source, mesh } of maskMeshes) {
          source.updateWorldMatrix(true, false);
          mesh.matrix.copy(source.matrixWorld);
        }
        renderer.setRenderTarget(maskTarget);
        renderer.render(maskScene, view);
      }
      if (strength > 0) {
        renderer.setRenderTarget(rayTarget);
        quad.material = rayMaterial;
        renderer.render(quadScene, camera);
      }
      // High tier keeps alpha blending linear regardless of ray envelope or debug toggles.
      renderer.setRenderTarget(sceneTarget);
      renderer.render(scene, view);
      renderer.setRenderTarget(null);
      compositeUniforms.uStrength.value = strength;
      compositeUniforms.uMaskOnly.value = maskOnly ? 1 : 0;
      quad.material = compositeMaterial;
      renderer.render(quadScene, camera);
      lastCpuMs = performance.now() - started;
    },
    dispose() {
      sceneTarget.dispose(); maskTarget.dispose(); rayTarget.dispose(); geometry.dispose(); rayMaterial.dispose(); compositeMaterial.dispose();
      maskMeshes.forEach(({ mesh }) => mesh.material.dispose());
    },
  };
}
