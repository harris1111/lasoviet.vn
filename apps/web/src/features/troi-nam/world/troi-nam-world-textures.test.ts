import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { createWorldTextures } from './troi-nam-world-textures';

it('shares a decoded URL while preserving independent mutable UVs and accounting for all instances', async () => {
  let finish: ((texture: THREE.Texture<HTMLImageElement>) => void) | undefined;
  const load = vi.fn((_url: string, ready?: (texture: THREE.Texture<HTMLImageElement>) => void) => { finish = ready; return new THREE.Texture<HTMLImageElement>(); });
  const scope = createWorldTextures({ load });
  const first = scope.load('/mist.webp', true);
  const second = scope.load('/mist.webp', true);
  const third = scope.load('/mist.webp', true);
  first.repeat.set(1, .33); second.repeat.set(.49, .34); third.repeat.set(.4, .23);
  first.image = { width: 512, height: 341 } as HTMLImageElement; finish!(first); await scope.ready();
  expect(load).toHaveBeenCalledOnce(); expect(second.image).toBe(first.image);
  expect([first, second, third].map(texture => texture.repeat.toArray())).toEqual([[1, .33], [.49, .34], [.4, .23]]);
  expect(scope.count).toBe(3); expect(scope.decodedBytes).toBe(2793472);
  scope.dispose(); expect(scope.decodedBytes).toBe(0);
});
it('reuses an immutable fleck texture and releases a late load after disposal', async () => {
  let finish: ((texture: THREE.Texture<HTMLImageElement>) => void) | undefined;
  const texture = new THREE.Texture<HTMLImageElement>(); const dispose = vi.spyOn(texture, 'dispose');
  const scope = createWorldTextures({ load(_url, ready) { finish = ready; return texture; } });
  const first = scope.load('/fleck.webp');
  for (let i = 0; i < 5; i++) expect(scope.load('/fleck.webp')).toBe(first);
  scope.dispose(); finish!(texture);
  await expect(scope.ready()).rejects.toThrow('cancelled'); expect(dispose).toHaveBeenCalled();
});
