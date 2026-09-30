import * as THREE from "three";

/**
 * Sky gradient, sun-shaft planes and mist bands — everything in the scene
 * that isn't karst rock, water or stars. All unlit/additive: cheap, and
 * this scene has no real point/directional light to cast (a stylized
 * lacquer painting, not a physically lit render).
 *
 * Dawn/dusk/night are three stacked, pre-baked sky gradients cross-fading
 * by opacity (`setPhase`) rather than one shader recomputed every frame —
 * matches the effects contract's exact weight formula
 * (`1-dusk`, `dusk*(1-night)`, `night`) and mirrors how the DOM hero
 * already crossfades its dawn/dusk plates.
 */

export type DawnLightPhase = { dusk: number; night: number };

export type DawnLight = {
  group: THREE.Group;
  setPhase(phase: DawnLightPhase): void;
  dispose(): void;
};

function verticalGradientTexture(stops: Array<[number, string]>): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function radialFalloffTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function createDawnLight(scene: THREE.Scene, { quality }: { quality: "low" | "high" }): DawnLight {
  const group = new THREE.Group();
  const disposables: Array<{ dispose(): void }> = [];

  // Sky: three stacked gradient planes (dawn/dusk/night), cross-faded by
  // setPhase. Tiny z offsets give the depth test a stable draw order
  // between coplanar transparent quads instead of z-fighting.
  const skyGeometry = new THREE.PlaneGeometry(140, 60);
  disposables.push(skyGeometry);
  const skyStops: Record<"dawn" | "dusk" | "night", Array<[number, string]>> = {
    dawn: [
      [0, "#0b0705"],
      [0.55, "#241708"],
      [0.82, "#7a4a1e"],
      [1, "#f2c37a"],
    ],
    dusk: [
      [0, "#06040a"],
      [0.5, "#1a0f1c"],
      [0.8, "#4a2a22"],
      [1, "#8a4a2a"],
    ],
    night: [
      [0, "#020203"],
      [0.6, "#05050a"],
      [1, "#0e0c16"],
    ],
  };
  const skyMeshes: Record<"dawn" | "dusk" | "night", THREE.Mesh> = {} as never;
  (["dawn", "dusk", "night"] as const).forEach((key, i) => {
    const texture = verticalGradientTexture(skyStops[key]);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(skyGeometry, material);
    mesh.position.set(4, 8, -34 - i * 0.02);
    mesh.renderOrder = i;
    group.add(mesh);
    skyMeshes[key] = mesh;
    disposables.push(material, texture);
  });
  // Dawn starts fully opaque (p=0 has no dusk/night yet); the others start
  // transparent so setPhase's first real call is the only cross-fade.
  (skyMeshes.dusk.material as THREE.MeshBasicMaterial).opacity = 0;
  (skyMeshes.night.material as THREE.MeshBasicMaterial).opacity = 0;

  // Sun rays: a small fan of tapered, additive gold beams from the glow
  // behind the peaks (upper-right, matching L01) down toward the water.
  // Recede through dusk — gone by the time night starts (setPhase).
  const rayTexture = verticalGradientTexture([
    [0, "rgba(242,220,160,0)"],
    [0.15, "rgba(242,220,160,0.9)"],
    [1, "rgba(242,220,160,0)"],
  ]);
  const rayCount = quality === "high" ? 5 : 3;
  const rayOrigin = new THREE.Vector3(6.5, 7.5, -18);
  const rayMaterials: THREE.MeshBasicMaterial[] = [];
  const rayBaseOpacity = 0.22;
  for (let i = 0; i < rayCount; i++) {
    const spread = (i / (rayCount - 1) - 0.5) * 0.9; // -0.45..0.45 rad fan
    const length = 20 + (i % 2) * 3;
    const rayGeometry = new THREE.PlaneGeometry(0.6, length);
    const rayMaterial = new THREE.MeshBasicMaterial({
      map: rayTexture,
      transparent: true,
      opacity: rayBaseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ray = new THREE.Mesh(rayGeometry, rayMaterial);
    ray.position.copy(rayOrigin);
    ray.position.x += spread * 4;
    ray.rotation.z = -0.55 + spread * 0.5;
    ray.renderOrder = 20 + i;
    group.add(ray);
    rayMaterials.push(rayMaterial);
    disposables.push(rayGeometry, rayMaterial);
  }
  disposables.push(rayTexture);

  // Mist: a couple of soft, wide translucent bands sitting between the
  // karst layers so the flat silhouettes read as depth/haze, not cutouts.
  const mistTexture = radialFalloffTexture();
  const mistBands = [
    { y: 0.4, z: -14, width: 60, height: 6, opacity: 0.16 },
    { y: 0.1, z: -22, width: 70, height: 8, opacity: 0.14 },
  ];
  const mistLayers: Array<{ material: THREE.MeshBasicMaterial; baseOpacity: number }> = [];
  for (const band of mistBands) {
    const mistGeometry = new THREE.PlaneGeometry(band.width, band.height);
    const mistMaterial = new THREE.MeshBasicMaterial({
      map: mistTexture,
      color: 0xcbb489,
      transparent: true,
      opacity: band.opacity,
      depthWrite: false,
    });
    const mist = new THREE.Mesh(mistGeometry, mistMaterial);
    mist.position.set(0, band.y, band.z);
    mist.renderOrder = 15;
    group.add(mist);
    mistLayers.push({ material: mistMaterial, baseOpacity: band.opacity });
    disposables.push(mistGeometry, mistMaterial);
  }
  disposables.push(mistTexture);

  scene.add(group);

  return {
    group,
    setPhase({ dusk, night }) {
      const dawnWeight = 1 - dusk;
      const duskWeight = dusk * (1 - night);
      (skyMeshes.dawn.material as THREE.MeshBasicMaterial).opacity = dawnWeight;
      (skyMeshes.dusk.material as THREE.MeshBasicMaterial).opacity = duskWeight;
      (skyMeshes.night.material as THREE.MeshBasicMaterial).opacity = night;

      const rayWeight = Math.max(0, 1 - dusk); // gone by the end of the dusk interval
      for (const material of rayMaterials) material.opacity = rayBaseOpacity * rayWeight;

      const mistWeight = 1 - night * 0.5;
      for (const layer of mistLayers) layer.material.opacity = layer.baseOpacity * mistWeight;
    },
    dispose() {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}
