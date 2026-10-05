import * as THREE from 'three';
import { box, cyl, glow, mesh, occluder, roundedBox, toon } from '../../engine/materials';
import { brick, planks, sign, street } from '../../engine/textures';
import { bottles, couch, door, frame, keyLight, mark, nodes, pendant, plant, room, type StageSet, v3, window_ } from './common';
import { chair, label } from './furnishings';

/** Flexible neighborhood restaurant: dates at a two-top, gang dinners in the booth. */
export function buildRestaurant(): StageSet {
  const g = new THREE.Group(); g.name = 'restaurant';
  const walnut = toon('#56392a'), brass = toon('#bb9350');
  room(g, { w: 13, d: 8, h: 3.4, floor: toon('#ffffff', { map: planks('#77553d', [7, 6], 94) }), back: toon('#ffffff', { map: brick('#914d38', '#665241', [8, 3]) }), left: toon('#d6ba8b'), right: toon('#344d42'), ceiling: '#3d342b' });
  g.add(mesh(box(13, 0.85, 0.08), walnut, 0, 0.425, -3.93, false));
  const day = toon('#ffffff', { map: street(false, 92), emissive: '#ffffff', emissiveIntensity: 0.2 });
  const night = toon('#ffffff', { map: street(true, 92), emissive: '#ffffff', emissiveIntensity: 0.5 });
  const panes = [-4.65, -2.7].map((x) => window_(g, x, 1.95, -3.87, 1.55, 1.8, night, '#3a463a', 0, 1));
  const entrance = door(g, -0.8, -3.9, 0, '#384d3e', { glass: night });
  entrance.traverse((o) => { if (o instanceof THREE.Mesh && o.material === night) panes.push(o); });
  label(g, 'THE RESTAURANT', -3.65, 3.06, -3.79, 3.8, 0.32, '#eed5a2', '#394b3d', 'italic 32px Georgia');

  // Upholstered banquette, open toward the audience.
  couch(g, 3.2, -2.85, 4.2, '#803b3d', '#3d2922', 0, 0.47);
  g.add(occluder(mesh(roundedBox(3.5, 0.08, 0.95, 0.03), walnut, 3.2, 0.77, -1.88)));
  for (const x of [2.0, 4.4]) g.add(mesh(cyl(0.055, 0.07, 0.7), brass, x, 0.37, -1.88, false));
  chair(g, 0.95, -1.9, Math.PI / 2 - 0.3, '#754136');
  chair(g, 5.45, -1.9, -Math.PI / 2 + 0.3, '#754136');
  for (const x of [2.0, 3.2, 4.4]) frame(g, x, 2.25, -3.85, 0.85, 1.05, 180 + Math.round(x * 10), 0, '#b99354');

  const placeSetting = (x: number, z: number) => {
    g.add(mesh(cyl(0.17, 0.17, 0.017, 16), toon('#eee9d6'), x, 0.825, z, false));
    g.add(mesh(cyl(0.12, 0.12, 0.019, 16), toon('#d9d5c4'), x, 0.829, z, false));
    g.add(mesh(box(0.012, 0.009, 0.2), brass, x - 0.23, 0.82, z, false));
    g.add(mesh(box(0.13, 0.012, 0.22), toon('#e4bd91'), x + 0.25, 0.82, z, false));
    // Stemmed water goblet, deliberately opaque low-poly glass.
    g.add(mesh(cyl(0.047, 0.025, 0.09), toon('#b5c9c3'), x + 0.23, 0.94, z - 0.23, false));
    g.add(mesh(cyl(0.009, 0.009, 0.07), brass, x + 0.23, 0.87, z - 0.23, false));
  };
  const candle = (x: number, z: number) => {
    g.add(mesh(cyl(0.07, 0.08, 0.1), brass, x, 0.85, z, false));
    g.add(mesh(cyl(0.027, 0.027, 0.13), toon('#f6e2af'), x, 0.95, z, false));
    g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), glow('#ffd084', 1.4), x, 1.03, z, false));
  };
  for (const x of [2.1, 3.25, 4.4]) placeSetting(x, -2.0);
  candle(3.1, -1.57);

  // Two intimate tables, their chairs angled so the director can see faces.
  for (const [x, z] of [[-3.7, -1.55], [-3.7, 1.25]]) {
    g.add(occluder(mesh(cyl(0.69, 0.69, 0.07, 16), walnut, x, 0.78, z)));
    g.add(mesh(cyl(0.06, 0.1, 0.7), brass, x, 0.37, z, false));
    g.add(mesh(cyl(0.35, 0.38, 0.06), walnut, x, 0.03, z, false));
    chair(g, x - 1.0, z, Math.PI / 2 - 0.25, '#5b6a4c');
    chair(g, x + 1.0, z, -Math.PI / 2 + 0.25, '#5b6a4c');
    placeSetting(x - 0.3, z); placeSetting(x + 0.3, z); candle(x, z - 0.25);
  }
  // Host stand, specials board, and a service station with bottles.
  g.add(occluder(mesh(box(0.65, 1.05, 0.5), walnut, -0.35, 0.525, -2.55)));
  g.add(mesh(box(0.45, 0.025, 0.3), toon('#f2e8c9'), -0.35, 1.065, -2.55, false));
  label(g, 'PLEASE WAIT TO BE SEATED', -0.35, 0.8, -2.29, 0.55, 0.19, '#f0d59e', '#51382b', '22px Georgia');
  g.add(mesh(box(0.7, 1.9, 1.8), walnut, 6.12, 0.95, 1.05));
  bottles(g, 5.9, 1.91, 0.5, 5, 0.22, Math.PI / 2, 24);
  const menu = mesh(new THREE.PlaneGeometry(1.3, 1.45), toon('#ffffff', { map: sign('SPECIALS', '#ece0bb', '#243c35', 128, 160, 'bold 22px Georgia') }), 6.4, 2.4, 1.05, false);
  menu.rotation.y = -Math.PI / 2; g.add(menu);
  plant(g, -5.8, -3.1, 1.3); plant(g, 5.8, -3.15, 1.25);
  const lamps: THREE.PointLight[] = [];
  for (const [x, z] of [[-3.7, -1.5], [-3.7, 1.25], [2.0, -1.85], [4.4, -1.85]]) {
    const l = pendant(g, x, 2.55, z, '#b69255', { color: '#ffd097', intensity: 2.2, distance: 5 });
    if (l) lamps.push(l);
  }
  const hemi = new THREE.HemisphereLight('#f5d6a7', '#4c392e', 1.4); g.add(hemi);
  keyLight(g, '#ffdfab', 1.7, [0, 6, 6], [0, 0, -1]);
  return {
    id: 'restaurant', name: 'The Restaurant', group: g,
    nodes: nodes({ door: [-0.8, -3.3], host: [-1.25, -2.45], center: [-0.8, 0], left: [-2.2, -1.55], back_left: [-3.7, -2.85], far_left: [-5.2, -1.55], outer_front: [-5.25, 2.3], front_left: [-3.7, 2.3], front: [1, 1.1], booth_left: [0.55, -2.7], booth_right: [5.6, -2.7], booth_front: [3.2, -0.85], service: [5.2, 1.1] }),
    edges: [['door', 'host'], ['host', 'center'], ['host', 'left'], ['left', 'back_left'], ['back_left', 'far_left'], ['left', 'center'], ['far_left', 'outer_front'], ['outer_front', 'front_left'], ['front_left', 'center'], ['center', 'front'], ['front', 'booth_front'], ['front', 'booth_left'], ['booth_front', 'service'], ['service', 'booth_right']],
    door: 'door',
    marks: {
      table_left: mark(-4.66, -1.53, Math.PI / 2 - 0.25, 'far_left', 'left chair at the date table', { seat: 0.47, approach: [-4.75, -0.55] }),
      table_right: mark(-2.74, -1.53, -Math.PI / 2 + 0.25, 'left', 'right chair at the date table', { seat: 0.47, approach: [-2.5, -0.55] }),
      table_2_left: mark(-4.66, 1.27, Math.PI / 2 - 0.25, 'front_left', 'left chair at the second table', { seat: 0.47, approach: [-4.7, 2.25] }),
      table_2_right: mark(-2.74, 1.27, -Math.PI / 2 + 0.25, 'front_left', 'right chair at the second table', { seat: 0.47, approach: [-2.7, 2.25] }),
      booth_left: mark(2.0, -2.78, 0.15, 'booth_left', 'left end of the banquette', { seat: 0.47, approach: [1.4, -2.78] }),
      booth_middle: mark(3.2, -2.78, 0, 'booth_left', 'middle of the banquette', { seat: 0.47, approach: [1.4, -2.78] }),
      booth_right: mark(4.4, -2.78, -0.15, 'booth_right', 'right end of the banquette', { seat: 0.47, approach: [5, -2.78] }),
      booth_end_left: mark(0.99, -1.88, Math.PI / 2 - 0.3, 'booth_left', 'chair at the left end of the group table', { seat: 0.47, approach: [0.55, -1.1] }),
      booth_end_right: mark(5.41, -1.88, -Math.PI / 2 + 0.3, 'booth_right', 'chair at the right end of the group table', { seat: 0.47, approach: [5.5, -1.0] }),
      host: mark(-0.35, -3.15, 0, 'door', 'behind the reservation stand'),
      service: mark(5.1, 1.1, -0.3, 'service', 'by the service station'),
      center: mark(-0.8, 0, 0, 'center', 'aisle between the tables'),
      door: mark(-0.8, -3.5, 0, 'door', 'restaurant entrance'),
    },
    wides: [
      { pos: v3(0, 2.65, 9.1), target: v3(0, 1.2, -1.5), fov: 49 },
      { pos: v3(-3.7, 1.75, 3.6), target: v3(-3.7, 1.1, -1.5), fov: 46 },
      { pos: v3(3.1, 1.9, 4.5), target: v3(3.2, 1.2, -2.2), fov: 48 },
    ],
    ambience: 'bar', background: [], doorSound: 'bell',
    setTime(t) { for (const p of panes) p.material = t === 'day' ? day : night; hemi.intensity = t === 'day' ? 1.9 : 1.25; for (const l of lamps) l.intensity = t === 'day' ? 1.4 : 2.2; },
  };
}
