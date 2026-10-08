import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { ellipsoid } from '../../engine/shapes';
import { planks, paneling, painting, books, rug, tufted, pillowStripes, kidsArt, handprint } from '../../engine/textures';
import { type StageSet, mark, nodes, frame, keyLight, v3 } from './common';

// Ted's living room in 2030, where Future Ted is telling the kids the story. Laid out after the couch
// shots from season 1 on: Penny (left) and Luke (right) on a black, button-tufted Chesterfield, facing
// their dad, who is the fourth wall. Behind the couch runs a built-in of warm orange wood: paneling up to
// a dark ledge, then a recess full of family stuff (a gilded wing, a gold handprint plaque, framed kids'
// drawings, photos, a stack of books, a stuffed monkey, a dark globe) and an upper shelf with more books
// and Ted's architecture models. A wooden coffee table sits in the foreground. Always a cozy evening.
export function buildFuture(): StageSet {
  const g = new THREE.Group();
  g.name = 'future';
  const H = 2.9;
  const LEFT = -3.2, RIGHT = 3.2, BACK = -1.75, FRONT = 3.2;

  const wood = toon('#a65a2c');
  const woodDark = toon('#6e3a1c');
  const ledgeMat = toon('#2c1c14');
  const leather = toon('#ffffff', { map: tufted('#26211f', [7, 2]) });
  const leatherPlain = toon('#1c1918');
  const leatherHi = toon('#2a2523');
  const gold = toon('#c9a04a', { emissive: '#3a2a08', emissiveIntensity: 0.4 });
  const brass = toon('#b8923a', { emissive: '#2a1e08', emissiveIntensity: 0.3 });

  // ---- shell -----------------------------------------------------------------------------
  const floor = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - BACK), toon('#ffffff', { map: planks('#5a3420', [6, 5], 41) }), 0, 0, (FRONT + BACK) / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - BACK), toon('#3a2618'), 0, H, (FRONT + BACK) / 2, false);
  ceil.rotation.x = Math.PI / 2;
  g.add(ceil);
  const sideMat = toon('#ffffff', { map: paneling('#9a5428', [5, 3]) });
  for (const [x, rot] of [[LEFT, Math.PI / 2], [RIGHT, -Math.PI / 2]] as const) {
    const w = mesh(new THREE.PlaneGeometry(FRONT - BACK, H), sideMat, x, H / 2, (FRONT + BACK) / 2, false);
    w.rotation.y = rot;
    g.add(w);
  }
  // back of the recess: darker wood boards
  g.add(mesh(new THREE.PlaneGeometry(RIGHT - LEFT, H), toon('#ffffff', { map: planks('#7a4224', [3, 5], 43) }), 0, H / 2, BACK, false));
  // The storytelling mark faces the couch; its reverse needs a wall behind Dad.
  const reverse = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, H), sideMat, 0, H / 2, FRONT, false).rotateY(Math.PI);
  reverse.userData.cameraBackdrop = true;
  g.add(reverse);

  // ---- the built-in behind the couch -------------------------------------------------------
  const LEDGE_Y = 1.06, LEDGE_D = 0.4, LZ = BACK + LEDGE_D / 2;
  const front = LZ + LEDGE_D / 2;
  // paneled cabinet front below the ledge
  g.add(occluder(mesh(box(RIGHT - LEFT, LEDGE_Y, LEDGE_D), wood, 0, LEDGE_Y / 2, LZ)));
  const panels = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, LEDGE_Y - 0.12), toon('#ffffff', { map: paneling('#b0622e', [8, 1]) }), 0, (LEDGE_Y - 0.12) / 2 + 0.08, front + 0.003, false);
  g.add(panels);
  g.add(mesh(box(RIGHT - LEFT, 0.08, 0.02), woodDark, 0, 0.04, front + 0.01, false)); // baseboard
  // the dark ledge top with a rounded nosing
  g.add(mesh(box(RIGHT - LEFT, 0.05, LEDGE_D + 0.06), ledgeMat, 0, LEDGE_Y + 0.025, LZ + 0.03));
  g.add(mesh(cyl(0.028, 0.028, RIGHT - LEFT, 6).rotateZ(Math.PI / 2), ledgeMat, 0, LEDGE_Y + 0.025, front + 0.06, false));
  // upper shelf and the vertical dividers of the built-in
  const SHELF_Y = 1.9;
  g.add(mesh(box(RIGHT - LEFT, 0.05, 0.32), woodDark, 0, SHELF_Y, BACK + 0.16));
  g.add(mesh(box(RIGHT - LEFT, 0.04, 0.02), wood, 0, SHELF_Y - 0.01, BACK + 0.33, false));
  for (const x of [-2.55, 2.55]) g.add(mesh(box(0.08, H - LEDGE_Y, 0.34), wood, x, (H + LEDGE_Y) / 2, BACK + 0.17, false));
  g.add(mesh(box(RIGHT - LEFT, 0.22, 0.36), wood, 0, H - 0.11, BACK + 0.18, false)); // header
  // a warm strip light under the upper shelf washes the recess
  g.add(mesh(box(4.8, 0.012, 0.04), glow('#ffd9a0', 1.1), 0, SHELF_Y - 0.03, BACK + 0.26, false));

  // ---- on the ledge, left to right -----------------------------------------------------------
  const top = LEDGE_Y + 0.05;
  // the gilded wing, rising to the left
  const wing = new THREE.Group();
  wing.position.set(-1.95, top, BACK + 0.2);
  wing.rotation.set(0, 0.25, 0.32);
  wing.add(mesh(box(0.12, 0.05, 0.1), ledgeMat, 0.25, 0.025, 0, false).rotateZ(-0.32));
  for (let i = 0; i < 6; i++) {
    const len = 0.5 - i * 0.05;
    const f = mesh(ellipsoid(len / 2, 0.035, 0.014, 10, 4), gold, -len / 2 + 0.28, 0.08 + i * 0.045, 0.02 - i * 0.004, false);
    f.rotation.z = 0.08 * i;
    wing.add(f);
  }
  g.add(wing);
  // a glass jar, a little red-and-yellow tin toy
  g.add(mesh(cyl(0.05, 0.05, 0.12, 8), toon('#bcd4dc', { emissive: '#203040', emissiveIntensity: 0.3 }), -1.55, top + 0.06, BACK + 0.24, false));
  g.add(mesh(roundedBox(0.16, 0.08, 0.08, 0.02), toon('#c8302a'), -1.32, top + 0.04, BACK + 0.3, false));
  g.add(mesh(roundedBox(0.08, 0.06, 0.07, 0.02), toon('#e8b830'), -1.33, top + 0.11, BACK + 0.3, false));
  // two of the kids' drawings, framed in red, leaning on the wall
  for (const [x, seed] of [[-0.88, 5], [-0.5, 8]] as const) {
    const f = new THREE.Group();
    f.position.set(x, top + 0.24, BACK + 0.06);
    f.rotation.x = -0.08;
    f.add(mesh(box(0.36, 0.46, 0.025), toon('#a8242a'), 0, 0, 0, false));
    f.add(mesh(new THREE.PlaneGeometry(0.3, 0.4), toon('#ffffff', { map: kidsArt(seed) }), 0, 0, 0.014, false));
    g.add(f);
  }
  // the gold handprint plaque on a stand, a blue vase in front
  const plaque = mesh(cyl(0.15, 0.15, 0.025, 14).rotateX(Math.PI / 2), toon('#ffffff', { map: handprint(), emissive: '#2a1e08', emissiveIntensity: 0.3 }), -0.14, top + 0.16, BACK + 0.12, false);
  plaque.rotation.x = -0.12;
  g.add(plaque);
  g.add(mesh(box(0.03, 0.14, 0.08), ledgeMat, -0.14, top + 0.07, BACK + 0.08, false));
  g.add(mesh(cyl(0.05, 0.065, 0.16, 8), toon('#5a78b0'), -0.32, top + 0.08, BACK + 0.32, false));
  // a framed photo: gold frame, white mat
  {
    const f = new THREE.Group();
    f.position.set(0.42, top + 0.2, BACK + 0.1);
    f.rotation.x = -0.1;
    f.add(mesh(box(0.42, 0.38, 0.03), toon('#c8a050'), 0, 0, 0, false));
    f.add(mesh(new THREE.PlaneGeometry(0.36, 0.32), toon('#f2eee4'), 0, 0, 0.016, false));
    f.add(mesh(new THREE.PlaneGeometry(0.22, 0.2), toon('#ffffff', { map: painting(77) }), 0, 0.01, 0.018, false));
    g.add(f);
  }
  // a stack of books, lying flat
  for (const [i, c, w] of [[0, '#3a4a6a', 0.3], [1, '#8a2a22', 0.27], [2, '#d8c8a0', 0.25], [3, '#2a4a2a', 0.22]] as const)
    g.add(mesh(box(w, 0.045, 0.2), toon(c), 0.98 + i * 0.01, top + 0.0225 + i * 0.045, BACK + 0.26, false).rotateY(0.06 * (i % 2 ? 1 : -1)));
  // the stuffed monkey, slumped against the wall
  {
    const m = new THREE.Group();
    m.position.set(1.38, top, BACK + 0.2);
    m.rotation.y = -0.3;
    const fur = toon('#6a4224'), face = toon('#d8b088');
    m.add(mesh(ellipsoid(0.09, 0.11, 0.08, 10, 8), fur, 0, 0.11, 0, false));
    m.add(mesh(ellipsoid(0.075, 0.07, 0.07, 10, 8), fur, 0, 0.28, 0.01, false));
    m.add(mesh(ellipsoid(0.05, 0.04, 0.03, 8, 6), face, 0, 0.265, 0.06, false));
    for (const s of [1, -1]) {
      m.add(mesh(ellipsoid(0.03, 0.03, 0.012, 8, 6), face, s * 0.075, 0.3, 0.0, false));
      m.add(mesh(ellipsoid(0.025, 0.09, 0.025, 6, 6), fur, s * 0.1, 0.12, 0.04, false).rotateZ(s * 0.5));
      m.add(mesh(ellipsoid(0.028, 0.03, 0.08, 6, 6), fur, s * 0.05, 0.03, 0.09, false));
      m.add(mesh(new THREE.SphereGeometry(0.01, 4, 3), toon('#111'), s * 0.022, 0.29, 0.07, false));
    }
    g.add(m);
  }
  // the dark globe on a brass stand, and the family photo in a white frame
  g.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), toon('#2a2a2a'), 1.82, top + 0.3, BACK + 0.18, false));
  g.add(mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 16, Math.PI), brass, 1.82, top + 0.3, BACK + 0.18, false).rotateZ(-0.4));
  g.add(mesh(cyl(0.012, 0.012, 0.12, 4), brass, 1.82, top + 0.08, BACK + 0.18, false));
  g.add(mesh(cyl(0.07, 0.08, 0.025, 8), brass, 1.82, top + 0.012, BACK + 0.18, false));
  {
    const f = new THREE.Group();
    f.position.set(2.15, top + 0.17, BACK + 0.12);
    f.rotation.set(-0.1, -0.15, 0);
    f.add(mesh(box(0.36, 0.3, 0.03), toon('#efece4'), 0, 0, 0, false));
    f.add(mesh(new THREE.PlaneGeometry(0.28, 0.22), toon('#ffffff', { map: painting(12) }), 0, 0, 0.016, false));
    g.add(f);
  }
  frame(g, -2.25, top + 0.22, BACK + 0.04, 0.34, 0.4, 91, 0, '#e8e0cc');

  // ---- the upper shelf: books, diplomas, and Ted's architecture models ---------------------------
  const st = SHELF_Y + 0.025;
  for (const [x, w] of [[-1.7, 0.7], [1.2, 0.9]] as const) {
    const b = mesh(new THREE.PlaneGeometry(w, 0.3), toon('#ffffff', { map: books(Math.round(x * 10) + 30) }), x, st + 0.15, BACK + 0.12, false);
    g.add(b);
  }
  // a model of the Empire State Building
  {
    const m = new THREE.Group();
    m.position.set(-0.75, st, BACK + 0.15);
    const silver = toon('#b8bcc0');
    for (const [y, w, h] of [[0, 0.16, 0.12], [0.12, 0.12, 0.26], [0.38, 0.08, 0.1], [0.48, 0.05, 0.07]] as const) m.add(mesh(box(w, h, w), silver, 0, y + h / 2, 0, false));
    m.add(mesh(cyl(0.006, 0.014, 0.16, 4), silver, 0, 0.63, 0, false));
    g.add(m);
  }
  // a framed diploma, a little white model house, a pair of bookends
  frame(g, 0.05, st + 0.2, BACK + 0.04, 0.4, 0.3, 64, 0, '#2a1b10');
  {
    const house = new THREE.Group();
    house.position.set(-0.35, st, BACK + 0.16);
    house.add(mesh(box(0.2, 0.12, 0.14), toon('#ece8de'), 0, 0.06, 0, false));
    house.add(mesh(cyl(0, 0.13, 0.08, 4).rotateY(Math.PI / 4).scale(1, 1, 0.75), toon('#7a3a2a'), 0, 0.16, 0, false));
    g.add(house);
  }
  g.add(mesh(box(0.06, 0.18, 0.14), brass, 0.55, st + 0.09, BACK + 0.15, false));
  g.add(mesh(cyl(0.08, 0.1, 0.2, 8), toon('#2e5a4a'), 2.15, st + 0.1, BACK + 0.15, false));
  // a big framed print above, on the left
  frame(g, -1.9, 2.42, BACK + 0.03, 0.9, 0.5, 70, 0, '#c9a227');
  frame(g, 1.6, 2.42, BACK + 0.03, 0.6, 0.45, 72, 0, '#2a1b10');

  // ---- the Chesterfield ------------------------------------------------------------------------
  const CZ = -0.95, L = 2.3, SEAT = 0.45;
  const couch = new THREE.Group();
  couch.position.set(0, 0, CZ);
  {
    couch.add(occluder(mesh(roundedBox(L, 0.3, 0.92, 0.04), leatherPlain, 0, 0.23, 0)));
    for (const dx of [-0.52, 0.52]) couch.add(mesh(roundedBox(1.0, 0.14, 0.7, 0.06), leatherHi, dx, SEAT - 0.06, 0.08));
    // tufted back, rolled over the top
    couch.add(occluder(mesh(roundedBox(L - 0.3, 0.46, 0.2, 0.05), leather, 0, SEAT + 0.2, -0.36)));
    couch.add(mesh(cyl(0.065, 0.065, L - 0.24, 10).rotateZ(Math.PI / 2), leatherHi, 0, SEAT + 0.43, -0.37));
    // scroll arms the same height as the back, rolled outward
    for (const s of [1, -1]) {
      const ax = s * (L / 2 - 0.09);
      couch.add(occluder(mesh(roundedBox(0.18, 0.5, 0.9, 0.03), leather, ax, 0.4, 0)));
      couch.add(mesh(cyl(0.075, 0.075, 0.92, 10).rotateX(Math.PI / 2), leatherHi, ax + s * 0.03, SEAT + 0.2, 0));
      couch.add(mesh(cyl(0.078, 0.078, 0.02, 10).rotateX(Math.PI / 2), leatherPlain, ax + s * 0.03, SEAT + 0.2, 0.46, false));
      couch.add(mesh(roundedBox(0.18, 0.42, 0.02, 0.01), leatherPlain, ax, 0.32, 0.455, false));
    }
    // brass nailhead trim along the front rail, turned wooden feet
    for (let i = 0; i < 26; i++) couch.add(mesh(new THREE.SphereGeometry(0.008, 4, 3), brass, -L / 2 + 0.2 + i * ((L - 0.4) / 25), 0.12, 0.465, false));
    for (const sx of [1, -1]) for (const sz of [1, -1]) couch.add(mesh(cyl(0.03, 0.04, 0.08, 6), toon('#3a2214'), sx * (L / 2 - 0.1), 0.04, sz * 0.38, false));
  }
  g.add(couch);

  // Penny's striped pillow (she hugs it; it travels with her) and the olive pillow wedged in Luke's corner
  const pillowGeo = roundedBox(0.36, 0.32, 0.13, 0.05, 3);
  const stripes = toon('#ffffff', { map: pillowStripes(['#5a2418', '#e6d2a8', '#9a3a22', '#c99a4a', '#5a2418', '#d8c098'], 2) });
  const pennyPillow = mesh(pillowGeo, stripes, 0, 0.2, 0.19, false);
  pennyPillow.rotation.set(-0.12, 0, 0.04);
  pennyPillow.castShadow = true;
  const olive = mesh(roundedBox(0.42, 0.4, 0.14, 0.06, 3), toon('#5a6630'), 0.93, SEAT + 0.24, CZ - 0.12, false);
  olive.rotation.set(-0.3, -0.5, -0.25);
  g.add(olive);
  g.add(mesh(ellipsoid(0.1, 0.06, 0.02, 8, 4), toon('#4a5a2a'), 0.9, SEAT + 0.27, CZ - 0.04, false).rotateY(-0.5));

  // ---- side tables and lamps at either end of the couch ------------------------------------------
  const lampLights: THREE.PointLight[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 + 0.38);
    g.add(occluder(mesh(box(0.48, 0.04, 0.48), woodDark, x, 0.6, CZ)));
    for (const ax of [1, -1]) for (const az of [1, -1]) g.add(mesh(box(0.04, 0.58, 0.04), woodDark, x + ax * 0.2, 0.29, CZ + az * 0.2, false));
    g.add(mesh(box(0.44, 0.03, 0.44), woodDark, x, 0.15, CZ, false));
    g.add(mesh(cyl(0.06, 0.09, 0.08, 8), brass, x, 0.66, CZ - 0.05, false));
    g.add(mesh(cyl(0.02, 0.02, 0.36, 6), brass, x, 0.88, CZ - 0.05, false));
    g.add(mesh(cyl(0.14, 0.2, 0.24, 10), toon('#efe2c4', { emissive: '#ffcf8a', emissiveIntensity: 0.55, side: THREE.DoubleSide }), x, 1.14, CZ - 0.05, false));
    const l = new THREE.PointLight('#ffcf90', 3.2, 4.5, 1.4);
    l.position.set(x, 1.1, CZ + 0.15);
    g.add(l);
    lampLights.push(l);
  }
  g.add(mesh(cyl(0.05, 0.04, 0.1, 8), toon('#e8e4da'), -L / 2 - 0.3, 0.67, CZ + 0.12, false)); // a mug

  // ---- foreground: rug and the wooden coffee table -----------------------------------------------
  const r = mesh(new THREE.PlaneGeometry(3.4, 2.4), toon('#ffffff', { map: rug('#5a2a1a', '#8a4a2a', '#c8945a') }), 0, 0.01, 0.2, false);
  r.rotation.x = -Math.PI / 2;
  r.receiveShadow = true;
  g.add(r);
  const TZ = 0.45;
  const tableMat = toon('#5a2e1a');
  g.add(occluder(mesh(roundedBox(1.3, 0.06, 0.66, 0.015), tableMat, 0, 0.42, TZ)));
  g.add(mesh(box(1.22, 0.1, 0.58), toon('#4a2414'), 0, 0.34, TZ, false));
  for (const sx of [1, -1]) for (const sz of [1, -1]) g.add(mesh(box(0.06, 0.4, 0.06), toon('#4a2414'), sx * 0.58, 0.2, TZ + sz * 0.26, false));
  g.add(mesh(box(1.18, 0.02, 0.54), toon('#4a2414'), 0, 0.1, TZ, false));
  // a big blue art book, a straw hat, a bowl, the remote
  g.add(mesh(box(0.42, 0.045, 0.32), toon('#2a3a7a'), -0.38, 0.47, TZ + 0.05, false).rotateY(0.12));
  g.add(mesh(box(0.36, 0.03, 0.26), toon('#d8c84a'), -0.38, 0.5, TZ + 0.06, false).rotateY(-0.05));
  g.add(mesh(cyl(0.15, 0.16, 0.02, 12), toon('#d8b878'), 0.34, 0.46, TZ + 0.02, false));
  g.add(mesh(cyl(0.08, 0.095, 0.07, 12), toon('#c8a868'), 0.34, 0.5, TZ + 0.02, false));
  g.add(mesh(cyl(0.097, 0.097, 0.012, 12), toon('#7a2a22'), 0.34, 0.475, TZ + 0.02, false));
  g.add(mesh(cyl(0.11, 0.07, 0.07, 10), toon('#cfe0e4', { emissive: '#203040', emissiveIntensity: 0.25 }), 0.0, 0.48, TZ - 0.12, false));
  g.add(mesh(box(0.05, 0.02, 0.17), toon('#18181a'), 0.6, 0.46, TZ + 0.1, false).rotateY(0.3));

  // ---- lights: lamplight and a soft key from the camera side, like a quiet evening -------------
  const hemi = new THREE.HemisphereLight('#ffe2c0', '#3a2216', 1.2);
  g.add(hemi);
  keyLight(g, '#fff0dc', 1.5, [-1.5, 4.5, 6], [0, 0.6, -1]);
  const fill = new THREE.PointLight('#ffd8a8', 4, 6, 1.3);
  fill.position.set(0.6, 2.2, 1.8);
  g.add(fill);
  const recessLight = new THREE.PointLight('#ffc888', 2.5, 3.2, 1.4);
  recessLight.position.set(0, 1.7, BACK + 0.5);
  g.add(recessLight);

  const N = nodes({ couch: [0, -0.2], side: [1.3, -0.2], front: [1.3, 1.3], center: [0, 1.3], door: [2.8, 1.5] });

  return {
    id: 'future',
    name: "Ted's Living Room, 2030",
    group: g,
    nodes: N,
    edges: [['couch', 'side'], ['side', 'front'], ['front', 'center'], ['front', 'door']],
    door: 'door',
    marks: {
      couch_left: mark(-0.5, CZ + 0.1, 0, 'couch', 'the black tufted Chesterfield, left cushion: Penny, cross-legged, hugging a striped pillow', { seat: SEAT, approach: [-0.5, CZ + 0.75], pose: 'cross_legged', prop: pennyPillow }),
      couch_right: mark(0.52, CZ + 0.1, 0, 'couch', 'the black tufted Chesterfield, right cushion: Luke, slouched with an arm along the back', { seat: SEAT, approach: [0.52, CZ + 0.75], pose: 'sprawl', depth: 0.36 }),
      center: mark(0, 1.3, Math.PI, 'center', "in front of the coffee table, where Dad's chair would be"),
      door: mark(2.8, 1.5, -Math.PI / 2, 'door', 'off to the side, toward the hall'),
    },
    wides: [
      // the shot: dead-on, couch-level, both kids, the ledge behind them
      { pos: v3(0, 1.0, 3.2), target: v3(0, 0.82, -0.9), fov: 22 },
      { pos: v3(0, 1.25, 4.4), target: v3(0, 1.0, -1.0), fov: 30 },
      { pos: v3(0.9, 1.05, 3.0), target: v3(-0.1, 0.85, -0.9), fov: 30 },
    ],
    ambience: 'none',
    background: [],
    doorSound: 'none',
    setTime() {
      // it's always the same evening on the couch
      for (const l of lampLights) l.intensity = 3.2;
    },
  };
}

/** Which kid sits where. */
export const KID_MARKS = { penny: 'couch_left', luke: 'couch_right' } as const;
