import * as THREE from "three";

type Loader = Pick<THREE.TextureLoader, "load">;
export type WorldTextures = ReturnType<typeof createWorldTextures>;

/** A factory-local load barrier and owner; failed required art never reveals a blank world. */
export function createWorldTextures(loader: Loader = new THREE.TextureLoader()) {
  const owned = new Set<THREE.Texture>();
  const cached = new Map<string, THREE.Texture<HTMLImageElement>>();
  const clones = new Map<string, THREE.Texture<HTMLImageElement>[]>();
  const pending: Promise<void>[] = [];
  let disposed = false;
  return {
    load(url: string, mutable = false): THREE.Texture<HTMLImageElement> {
      if (disposed) throw new Error("World texture scope is disposed");
      const existing = cached.get(url);
      if (existing) {
        if (!mutable) return existing;
        const clone = existing.clone();
        owned.add(clone);
        const siblings = clones.get(url) ?? [];
        siblings.push(clone); clones.set(url, siblings);
        return clone;
      }
      let texture: THREE.Texture<HTMLImageElement>;
      const promise = new Promise<void>((resolve, reject) => {
        texture = loader.load(url, (loaded) => {
          if (disposed) loaded.dispose();
          else for (const clone of clones.get(url) ?? []) { clone.image = loaded.image; clone.needsUpdate = true; }
          resolve();
        }, undefined, (error) => reject(error instanceof Error ? error : new Error(`Required world texture failed: ${url}`)));
      });
      // A synchronous construction exception may happen before ready() attaches its barrier.
      void promise.catch(() => undefined);
      pending.push(promise);
      texture!.colorSpace = THREE.SRGBColorSpace;
      texture!.generateMipmaps = true;
      texture!.minFilter = THREE.LinearMipmapLinearFilter;
      texture!.magFilter = THREE.LinearFilter;
      owned.add(texture!);
      cached.set(url, texture!);
      return texture!;
    },
    async ready() {
      await Promise.all(pending);
      if (disposed) throw new Error("World texture load cancelled");
    },
    get decodedBytes() {
      let bytes = 0;
      for (const texture of owned) {
        const image = texture.image as { width?: number; height?: number } | undefined;
        bytes += (image?.width ?? 0) * (image?.height ?? 0) * 4 * (texture.generateMipmaps ? 4 / 3 : 1);
      }
      return Math.ceil(bytes);
    },
    get count() { return owned.size; },
    validateDimensions(maxTextureSize: number) {
      for (const texture of owned) {
        const image = texture.image as { width?: number; height?: number } | undefined;
        if ((image?.width ?? 0) > maxTextureSize || (image?.height ?? 0) > maxTextureSize) throw new Error("World image exceeds GPU maxTextureSize");
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of owned) texture.dispose();
      owned.clear();
      cached.clear(); clones.clear();
    },
  };
}

export function loadWorldTexture(url: string, textures: WorldTextures): THREE.Texture {
  return textures.load(url);
}

export function applyAnisotropy(texture: THREE.Texture, renderer: THREE.WebGLRenderer): void {
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
}
