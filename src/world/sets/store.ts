import * as THREE from 'three';
import { box, cyl, mesh, occluder, toon } from '../../engine/materials';
import { checker, street } from '../../engine/textures';
import { door, keyLight, mark, nodes, room, type StageSet, v3, window_ } from './common';
import { label } from './furnishings';

/** A small neighborhood shop: checkout, stocked shelves, a sale island, street windows. */
export function buildStore(): StageSet {
  const g = new THREE.Group(); g.name = 'store';
  const cream = toon('#eee4c9'), green = toon('#466a56'), wood = toon('#aa7749');
  room(g, { w: 12, d: 8, h: 3.2, floor: toon('#ffffff', { map: checker('#c6bfa9', '#888f82', [12, 10]) }), back: cream, ceiling: '#e6ddc8' });
  const day = toon('#ffffff', { map: street(false, 118), emissive: '#ffffff', emissiveIntensity: 0.3 });
  const night = toon('#ffffff', { map: street(true, 118), emissive: '#ffffff', emissiveIntensity: 0.5 });
  const panes = [-4.8, -2.95].map((x) => window_(g, x, 1.7, -3.94, 1.55, 1.7, day, '#42624d', 0, 1));
  const entrance = door(g, -0.9, -3.95, 0, '#42624d', { glass: day });
  entrance.traverse((o) => { if (o instanceof THREE.Mesh && o.material === day) panes.push(o); });
  label(g, 'NEIGHBORHOOD GOODS', -3.8, 2.86, -3.84, 3.95, 0.38);
  label(g, 'OPEN', -2.95, 1.5, -3.82, 0.66, 0.3, '#f7d490', '#874532');

  // The back wall shelves leave the doorway and checkout aisle clear.
  const colors = ['#c65341', '#e9bd50', '#608a7a', '#5e7fa2', '#e2d3a4'];
  const shelf = (x: number, z: number, w: number, height: number, rows: number) => {
    g.add(occluder(mesh(box(w, height, 0.14), green, x, height / 2, z - 0.22)));
    for (let row = 0; row < rows; row++) {
      const y = 0.22 + row * 0.51;
      g.add(mesh(box(w + 0.08, 0.065, 0.62), cream, x, y, z, false));
      const count = Math.floor(w / 0.29);
      for (let i = 0; i < count; i++) {
        const px = x - w / 2 + 0.18 + i * 0.29;
        const h = 0.24 + (i % 3) * 0.055;
        g.add(mesh(box(0.2, h, 0.23), toon(colors[(i + row) % colors.length]), px, y + h / 2 + 0.04, z, false));
        g.add(mesh(box(0.13, 0.07, 0.005), cream, px, y + 0.17, z + 0.12, false));
      }
      g.add(mesh(box(w, 0.05, 0.01), toon('#e4bd65'), x, y - 0.01, z + 0.32, false));
    }
  };
  shelf(2.55, -3.55, 4.5, 2.38, 4);
  label(g, 'PANTRY  /  EVERYDAY ESSENTIALS', 2.55, 2.72, -3.43, 4.6, 0.28);
  // A low aisle island: sightlines remain open above the merchandise.
  shelf(2.7, 0.25, 2.3, 1.05, 2);
  label(g, 'SPECIALS', 2.7, 1.36, 0.0, 1.8, 0.26, '#fff1cf', '#a43f30');

  // Checkout faces the open floor; customers queue to its right.
  g.add(occluder(mesh(box(2.0, 0.9, 0.9), wood, -3.9, 0.45, -0.6)));
  g.add(occluder(mesh(box(2.1, 0.07, 1.0), toon('#39443d'), -3.9, 0.94, -0.6)));
  g.add(mesh(box(0.43, 0.13, 0.32), toon('#323838'), -3.75, 1.04, -0.65, false));
  g.add(mesh(box(0.36, 0.28, 0.05), toon('#323838'), -3.75, 1.24, -0.76, false));
  label(g, '8.99', -3.75, 1.24, -0.728, 0.28, 0.14, '#9ae6a7', '#203129');
  label(g, 'CHECKOUT', -3.9, 0.57, -0.138, 1.6, 0.23);
  // Paper shopping bags and baskets.
  for (const x of [-4.5, -4.15]) {
    g.add(mesh(box(0.24, 0.33, 0.2), toon('#cba46f'), x, 1.14, -0.48, false));
    g.add(mesh(new THREE.TorusGeometry(0.065, 0.008, 4, 8), toon('#7d5e3b'), x, 1.33, -0.48, false));
  }
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.5, 0.12, 0.36), toon('#9e493c'), -1.75, 0.15 + i * 0.075, -3.15, false));
  // Produce bins along the right wall.
  for (let i = 0; i < 3; i++) {
    const z = -2.45 + i * 0.9;
    g.add(mesh(box(0.75, 0.7, 0.76), wood, 5.15, 0.35, z));
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.12, 0), toon(['#b84d33', '#799846', '#db9b37'][i]), 4.93 + (k % 3) * 0.21, 0.78, z - 0.17 + Math.floor(k / 3) * 0.31, false));
  }
  for (const x of [-3, 0, 3]) g.add(mesh(box(1.35, 0.05, 0.55), toon('#ffffe8', { emissive: '#fff2cd', emissiveIntensity: 0.7 }), x, 3.15, -0.9, false));
  // A small bell over the door.
  g.add(mesh(cyl(0.025, 0.08, 0.09), toon('#c7a153'), -0.9, 2.35, -3.77, false));
  const hemi = new THREE.HemisphereLight('#fff3d7', '#51604a', 1.9); g.add(hemi);
  keyLight(g, '#ffefcf', 2.1, [-3, 6, 5], [0, 0, -1]);
  return {
    id: 'store', name: 'The Store', group: g,
    nodes: nodes({ door: [-0.9, -3.25], back: [0, -2.5], shelves: [2.7, -2.4], right: [4.1, -1.1], center: [0, 0.5], front: [2.8, 1.5], checkout: [-2.3, 0.6], clerk: [-3.9, -1.7] }),
    edges: [['door', 'back'], ['back', 'shelves'], ['shelves', 'right'], ['right', 'front'], ['front', 'center'], ['center', 'back'], ['center', 'checkout'], ['checkout', 'door'], ['door', 'clerk']],
    door: 'door', reserved: ['cashier'],
    marks: {
      cashier: mark(-3.9, -1.5, 0, 'clerk', 'behind the checkout counter; shopkeeper'),
      checkout: mark(-3.75, 0.45, Math.PI - 0.3, 'checkout', 'paying at the checkout'),
      queue: mark(-2.3, 0.65, -0.65, 'checkout', 'waiting in line beside the checkout'),
      shelves: mark(2.4, -2.5, -0.4, 'shelves', 'browsing the back-wall shelves'),
      produce: mark(4.2, -1.35, 0.6, 'right', 'beside the fresh produce bins'),
      display: mark(2.7, 1.5, 0.3, 'front', 'at the sale display in the middle aisle'),
      center: mark(0, 0.5, 0, 'center', 'open shop aisle'),
      door: mark(-0.9, -3.5, 0, 'door', 'shop entrance with the doorbell'),
    },
    wides: [
      { pos: v3(0, 2.6, 8.7), target: v3(0, 1.25, -1.6), fov: 49 },
      { pos: v3(-0.4, 1.85, 4.1), target: v3(-3.4, 1.2, -0.8), fov: 48 },
      { pos: v3(0, 1.9, 4.8), target: v3(3.1, 1.25, -1.6), fov: 48 },
    ],
    ambience: 'city', background: [], doorSound: 'bell',
    setTime(t) { for (const p of panes) p.material = t === 'day' ? day : night; hemi.intensity = t === 'day' ? 1.9 : 1.45; },
  };
}
