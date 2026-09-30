import * as THREE from "three";

/**
 * Dawn sky gradient, sun-shaft planes and mist bands — everything in the
 * scene that isn't karst rock or water. All unlit/additive: cheap, and this
 * scene has no real point/directional light to cast (Task 2 is a stylized
 * lacquer-painting dawn, not a physically lit render).
 */

export type DawnLight = {
  group: THREE.Group;
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

  // Sky: one large plane behind the karst layers, vertical gradient from
  // near-black lacquer at the top to a warm sun glow near the horizon.
  const skyTexture = verticalGradientTexture([
    [0, "#0b0705"],
    [0.55, "#241708"],
    [0.82, "#7a4a1e"],
    [1, "#f2c37a"],
  ]);
  const skyGeometry = new THREE.PlaneGeometry(140, 60);
  const skyMaterial = new THREE.MeshBasicMaterial({ map: skyTexture, depthWrite: false });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.position.set(4, 8, -34);
  group.add(sky);
  disposables.push(skyGeometry, skyMaterial, skyTexture);

  // Sun rays: a small fan of tapered, additive gold beams from the glow
  // behind the peaks (upper-right, matching L01) down toward the water.
  const rayTexture = verticalGradientTexture([
    [0, "rgba(242,220,160,0)"],
    [0.15, "rgba(242,220,160,0.9)"],
    [1, "rgba(242,220,160,0)"],
  ]);
  const rayCount = quality === "high" ? 5 : 3;
  const rayOrigin = new THREE.Vector3(6.5, 7.5, -18);
  for (let i = 0; i < rayCount; i++) {
    const spread = (i / (rayCount - 1) - 0.5) * 0.9; // -0.45..0.45 rad fan
    const length = 20 + (i % 2) * 3;
    const rayGeometry = new THREE.PlaneGeometry(0.6, length);
    const rayMaterial = new THREE.MeshBasicMaterial({
      map: rayTexture,
      transparent: true,
      opacity: 0.22,
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
    disposables.push(mistGeometry, mistMaterial);
  }
  disposables.push(mistTexture);

  scene.add(group);

  return {
    group,
    dispose() {
      scene.remove(group);
      disposables.forEach((d) => d.dispose());
    },
  };
}
