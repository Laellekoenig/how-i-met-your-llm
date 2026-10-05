import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { planks, brick, skyline, rug, books } from '../../engine/textures';
import { type StageSet, mark, nodes, room, band, frame, door, couch, armchair, plant, keyLight, window_, v3 } from './common';

/** Ted & Marshall's apartment on the Upper West Side. */
export function buildApartment(): StageSet {
  const g = new THREE.Group();
  g.name = 'apartment';
  const W = 11, D = 8, H = 3.3;
  const wall = toon('#a8643f');
  room(g, {
    w: W, d: D, h: H,
    floor: toon('#ffffff', { map: planks('#8a5a32', [7, 5], 9) }),
    back: wall,
    left: toon('#ffffff', { map: brick('#9a4a2e', '#4a3328', [5, 2], 5) }),
    right: wall,
    ceiling: '#3a2a20',
  });
  const trim = toon('#efe6d2');
  band(g, trim, 0, -D / 2 + 0.03, W, 0.14);
  band(g, trim, W / 2 - 0.03, 0, D + 2, 0.14, Math.PI / 2);
  band(g, trim, 0, -D / 2 + 0.03, W, 0.06).position.y = 3.2;

  // window behind the couch
  const night = toon('#ffffff', { map: skyline(true, 3), emissive: '#ffffff', emissiveIntensity: 0.55 });
  const day = toon('#ffffff', { map: skyline(false, 3), emissive: '#ffffff', emissiveIntensity: 0.6 });
  const pane = window_(g, 0, 1.95, -D / 2 + 0.02, 3.0, 1.7, night, '#efe6d2', 0, 2);
  // curtains
  for (const s of [1, -1]) g.add(mesh(box(0.45, 2.3, 0.08), toon('#5a6b3a'), s * 1.85, 1.75, -3.9, false));
  g.add(mesh(box(4.4, 0.05, 0.05), toon('#2a1a10'), 0, 2.95, -3.88, false));

  // couch + coffee table + rug
  couch(g, 0, -3.3, 2.7, '#6b4a33', '#2a1a10');
  const rugM = mesh(new THREE.PlaneGeometry(3.4, 2.2), toon('#ffffff', { map: rug('#5a2a24', '#c9a227', '#2e4a6b') }), 0, 0.01, -1.9, false);
  rugM.rotation.x = -Math.PI / 2;
  rugM.receiveShadow = true;
  g.add(rugM);
  const tableWood = toon('#4a2e1a');
  g.add(occluder(mesh(roundedBox(1.4, 0.06, 0.7, 0.02), tableWood, 0, 0.42, -1.9)));
  for (const sx of [1, -1]) for (const sz of [1, -1]) g.add(mesh(box(0.06, 0.4, 0.06), tableWood, sx * 0.62, 0.2, -1.9 + sz * 0.28));
  g.add(mesh(box(0.3, 0.04, 0.22), toon('#c94a3a'), -0.3, 0.47, -1.85, false));
  g.add(mesh(cyl(0.05, 0.05, 0.1, 6), toon('#e8e2d0'), 0.35, 0.5, -1.95, false));
  g.add(mesh(cyl(0.045, 0.038, 0.15, 6), toon('#e09a2a', { emissive: '#6a3a08', emissiveIntensity: 0.4 }), 0.1, 0.52, -1.75, false));

  // armchair
  armchair(g, 2.35, -2.45, -0.75, '#7a2e24');

  // kitchen (left)
  const cab = toon('#6b4428');
  const counter = toon('#2f2f33');
  g.add(occluder(mesh(box(3.0, 0.92, 0.62), cab, -3.9, 0.46, -3.68)));
  g.add(mesh(box(3.05, 0.05, 0.66), counter, -3.9, 0.94, -3.68));
  g.add(mesh(box(3.0, 0.75, 0.35), cab, -3.9, 2.2, -3.8));
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.02, 0.6, 0.02), toon('#3a2414'), -5.1 + i * 0.75, 2.2, -3.62, false));
  g.add(occluder(mesh(roundedBox(0.8, 2.0, 0.75, 0.04), toon('#d8d8d0'), -5.05, 1.0, -2.6)));
  g.add(mesh(box(0.03, 0.5, 0.03), toon('#888'), -4.62, 1.3, -2.25, false));
  // island + stools
  g.add(occluder(mesh(box(0.75, 0.92, 1.7), cab, -3.45, 0.46, -1.8)));
  g.add(mesh(box(0.9, 0.05, 1.85), counter, -3.45, 0.95, -1.8));
  for (const z of [-2.3, -1.3]) {
    g.add(mesh(cyl(0.19, 0.19, 0.06, 8), toon('#2a1a10'), -2.75, 0.72, z));
    g.add(mesh(cyl(0.03, 0.04, 0.7, 6), toon('#1a1a1a'), -2.75, 0.35, z));
  }
  g.add(mesh(cyl(0.12, 0.1, 0.12, 8), toon('#c9a227'), -3.45, 1.03, -1.6, false));
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), toon('#d93a2a'), -3.45, 1.1, -1.6, false));

  // hallway door + front door
  door(g, -1.95, -D / 2 + 0.02, 0, '#e8dfcc');
  door(g, W / 2 - 0.02, -1.0, -Math.PI / 2, '#7a3a24');

  // bookshelf + swords + frames
  g.add(occluder(mesh(box(1.3, 2.1, 0.35), toon('#3a2618'), 3.6, 1.05, -3.8)));
  const shelf = mesh(new THREE.PlaneGeometry(1.15, 1.95), toon('#ffffff', { map: books(4) }), 3.6, 1.07, -3.62, false);
  g.add(shelf);
  const sword = (rz: number) => {
    const s = new THREE.Group();
    s.add(mesh(box(0.05, 1.0, 0.015), toon('#d0d4da'), 0, 0.25, 0, false));
    s.add(mesh(box(0.2, 0.04, 0.03), toon('#8a6a2a'), 0, -0.27, 0, false));
    s.add(mesh(box(0.035, 0.2, 0.03), toon('#2a1a10'), 0, -0.39, 0, false));
    s.position.set(2.35, 2.05, -3.96);
    s.rotation.z = rz;
    g.add(s);
  };
  sword(0.6);
  sword(-0.6);
  frame(g, -5.47, 1.9, -0.6, 0.7, 0.5, 31, Math.PI / 2, '#1a1a1a');
  frame(g, 5.47, 1.9, -2.6, 0.55, 0.7, 32, -Math.PI / 2, '#efe6d2');
  frame(g, 4.5, 2.0, -3.97, 0.4, 0.55, 33, 0, '#1a1a1a');

  plant(g, -1.35, -3.6, 1.1);
  plant(g, 4.6, -3.5, 1.2);
  // floor lamp
  g.add(mesh(cyl(0.02, 0.02, 1.6, 4), toon('#1a1a1a'), 3.0, 0.8, -3.0, false));
  g.add(mesh(cyl(0.15, 0.22, 0.28, 8), glow('#f5dca0', 1.1), 3.0, 1.65, -3.0, false));

  // lighting
  const hemi = new THREE.HemisphereLight('#ffe0b8', '#4a2a18', 1.5);
  g.add(hemi);
  const key = keyLight(g, '#fff0dc', 1.6, [2, 7, 7], [0, 0, -2]);
  const lamp = new THREE.PointLight('#ffc070', 6, 6, 1.4);
  lamp.position.set(3.0, 1.8, -2.8);
  g.add(lamp);
  const kitchenLight = new THREE.PointLight('#ffd8a0', 5, 6, 1.4);
  kitchenLight.position.set(-3.5, 2.6, -1.8);
  g.add(kitchenLight);
  g.add(mesh(cyl(0.2, 0.25, 0.08, 8), glow('#ffe6b0', 1.3), -3.5, 3.25, -1.8, false));
  const windowLight = new THREE.PointLight('#9ab8ff', 2, 6, 1.4);
  windowLight.position.set(0, 2, -3.2);
  g.add(windowLight);

  const N = nodes({
    center: [0.6, -0.7], front_l: [-1.5, -0.9], couch_l: [-1.7, -2.5], couch_r: [1.7, -2.5],
    right: [2.6, -1.2], door: [4.3, -0.9], kitchen: [-2.9, -0.5], hall: [-1.95, -2.9],
  });

  return {
    id: 'apartment',
    name: "Ted & Marshall's Apartment",
    group: g,
    nodes: N,
    edges: [['center', 'front_l'], ['front_l', 'couch_l'], ['front_l', 'kitchen'], ['couch_l', 'hall'], ['kitchen', 'hall'], ['center', 'right'], ['right', 'couch_r'], ['right', 'door'], ['center', 'door'], ['couch_l', 'couch_r']],
    door: 'door',
    marks: {
      couch_left: mark(-0.85, -3.2, 0, 'couch_l', 'couch, left cushion', { seat: 0.45, approach: [-0.85, -2.5] }),
      couch_center: mark(0, -3.2, 0, 'couch_l', 'couch, middle cushion', { seat: 0.45, approach: [0, -2.5] }),
      couch_right: mark(0.85, -3.2, 0, 'couch_r', 'couch, right cushion', { seat: 0.45, approach: [0.85, -2.5] }),
      armchair: mark(2.3, -2.4, -0.75, 'right', 'armchair to the right of the couch', { seat: 0.45, approach: [1.9, -1.9] }),
      kitchen: mark(-4.2, -1.8, Math.PI / 2, 'kitchen', 'in the kitchen, behind the island', { approach: [-4.2, -0.6] }),
      kitchen_stool_1: mark(-2.75, -2.3, -Math.PI / 2, 'kitchen', 'stool at the kitchen island', { seat: 0.73, approach: [-2.2, -2.3] }),
      kitchen_stool_2: mark(-2.75, -1.3, -Math.PI / 2, 'kitchen', 'second stool at the kitchen island', { seat: 0.73, approach: [-2.2, -1.3] }),
      window: mark(1.9, -3.45, Math.PI - 0.4, 'couch_r', 'by the window, looking out at the city'),
      hallway: mark(-1.95, -3.5, 0, 'hall', 'in the bedroom hallway doorway'),
      center: mark(0.6, -0.8, 0, 'center', 'middle of the living room'),
      door: mark(4.9, -1.0, -Math.PI / 2, 'door', 'the front door'),
    },
    wides: [
      { pos: v3(0, 1.75, 5.8), target: v3(-0.4, 1.0, -2.0), fov: 46 },
      { pos: v3(0.4, 1.35, 2.2), target: v3(0, 0.95, -3.0), fov: 46 },
      { pos: v3(1.6, 1.6, 2.4), target: v3(-3.3, 1.0, -1.9), fov: 44 },
    ],
    ambience: 'apartment',
    background: [],
    setTime(t) {
      pane.material = t === 'night' ? night : day;
      hemi.intensity = t === 'night' ? 1.4 : 2.0;
      key.intensity = t === 'night' ? 1.3 : 2.0;
      windowLight.color.set(t === 'night' ? '#9ab8ff' : '#fff2d8');
      windowLight.intensity = t === 'night' ? 2 : 6;
    },
  };
}
