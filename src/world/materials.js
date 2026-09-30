import * as THREE from 'three';

/** Everything static in the world shares this one vertex-coloured material. */
export const worldMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.92,
  metalness: 0,
});

/** Unlit, HDR-bright material for anything that should glow (picked up by bloom). */
export function makeGlowMaterial(intensity = 2.6) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  m.color.setScalar(intensity);
  return m;
}

export const glowMaterial = makeGlowMaterial();

export const PALETTE = {
  wood: '#7a5230',
  woodDark: '#553620',
  woodLight: '#a47444',
  plank: '#8d6239',
  canvas: '#dccaa0',
  canvasDark: '#b9a57c',
  red: '#9e3a2c',
  blue: '#3f5f8f',
  green: '#5b7b45',
  purple: '#6a4a8c',
  orange: '#c46a2c',
  stone: '#8d8b85',
  stoneDark: '#6c6a66',
  stoneLight: '#aaa69c',
  metal: '#a3a7ae',
  metalDark: '#55595f',
  gold: '#d6a84a',
  leaf: '#46743a',
  leafLight: '#5f9043',
  leafDark: '#335a2e',
  pine: '#2e5a3e',
  pineLight: '#3d6e4a',
  paper: '#efe2c2',
  rope: '#b89a6a',
  straw: '#d1b364',
  dark: '#2a1d14',
};

export const GLOW = {
  fire: '#ff7a1f',
  fireCore: '#ffd37a',
  lantern: '#ffbb5c',
  candle: '#ffcf7a',
  arcane: '#a77bff',
  rune: '#5fd3ff',
  green: '#8dff9a',
};
