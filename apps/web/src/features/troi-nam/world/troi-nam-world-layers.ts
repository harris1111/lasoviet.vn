import * as THREE from "three";

import { troiNamAsset } from "../troi-nam-assets";
import { fillFootprint, makeReferenceCamera, unprojectToPlane } from "./troi-nam-world-chapters";
import { loadWorldTexture } from "./troi-nam-world-textures";

/**
 * The painted karst/mist/foreground layers — flat image planes at different
 * depths, the scroll camera's own movement producing real parallax. No
 * code-drawn geometry: every pixel comes from a reviewed painting (see
 * docs/superpowers/plans/2026-10-01-troi-nam-painted-world/phase-03-painted-layer-world.md).
 *
 * Luật 1 (measured, not assumed): a plane that fills the frame has an
 * apparent size fixed by distance — z only buys parallax *rate*, never
 * apparent size. Luật 2: each karst image's own silhouette occupies a fixed
 * fraction of its own frame (W04 22.7%, W05 47.5%, W06 93%), so the only
 * real sizing control is `overscan` (how much wider than the viewport the
 * plane is) plus how far its anchored bottom edge sits below the waterline.
 * The `overscan` values below are not derived — they come from compositing
 * the real assets with Sharp and looking at the result (see the plan for
 * the two tuning passes that got here).
 */

export type PaintedWorldPhase = { dusk: number; night: number };

export type PaintedWorld = {
  group: THREE.Group;
  setPhase(phase: PaintedWorldPhase): void;
  resize(aspect: number): void;
  dispose(): void;
};

const WATERLINE_SCREEN = 0.5; // fraction up from the bottom of the p=0 frame; Luật 3
const NIGHT_COLOR = new THREE.Color(0x060812);
const WHITE = new THREE.Color(0xffffff);

type FillLayer = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  z: number;
  overscan: number;
  textureAspect: number;
  anchor: "waterline" | "frameCenter";
  // Where the designed rectangle's bottom edge sits, as a fraction of its
  // own designedHeight above the anchor line. Negative dips it below.
  bottomOffsetFrac: number;
  nightTint: number; // 0 = untouched by night, 1 = fully tinted/dimmed like the old vector layers
  baseOpacity: number;
};

type SpriteLayer = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  baseOpacity: number;
  duskFade: boolean; // fades out across the dusk interval (the sun itself, gone once the sky turns to night)
};

export function createPaintedWorld(scene: THREE.Scene, { quality }: { quality: "low" | "high" }): PaintedWorld {
  const group = new THREE.Group();
  const disposables: Array<{ dispose(): void }> = [];
  const sharedGeometry = new THREE.PlaneGeometry(1, 1);
  disposables.push(sharedGeometry);

  const fillLayers: FillLayer[] = [];
  const spriteLayers: SpriteLayer[] = [];

  function addFillLayer(spec: {
    id: string;
    z: number;
    overscan: number;
    flip?: boolean;
    anchor: "waterline" | "frameCenter";
    bottomOffsetFrac: number;
    nightTint?: number;
    renderOrder: number;
    blending?: THREE.Blending;
    opacity?: number;
  }): void {
    const asset = troiNamAsset(spec.id);
    const texture = loadWorldTexture(asset.src);
    if (spec.flip) {
      // Horizontal mirror without re-exporting the file: W08's foliage frames
      // the top+left in the source, which sits directly over the hero copy
      // and birth form; flipped it frames top+right and leaves the left
      // half dark, matching docs/22-art-direction.md's "≥40% dark for copy".
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.offset.x = 1;
      texture.repeat.x = -1;
    }
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: spec.blending ?? THREE.NormalBlending,
      opacity: spec.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(sharedGeometry, material);
    mesh.renderOrder = spec.renderOrder;
    group.add(mesh);
    disposables.push(material, texture);

    fillLayers.push({
      mesh,
      material,
      z: spec.z,
      overscan: spec.overscan,
      textureAspect: (asset.width ?? 16) / (asset.height ?? 9),
      anchor: spec.anchor,
      bottomOffsetFrac: spec.bottomOffsetFrac,
      nightTint: spec.nightTint ?? 0,
      baseOpacity: spec.opacity ?? 1,
    });
  }

  function addSpriteLayer(spec: {
    id: string;
    position: THREE.Vector3;
    size: number; // world units, taller dimension
    renderOrder: number;
    opacity: number;
    duskFade?: boolean;
    blending?: THREE.Blending;
  }): void {
    const asset = troiNamAsset(spec.id);
    const texture = loadWorldTexture(asset.src);
    const aspect = (asset.width ?? 1) / (asset.height ?? 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: spec.opacity,
      blending: spec.blending ?? THREE.NormalBlending,
    });
    const mesh = new THREE.Mesh(sharedGeometry, material);
    mesh.position.copy(spec.position);
    mesh.scale.set(aspect >= 1 ? spec.size * aspect : spec.size, aspect >= 1 ? spec.size : spec.size / aspect, 1);
    mesh.renderOrder = spec.renderOrder;
    group.add(mesh);
    disposables.push(material, texture);
    spriteLayers.push({ mesh, material, baseOpacity: spec.opacity, duskFade: spec.duskFade ?? false });
  }

  // ---- Karst (Luật 2: overscan is the only real size control) ----
  // bottomOffsetFrac -0.01: the bottom edge dips 1% of its own height below
  // the waterline ("dìm bớt chân núi" — Luật 3).
  addFillLayer({ id: "W04", z: -26, overscan: 1.0, anchor: "waterline", bottomOffsetFrac: -0.01, nightTint: 0.85, renderOrder: 1 });
  addFillLayer({ id: "W05", z: -15, overscan: 1.06, anchor: "waterline", bottomOffsetFrac: -0.01, nightTint: 0.85, renderOrder: 3 });
  addFillLayer({ id: "W06", z: -6, overscan: 1.28, anchor: "waterline", bottomOffsetFrac: -0.01, nightTint: 0.85, renderOrder: 5 });

  // ---- Mist bands (T11, real alpha wisps) between the karst layers ----
  // Low tier skips the second band: two overlapping full-width transparent
  // layers are the cheapest thing here to cut for a GPU that's struggling.
  addFillLayer({ id: "T11", z: -20, overscan: 1.3, anchor: "waterline", bottomOffsetFrac: 0.15, nightTint: 0.3, renderOrder: 2, opacity: 0.55 });
  if (quality === "high") {
    addFillLayer({ id: "T11", z: -8, overscan: 1.3, anchor: "waterline", bottomOffsetFrac: 0.15, nightTint: 0.3, renderOrder: 4, opacity: 0.45 });
  }

  // ---- Foreground frame (W08, flipped so its foliage clears the copy) ----
  // bottomOffsetFrac -0.43: the designed rect's center sits 7% of its own
  // height above frame-center (the original artistic placement); bottom =
  // center - height/2 = +0.07 - 0.5.
  addFillLayer({ id: "W08", z: 3.2, overscan: 1.0, flip: true, anchor: "frameCenter", bottomOffsetFrac: -0.43, nightTint: 0.5, renderOrder: 9 });

  // ---- Mid-ground props: small sprites resting just above the waterline ----
  addSpriteLayer({ id: "W09.thuy-dinh-co", position: new THREE.Vector3(1.8, 0, -10), size: 1.6, renderOrder: 6, opacity: 0.9 });
  addSpriteLayer({ id: "W09.thuyen-nan-tren-nuoc", position: new THREE.Vector3(-2.4, -0.3, -9), size: 0.9, renderOrder: 6, opacity: 0.85 });

  // ---- Sun: a small additive glow, gone by the end of dusk (Phase 4 adds real occlusion rays from the same asset) ----
  addSpriteLayer({
    id: "W10",
    position: new THREE.Vector3(7, 7.5, -24),
    size: 6,
    renderOrder: 0,
    opacity: 0.8,
    duskFade: true,
    blending: THREE.AdditiveBlending,
  });

  function placeFillLayer(layer: FillLayer, aspect: number): void {
    const { designedWidth, designedHeight } = fillFootprint(aspect, layer.z, layer.overscan, layer.textureAspect);
    layer.mesh.scale.set(designedWidth, designedHeight, 1);

    const referenceCamera = makeReferenceCamera(aspect);
    const anchorNdcY = layer.anchor === "waterline" ? -1 + 2 * WATERLINE_SCREEN : 0;
    const anchorLineY = unprojectToPlane(referenceCamera, 0, anchorNdcY, layer.z).y;
    const designedBottomY = anchorLineY + layer.bottomOffsetFrac * designedHeight;
    layer.mesh.position.set(0, designedBottomY + designedHeight / 2, layer.z);
  }

  function resize(aspect: number): void {
    for (const layer of fillLayers) placeFillLayer(layer, aspect);
  }
  resize(1); // a sane default before the stage's first real resize() call

  scene.add(group);

  return {
    group,
    setPhase({ dusk, night }) {
      for (const layer of fillLayers) {
        if (layer.nightTint <= 0) continue;
        const weight = night * layer.nightTint;
        layer.material.color.copy(WHITE).lerp(NIGHT_COLOR, weight);
        layer.material.opacity = layer.baseOpacity * (1 - weight * 0.4);
      }
      for (const sprite of spriteLayers) {
        if (!sprite.duskFade) continue;
        sprite.material.opacity = sprite.baseOpacity * Math.max(0, 1 - dusk);
      }
    },
    resize,
    dispose() {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}
