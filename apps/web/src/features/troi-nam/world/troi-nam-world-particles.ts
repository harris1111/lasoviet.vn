import * as THREE from "three";
import { troiNamAsset } from "../troi-nam-assets";
import { mulberry32 } from "./troi-nam-world-rng";
import type { WorldTextures } from "./troi-nam-world-textures";
import type { WorldQuality } from "./troi-nam-world-types";

export function createWorldParticles(scene: THREE.Scene, textures: WorldTextures, seed: number, initialQuality: WorldQuality) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1, 1);
  // One isolated large painted fragment near the upper-left of T03.
  const fragmentTexture = textures.load(troiNamAsset("T03").src);
  fragmentTexture.repeat.set(0.21, 0.18);
  fragmentTexture.offset.set(0.02, 0.8);
  const goldMaterial = new THREE.MeshBasicMaterial({ map: fragmentTexture, transparent: true, depthWrite: false, opacity: 0 });
  const fragments = new THREE.InstancedMesh(geometry, goldMaterial, initialQuality === "high" ? 40 : 15);
  fragments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fragments.frustumCulled = false;
  fragments.renderOrder = 12;
  group.add(fragments);
  const rng = mulberry32(seed * 5 + 19);
  const seeds = Array.from({ length: fragments.count }, () => ({ x: rng(), y: rng(), z: rng(), turn: rng() * Math.PI * 2, size: 0.08 + rng() * 0.14 }));
  const lanternIds = ["kem", "hong", "do", "vang"];
  // Each lantern photo has its own real aspect ratio (~1.17-1.30:1, not
  // square) — a bare scale.setScalar() below used to squash them into a
  // square, visibly distorting the lantern shape (Phase 4/5 integration
  // review, 2026-10-01). aspect[i] corrects the X scale per material.
  const lanternAssets = lanternIds.map((color) => troiNamAsset(`E02.hoa-dang-${color}`));
  const lanternAspect = lanternAssets.map((asset) => (asset.width ?? 1) / (asset.height ?? 1));
  const lanternMaterials = lanternAssets.map((asset) => new THREE.MeshBasicMaterial({ map: textures.load(asset.src), transparent: true, depthWrite: false, opacity: 0 }));
  const haloMaterial = new THREE.MeshBasicMaterial({ map: textures.load(troiNamAsset("W10").src), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const lanterns = Array.from({ length: initialQuality === "high" ? 8 : 5 }, (_, index) => {
    const variant = index % 4;
    const mesh = new THREE.Mesh(geometry, lanternMaterials[variant]!);
    const halo = new THREE.Mesh(geometry, haloMaterial);
    mesh.renderOrder = 13;
    halo.renderOrder = 12;
    group.add(mesh, halo);
    return { mesh, halo, variant, x: (rng() - 0.5) * 13, z: -2 - rng() * 6, phase: rng() * Math.PI * 2 };
  });
  const transform = new THREE.Object3D();
  let quality = initialQuality;
  scene.add(group);
  return {
    setQuality(next: WorldQuality) { quality = next; fragments.count = Math.min(seeds.length, next === "high" ? 40 : 15); },
    setProgress(progress: number) {
      const weight = THREE.MathUtils.smoothstep(progress, 0.45, 0.51) * (1 - THREE.MathUtils.smoothstep(progress, 0.69, 0.75));
      goldMaterial.opacity = weight * 0.7;
      fragments.visible = weight > 0;
      if (fragments.visible) {
        for (let i = 0; i < fragments.count; i++) {
          const particle = seeds[i]!;
          transform.position.set((particle.x - 0.5) * 15 + Math.sin(progress * 6 + particle.turn) * 0.6, 7 - ((particle.y + progress * 1.4) % 1) * 10, -1 - particle.z * 9);
          transform.rotation.set(0, progress * 3 + particle.turn, particle.turn + progress * 4);
          transform.scale.setScalar(particle.size);
          transform.updateMatrix();
          fragments.setMatrixAt(i, transform.matrix);
        }
        fragments.instanceMatrix.needsUpdate = true;
      }
      const lanternWeight = THREE.MathUtils.smoothstep(progress, 0.72, 0.82) * (1 - THREE.MathUtils.smoothstep(progress, 0.93, 1));
      lanternMaterials.forEach((material) => { material.opacity = lanternWeight * 0.85; });
      haloMaterial.opacity = lanternWeight * 0.16;
      lanterns.forEach((lantern, index) => {
        lantern.mesh.visible = lantern.halo.visible = lanternWeight > 0 && (quality === "high" || index < 5);
        lantern.mesh.position.set(lantern.x + Math.sin(progress * 3 + lantern.phase) * 0.5, -0.98 + Math.sin(progress * 6 + lantern.phase) * 0.04, lantern.z);
        const aspect = lanternAspect[lantern.variant]!;
        lantern.mesh.scale.set(0.44 * aspect, 0.44, 1);
        lantern.halo.position.copy(lantern.mesh.position);
        lantern.halo.position.z -= 0.01;
        lantern.halo.scale.setScalar(0.85);
      });
    },
    dispose() { scene.remove(group); geometry.dispose(); goldMaterial.dispose(); haloMaterial.dispose(); lanternMaterials.forEach((material) => material.dispose()); },
  };
}
