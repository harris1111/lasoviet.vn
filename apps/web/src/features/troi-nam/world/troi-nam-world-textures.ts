import * as THREE from "three";

/**
 * One loader shared by every painted layer, with the settings that matter
 * for a photo texture on a flat plane (`3d-high-resolution-textures`):
 * sRGB color space (the single most common silent bug — skip it and every
 * photo reads washed out against the scene's linear lighting math), real
 * mipmaps so a distant/shrunk layer doesn't alias, and anisotropic
 * filtering only where a plane is viewed at a shallow angle (the water).
 *
 * The total payload here (~870 KB across 17 files) is small enough that a
 * formal priority-loading queue isn't worth building: the browser's own
 * HTTP/2 connection handling already parallelizes this fine. `three.js`'s
 * `TextureLoader` returns a texture synchronously (initially blank) and
 * fills it in on load, so the first rendered frame never blocks on these —
 * exactly the "poster now, real asset when ready" behavior this skill asks
 * for, without extra machinery.
 */
export function loadWorldTexture(url: string): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** Call once the renderer exists, for the one plane (water) viewed at a shallow angle. Capped at 4: anisotropy improves oblique sampling, it doesn't add source detail, so the maximum the device offers is rarely worth its cost. */
export function applyAnisotropy(texture: THREE.Texture, renderer: THREE.WebGLRenderer): void {
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
}
