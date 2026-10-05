import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { keyLight, mark, nodes, type StageSet, v3 } from './common';
import { label } from './furnishings';
import { interior } from './interior';

export function buildLaserTag(): StageSet {
  const g = new THREE.Group(); g.name = 'laser_tag';
  const dark = toon('#171b35'), cyan = glow('#35bfd0'), pink = glow('#da418c');
  interior(g, 13, 9, 4.2, toon('#222737'), dark, '#14162c');
  label(g, 'LASER ZONE', 0, 3.35, -4.43, 4.8, 0.57, '#4cd5dd', '#181e37', 'bold 60px Helvetica');
  label(g, 'RED  0240     BLUE  0190', 0, 2.68, -4.42, 3.8, 0.4, '#df82b8', '#101626', 'bold 28px monospace');
  // Portal and fluorescent maze ribs around an open playing lane.
  for (const x of [-5.3, -2.4, 2.4, 5.3]) {
    g.add(mesh(box(0.22, 3.7, 0.24), toon('#354264'), x, 1.85, -4.23));
    g.add(mesh(box(0.05, 3.45, 0.05), x < 0 ? cyan : pink, x, 1.87, -4.09, false));
  }
  for (const side of [-1, 1]) for (const z of [-2.2, 0.1, 2.4]) {
    const x = side * 6.44;
    g.add(mesh(box(0.035, 2.3, 0.08), side < 0 ? cyan : pink, x, 1.6, z, false).rotateX(0.38));
  }
  const bunker = (x: number, z: number, color: THREE.Material) => {
    g.add(mesh(box(1.9, 0.92, 0.68), toon('#424659'), x, 0.46, z));
    g.add(mesh(box(1.94, 0.06, 0.73), color, x, 0.94, z, false));
    for (const dx of [-0.81, 0.81]) g.add(mesh(box(0.05, 0.8, 0.02), color, x + dx, 0.44, z + 0.35, false));
  };
  bunker(-3.2, -1.2, cyan); bunker(3.2, -1.2, pink);
  for (const [x, z, color] of [[-4.8, -3.7, '#8d9544'], [4.5, -3.9, '#93567d'], [-5.1, 1.5, '#697b56']] as const) {
    g.add(mesh(cyl(0.38, 0.38, 1.1, 12), toon(color), x, 0.55, z));
    for (const y of [0.16, 0.92]) g.add(mesh(cyl(0.397, 0.397, 0.08, 12), toon('#292c37'), x, y, z));
    label(g, 'X', x, 0.57, z + 0.385, 0.28, 0.26, '#dedd8a', '#333839');
  }
  label(g, 'BLUE BASE', -3.6, 2.3, -4.41, 1.5, 0.28, '#54d4e2', '#172b45');
  label(g, 'RED BASE', 3.6, 2.3, -4.41, 1.5, 0.28, '#ee77ab', '#45243c');
  label(g, 'READY ROOM', 5.25, 3.05, -4.42, 1.8, 0.3);
  // A vest rack is scenery; actor hands remain available for the existing gesture system.
  for (const x of [-1, 0, 1]) {
    g.add(mesh(box(0.42, 0.63, 0.15), toon('#323c54'), x, 1.52, -4.2));
    g.add(mesh(new THREE.CircleGeometry(0.09, 10), x < 0 ? cyan : pink, x, 1.56, -4.11, false));
  }
  for (const x of [-1.7, 1.7]) g.add(mesh(box(0.035, 0.015, 6.3), x < 0 ? cyan : pink, x, 0.015, 0, false));
  const hemi = new THREE.HemisphereLight('#aab6e7', '#272338', 1.35); g.add(hemi);
  keyLight(g, '#bfd6ec', 1.65, [0, 6, 5], [0, 0, -1]);
  for (const [x, color] of [[-4, '#39a7dc'], [4, '#d54999']] as const) {
    const light = new THREE.PointLight(color, 14, 9, 2); light.position.set(x, 2.8, -1); g.add(light);
  }
  return {
    id: 'laser_tag', name: 'Laser Tag Arena', group: g,
    nodes: nodes({ door: [5.3, -3.3], back: [0, -2.6], blue: [-3.1, -2.2], red: [3.1, -2.2], center: [0, 0.3], left: [-2.8, 0.1], right: [2.8, 0.1], front: [0, 2] }),
    edges: [['door', 'red'], ['red', 'back'], ['back', 'blue'], ['back', 'center'], ['center', 'left'], ['center', 'right'], ['center', 'front']], door: 'door',
    marks: {
      blue_cover: mark(-3.1, -2.05, 0.25, 'blue', 'behind the blue neon bunker'),
      red_cover: mark(3.1, -2.05, -0.25, 'red', 'behind the red neon bunker'),
      center: mark(-0.8, 0.4, 0.25, 'center', 'middle of the arena, clear firing lane'),
      teammate: mark(0.8, 0.1, -0.3, 'center', 'beside a teammate in the center lane'),
      blue_base: mark(-3.3, -3.3, 0.2, 'blue', 'at the blue team base'),
      red_base: mark(3.3, -3.3, -0.2, 'red', 'at the red team base'),
      door: mark(5.3, -3.3, 0, 'door', 'entrance from the ready room'),
    },
    maxTwoShotDistance: 6.5,
    wides: [
      { pos: v3(0, 1.95, 6.3), target: v3(0, 1.35, -1.8), fov: 49 },
      { pos: v3(-0.5, 2.1, 4.2), target: v3(-2.4, 1.25, -2), fov: 54 },
      { pos: v3(0.5, 2.1, 4.2), target: v3(2.4, 1.25, -2), fov: 54 },
    ], ambience: 'none', background: [], doorSound: 'none',
    setTime() { /* Blacklight arena has no exterior daylight. */ },
  };
}
