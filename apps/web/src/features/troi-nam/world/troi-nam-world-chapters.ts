import * as THREE from "three";

import type { ScenePhases } from "../troi-nam-motion-math";

export type Pose = { position: THREE.Vector3; look: THREE.Vector3 };

/**
 * Four keyframe poses (dawn/dusk/night/chart), nested-lerped in temporal
 * order by the exact same `scenePhases(p)` weights that drive every other
 * scroll-scrubbed effect on this page — so the camera reaching a given p
 * always reproduces the same composition for a given aspect ratio. FOV and
 * distance also widen for narrow/close phone framing (a fixed FOV cropped
 * the range down to one peak on 390×844; fine at 1440×900).
 */
export function cameraFraming(aspect: number, phases: ScenePhases): { fov: number; pose: Pose } {
  const t = THREE.MathUtils.clamp((aspect - 0.45) / (1.6 - 0.45), 0, 1);
  const y = (narrow: number, wide: number) => THREE.MathUtils.lerp(narrow, wide, t);

  const dawn: Pose = { position: new THREE.Vector3(0, y(1.1, 1.4), y(10, 6)), look: new THREE.Vector3(0, 0.4, -6) };
  const dusk: Pose = { position: new THREE.Vector3(0, y(1.5, 1.8), y(9.5, 6.5)), look: new THREE.Vector3(0, 2.6, -9) };
  const night: Pose = { position: new THREE.Vector3(0, y(1.9, 2.2), y(9, 7)), look: new THREE.Vector3(0, 6.5, -16) };
  const chart: Pose = { position: new THREE.Vector3(0, y(2.6, 3), y(6.5, 5)), look: new THREE.Vector3(0, 3.2, -3) };

  const position = dawn.position.clone().lerp(dusk.position, phases.dusk).lerp(night.position, phases.night).lerp(chart.position, phases.chart);
  const look = dawn.look.clone().lerp(dusk.look, phases.dusk).lerp(night.look, phases.night).lerp(chart.look, phases.chart);
  const fov = THREE.MathUtils.lerp(66, 40, t);
  return { fov, pose: { position, look } };
}

/**
 * The dawn (p=0) pose for a given aspect — the fixed reference every painted
 * layer's world size is computed against (see troi-nam-world-layers.ts §Luật
 * 1/2). Plane geometry is sized once per aspect, not every frame, even
 * though the camera itself keeps moving through dusk/night/chart: the
 * overscan margins in the layout table exist precisely so a plane sized for
 * the dawn distance still covers the frame as the camera's actual z drifts
 * within the phases' range.
 */
export function referenceDawnFraming(aspect: number): { fov: number; cameraZ: number } {
  const { fov, pose } = cameraFraming(aspect, { dusk: 0, night: 0, chart: 0 });
  return { fov, cameraZ: pose.position.z };
}

/** A camera posed at the dawn framing for `aspect`, matrices up to date — for one-off world-space measurements (waterline, frame-center) at build/resize time, never in the render loop. */
export function makeReferenceCamera(aspect: number): THREE.PerspectiveCamera {
  const { fov, pose } = cameraFraming(aspect, { dusk: 0, night: 0, chart: 0 });
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
  camera.position.copy(pose.position);
  camera.lookAt(pose.look);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

/**
 * The size a plane at `planeZ` needs to cover the dawn (p=0) frustum, per
 * Luật 1/2: distance only buys parallax rate, so the only real sizing
 * control is `overscan`. Does not pad for the camera's tilt across later
 * phases (dusk/night tilt the look direction up to ~11°) — a first attempt
 * at that (both via `texture.repeat > 1` with ClampToEdgeWrapping, and via
 * a custom 3-row "clamp the padding region to the image's own top edge"
 * geometry) reproduced banded vertical-stripe rendering corruption on this
 * environment's software renderer (SwiftShader) whenever a padded layer was
 * on screen. Traced to the padding mechanism itself, not plane size alone
 * (a plain uniform stretch to a larger size rendered fine). Shipping without
 * the padding and checking render evidence for an actual gap, per the
 * plan's own "render it, then judge — don't guess" rule, rather than
 * sinking more budget into a fix for a software-renderer-specific artifact
 * that may not even reproduce on real hardware.
 */
export function fillFootprint(
  aspect: number,
  planeZ: number,
  overscan: number,
  textureAspect: number,
): { designedWidth: number; designedHeight: number } {
  const { fov, cameraZ } = referenceDawnFraming(aspect);
  const d = cameraZ - planeZ;
  const halfFovRad = THREE.MathUtils.degToRad(fov / 2);
  const visibleH = 2 * d * Math.tan(halfFovRad);
  const visibleW = visibleH * aspect;
  const designedWidth = overscan * visibleW;
  const designedHeight = designedWidth / textureAspect;
  return { designedWidth, designedHeight };
}

/** Screen-space ray from `camera` through NDC (x,y), intersected with the world plane z = planeZ. Shared by the chart-target projection and the painted layers' waterline/frame-center anchoring. */
export function unprojectToPlane(camera: THREE.PerspectiveCamera, ndcX: number, ndcY: number, planeZ: number): THREE.Vector3 {
  const near = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera);
  const far = new THREE.Vector3(ndcX, ndcY, 1).unproject(camera);
  const direction = far.sub(near);
  const t = direction.z === 0 ? 0 : (planeZ - near.z) / direction.z;
  return near.add(direction.multiplyScalar(t));
}
