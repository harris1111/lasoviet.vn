import * as THREE from "three";

type Loader = Pick<THREE.TextureLoader, "load">;
export type WorldTextures = ReturnType<typeof createWorldTextures>;

/** A factory-local load barrier and owner; failed required art never reveals a blank world. */
export function createWorldTextures(loader: Loader = new THREE.TextureLoader()) {
  const owned = new Set<THREE.Texture>();
  const pending: Promise<void>[] = [];
  let disposed = false;
  return {
    load(url: string): THREE.Texture {
      if (disposed) throw new Error("World texture scope is disposed");
      let texture: THREE.Texture;
      const promise = new Promise<void>((resolve, reject) => {
        texture = loader.load(url, (loaded) => {
          if (disposed) loaded.dispose();
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
      return texture!;
    },
    async ready() {
      await Promise.all(pending);
      if (disposed) throw new Error("World texture load cancelled");
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const texture of owned) texture.dispose();
      owned.clear();
    },
  };
}

export function loadWorldTexture(url: string, textures: WorldTextures): THREE.Texture {
  return textures.load(url);
}

export function applyAnisotropy(texture: THREE.Texture, renderer: THREE.WebGLRenderer): void {
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
}
