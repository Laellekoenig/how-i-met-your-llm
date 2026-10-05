import * as THREE from 'three';
import { box, cyl, mesh, roundedBox, toon } from '../../engine/materials';
import { speckle } from '../../engine/textures';
import { keyLight, mark, nodes, type StageSet, v3, window_ } from './common';
import { label } from './furnishings';
import { ceilingPanel, interior } from './interior';

/** A side-on NYC car with orange molded seats and a clear standing aisle. */
export function buildSubway(): StageSet {
  const g = new THREE.Group(); g.name = 'subway';
  const steel = toon('#9aa5a7'), trim = toon('#536169');
  interior(g, 12, 5.2, 3.1, toon('#ffffff', { map: speckle('#515657', [10, 6], 22, 0.14) }), steel, '#b4bebe');
  for (const x of [-4.25, 4.25]) {
    window_(g, x, 1.83, -2.54, 2.65, 1.02, toon('#182834'), '#49565b', 0, 0);
    for (let i = 0; i < 4; i++) {
      const px = x - 1.08 + i * 0.72;
      const color = toon(i % 2 ? '#dbaa44' : '#d26730');
      g.add(mesh(roundedBox(0.67, 0.13, 0.65, 0.04), color, px, 0.5, -1.99));
      g.add(mesh(roundedBox(0.67, 0.55, 0.1, 0.035), color, px, 0.8, -2.27));
      g.add(mesh(box(0.07, 0.44, 0.44), trim, px, 0.23, -2.08));
    }
    label(g, 'PLEASE OFFER YOUR SEAT', x, 2.69, -2.48, 2.5, 0.22, '#25343b', '#d6dddd');
  }
  // Center sliding doors, rubber seam, dark windows and route strip.
  for (const x of [-0.51, 0.51]) {
    g.add(mesh(box(0.99, 2.32, 0.09), toon('#b2bcbc'), x, 1.16, -2.51));
    window_(g, x, 1.65, -2.45, 0.61, 0.85, toon('#1a2730'), '#65747b', 0, 0);
  }
  g.add(mesh(box(0.035, 2.3, 0.035), toon('#263037'), 0, 1.15, -2.44));
  label(g, '1   BROADWAY LOCAL', 0, 2.77, -2.46, 2.7, 0.31, '#fff6d9', '#273336', 'bold 42px Helvetica');
  label(g, 'STAND CLEAR OF THE CLOSING DOORS', 0, 2.35, -2.43, 2.3, 0.16, '#202b30', '#c9d1ce');
  for (const x of [-1.55, 1.55]) {
    g.add(mesh(cyl(0.033, 0.033, 2.9), toon('#c7d0cc'), x, 1.45, -1.75));
    g.add(mesh(box(0.06, 0.05, 1.25), toon('#c7d0cc'), x, 2.91, -1.18));
  }
  g.add(mesh(box(10.5, 0.05, 0.05), toon('#c7d0cc'), 0, 2.78, -0.58));
  // Stylized route map, laid out as three colored lines with station dots.
  g.add(mesh(box(0.86, 1.16, 0.03), toon('#ddd9c7'), -1.96, 1.8, -2.48));
  for (let i = 0; i < 3; i++) {
    g.add(mesh(box(0.027, 0.9, 0.015), toon(['#b64a36', '#3e795c', '#41698f'][i]), -2.18 + i * 0.2, 1.8, -2.456).rotateZ(-0.2));
    for (let j = 0; j < 5; j++) g.add(mesh(new THREE.CircleGeometry(0.03, 8), toon('#ede8cf'), -2.26 + i * 0.2 + j * 0.041, 1.4 + j * 0.2, -2.44));
  }
  label(g, 'NEW YORK CITY TRANSIT', 2.0, 1.96, -2.46, 0.8, 0.28, '#182d3b', '#d5dcd7');
  label(g, '2406', 2.0, 1.62, -2.46, 0.55, 0.2);
  for (const x of [-3.7, 0, 3.7]) ceilingPanel(g, x, 3.03, -0.5, 2.2, 0.25);
  const hemi = new THREE.HemisphereLight('#e0ecea', '#414c51', 1.9); g.add(hemi);
  keyLight(g, '#dfece9', 2.2, [0, 4, 4], [0, 1, -2]);
  return {
    id: 'subway', name: 'NYC Subway Car', group: g,
    nodes: nodes({ door: [0, -1.9], center: [0, 0], left: [-3.6, -0.65], right: [3.6, -0.65], front: [0, 1.2] }),
    edges: [['door', 'center'], ['center', 'left'], ['center', 'right'], ['center', 'front']], door: 'door',
    marks: {
      seat_left: mark(-4.61, -1.92, 0.1, 'left', 'orange bench seat by the window', { seat: 0.56, approach: [-4.61, -0.65] }),
      seat_left_inner: mark(-3.17, -1.92, -0.1, 'left', 'orange bench seat nearest the doors', { seat: 0.56, approach: [-3.17, -0.65] }),
      seat_right: mark(3.17, -1.92, 0.1, 'right', 'opposite orange bench, by the doors', { seat: 0.56, approach: [3.17, -0.65] }),
      seat_right_window: mark(4.61, -1.92, -0.1, 'right', 'orange bench by the route sign', { seat: 0.56, approach: [4.61, -0.65] }),
      pole: mark(-1.2, -0.35, 0.25, 'center', 'standing near the grab pole'),
      center: mark(0.65, 0.15, -0.3, 'center', 'standing in the center aisle'),
      door: mark(0, -1.9, 0, 'door', 'inside the subway doors'),
    },
    maxTwoShotDistance: 6,
    wides: [
      { pos: v3(0, 1.6, 4.7), target: v3(0, 1.4, -1.6), fov: 51 },
      // A bench plus its adjacent standing aisle, without the empty half-car.
      { pos: v3(-1.8, 1.65, 4.3), target: v3(-1.8, 1.25, -1.2), fov: 46 },
      { pos: v3(1.8, 1.65, 4.3), target: v3(1.8, 1.25, -1.2), fov: 46 },
      // Coverage tries these tighter seated pairs before the group angles.
      { pos: v3(-3.7, 1.7, 2.5), target: v3(-3.8, 1.25, -1.9), fov: 49 },
      { pos: v3(3.7, 1.7, 2.5), target: v3(3.8, 1.25, -1.9), fov: 49 },
    ], ambience: 'car', background: [], doorSound: 'elevator',
    setTime(t) { hemi.intensity = t === 'day' ? 1.9 : 1.65; },
  };
}
