import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { planks, paneling, brick, sign, skyline, stripes } from '../../engine/textures';
import { type StageSet, mark, nodes, room, band, frame, pendant, door, bottles, keyLight, v3 } from './common';

export function buildMaclarens(): StageSet {
  const g = new THREE.Group();
  g.name = 'maclarens';
  const W = 12, D = 8, H = 3.4;

  room(g, {
    w: W, d: D, h: H,
    floor: toon('#ffffff', { map: planks('#4a3222', [8, 6], 4) }),
    back: toon('#ffffff', { map: stripes('#3e2a1e', '#36251a', [10, 3]) }),
    left: toon('#ffffff', { map: brick('#6a3a28', '#3a2e26', [6, 2]) }),
    right: toon('#ffffff', { map: stripes('#3e2a1e', '#36251a', [8, 3]) }),
    ceiling: '#1e1610',
  });
  // wainscoting
  const panel = toon('#ffffff', { map: paneling('#4a2c18', [14, 1]) });
  band(g, panel, 0, -D / 2 + 0.03, W, 1.25);
  band(g, panel, W / 2 - 0.03, 0, D + 2, 1.25, Math.PI / 2);
  band(g, toon('#2e1a0e'), 0, -D / 2 + 0.06, W, 0.06, 0, 0.08).position.y = 1.27;
  // ceiling beams
  for (let x = -5; x <= 5; x += 2.5) g.add(mesh(box(0.25, 0.25, D + 2), toon('#2a1a10'), x, H - 0.12, 1, false));

  // ---- the booth -------------------------------------------------------
  const leather = toon('#6e1d1d');
  const leatherDark = toon('#4e1414');
  const wood = toon('#3a2214');
  // back bench
  g.add(occluder(mesh(roundedBox(2.7, 0.42, 0.6, 0.03), wood, -1.6, 0.21, -3.45)));
  g.add(mesh(roundedBox(2.6, 0.1, 0.55, 0.04), leather, -1.6, 0.46, -3.43));
  g.add(occluder(mesh(roundedBox(2.7, 0.85, 0.18, 0.05), leatherDark, -1.6, 0.9, -3.82)));
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.03, 0.75, 0.02), leather, -2.7 + i * 0.73, 0.92, -3.72, false));
  // left bench
  g.add(occluder(mesh(roundedBox(0.6, 0.42, 1.5, 0.03), wood, -3.15, 0.21, -2.55)));
  g.add(mesh(roundedBox(0.55, 0.1, 1.45, 0.04), leather, -3.12, 0.46, -2.55));
  g.add(occluder(mesh(roundedBox(0.18, 0.85, 1.5, 0.05), leatherDark, -3.5, 0.9, -2.55)));
  // right chair
  const chairX = -0.22, chairZ = -2.55;
  g.add(mesh(box(0.48, 0.06, 0.48), wood, chairX, 0.45, chairZ));
  for (const sx of [1, -1]) for (const sz of [1, -1]) g.add(mesh(box(0.04, 0.45, 0.04), wood, chairX + sx * 0.2, 0.225, chairZ + sz * 0.2));
  g.add(occluder(mesh(box(0.05, 0.55, 0.46), wood, chairX + 0.24, 0.78, chairZ)));
  // table
  g.add(occluder(mesh(roundedBox(1.55, 0.07, 0.9, 0.02), toon('#2b170c'), -1.6, 0.76, -2.55)));
  g.add(mesh(cyl(0.06, 0.08, 0.72, 6), wood, -1.6, 0.36, -2.55));
  g.add(mesh(box(0.6, 0.04, 0.4), wood, -1.6, 0.02, -2.55));
  // pints and a scotch
  const beer = toon('#e09a2a', { emissive: '#6a3a08', emissiveIntensity: 0.5 });
  const foam = toon('#f5efe0');
  for (const [x, z] of [[-2.15, -2.8], [-1.75, -2.85], [-1.15, -2.8], [-0.95, -2.35], [-2.25, -2.3]] as const) {
    g.add(mesh(cyl(0.045, 0.038, 0.15, 6), beer, x, 0.875, z, false));
    g.add(mesh(cyl(0.046, 0.046, 0.025, 6), foam, x, 0.96, z, false));
  }
  g.add(mesh(cyl(0.04, 0.04, 0.08, 6), toon('#b8742a', { emissive: '#4a2a08' }), -1.4, 0.84, -2.3, false));

  // ---- the bar -------------------------------------------------------
  const barX = 4.0;
  g.add(occluder(mesh(box(0.6, 1.05, 3.8), toon('#ffffff', { map: paneling('#3e2414', [1, 4]) }), barX, 0.525, -1.9)));
  g.add(mesh(roundedBox(0.8, 0.07, 4.0, 0.02), toon('#24130a'), barX, 1.08, -1.9));
  g.add(mesh(box(0.06, 0.06, 3.8), toon('#b08a3a'), barX - 0.33, 0.12, -1.9, false));
  // taps
  for (let i = 0; i < 4; i++) {
    g.add(mesh(cyl(0.02, 0.02, 0.25, 4), toon('#c9c9c9'), barX + 0.1, 1.24, -2.6 + i * 0.12, false));
    g.add(mesh(box(0.04, 0.09, 0.02), toon(['#c9a227', '#7a2e1f', '#2e4a6b', '#3d6b2e'][i]), barX + 0.1, 1.4, -2.6 + i * 0.12, false));
  }
  // stools
  for (const z of [-2.85, -1.85, -0.85]) {
    g.add(mesh(cyl(0.21, 0.21, 0.07, 8), leather, 3.3, 0.73, z));
    g.add(mesh(cyl(0.035, 0.05, 0.7, 6), toon('#1a1a1a'), 3.3, 0.35, z));
    g.add(mesh(cyl(0.18, 0.18, 0.02, 8), toon('#1a1a1a'), 3.3, 0.3, z, false));
  }
  // back bar: shelves, mirror, bottles
  const bb = toon('#2b170c');
  g.add(mesh(box(0.5, 0.95, 3.8), bb, 5.72, 0.475, -1.9));
  g.add(mesh(box(0.05, 1.1, 3.6), glow('#6a6a78', 0.55), 5.94, 1.75, -1.9, false));
  for (const y of [1.25, 1.75, 2.25]) {
    g.add(mesh(box(0.3, 0.04, 3.6), bb, 5.8, y, -1.9, false));
    bottles(g, 5.8, y + 0.02, -3.5, 16, 0.2, -Math.PI / 2, Math.round(y * 100));
  }
  g.add(mesh(box(0.08, 1.3, 0.1), bb, 5.8, 1.75, -3.75, false));
  g.add(mesh(box(0.08, 1.3, 0.1), bb, 5.8, 1.75, -0.05, false));

  // ---- walls: frames, signs, door ------------------------------------------
  frame(g, -2.35, 2.05, -3.97, 0.5, 0.65, 11);
  frame(g, -1.6, 2.15, -3.97, 0.55, 0.42, 12);
  frame(g, -0.85, 2.05, -3.97, 0.5, 0.65, 13);
  frame(g, -1.95, 2.65, -3.97, 0.35, 0.3, 14);
  frame(g, -1.15, 2.7, -3.97, 0.4, 0.3, 15);
  frame(g, 1.3, 2.1, -3.97, 0.7, 0.5, 16);
  frame(g, -4.6, 2.0, -3.97, 0.6, 0.8, 17);
  frame(g, -5.97, 2.1, -2.9, 0.6, 0.45, 18, Math.PI / 2);
  // neon beer sign on back wall
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.32), new THREE.MeshBasicMaterial({ map: sign('ALE ON TAP', '#ff5a7a', '#120808', 128, 36, 'bold 22px monospace') }));
  neon.position.set(1.3, 1.55, -3.97);
  g.add(neon);
  const neonLight = new THREE.PointLight('#ff4060', 1.2, 3, 1.5);
  neonLight.position.set(1.3, 1.6, -3.6);
  g.add(neonLight);
  // dartboard
  g.add(mesh(cyl(0.24, 0.24, 0.04, 12), toon('#1f1f1f'), -5.96, 1.7, -0.7, false).rotateZ(Math.PI / 2));
  g.add(mesh(cyl(0.14, 0.14, 0.05, 12), toon('#8a2a1a'), -5.95, 1.7, -0.7, false).rotateZ(Math.PI / 2));
  g.add(mesh(cyl(0.04, 0.04, 0.06, 8), toon('#2e6b3a'), -5.94, 1.7, -0.7, false).rotateZ(Math.PI / 2));
  // front door with glass
  const streetNight = toon('#ffffff', { map: skyline(true, 21), emissive: '#ffffff', emissiveIntensity: 0.35 });
  const streetDay = toon('#ffffff', { map: skyline(false, 21), emissive: '#ffffff', emissiveIntensity: 0.4 });
  const d = door(g, -5.96, 1.4, Math.PI / 2, '#3a1e10', { glass: streetNight, frameColor: '#24130a' });
  const doorGlass = d.children[d.children.length - 1] as THREE.Mesh;
  const lettering = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), new THREE.MeshBasicMaterial({ map: sign("MacLAREN'S", '#e8c56a', '#1a0d06', 128, 32, 'italic bold 22px Georgia'), transparent: false }));
  lettering.position.set(-5.9, 1.95, 1.4);
  lettering.rotation.y = Math.PI / 2;
  g.add(lettering);
  // coat hooks + high-top in the back corner
  g.add(occluder(mesh(cyl(0.35, 0.35, 0.05, 10), toon('#2b170c'), -4.7, 1.05, -3.3)));
  g.add(mesh(cyl(0.05, 0.05, 1.05, 6), toon('#1a1a1a'), -4.7, 0.52, -3.3));

  // ---- lighting -------------------------------------------------------
  g.add(new THREE.HemisphereLight('#ffe2c4', '#3a2c20', 1.7));
  keyLight(g, '#fff0e0', 2.1, [1.5, 7, 7], [-0.5, 0, -2]);
  pendant(g, -1.6, 2.35, -2.55, '#24442e', { color: '#ffc884', intensity: 9, distance: 6 });
  pendant(g, 4.0, 2.4, -2.6, '#24442e', { color: '#ffc884', intensity: 5, distance: 5 });
  pendant(g, 4.0, 2.4, -1.0, '#24442e', { color: '#ffc884', intensity: 5, distance: 5 });
  pendant(g, -4.7, 2.4, -3.0, '#24442e', { color: '#ffc884', intensity: 3, distance: 4 });
  pendant(g, 1.0, 2.6, -0.8, '#24442e', { color: '#ffc884', intensity: 3, distance: 5 });
  // sconces
  for (const x of [-3.2, 0.1]) {
    g.add(mesh(box(0.12, 0.18, 0.08), glow('#ffcf8a', 1.4), x, 2.2, -3.95, false));
  }

  const N = nodes({
    door: [-4.9, 1.0], left: [-3.7, -1.2], booth_l: [-2.6, -1.65], booth_r: [-0.7, -1.65],
    mid: [0.9, -0.9], bar: [2.7, -1.85], bar_end: [3.7, 0.7], front: [0.5, 0.8],
  });

  return {
    id: 'maclarens',
    name: "MacLaren's Pub",
    group: g,
    nodes: N,
    edges: [['door', 'left'], ['left', 'booth_l'], ['booth_l', 'booth_r'], ['booth_r', 'mid'], ['mid', 'bar'], ['bar', 'bar_end'], ['door', 'front'], ['front', 'mid'], ['front', 'bar_end'], ['left', 'front']],
    door: 'door',
    marks: {
      booth_back_left: mark(-2.25, -3.3, 0, 'booth_l', 'booth, back bench, left seat', { seat: 0.47, approach: [-2.25, -1.85] }),
      booth_back_center: mark(-1.6, -3.3, 0, 'booth_l', 'booth, back bench, middle seat', { seat: 0.47, approach: [-1.6, -1.85] }),
      booth_back_right: mark(-0.95, -3.3, 0, 'booth_r', 'booth, back bench, right seat', { seat: 0.47, approach: [-0.95, -1.85] }),
      booth_left: mark(-2.95, -2.55, Math.PI / 2, 'booth_l', 'booth, left end (side bench)', { seat: 0.47, approach: [-2.95, -1.8] }),
      booth_right: mark(-0.35, -2.55, -Math.PI / 2, 'booth_r', 'booth, right end (chair)', { seat: 0.48, approach: [-0.35, -1.75] }),
      booth_side: mark(0.25, -1.75, -1.1, 'booth_r', 'standing at the end of the booth table (where the waitress stands)'),
      bar_stool_1: mark(3.25, -2.85, Math.PI / 2, 'bar', 'bar stool, far', { seat: 0.76, approach: [2.75, -2.85] }),
      bar_stool_2: mark(3.25, -1.85, Math.PI / 2, 'bar', 'bar stool, middle', { seat: 0.76, approach: [2.75, -1.85] }),
      bar_stool_3: mark(3.25, -0.85, Math.PI / 2, 'bar', 'bar stool, near', { seat: 0.76, approach: [2.75, -0.85] }),
      bar_standing: mark(2.6, -0.2, -0.6, 'bar', 'standing by the bar, facing the room'),
      behind_bar: mark(4.75, -1.7, -Math.PI / 2, 'bar_end', 'behind the bar (bartender spot)', { approach: [4.75, 0.5] }),
      center: mark(0.7, -0.9, 0.1, 'mid', 'middle of the pub floor'),
      darts: mark(-5.0, -0.7, -Math.PI / 2 + 0.5, 'left', 'by the dartboard on the left wall'),
      door: mark(-5.2, 1.3, Math.PI / 2, 'door', 'the front door'),
    },
    wides: [
      { pos: v3(0.3, 1.8, 6.4), target: v3(0.0, 1.1, -1.8), fov: 44 },
      { pos: v3(-0.2, 1.65, 3.6), target: v3(-0.6, 1.0, -2.2), fov: 46 },
      { pos: v3(-1.0, 1.45, 2.4), target: v3(-1.65, 0.95, -2.9), fov: 44 },
      { pos: v3(0.6, 1.6, 2.2), target: v3(3.8, 1.1, -1.9), fov: 46 },
    ],
    ambience: 'bar',
    background: [{ character: 'carl', mark: 'behind_bar' }],
    setTime(t) {
      doorGlass.material = t === 'night' ? streetNight : streetDay;
    },
  };
}
