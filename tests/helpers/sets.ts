import * as THREE from 'three';
import { Stage } from '../../src/show/stage';

// The real geometry runs in Bun; canvas drawing itself is covered by browser screenshots.
const context = new Proxy({}, {
  get: (_target, key) => key === 'createLinearGradient' || key === 'createRadialGradient'
    ? () => ({ addColorStop() {} }) : () => {},
  set: () => true,
});
Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => context }) } });

export function testStage() {
  return new Stage(new THREE.Scene());
}
