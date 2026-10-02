import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createDawnLight } from './troi-nam-world-light';
import { createPaintedWorld } from './troi-nam-world-layers';
import { createWorldTextures } from './troi-nam-world-textures';
import { worldThemeConfig } from './troi-nam-world-theme-config';

function scope() {
  const urls: string[] = [];
  const textures = createWorldTextures({ load(url) { urls.push(url); return new THREE.Texture(); } });
  return { urls, textures };
}
describe('painted light world', () => {
  it('keeps the light solar disc until the chart chapter and fades it there', () => {
    const { textures } = scope(); const scene = new THREE.Scene();
    const world = createPaintedWorld(scene, { quality: 'low', textures, config: worldThemeConfig('light', 'low') });
    const sun = world.group.children.find(mesh => mesh.position.equals(world.sun)) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    world.setPhase({ dusk: 1, night: 1, chart: 0 });
    expect(sun.material.opacity).toBe(.35);
    world.setPhase({ dusk: 1, night: 1, chart: .5 });
    expect(sun.material.opacity).toBe(.175);
    world.dispose(); textures.dispose();
  });
  it('keeps dawn opaque beneath fractional daytime/afternoon plates', () => {
    const { textures } = scope(); const scene = new THREE.Scene();
    const sky = createDawnLight(scene, textures, worldThemeConfig('light', 'low'));
    sky.setPhase({ dusk: .5, night: .25 });
    const opacity = sky.group.children.map(mesh => ((mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity);
    expect(opacity).toEqual([1, .5, .25]); sky.dispose(); textures.dispose();
  });
  it('preserves three independent mist UV crops and installs remaps without night tint', () => {
    const { textures } = scope(); const scene = new THREE.Scene();
    const world = createPaintedWorld(scene, { quality: 'high', textures, config: worldThemeConfig('light', 'high') });
    const mist = world.group.children.filter(mesh => (mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.map?.userData.sourceId === 'T11') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
    expect(mist).toHaveLength(3);
    expect(new Set(mist.map(mesh => mesh.material.map))).toHaveLength(3);
    expect(mist.map(mesh => mesh.material.map!.repeat.toArray())).toEqual([[1, .33], [.49, .34], [.4, .23]]);
    world.setPhase({ dusk: 1, night: 1 });
    for (const mesh of mist) { expect(mesh.material.color.getHex()).toBe(0xffffff); expect(mesh.material.userData.lsvLightRemap).toBe(true); }
    world.dispose(); textures.dispose();
  });
  it('uses one light fleck URL and explicit low derivatives rather than dark plates', () => {
    const config = worldThemeConfig('light', 'low');
    expect(config.asset('W01').src).toMatch(/640w\.webp$/);
    expect(config.asset('W01').src).toContain('/light/');
    expect(config.asset('W11.hat-sao-1').src).toBe(config.asset('W11.hat-sao-6').src);
    expect(config.rays).toBe(false); expect(config.lanternHalo).toBe(false);
  });
});
