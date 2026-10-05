import * as THREE from 'three';
import { box, mesh, toon } from '../../engine/materials';
import { paneling, tiles } from '../../engine/textures';
import { keyLight, mark, nodes, type StageSet, v3 } from './common';
import { label } from './furnishings';
import { ceilingPanel, interior } from './interior';

export function buildElevator(): StageSet {
  const g = new THREE.Group(); g.name = 'elevator';
  const steel = toon('#a8b2b1'), wood = toon('#ffffff', { map: paneling('#725b48', [6, 1]) });
  interior(g, 4.8, 5, 2.8, toon('#ffffff', { map: tiles('#a6a394', '#666b66', [6, 6]) }), wood, '#d1cec0');
  // Closed brushed metal doors face the audience; all marks are inside the cabin.
  g.add(mesh(box(2.68, 2.52, 0.09), toon('#4d595c'), 0, 1.26, -2.43));
  for (const x of [-0.63, 0.63]) g.add(mesh(box(1.24, 2.4, 0.055), steel, x, 1.22, -2.35));
  g.add(mesh(box(0.025, 2.4, 0.02), toon('#475254'), 0, 1.22, -2.31));
  label(g, '↑  12', 0, 2.64, -2.38, 1.02, 0.23, '#f0bd68', '#273239', 'bold 32px monospace');
  label(g, 'GOLIATH NATIONAL BANK', 0, 2.77, -2.37, 2.7, 0.06, '#d2c39e', '#61513f');
  g.add(mesh(box(0.39, 1.04, 0.05), steel, 1.72, 1.45, -2.38));
  for (let row = 0; row < 5; row++) for (let col = 0; col < 2; col++) {
    const x = 1.64 + col * 0.16, y = 1.79 - row * 0.15;
    g.add(mesh(new THREE.CircleGeometry(0.048, 12), toon(row === 1 && col === 1 ? '#e0b960' : '#5d6c6b'), x, y, -2.345));
  }
  label(g, 'ALARM', 1.72, 1.02, -2.34, 0.32, 0.1, '#eee4c6', '#87594c');
  label(g, 'CAPACITY  12 PERSONS', -1.9, 1.85, -2.43, 0.75, 0.18, '#ddd3b8', '#544c42');
  label(g, 'NO SMOKING', -1.9, 1.58, -2.43, 0.75, 0.17, '#ddd3b8', '#544c42');
  for (const x of [-2.33, 2.33]) {
    g.add(mesh(box(0.07, 0.055, 6.1), steel, x, 0.95, 0.45));
    for (const z of [-1.5, 0.5, 2.5]) g.add(mesh(box(0.15, 0.1, 0.08), toon('#626d69'), x, 0.93, z));
  }
  // The reverse wall has a matching rail, also one-sided for the master camera.
  const rail = mesh(new THREE.PlaneGeometry(4.5, 0.06), steel, 0, 0.95, 4.27, false).rotateY(Math.PI);
  rail.userData.cameraBackdrop = true; g.add(rail);
  for (const x of [-1.6, 0, 1.6]) ceilingPanel(g, x, 2.74, -0.2, 1.1, 1.5);
  const hemi = new THREE.HemisphereLight('#eae2c9', '#575448', 1.8); g.add(hemi);
  keyLight(g, '#f0e6cc', 2.0, [0, 4.5, 4], [0, 1, -1]);
  return {
    id: 'elevator', name: 'The Elevator', group: g,
    nodes: nodes({ door: [0, -1.8], back: [0, -0.8], left: [-1.5, 0], right: [1.5, 0], center: [0, 0.8], buttons: [1.7, -1.6] }),
    edges: [['door', 'back'], ['back', 'left'], ['back', 'right'], ['left', 'center'], ['right', 'center'], ['right', 'buttons']], door: 'door',
    marks: {
      left: mark(-1.45, -0.3, 0.2, 'left', 'left side of the elevator'),
      right: mark(1.45, -0.3, -0.2, 'right', 'right side of the elevator'),
      center: mark(0, 0.8, 0, 'center', 'front center of the cabin'),
      back: mark(-0.55, -1.15, 0, 'back', 'just inside the elevator doors'),
      buttons: mark(1.7, -1.55, 0.2, 'buttons', 'at the floor buttons'),
      door: mark(0, -1.85, 0, 'door', 'entering through the elevator doors'),
    },
    maxTwoShotDistance: 5.2,
    wides: [
      { pos: v3(0, 1.65, 3.5), target: v3(0, 1.4, -0.75), fov: 46 },
      { pos: v3(-1.65, 1.75, 2.65), target: v3(0.4, 1.35, -0.9), fov: 54 },
      { pos: v3(1.65, 1.75, 2.65), target: v3(-0.4, 1.35, -0.9), fov: 54 },
    ], ambience: 'office', background: [], doorSound: 'elevator',
    setTime() { /* Enclosed cabin, constant practical lighting. */ },
  };
}
