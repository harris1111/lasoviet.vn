import * as THREE from "three";

import { troiNamAsset } from "../troi-nam-assets";
import { referenceDawnFraming } from "./troi-nam-world-chapters";
import { loadWorldTexture, type WorldTextures } from "./troi-nam-world-textures";

/**
 * The sky: three painted plates (W01 dawn / W02 dusk / W03 night — real
 * Milky Way photography, not a procedural gradient) cross-faded by opacity
 * per `setPhase`, using the effects contract's exact weight formula
 * (`1-dusk`, `dusk*(1-night)`, `night`). Locked to the camera's position
 * every frame (`followCamera`) so it never visibly translates — only the
 * karst/water/foreground layers in front of it carry parallax.
 *
 * Sun rays and mist moved to troi-nam-world-layers.ts (mist) and
 * troi-nam-world-rays.ts (real occlusion-masked god rays, Phase 4).
 *
 * `followCamera` billboards the sky (position AND rotation), unlike the
 * karst/water/foreground layers which stay fixed in world orientation for
 * real parallax. These single authored vistas aren't a panorama meant to be
 * looked around inside, so a billboard is simpler and cheaper than oversizing
 * a fixed-orientation plane to cover the camera's tilt across phases — see
 * fillFootprint's doc comment for why that oversizing approach was dropped
 * for the karst/foreground layers too.
 */

export type DawnLightPhase = { dusk: number; night: number };

export type DawnLight = {
  group: THREE.Group;
  setPhase(phase: DawnLightPhase): void;
  /** Sky brightness multiplier, 1 = as painted. Scales the plates' colour, so it costs nothing per frame. */
  setExposure(value: number): void;
  resize(aspect: number): void;
  dispose(): void;
};

const SKY_DISTANCE = 60; // z offset behind the camera, in view space, along -look
const SKY_TEXTURE_ASPECT = 16 / 9; // close enough for a cloud/star photo — unlike rock, mild stretch here is imperceptible

export function createDawnLight(scene: THREE.Scene, textures: WorldTextures): DawnLight {
  const group = new THREE.Group();
  const disposables: Array<{ dispose(): void }> = [];
  const sharedGeometry = new THREE.PlaneGeometry(1, 1);
  disposables.push(sharedGeometry);

  const skyMeshes: Record<"dawn" | "dusk" | "night", THREE.Mesh> = {} as never;
  (["dawn", "dusk", "night"] as const).forEach((key, i) => {
    const asset = troiNamAsset(key === "dawn" ? "W01" : key === "dusk" ? "W02" : "W03");
    const texture = loadWorldTexture(asset.src, textures);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(sharedGeometry, material);
    // Tiny per-plate z offset gives the depth test a stable draw order
    // between otherwise-coplanar transparent quads instead of z-fighting.
    mesh.position.z = -SKY_DISTANCE - i * 0.02;
    // Transparent sorting must place every sky plate below cloud, sun, karst and foreground.
    mesh.renderOrder = i - 3;
    group.add(mesh);
    skyMeshes[key] = mesh;
    disposables.push(material);
  });
  // Dawn starts fully opaque (p=0 has no dusk/night yet); the others start
  // transparent so setPhase's first real call is the only cross-fade.
  (skyMeshes.dusk.material as THREE.MeshBasicMaterial).opacity = 0;
  (skyMeshes.night.material as THREE.MeshBasicMaterial).opacity = 0;

  function resize(aspect: number): void {
    // Not `fillFootprint`: that helper measures distance as (reference
    // camera z) - (world-space planeZ), but the sky's plane follows the
    // camera (`followCamera`) so its distance from the camera is always
    // exactly SKY_DISTANCE, not SKY_DISTANCE plus the camera's own z. No
    // tilt margin needed here — see the billboard note above — so this is
    // just "big enough to fill the frustum at this distance", cover-fit
    // against the viewport's own aspect (not just the texture's), so an
    // ultrawide viewport (e.g. 2560x1080, aspect ~2.37) doesn't leave bare
    // canvas on both sides past the old fixed 16:9-multiple-of-height sizing
    // (found in the 2026-10-01 review).
    const { fov } = referenceDawnFraming(aspect);
    const halfFovRad = THREE.MathUtils.degToRad(fov / 2);
    const height = 2 * SKY_DISTANCE * Math.tan(halfFovRad) * 1.15 * Math.max(1, aspect / SKY_TEXTURE_ASPECT);
    const width = height * SKY_TEXTURE_ASPECT;
    for (const mesh of Object.values(skyMeshes)) mesh.scale.set(width, height, 1);
  }
  resize(1);

  scene.add(group);

  return {
    group,
    setPhase({ dusk, night }) {
      (skyMeshes.dawn.material as THREE.MeshBasicMaterial).opacity = 1 - dusk;
      (skyMeshes.dusk.material as THREE.MeshBasicMaterial).opacity = dusk * (1 - night);
      (skyMeshes.night.material as THREE.MeshBasicMaterial).opacity = night;
    },
    setExposure(value) {
      for (const mesh of Object.values(skyMeshes)) (mesh.material as THREE.MeshBasicMaterial).color.setScalar(value);
    },
    resize,
    dispose() {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Billboards the sky to the camera (position and rotation) so it always exactly fills the frame regardless of the camera's tilt — call once per frame after the camera's pose is set. */
export function followCamera(light: DawnLight, camera: THREE.Camera): void {
  light.group.position.copy(camera.position);
  light.group.quaternion.copy(camera.quaternion);
}
