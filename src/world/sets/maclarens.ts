import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { planks, paneling, brick, sign, skyline, stripes, mural, paneGlass, glassBlock, neonShamrock } from '../../engine/textures';
import { type StageSet, mark, nodes, room, band, frame, door, bottles, keyLight, v3 } from './common';

// Laid out after the show's set: the gang's booth sits downstage centre with two red benches
// facing each other and a chair at the far end; behind it the frosted window with the shamrock
// neon, the mural over the corner booth on the left, the entrance and glass block on the right
// of the window, and the bar along the right wall.
export function buildMaclarens(): StageSet {
  const g = new THREE.Group();
  g.name = 'maclarens';
  const W = 14, D = 9, H = 3.4;
  const BACK = -D / 2, LEFT = -W / 2, RIGHT = W / 2;
  const GREEN = '#24402f';

  const leather = toon('#7a1f1c');
  const leatherDark = toon('#5c1715');
  const wood = toon('#3a2214');
  const woodDark = toon('#24130a');
  const brass = toon('#b08a3a');
  const black = toon('#1a1a1a');
  const bead = (len: number) => toon('#ffffff', { map: stripes('#3a2214', '#2c190e', [Math.round(len * 4), 1]) });

  room(g, {
    w: W, d: D, h: H,
    floor: toon('#ffffff', { map: planks('#4a3222', [9, 7], 4) }),
    back: toon(GREEN),
    ceiling: '#1e1610',
  });
  // beadboard wainscoting, broken on the back wall by the entrance
  const WAIN = 1.3;
  band(g, bead(8.3), -2.85, BACK + 0.03, 8.3, WAIN);
  band(g, bead(3.05), 5.475, BACK + 0.03, 3.05, WAIN);
  band(g, bead(D + 2), LEFT + 0.03, 1, D + 2, WAIN, Math.PI / 2);
  band(g, bead(D + 2), RIGHT - 0.03, 1, D + 2, WAIN, Math.PI / 2);
  g.add(mesh(box(8.3, 0.06, 0.1), woodDark, -2.85, WAIN + 0.03, BACK + 0.05, false));
  g.add(mesh(box(3.05, 0.06, 0.1), woodDark, 5.475, WAIN + 0.03, BACK + 0.05, false));
  for (const x of [LEFT + 0.05, RIGHT - 0.05]) g.add(mesh(box(0.1, 0.06, D + 2), woodDark, x, WAIN + 0.03, 1, false));
  // ceiling beams
  for (let x = -6; x <= 6; x += 3) g.add(mesh(box(0.25, 0.25, D + 2), toon('#2a1a10'), x, H - 0.12, 1, false));

  // ---- furniture kit ---------------------------------------------------
  /** Red leather booth bench running along its local x, facing local +z. */
  const bench = (x: number, z: number, len: number, rotY: number, backTop = 1.05) => {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    const bh = backTop - 0.4;
    b.add(occluder(mesh(roundedBox(len, 0.42, 0.58, 0.03), wood, 0, 0.21, 0)));
    b.add(mesh(roundedBox(len - 0.06, 0.1, 0.55, 0.04), leather, 0, 0.46, 0.01));
    b.add(occluder(mesh(roundedBox(len, bh, 0.16, 0.05), leatherDark, 0, 0.4 + bh / 2, -0.37)));
    const n = Math.round(len / 0.42);
    for (let i = 1; i < n; i++) b.add(mesh(box(0.025, bh - 0.14, 0.02), leather, -len / 2 + (i * len) / n, 0.4 + bh / 2, -0.285, false));
    g.add(b);
  };
  /** Wooden pub chair with a red seat pad, facing local +z. */
  const chair = (x: number, z: number, rotY: number) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    c.add(mesh(box(0.44, 0.05, 0.44), wood, 0, 0.44, 0));
    c.add(mesh(box(0.38, 0.03, 0.38), leather, 0, 0.475, 0, false));
    for (const sx of [1, -1]) {
      c.add(mesh(box(0.04, 0.44, 0.04), wood, sx * 0.19, 0.22, 0.19));
      c.add(mesh(box(0.04, 1.0, 0.04), wood, sx * 0.19, 0.5, -0.2));
    }
    c.add(mesh(box(0.42, 0.1, 0.03), wood, 0, 0.94, -0.2));
    c.add(mesh(box(0.42, 0.05, 0.03), wood, 0, 0.72, -0.2));
    g.add(c);
  };
  /** Round pub table with chairs at the given angles (0 = audience side). */
  const pubTable = (x: number, z: number, chairs: number[], r = 0.42) => {
    g.add(mesh(cyl(r, r, 0.05, 10), woodDark, x, 0.75, z));
    g.add(mesh(cyl(0.05, 0.07, 0.72, 6), black, x, 0.36, z));
    g.add(mesh(cyl(0.25, 0.28, 0.04, 8), black, x, 0.02, z, false));
    for (const a of chairs) chair(x + Math.sin(a) * (r + 0.26), z + Math.cos(a) * (r + 0.26), a + Math.PI);
  };
  const beer = toon('#e09a2a', { emissive: '#6a3a08', emissiveIntensity: 0.5 });
  const foam = toon('#f5efe0');
  const pint = (x: number, y: number, z: number) => {
    g.add(mesh(cyl(0.045, 0.038, 0.15, 6), beer, x, y + 0.08, z, false));
    g.add(mesh(cyl(0.046, 0.046, 0.025, 6), foam, x, y + 0.165, z, false));
  };
  const bottleGreen = toon('#2e6b3a', { emissive: '#143a1c', emissiveIntensity: 0.5 });
  const beerBottle = (x: number, y: number, z: number) => {
    g.add(mesh(cyl(0.03, 0.03, 0.14, 6), bottleGreen, x, y + 0.07, z, false));
    g.add(mesh(cyl(0.012, 0.02, 0.08, 5), bottleGreen, x, y + 0.18, z, false));
  };
  const amber = glow('#ffd9a0', 1.3);
  const bowl = (r: number) => new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  /** Hanging schoolhouse bowl lamp. */
  const bowlLamp = (x: number, y: number, z: number, intensity: number, distance = 6) => {
    g.add(mesh(cyl(0.01, 0.01, H - y, 4), brass, x, y + (H - y) / 2, z, false));
    g.add(mesh(cyl(0.05, 0.2, 0.06, 8), brass, x, y + 0.03, z, false));
    g.add(mesh(bowl(0.2), amber, x, y, z, false));
    const l = new THREE.PointLight('#ffc884', intensity, distance, 1.4);
    l.position.set(x, y - 0.25, z);
    g.add(l);
  };
  /** Wall sconce: brass plate with a glowing glass bowl. */
  const sconce = (x: number, y: number, z: number, rotY = 0) => {
    const s = new THREE.Group();
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    s.add(mesh(box(0.1, 0.16, 0.03), brass, 0, 0.04, 0.015, false));
    s.add(mesh(bowl(0.14), amber, 0, 0, 0.1, false));
    g.add(s);
  };

  // ---- the booth -------------------------------------------------------
  const BX = -1.0, BZ = 0.6;
  bench(BX - 0.98, BZ, 1.7, Math.PI / 2);
  bench(BX + 0.98, BZ, 1.7, -Math.PI / 2);
  chair(BX, BZ - 1.3, 0);
  g.add(occluder(mesh(roundedBox(0.9, 0.07, 1.6, 0.02), toon('#3b2414'), BX, 0.76, BZ)));
  g.add(mesh(cyl(0.06, 0.08, 0.72, 6), black, BX, 0.36, BZ));
  g.add(mesh(box(0.4, 0.04, 0.7), black, BX, 0.02, BZ));
  // pints, bottles, napkins and the snack bowl
  const TOP = 0.795;
  for (const [x, z] of [[-0.3, 0.42], [-0.28, -0.4], [0.3, 0.4], [0.3, -0.38], [0.05, -0.66]] as const) pint(BX + x, TOP, BZ + z);
  beerBottle(BX - 0.08, TOP, BZ + 0.05);
  beerBottle(BX + 0.12, TOP, BZ + 0.3);
  for (const [x, z] of [[-0.2, 0.2], [0.22, -0.1], [0.0, 0.55]] as const) g.add(mesh(box(0.1, 0.006, 0.1), toon('#3a5a9a'), BX + x, TOP + 0.003, BZ + z, false));
  g.add(mesh(cyl(0.09, 0.06, 0.045, 8), woodDark, BX + 0.02, TOP + 0.022, BZ - 0.2, false));
  g.add(mesh(cyl(0.075, 0.075, 0.02, 8), toon('#c9742a'), BX + 0.02, TOP + 0.045, BZ - 0.2, false));
  // the neighbouring booth, back to back with ours under a shared wooden cap
  bench(BX - 1.9, BZ, 1.7, -Math.PI / 2);
  bench(BX - 3.6, BZ, 1.7, Math.PI / 2);
  g.add(mesh(box(0.42, 0.06, 1.9), woodDark, BX - 1.44, 1.08, BZ));
  g.add(mesh(roundedBox(0.9, 0.07, 1.5, 0.02), toon('#3b2414'), BX - 2.75, 0.76, BZ));
  g.add(mesh(cyl(0.06, 0.08, 0.72, 6), black, BX - 2.75, 0.36, BZ));
  // square column and the low partition running off it
  const colMat = toon('#ffffff', { map: stripes('#33241a', '#291c13', [2, 1]) });
  g.add(occluder(mesh(box(0.34, H, 0.34), colMat, BX - 1.44, H / 2, BZ - 1.07)));
  g.add(mesh(box(0.44, 0.3, 0.44), woodDark, BX - 1.44, 0.15, BZ - 1.07));
  g.add(mesh(box(0.44, 0.2, 0.44), woodDark, BX - 1.44, H - 0.35, BZ - 1.07, false));
  g.add(occluder(mesh(box(2.6, 1.0, 0.12), bead(2.6), BX - 2.9, 0.5, BZ - 1.07)));
  g.add(mesh(box(2.7, 0.06, 0.22), woodDark, BX - 2.9, 1.03, BZ - 1.07));

  // ---- corner booth under the mural ------------------------------------
  bench(-4.75, BACK + 0.45, 4.3, 0, 1.15);
  bench(LEFT + 0.45, -2.55, 2.3, Math.PI / 2, 1.15);
  pubTable(-5.6, -3.1, [0.9], 0.45);
  pubTable(-3.5, -3.3, [0], 0.36);
  pint(-5.5, 0.775, -3.2);
  pint(-5.8, 0.775, -3.0);
  pint(-3.5, 0.775, -3.35);
  const muralMesh = mesh(new THREE.PlaneGeometry(4.3, 1.5), toon('#ffffff', { map: mural(GREEN) }), -4.75, 2.07, BACK + 0.02, false);
  g.add(muralMesh);

  // ---- floor tables ------------------------------------------------------
  pubTable(-1.2, -3.1, [0.6, Math.PI + 0.5, -1.6]);
  pubTable(1.3, -3.2, [Math.PI, 1.4, -0.9]);
  pubTable(2.6, 0.5, [2.4, -2.2, 0.3]);
  pint(1.25, 0.775, -3.3);
  pint(2.5, 0.775, 0.45);
  beerBottle(-1.25, 0.775, -3.05);

  // ---- back wall: window, glass block, entrance ------------------------------
  const paneNight = toon('#ffffff', { map: paneGlass(true), emissive: '#ffffff', emissiveIntensity: 0.3 });
  const paneDay = toon('#ffffff', { map: paneGlass(false), emissive: '#ffffff', emissiveIntensity: 0.8 });
  const WX = -0.3, WY = 2.1;
  const pane = mesh(new THREE.PlaneGeometry(3.0, 1.6), paneNight, WX, WY, BACK + 0.02, false);
  g.add(pane);
  for (const s of [1, -1]) {
    g.add(mesh(box(3.24, 0.12, 0.12), woodDark, WX, WY + s * 0.86, BACK + 0.06, false));
    g.add(mesh(box(0.12, 1.6, 0.12), woodDark, WX + s * 1.56, WY, BACK + 0.06, false));
  }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.56), new THREE.MeshBasicMaterial({ map: neonShamrock(), transparent: true, alphaTest: 0.3 }));
  neon.position.set(WX + 0.55, WY + 0.2, BACK + 0.14);
  g.add(neon);
  const neonLight = new THREE.PointLight('#8aff9a', 1.0, 3, 1.5);
  neonLight.position.set(WX + 0.55, WY + 0.2, BACK + 0.6);
  g.add(neonLight);
  // glass block over a brick knee wall
  const blockNight = toon('#ffffff', { map: glassBlock(true), emissive: '#ffffff', emissiveIntensity: 0.6 });
  const blockDay = toon('#ffffff', { map: glassBlock(false), emissive: '#ffffff', emissiveIntensity: 0.8 });
  const blocks = mesh(new THREE.PlaneGeometry(1.2, 1.0), blockNight, 2.1, 2.1, BACK + 0.02, false);
  g.add(blocks);
  for (const s of [1, -1]) {
    g.add(mesh(box(1.36, 0.08, 0.1), woodDark, 2.1, 2.1 + s * 0.54, BACK + 0.05, false));
    g.add(mesh(box(0.08, 1.0, 0.1), woodDark, 2.1 + s * 0.64, 2.1, BACK + 0.05, false));
  }
  band(g, toon('#ffffff', { map: brick('#6a3a28', '#3a2e26', [2, 3]) }), 2.075, BACK + 0.08, 1.55, 1.45, 0, 0.16);
  g.add(mesh(box(1.65, 0.06, 0.24), woodDark, 2.075, 1.48, BACK + 0.1, false));
  // the door up to the street
  const streetNight = toon('#ffffff', { map: skyline(true, 21), emissive: '#ffffff', emissiveIntensity: 0.35 });
  const streetDay = toon('#ffffff', { map: skyline(false, 21), emissive: '#ffffff', emissiveIntensity: 0.4 });
  const DOOR_X = 3.4;
  const d = door(g, DOOR_X, BACK + 0.04, 0, '#2c1a10', { glass: streetNight, frameColor: '#24130a' });
  const doorGlass = d.children[d.children.length - 1] as THREE.Mesh;
  const lettering = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), new THREE.MeshBasicMaterial({ map: sign("MacLAREN'S", '#e8c56a', '#1a0d06', 128, 32, 'italic bold 22px Georgia') }));
  lettering.position.set(DOOR_X, 1.93, BACK + 0.12);
  g.add(lettering);
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.17), new THREE.MeshBasicMaterial({ map: sign('EXIT', '#7dffa0', '#0c1a10', 64, 26, 'bold 18px monospace') }));
  exit.position.set(DOOR_X, 2.62, BACK + 0.03);
  g.add(exit);

  // ---- the bar -----------------------------------------------------------
  const barX = 5.0, barZ0 = -2.9, barZ1 = 0.3;
  const barLen = barZ1 - barZ0, barMid = (barZ0 + barZ1) / 2;
  const barFront = toon('#ffffff', { map: paneling('#3e2414', [1, 4]) });
  g.add(occluder(mesh(box(0.6, 1.05, barLen), barFront, barX, 0.525, barMid)));
  g.add(mesh(roundedBox(0.8, 0.07, barLen + 0.1, 0.02), woodDark, barX, 1.08, barMid));
  // the return closing off the downstage end
  g.add(occluder(mesh(box(RIGHT - barX - 0.3, 1.05, 0.6), toon('#ffffff', { map: paneling('#3e2414', [3, 1]) }), (RIGHT + barX + 0.3) / 2, 0.525, barZ1 - 0.3)));
  g.add(mesh(roundedBox(RIGHT - barX + 0.4, 0.07, 0.8, 0.02), woodDark, (RIGHT + barX - 0.4) / 2, 1.08, barZ1 - 0.3));
  g.add(mesh(box(0.06, 0.06, barLen + 0.3), brass, barX - 0.36, 0.12, barMid + 0.15, false));
  g.add(mesh(box(RIGHT - barX + 0.3, 0.06, 0.06), brass, (RIGHT + barX - 0.4) / 2, 0.12, barZ1 + 0.06, false));
  // taps
  for (let i = 0; i < 4; i++) {
    g.add(mesh(cyl(0.02, 0.02, 0.25, 4), toon('#c9c9c9'), barX + 0.1, 1.24, -2.0 + i * 0.12, false));
    g.add(mesh(box(0.04, 0.09, 0.02), toon(['#c9a227', '#7a2e1f', '#2e4a6b', '#3d6b2e'][i]), barX + 0.1, 1.4, -2.0 + i * 0.12, false));
  }
  // banker's lamp, pints left on the bar
  g.add(mesh(cyl(0.06, 0.07, 0.02, 6), brass, barX + 0.1, 1.125, -0.15, false));
  g.add(mesh(cyl(0.012, 0.012, 0.22, 4), brass, barX + 0.1, 1.23, -0.15, false));
  g.add(mesh(roundedBox(0.14, 0.08, 0.26, 0.03), glow('#3fae5c', 1.2), barX + 0.06, 1.36, -0.15, false));
  pint(barX - 0.12, 1.115, -1.2);
  pint(barX - 0.1, 1.115, -2.55);
  // high-backed wooden stools with black seats
  const stoolZ = [-2.4, -1.5, -0.6];
  for (const z of stoolZ) {
    const sx = barX - 0.7;
    g.add(mesh(cyl(0.2, 0.2, 0.06, 8), black, sx, 0.76, z));
    g.add(mesh(cyl(0.21, 0.21, 0.04, 8), wood, sx, 0.72, z, false));
    for (const a of [1, -1]) for (const b of [1, -1]) g.add(mesh(box(0.04, 0.72, 0.04), wood, sx + a * 0.15, 0.36, z + b * 0.15));
    g.add(mesh(box(0.34, 0.03, 0.34), wood, sx, 0.3, z, false));
    for (const b of [1, -1]) g.add(mesh(box(0.035, 0.42, 0.035), wood, sx - 0.19, 0.95, z + b * 0.15, false));
    g.add(mesh(box(0.03, 0.12, 0.36), wood, sx - 0.19, 1.12, z, false));
  }
  // back bar: cabinet, mirror, shelves of bottles
  const bbZ0 = barZ0, bbLen = 2.6, bbMid = bbZ0 + bbLen / 2;
  g.add(mesh(box(0.5, 0.95, bbLen), woodDark, RIGHT - 0.28, 0.475, bbMid));
  g.add(mesh(box(0.05, 1.3, bbLen - 0.2), glow('#6a6a78', 0.55), RIGHT - 0.06, 1.85, bbMid, false));
  for (const y of [1.25, 1.75, 2.25]) {
    g.add(mesh(box(0.3, 0.04, bbLen - 0.2), woodDark, RIGHT - 0.2, y, bbMid, false));
    bottles(g, RIGHT - 0.2, y + 0.02, bbZ0 + 0.2, 11, 0.22, -Math.PI / 2, Math.round(y * 100));
  }
  for (const z of [bbZ0 + 0.05, bbZ0 + bbLen - 0.05]) g.add(mesh(box(0.1, 1.6, 0.1), woodDark, RIGHT - 0.2, 1.75, z, false));
  g.add(mesh(box(0.36, 0.12, bbLen + 0.1), woodDark, RIGHT - 0.2, 2.6, bbMid, false));

  // ---- walls: frames, signs, sconces ----------------------------------------
  const bz = BACK + 0.03;
  const stout = new THREE.MeshBasicMaterial({ map: sign('STOUT', '#e8c56a', '#12100c', 64, 22, 'bold 15px Georgia') });
  for (const x of [-6.2, -4.75, -3.3, 0.6, 5.2]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.25), stout);
    s.position.set(x, 3.08, bz);
    g.add(s);
  }
  frame(g, -5.5, 3.05, bz, 0.42, 0.26, 11, 0, '#8a6a2a');
  frame(g, -4.0, 3.05, bz, 0.42, 0.26, 12, 0, '#8a6a2a');
  frame(g, -2.2, 1.72, bz, 0.34, 0.44, 13);
  frame(g, -2.2, 2.3, bz, 0.34, 0.3, 14, 0, '#8a6a2a');
  sconce(-2.2, 2.82, bz);
  frame(g, -1.3, 3.12, bz, 0.4, 0.22, 15);
  frame(g, 2.1, 2.95, bz, 0.5, 0.3, 16, 0, '#8a6a2a');
  frame(g, 4.6, 2.1, bz, 0.5, 0.65, 17);
  frame(g, 5.4, 2.2, bz, 0.6, 0.45, 18, 0, '#8a6a2a');
  frame(g, 6.3, 2.05, bz, 0.5, 0.7, 19);
  sconce(4.25, 2.75, bz);
  // left wall
  const lx = LEFT + 0.03;
  frame(g, lx, 2.1, -3.3, 0.6, 0.45, 21, Math.PI / 2, '#8a6a2a');
  sconce(lx, 2.45, -2.55, Math.PI / 2);
  frame(g, lx, 2.1, -1.8, 0.5, 0.65, 22, Math.PI / 2);
  frame(g, lx, 2.2, -0.7, 0.4, 0.3, 23, Math.PI / 2);
  frame(g, lx, 2.1, 1.9, 0.6, 0.8, 24, Math.PI / 2, '#8a6a2a');
  sconce(lx, 2.45, 3.0, Math.PI / 2);
  g.add(mesh(cyl(0.07, 0.07, 0.36, 6), toon('#b3261e'), LEFT + 0.12, 1.0, -0.75, false)); // fire extinguisher
  g.add(mesh(cyl(0.02, 0.03, 0.08, 4), black, LEFT + 0.12, 1.22, -0.75, false));
  // dartboard
  g.add(mesh(cyl(0.24, 0.24, 0.04, 12), toon('#1f1f1f'), LEFT + 0.04, 1.7, 0.6, false).rotateZ(Math.PI / 2));
  g.add(mesh(cyl(0.14, 0.14, 0.05, 12), toon('#8a2a1a'), LEFT + 0.05, 1.7, 0.6, false).rotateZ(Math.PI / 2));
  g.add(mesh(cyl(0.04, 0.04, 0.06, 8), toon('#2e6b3a'), LEFT + 0.06, 1.7, 0.6, false).rotateZ(Math.PI / 2));
  // right wall, downstage of the bar
  const rx = RIGHT - 0.03;
  frame(g, rx, 2.1, 1.3, 0.6, 0.8, 25, -Math.PI / 2);
  frame(g, rx, 2.2, 2.3, 0.5, 0.4, 26, -Math.PI / 2, '#8a6a2a');
  sconce(rx, 2.45, 3.2, -Math.PI / 2);

  // ---- lighting -------------------------------------------------------
  g.add(new THREE.HemisphereLight('#ffe2c4', '#3a2c20', 1.7));
  keyLight(g, '#fff0e0', 2.1, [1.5, 7, 8], [-0.5, 0, -1]);
  bowlLamp(BX, 2.5, BZ, 6);
  bowlLamp(BX - 2.75, 2.4, BZ, 3, 5);
  bowlLamp(-5.3, 2.45, -3.1, 4, 5);
  bowlLamp(1.5, 2.55, -2.5, 4, 5);
  bowlLamp(barX, 2.4, -2.2, 5, 5);
  bowlLamp(barX, 2.4, -0.6, 5, 5);

  const N = nodes({
    door: [DOOR_X, -3.8], entry: [3.3, -3.3], back_bar: [5.85, -3.6], mid: [1.4, -1.3], bar: [3.75, -1.5], bar_front: [3.8, 1.1],
    booth_up: [-1.0, -1.6], booth_r: [0.9, 0.3], front: [1.2, 2.0], left: [-3.4, -1.4], left_far: [-5.6, -1.0],
  });

  const stool = (i: number, hint: string) => mark(barX - 0.75, stoolZ[i], Math.PI / 2, 'bar', hint, { seat: 0.76, approach: [barX - 1.25, stoolZ[i]] });
  return {
    id: 'maclarens',
    name: "MacLaren's Pub",
    group: g,
    nodes: N,
    edges: [
      ['door', 'entry'], ['entry', 'mid'], ['entry', 'bar'], ['entry', 'back_bar'], ['mid', 'bar'], ['mid', 'booth_up'], ['mid', 'booth_r'],
      ['booth_up', 'left'], ['left', 'left_far'], ['mid', 'front'], ['booth_r', 'front'], ['bar', 'bar_front'], ['front', 'bar_front'],
    ],
    door: 'door',
    marks: {
      booth_left_front: mark(BX - 0.85, BZ + 0.4, Math.PI / 2, 'booth_up', 'the booth, left bench, seat nearest the audience', { seat: 0.47, approach: [BX - 0.72, BZ - 1.4] }),
      booth_left_back: mark(BX - 0.85, BZ - 0.4, Math.PI / 2, 'booth_up', 'the booth, left bench, inner seat', { seat: 0.47, approach: [BX - 0.72, BZ - 1.4] }),
      booth_right_front: mark(BX + 0.85, BZ + 0.4, -Math.PI / 2, 'booth_up', 'the booth, right bench, seat nearest the audience', { seat: 0.47, approach: [BX + 0.72, BZ - 1.4] }),
      booth_right_back: mark(BX + 0.85, BZ - 0.4, -Math.PI / 2, 'booth_up', 'the booth, right bench, inner seat', { seat: 0.47, approach: [BX + 0.72, BZ - 1.4] }),
      booth_end: mark(BX, BZ - 1.17, 0, 'booth_up', "the booth, chair at the head of the table facing the audience (Ted's usual spot)", { seat: 0.48, approach: [BX, BZ - 1.95] }),
      booth_side: mark(BX + 1.35, BZ - 1.35, -0.78, 'mid', 'standing at the end of the booth table (where the waitress stands)'),
      bar_stool_1: stool(0, 'bar stool, far'),
      bar_stool_2: stool(1, 'bar stool, middle'),
      bar_stool_3: stool(2, 'bar stool, near'),
      bar_standing: mark(4.2, 1.0, -0.5, 'bar_front', 'standing at the near end of the bar, facing the room'),
      behind_bar: mark(5.85, -1.3, -Math.PI / 2, 'back_bar', 'behind the bar (bartender spot)', { approach: [5.85, -3.4] }),
      center: mark(1.4, -1.0, 0.1, 'mid', 'middle of the pub floor, between the booth and the bar'),
      darts: mark(-6.2, 0.6, -Math.PI / 2 + 0.5, 'left_far', 'by the dartboard on the left wall'),
      door: mark(DOOR_X, -4.0, 0, 'door', 'the front door, back wall right of the window'),
    },
    wides: [
      { pos: v3(0.2, 1.9, 7.4), target: v3(0.4, 1.15, -1.5), fov: 44 },
      { pos: v3(-1.0, 1.6, 4.9), target: v3(-1.0, 1.05, 0.0), fov: 44 },
      { pos: v3(0.3, 1.45, 3.7), target: v3(-1.1, 0.98, 0.1), fov: 42 },
      { pos: v3(1.6, 1.6, 3.4), target: v3(5.0, 1.1, -1.3), fov: 46 },
    ],
    ambience: 'bar',
    background: [{ character: 'carl', mark: 'behind_bar' }],
    doorSound: 'none',
    reserved: ['behind_bar'],
    setTime(t) {
      const night = t === 'night';
      doorGlass.material = night ? streetNight : streetDay;
      pane.material = night ? paneNight : paneDay;
      blocks.material = night ? blockNight : blockDay;
    },
  };
}
