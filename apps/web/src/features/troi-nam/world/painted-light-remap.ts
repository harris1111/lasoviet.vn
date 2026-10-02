import * as THREE from 'three';
import type { PaintedPalette } from './troi-nam-world-theme-config';

export function installPaintedLightRemap(material: THREE.MeshBasicMaterial, palette: PaintedPalette | undefined) {
  if (!palette) return;
  if (material.userData.lsvLightRemap) throw new Error('Painted light remap must be installed once per material');
  material.userData.lsvLightRemap = true;
  material.color.set(0xffffff);
  const previous = material.onBeforeCompile;
  const baseKey = material.customProgramCacheKey();
  const shadow = new THREE.Color(palette[0]);
  const light = new THREE.Color(palette[1]);
  material.onBeforeCompile = function(shader, renderer) {
    previous.call(this, shader, renderer);
    const marker = '#include <map_fragment>';
    if (!shader.fragmentShader.includes(marker)) throw new Error('Three map_fragment changed; painted remap cannot compile');
    shader.uniforms.uLsvShadow = { value: shadow }; shader.uniforms.uLsvLight = { value: light };
    shader.fragmentShader = 'uniform vec3 uLsvShadow;\nuniform vec3 uLsvLight;\n' + shader.fragmentShader.replace(marker, marker + `
      float lsvSourceLuma = clamp(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
      diffuseColor.rgb = mix(uLsvShadow, uLsvLight, pow(lsvSourceLuma, 0.55));
    `);
  };
  material.customProgramCacheKey = () => baseKey + '|lsv-paper-remap-v2';
  material.needsUpdate = true;
}
