import * as THREE from 'three';
import { box, cyl, glow, mesh, occluder, roundedBox, toon } from '../../engine/materials';
import { brick, chalkMenu, paneling, planks, street, wineRack } from '../../engine/textures';
import { band, bottles, couch, door, frame, keyLight, mark, nodes, pendant, plant, room, type StageSet, v3, window_ } from './common';
import { chair, label } from './furnishings';

/**
 * Flexible neighborhood restaurant: dates at a two-top, gang dinners in the booth. White tablecloths,
 * candles and a rose on every table; a wine rack and gilt mirror on the paneled left wall; café
 * curtains in the street windows; a coat rack by the host stand; a swinging kitchen door with a lit
 * porthole behind the booth; a busy dining bay, dark beams and a lazy ceiling fan overhead.
 */
export function buildRestaurant(): StageSet {
  const g = new THREE.Group(); g.name = 'restaurant';
  const walnut = toon('#56392a'), brass = toon('#bb9350'), linen = toon('#efe8d6');
  room(g, { w: 13, d: 8, h: 3.4, floor: toon('#ffffff', { map: planks('#77553d', [7, 6], 94) }), back: toon('#ffffff', { map: brick('#914d38', '#665241', [8, 3]) }), left: toon('#d6ba8b'), right: toon('#344d42'), ceiling: '#3d342b' });
  g.add(mesh(box(13, 0.85, 0.08), walnut, 0, 0.425, -3.93, false));
  const day = toon('#ffffff', { map: street(false, 92), emissive: '#ffffff', emissiveIntensity: 0.2 });
  const night = toon('#ffffff', { map: street(true, 92), emissive: '#ffffff', emissiveIntensity: 0.5 });
  const panes = [-4.65, -2.7].map((x) => window_(g, x, 1.95, -3.87, 1.55, 1.8, night, '#3a463a', 0, 1));
  const entrance = door(g, -0.8, -3.9, 0, '#384d3e', { glass: night, beyond: night });
  entrance.traverse((o) => { if (o instanceof THREE.Mesh && o.material === night) panes.push(o); });
  label(g, 'THE RESTAURANT', -3.65, 3.06, -3.79, 3.8, 0.32, '#eed5a2', '#394b3d', 'italic 32px Georgia');

  // Upholstered banquette, open toward the audience.
  couch(g, 3.2, -2.85, 4.2, '#803b3d', '#3d2922', 0, 0.47);
  g.add(occluder(mesh(roundedBox(3.5, 0.08, 0.95, 0.03), walnut, 3.2, 0.77, -1.88)));
  g.add(mesh(roundedBox(3.6, 0.12, 0.99, 0.02), linen, 3.2, 0.757, -1.86));
  g.add(mesh(box(0.5, 0.003, 1.0), toon('#8a2e30'), 3.2, 0.818, -1.86, false)); // runner
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
  const rose = (x: number, z: number) => {
    g.add(mesh(cyl(0.025, 0.035, 0.14, 6), toon('#b5c9c3'), x, 0.89, z, false));
    g.add(mesh(cyl(0.004, 0.004, 0.12, 3), toon('#3f7a3a'), x, 1.0, z, false));
    g.add(mesh(new THREE.IcosahedronGeometry(0.035, 0), toon('#b82a3a'), x, 1.07, z, false));
  };
  const wine = (x: number, z: number) => {
    const green = toon('#1e3a26');
    g.add(mesh(cyl(0.04, 0.042, 0.2, 8), green, x, 0.92, z, false));
    g.add(mesh(cyl(0.015, 0.04, 0.06, 8), green, x, 1.05, z, false));
    g.add(mesh(cyl(0.016, 0.016, 0.06, 6), toon('#8a1a24'), x, 1.1, z, false));
    g.add(mesh(cyl(0.041, 0.041, 0.07, 8), toon('#e8dcb8'), x, 0.91, z, false)); // label
  };
  for (const x of [2.1, 3.25, 4.4]) placeSetting(x, -2.0);
  candle(3.1, -1.57);
  rose(3.45, -1.6);
  wine(2.65, -1.62);
  // a bread basket and salt and pepper
  g.add(mesh(cyl(0.14, 0.1, 0.07, 8), toon('#a8743a'), 3.85, 0.855, -1.62, false));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(0.055, 6, 4).scale(1.3, 0.7, 1), toon('#d8a35a'), 3.8 + i * 0.06, 0.9, -1.62 + (i - 1) * 0.04, false));
  for (const [dx, c] of [[0, '#f4f0e6'], [0.07, '#2a2a2a']] as const) g.add(mesh(cyl(0.02, 0.025, 0.08, 6), toon(c), 2.3 + dx, 0.86, -1.6, false));

  // Date tables and a neighboring dining bay. Keep the central aisle and the
  // route from the booth to the service station open; patrons sit at real seats.
  for (const [x, z] of [[-3.7, -1.55], [-3.7, 1.25], [-3.7, 4.45], [3.45, 2.0], [3.45, 4.45]]) {
    g.add(occluder(mesh(cyl(0.69, 0.69, 0.07, 16), walnut, x, 0.78, z)));
    g.add(mesh(cyl(0.73, 0.76, 0.15, 16), linen, x, 0.742, z));
    g.add(mesh(cyl(0.06, 0.1, 0.7), brass, x, 0.37, z, false));
    g.add(mesh(cyl(0.35, 0.38, 0.06), walnut, x, 0.03, z, false));
    chair(g, x - 1.0, z, Math.PI / 2 - 0.25, '#5b6a4c');
    chair(g, x + 1.0, z, -Math.PI / 2 + 0.25, '#5b6a4c');
    placeSetting(x - 0.3, z); placeSetting(x + 0.3, z); candle(x, z - 0.25); rose(x + 0.12, z + 0.3);
    wine(x - 0.05, z + 0.42);
    // Folded burgundy menus and a bread basket make the tables read as dinner in progress.
    const menu = mesh(box(0.16, 0.2, 0.018), toon('#74373a'), x + 0.18, 0.92, z - 0.34, false);
    menu.rotation.x = -0.2; g.add(menu);
    g.add(mesh(cyl(0.12, 0.09, 0.06, 8), toon('#a8743a'), x - 0.22, 0.85, z - 0.25, false));
    for (const dx of [-0.05, 0.04]) g.add(mesh(new THREE.SphereGeometry(0.055, 6, 4).scale(1.3, 0.7, 1), toon('#d8a35a'), x - 0.22 + dx, 0.895, z - 0.25, false));
  }
  // A low, planted divider gives the dining bay an edge without hiding faces.
  g.add(occluder(mesh(roundedBox(0.34, 0.58, 1.6, 0.04), walnut, 1.4, 0.29, 3.05)));
  g.add(mesh(box(0.38, 0.05, 1.66), brass, 1.4, 0.59, 3.05, false));
  const greenery = new THREE.Group(); greenery.position.y = 0.62; g.add(greenery);
  for (const z of [2.45, 2.85, 3.25, 3.65]) plant(greenery, 1.4, z, 0.6);
  for (const z of [3.15, 5.35]) frame(g, 6.44, 2.0, z, 1.15, 0.9, 245 + Math.round(z * 10), -Math.PI / 2, '#b99354');
  // Host stand, specials board, and a service station with bottles.
  g.add(occluder(mesh(box(0.65, 1.05, 0.5), walnut, -0.35, 0.525, -2.55)));
  g.add(mesh(box(0.45, 0.025, 0.3), toon('#f2e8c9'), -0.35, 1.065, -2.55, false));
  label(g, 'PLEASE WAIT TO BE SEATED', -0.35, 0.8, -2.29, 0.55, 0.19, '#f0d59e', '#51382b', '22px Georgia');
  g.add(mesh(box(0.7, 1.9, 1.8), walnut, 6.12, 0.95, 1.05));
  bottles(g, 5.9, 1.91, 0.5, 5, 0.22, Math.PI / 2, 24);
  const menu = mesh(new THREE.PlaneGeometry(1.3, 1.45), toon('#ffffff', { map: chalkMenu('SPECIALS', ['Lobster Ravioli', 'Steak Frites', 'Mussels Marinière', 'Tiramisu']) }), 6.4, 2.4, 1.05, false);
  menu.rotation.y = -Math.PI / 2; g.add(menu);
  plant(g, -5.8, -3.1, 1.3); plant(g, -5.9, 3.0, 1.4);

  // ---- the left wall: paneling, a wine rack, a gilt mirror, sconces -------------------------------
  const panel = toon('#ffffff', { map: paneling('#5e3e2c', [4, 1]) });
  band(g, panel, -6.47, 0.5, 9, 1.0, Math.PI / 2);
  g.add(mesh(box(0.06, 0.05, 9), walnut, -6.45, 1.02, 0.5, false));
  g.add(occluder(mesh(box(0.32, 2.4, 1.7), walnut, -6.34, 1.2, -1.6)));
  const rack = mesh(new THREE.PlaneGeometry(1.5, 2.1), toon('#ffffff', { map: wineRack(103) }), -6.175, 1.2, -1.6, false);
  rack.rotation.y = Math.PI / 2;
  g.add(rack);
  g.add(mesh(box(0.36, 0.06, 1.76), brass, -6.33, 2.43, -1.6, false));
  const mirror = new THREE.Group();
  mirror.position.set(-6.46, 1.95, 1.25);
  mirror.rotation.y = Math.PI / 2;
  mirror.add(mesh(box(1.25, 1.0, 0.05), brass, 0, 0, 0, false));
  mirror.add(mesh(new THREE.PlaneGeometry(1.1, 0.85), toon('#8a9aa0', { emissive: '#5a4a3a', emissiveIntensity: 0.25 }), 0, 0, 0.03, false));
  mirror.add(mesh(new THREE.PlaneGeometry(0.5, 0.06), toon('#c8d4d8'), -0.2, 0.25, 0.031, false).rotateZ(0.6));
  g.add(mirror);
  const sconce = (x: number, z: number, rotY: number) => {
    const s = new THREE.Group();
    s.position.set(x, 1.85, z);
    s.rotation.y = rotY;
    s.add(mesh(box(0.1, 0.18, 0.03), brass, 0, 0, 0, false));
    s.add(mesh(cyl(0.012, 0.012, 0.16, 4).rotateX(Math.PI / 2), brass, 0, 0.02, 0.08, false));
    s.add(mesh(cyl(0.05, 0.09, 0.14, 8), toon('#f0dcb0', { emissive: '#ffcf8a', emissiveIntensity: 0.6 }), 0, 0.1, 0.16, false));
    g.add(s);
  };
  sconce(-6.47, 0.2, Math.PI / 2); sconce(-6.47, 2.3, Math.PI / 2);
  sconce(6.47, -0.4, -Math.PI / 2);

  // ---- café curtains in the street windows --------------------------------------------------------
  for (const x of [-4.65, -2.7]) {
    g.add(mesh(cyl(0.015, 0.015, 1.7, 4).rotateZ(Math.PI / 2), brass, x, 1.66, -3.8, false));
    for (let i = 0; i < 6; i++) g.add(mesh(box(0.27, 0.58, 0.02), toon(i % 2 ? '#e8dcc0' : '#dccfae'), x - 0.68 + i * 0.27, 1.36, -3.8 + (i % 2) * 0.015, false));
  }

  // ---- the host stand: a lamp, a reservation book, menus; a coat rack by the door -------------------
  g.add(mesh(box(0.3, 0.02, 0.22), toon('#7a2a24'), -0.42, 1.09, -2.55, false));
  g.add(mesh(box(0.27, 0.005, 0.2), toon('#f8f2e0'), -0.42, 1.1, -2.55, false));
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.2, 0.012, 0.3), toon('#2f3e34'), -0.16, 1.085 + i * 0.013, -2.6, false));
  g.add(mesh(cyl(0.008, 0.008, 0.28, 4), brass, -0.6, 1.22, -2.68, false));
  g.add(mesh(cyl(0.05, 0.08, 0.08, 8), toon('#2f4a3b', { emissive: '#ffcf8a', emissiveIntensity: 0.2 }), -0.6, 1.37, -2.66, false));
  const coats = new THREE.Group();
  coats.position.set(0.25, 0, -3.55);
  coats.add(mesh(cyl(0.025, 0.025, 1.8, 6), walnut, 0, 0.9, 0, false));
  coats.add(mesh(cyl(0.2, 0.24, 0.04, 8), walnut, 0, 0.02, 0, false));
  for (const [a, c, h] of [[0.6, '#3a3a52', 0.85], [2.4, '#8a4a2a', 0.7], [4.3, '#c8b890', 0.95]] as const) {
    coats.add(mesh(box(0.05, 0.03, 0.18).rotateY(a), brass, Math.sin(a) * 0.08, 1.72, Math.cos(a) * 0.08, false));
    const coat = mesh(roundedBox(0.3, h, 0.12, 0.04), toon(c), Math.sin(a) * 0.14, 1.72 - h / 2, Math.cos(a) * 0.14, false);
    coat.rotation.y = a;
    coats.add(coat);
  }
  coats.add(mesh(cyl(0.08, 0.11, 0.08, 8), toon('#2a2a2a'), 0.0, 1.86, 0, false)); // a hat on top
  g.add(coats);

  // ---- the swinging kitchen door behind the booth, with a lit porthole -------------------------------
  const KX = 5.82;
  door(g, KX, -3.92, 0, '#6e4a36', { frameColor: '#3a2a20' });
  g.add(mesh(new THREE.CircleGeometry(0.17, 12), toon('#e8b468', { emissive: '#d89a50', emissiveIntensity: 0.6 }), KX, 1.62, -3.83, false));
  g.add(mesh(new THREE.TorusGeometry(0.18, 0.025, 4, 12), toon('#a8acb0'), KX, 1.62, -3.83, false));
  g.add(mesh(box(0.95, 0.3, 0.02), toon('#a8acb0'), KX, 0.2, -3.84, false)); // kick plate
  label(g, 'KITCHEN', KX, 2.52, -3.86, 0.6, 0.14, '#f0d59e', '#2a1e18', 'bold 40px Georgia');

  // ---- the service station: cabinet doors below, plates and glasses on its shelves ----------------
  for (const z of [0.6, 1.5]) {
    g.add(mesh(box(0.02, 0.7, 0.8), toon('#4a3022'), 5.76, 0.42, z, false));
    g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), brass, 5.74, 0.55, z + (z < 1 ? 0.3 : -0.3), false));
  }
  g.add(mesh(box(0.02, 0.75, 1.7), toon('#2a1a12'), 5.76, 1.35, 1.05, false));
  for (const y of [1.06, 1.42]) g.add(mesh(box(0.1, 0.03, 1.7), walnut, 5.72, y, 1.05, false));
  for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) g.add(mesh(cyl(0.11, 0.11, 0.012, 10), linen, 5.68, 1.09 + k * 0.016, 0.45 + i * 0.27, false));
  for (let i = 0; i < 6; i++) g.add(mesh(cyl(0.035, 0.028, 0.12, 6), toon('#b5c9c3'), 5.68, 1.5, 1.2 + i * 0.1, false));
  g.add(mesh(cyl(0.06, 0.05, 0.22, 8), toon('#b5c9c3'), 5.68, 1.18, 1.55, false)); // water pitcher

  // ---- overhead: dark beams and a lazy ceiling fan --------------------------------------------------
  for (const z of [-3.0, -1.0, 1.0, 3.0]) g.add(mesh(box(13, 0.16, 0.22), toon('#2a1e16'), 0, 3.32, z, false));
  const fan = new THREE.Group();
  fan.position.set(0.8, 3.0, 0.2);
  fan.add(mesh(cyl(0.015, 0.015, 0.4, 4), toon('#2a2a2a'), 0, 0.2, 0, false));
  fan.add(mesh(cyl(0.1, 0.12, 0.12, 8), toon('#3a2a20'), 0, 0, 0, false));
  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) blades.add(mesh(box(0.7, 0.012, 0.14), walnut, Math.cos(i * Math.PI / 2) * 0.42, -0.03, Math.sin(i * Math.PI / 2) * 0.42, false).rotateY(-i * Math.PI / 2));
  fan.add(blades);
  g.add(fan);
  // a burgundy runner from the door down the aisle
  const runner = mesh(new THREE.PlaneGeometry(1.15, 3.7), toon('#4e2222'), -0.8, 0.005, -1.75, false);
  runner.rotation.x = -Math.PI / 2;
  g.add(runner);
  const runnerEdge = mesh(new THREE.PlaneGeometry(1.0, 3.55), toon('#6a2e2a'), -0.8, 0.007, -1.75, false);
  runnerEdge.rotation.x = -Math.PI / 2;
  g.add(runnerEdge);
  const lamps: THREE.PointLight[] = [];
  for (const [x, z] of [[-3.7, -1.5], [-3.7, 1.25], [2.0, -1.85], [4.4, -1.85], [3.45, 2.0], [3.45, 4.45], [-3.7, 4.45]]) {
    const l = pendant(g, x, 2.55, z, '#b69255', { color: '#ffd097', intensity: 2.2, distance: 5 });
    if (l) lamps.push(l);
  }
  const hemi = new THREE.HemisphereLight('#f5d6a7', '#4c392e', 1.4); g.add(hemi);
  keyLight(g, '#ffdfab', 1.7, [0, 6, 6], [0, 0, -1]);
  return {
    id: 'restaurant', name: 'The Restaurant', group: g,
    nodes: nodes({ door: [-0.8, -3.3], host: [-1.25, -2.45], center: [-0.8, 0], left: [-1.9, -0.55], back_inner: [-1.9, -2.65], back_left: [-3.7, -2.65], back_outer: [-5.4, -2.65], far_left: [-5.5, -0.55], outer_front: [-5.25, 2.3], front_left: [-3.7, 2.3], window_front: [-3.7, 3.3], inner_front: [-1.7, 2.3], front: [1, 1.1], booth_left: [0.55, -2.78], booth_right: [5.85, -2.78], booth_aisle_l: [0.25, -0.8], booth_back_l: [0.25, -2.78], booth_aisle_r: [6.2, -0.8], booth_back_r: [6.2, -2.78], booth_head_l: [0.55, -1.1], booth_head_r: [5.5, -1.0], booth_front: [3.2, -0.85], service: [5.2, 1.1], dining_aisle: [5.2, 3.3], dining_front: [3.45, 3.3], kitchen: [6.08, -3.3] }),
    edges: [['door', 'host'], ['host', 'center'], ['host', 'left'], ['left', 'back_inner'], ['back_inner', 'back_left'], ['back_left', 'back_outer'], ['back_outer', 'far_left'], ['left', 'center'], ['far_left', 'outer_front'], ['outer_front', 'front_left'], ['front_left', 'inner_front'], ['front_left', 'window_front'], ['inner_front', 'center'], ['center', 'front'], ['front', 'booth_front'], ['front', 'booth_aisle_l'], ['booth_aisle_l', 'booth_back_l'], ['booth_back_l', 'booth_left'], ['booth_aisle_l', 'booth_head_l'], ['booth_front', 'service'], ['booth_front', 'booth_aisle_r'], ['booth_aisle_r', 'booth_back_r'], ['booth_back_r', 'booth_right'], ['booth_back_r', 'kitchen'], ['booth_front', 'booth_head_r'], ['service', 'dining_aisle'], ['dining_aisle', 'dining_front']],
    door: 'door',
    doors: { door: entrance },
    marks: {
      table_left: mark(-4.66, -1.53, Math.PI / 2 - 0.25, 'far_left', 'left chair at the date table', { seat: 0.47, approach: [-4.75, -0.55] }),
      table_right: mark(-2.74, -1.53, -Math.PI / 2 + 0.25, 'left', 'right chair at the date table', { seat: 0.47, approach: [-2.5, -0.55] }),
      table_2_left: mark(-4.66, 1.27, Math.PI / 2 - 0.25, 'front_left', 'left chair at the second table', { seat: 0.47, approach: [-4.7, 2.25] }),
      table_2_right: mark(-2.74, 1.27, -Math.PI / 2 + 0.25, 'front_left', 'right chair at the second table', { seat: 0.47, approach: [-2.7, 2.25] }),
      dining_left: mark(2.49, 2.02, Math.PI / 2 - 0.25, 'front', 'left chair in the neighboring dining bay', { seat: 0.47, approach: [2.45, 1.1] }),
      dining_right: mark(4.41, 2.02, -Math.PI / 2 + 0.25, 'service', 'right chair in the neighboring dining bay', { seat: 0.47, approach: [4.45, 1.1] }),
      dining_front_left: mark(2.49, 4.47, Math.PI / 2 - 0.25, 'dining_front', 'left chair at the foreground dining table', { seat: 0.47, approach: [2.45, 3.55] }),
      dining_front_right: mark(4.41, 4.47, -Math.PI / 2 + 0.25, 'dining_front', 'right chair at the foreground dining table', { seat: 0.47, approach: [4.45, 3.55] }),
      window_front_left: mark(-4.66, 4.47, Math.PI / 2 - 0.25, 'window_front', 'left chair at the foreground window table', { seat: 0.47, approach: [-4.7, 3.55] }),
      window_front_right: mark(-2.74, 4.47, -Math.PI / 2 + 0.25, 'window_front', 'right chair at the foreground window table', { seat: 0.47, approach: [-2.7, 3.55] }),
      booth_left: mark(2.0, -2.78, 0.15, 'booth_left', 'left end of the banquette', { seat: 0.47, approach: [0.55, -2.78], depth: 0.38 }),
      booth_middle: mark(3.2, -2.78, 0, 'booth_left', 'middle of the banquette', { seat: 0.47, approach: [0.55, -2.78], depth: 0.38 }),
      booth_right: mark(4.4, -2.78, -0.15, 'booth_right', 'right end of the banquette', { seat: 0.47, approach: [5.85, -2.78], depth: 0.38 }),
      booth_end_left: mark(0.99, -1.88, Math.PI / 2 - 0.3, 'booth_head_l', 'chair at the left end of the group table', { seat: 0.47, approach: [0.55, -1.1] }),
      booth_end_right: mark(5.41, -1.88, -Math.PI / 2 + 0.3, 'booth_head_r', 'chair at the right end of the group table', { seat: 0.47, approach: [5.5, -1.0] }),
      host: mark(-0.35, -3.15, 0, 'door', 'behind the reservation stand'),
      service: mark(5.1, 1.1, -0.3, 'service', 'by the service station'),
      kitchen_door: mark(6.08, -3.3, -0.35, 'kitchen', 'bursting out of the swinging kitchen door behind the booth'),
      center: mark(-0.8, 0, 0, 'center', 'aisle between the tables'),
      door: mark(-0.8, -3.5, 0, 'door', 'restaurant entrance'),
    },
    wides: [
      { pos: v3(0, 2.05, 10.2), target: v3(0, 1.0, -0.6), fov: 54, label: 'Dining room wide' },
      { pos: v3(-3.7, 1.75, 0.5), target: v3(-3.7, 1.1, -1.55), fov: 58, label: 'Date table' },
      { pos: v3(3.2, 1.9, 0.9), target: v3(3.2, 1.2, -2.2), fov: 54, label: 'Group banquette' },
    ],
    ambience: 'bar', background: [], doorSound: 'bell',
    update(dt) { blades.rotation.y += dt * 1.6; },
    setTime(t) { for (const p of panes) p.material = t === 'day' ? day : night; hemi.intensity = t === 'day' ? 1.9 : 1.25; for (const l of lamps) l.intensity = t === 'day' ? 1.4 : 2.2; },
  };
}
