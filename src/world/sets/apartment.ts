import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { planks, brick, books, sign, stripes, painting, tvScreen, blindsWindow, patchRug, checker, fridgePhotos, phoneBox, blueprint, clockFace, archNiche, glassCabinet } from '../../engine/textures';
import { type StageSet, mark, nodes, frame, door, plant, keyLight, window_, v3 } from './common';
import { apartmentSeating, APARTMENT_SOFA } from './apartmentSeating';

// Ted & Marshall's apartment, laid out after the show's set: the orange couch in the middle of the
// room facing the audience; behind it a raised landing with Ted's desk under the two tall windows
// and the two bedroom doors at either end; the brick fireplace on the angled wall upstage left and
// the piano on the left wall (the swords crossed above it, the little red English phone box on top);
// the front door on the angled wall upstage right; and off right, the wall with the kitchen doorway and
// the pass-through window (the little desk underneath it, the round table in front), with the
// black-and-white tiled kitchen behind it.
export function buildApartment(): StageSet {
  const g = new THREE.Group();
  g.name = 'apartment';
  const H = 3.3;
  const LEFT = -5.6, RIGHT = 7.4, FRONT = 6;
  // the landing: a raised alcove behind the couch
  const AX0 = -3.0, AX1 = 2.6, AZB = -4.8, AZM = -2.75, PH = 0.3, STEP = 0.3;
  // kitchen: behind the wall running downstage from (KX, KZ) to (KX, KF)
  const KX = 4.4, KZ = -1.0, KB = -3.0, KF = 2.6, KT = 0.12;

  const wallMat = toon('#aaa597');
  const kitchenWall = toon('#e2cc8e');
  const trim = toon('#6a2a22');
  const white = toon('#efe9dc');
  const wood = toon('#5a3420');
  const woodDark = toon('#3a2214');
  const black = toon('#1a1a1a');
  const brass = toon('#b08a3a');

  /** Wall from a to b; the room is on its left (looking from a to b). Returns a group in wall space:
   *  x runs along the wall, y is up, +z points into the room. */
  const wall = (a: [number, number], b: [number, number], mat: THREE.Material, opts: { base?: number; trim?: boolean } = {}) => {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const w = new THREE.Group();
    w.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
    w.rotation.y = Math.atan2(-dz, dx);
    const plane = mesh(new THREE.PlaneGeometry(len, H), mat, 0, H / 2, 0);
    plane.castShadow = false;
    w.add(plane);
    if (opts.trim ?? true) {
      const base = opts.base ?? 0;
      for (const [y, h] of [[0, 0.14], [0.9, 0.05], [2.6, 0.05]] as const) w.add(mesh(box(len, h, 0.05), trim, 0, base + y + h / 2, 0.025, false));
      w.add(mesh(box(len, 0.1, 0.06), white, 0, H - 0.05, 0.03, false));
    }
    g.add(w);
    return w;
  };
  const place = <T extends THREE.Object3D>(w: THREE.Group, o: T, x: number, y: number, z: number, rotY = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = rotY;
    w.add(o);
    return o;
  };

  // ---- shell -----------------------------------------------------------------------------
  const floor = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - AZB), toon('#ffffff', { map: planks('#b07a44', [8, 6], 9) }), (LEFT + RIGHT) / 2, 0, (FRONT + AZB) / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - AZB), toon('#8a857a'), (LEFT + RIGHT) / 2, H, (FRONT + AZB) / 2, false);
  ceil.rotation.x = Math.PI / 2;
  g.add(ceil);
  const tiles = mesh(new THREE.PlaneGeometry(RIGHT - KX, FRONT - KB), toon('#ffffff', { map: checker('#f2efe6', '#1c1c1c', [6, 18]) }), (RIGHT + KX) / 2, 0.005, (FRONT + KB) / 2, false);
  tiles.rotation.x = -Math.PI / 2;
  tiles.receiveShadow = true;
  g.add(tiles);

  const leftWall = wall([LEFT, FRONT], [LEFT, -0.9], wallMat);
  const fireWall = wall([LEFT, -0.9], [AX0, AZM], wallMat);
  const tedWall = wall([AX0, AZM], [AX0, AZB], wallMat, { base: PH });
  const backWall = wall([AX0, AZB], [AX1, AZB], wallMat, { base: PH });
  const mlWall = wall([AX1, AZB], [AX1, AZM], wallMat, { base: PH });
  const doorWall = wall([AX1, AZM], [KX, KZ], wallMat);
  wall([KX + KT / 2, KZ], [KX + KT / 2, KB], kitchenWall, { trim: false });
  const kBack = wall([KX, KB], [RIGHT, KB], kitchenWall, { trim: false });
  const kRight = wall([RIGHT, KB], [RIGHT, FRONT], kitchenWall, { trim: false });
  for (const [w, len] of [[kBack, RIGHT - KX], [kRight, FRONT - KB]] as const) w.add(mesh(box(len, 0.12, 0.05), toon('#d8c890'), 0, 0.06, 0.025, false));

  // the kitchen wall: a doorway upstage, then the pass-through window
  const DOOR0 = -0.75, DOOR1 = 0.1, DTOP = 2.2, WIN0 = 0.4, WIN1 = 1.35, SILL = 1.0, WTOP = 2.05;
  const kwMats = [kitchenWall, wallMat, white, white, white, white];
  const LX = KX - KT / 2; // living-room face
  const kPiece = (z0: number, z1: number, y0: number, y1: number) => {
    const m = new THREE.Mesh(box(KT, y1 - y0, z1 - z0), kwMats);
    m.position.set(KX, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    g.add(occluder(m));
    for (const [y, h] of [[0, 0.14], [0.9, 0.05], [2.6, 0.05]] as const)
      if (y >= y0 && y + h <= y1) g.add(mesh(box(0.05, h, z1 - z0), trim, LX - 0.025, y + h / 2, (z0 + z1) / 2, false));
  };
  kPiece(KZ, DOOR0, 0, H);
  kPiece(DOOR0, DOOR1, DTOP, H);
  kPiece(DOOR1, WIN0, 0, H);
  kPiece(WIN0, WIN1, 0, SILL);
  kPiece(WIN0, WIN1, WTOP, H);
  kPiece(WIN1, KF, 0, H);
  g.add(mesh(box(0.06, 0.1, KF - KZ), white, LX - 0.03, H - 0.05, (KZ + KF) / 2, false));
  // dark wood casings around both openings, and the sill of the pass-through
  const casing = toon('#4a2416');
  for (const [z0, z1, y0, y1] of [[DOOR0, DOOR1, 0, DTOP], [WIN0, WIN1, SILL, WTOP]] as const) {
    for (const z of [z0 - 0.03, z1 + 0.03]) g.add(mesh(box(KT + 0.05, y1 - y0, 0.08), casing, KX, (y0 + y1) / 2, z, false));
    g.add(mesh(box(KT + 0.05, 0.1, z1 - z0 + 0.14), casing, KX, y1 + 0.05, (z0 + z1) / 2, false));
  }
  g.add(mesh(box(0.42, 0.05, WIN1 - WIN0 + 0.2), casing, KX - 0.08, SILL + 0.025, (WIN0 + WIN1) / 2));

  // the landing and its step, running the width of the alcove
  const deck = toon('#ffffff', { map: planks('#b07a44', [4, 2], 9) });
  const riser = toon('#5a3420');
  const platform = new THREE.Mesh(box(AX1 - AX0, PH, AZM - AZB), [riser, riser, deck, riser, riser, riser]);
  platform.position.set((AX0 + AX1) / 2, PH / 2, (AZB + AZM) / 2);
  platform.receiveShadow = true;
  g.add(platform);
  const step = new THREE.Mesh(box(AX1 - AX0, PH / 2, STEP), [riser, riser, deck, riser, riser, riser]);
  step.position.set((AX0 + AX1) / 2, PH / 4, AZM + STEP / 2);
  step.receiveShadow = true;
  g.add(step);
  g.add(mesh(box(AX1 - AX0, 0.03, 0.05), toon('#2a1a10'), (AX0 + AX1) / 2, PH, AZM + 0.02, false));

  // ---- the landing: windows, Ted's desk, drafting table, bookcase, bedroom doors -------------
  // Ted's bedroom (left) and Marshall & Lily's (right) open off the ends of the landing
  door(tedWall, 0, 0.02, 0, '#7a3a24', { frameColor: '#5a2a1a' }).position.y = PH;
  door(mlWall, 0, 0.02, 0, '#7a3a24', { frameColor: '#5a2a1a' }).position.y = PH;
  frame(tedWall, 0, 2.95, 0.03, 0.3, 0.2, 52, 0, '#1a1a1a');

  // two tall windows with half-drawn blinds; the radiator Ted handcuffed Barney to sits under the left one
  const nightGlass = toon('#ffffff', { map: blindsWindow(true, 3), emissive: '#ffffff', emissiveIntensity: 0.5 });
  const dayGlass = toon('#ffffff', { map: blindsWindow(false, 3), emissive: '#ffffff', emissiveIntensity: 0.65 });
  const WL = -1.6, WR = 1.0; // window centres (world x)
  const bx = (x: number) => x - (AX0 + AX1) / 2; // world x -> back-wall x
  const panes = [WL, WR].map((x) => window_(backWall, bx(x), PH + 1.75, 0.02, 1.0, 1.5, nightGlass, '#5a2a1a', 0, 0));
  const radiator = place(backWall, new THREE.Group(), bx(WL), PH, 0.14);
  radiator.add(occluder(mesh(box(0.9, 0.6, 0.16), toon('#ffffff', { map: stripes('#d8d2c4', '#a8a294', [6, 1]) }), 0, 0.36, 0)));
  radiator.add(mesh(box(0.94, 0.04, 0.2), toon('#d8d2c4'), 0, 0.68, 0, false));
  radiator.add(mesh(cyl(0.025, 0.025, 0.06, 6), toon('#b8b2a4'), 0.5, 0.15, 0, false));
  frame(backWall, bx(AX0 + 0.45), PH + 1.8, 0.03, 0.4, 0.55, 45, 0, '#efe6d2');

  // Ted's desk between the windows: monitor, globe, red desk lamp, rolled-up plans
  const desk = place(backWall, new THREE.Group(), bx(-0.3), PH, 0.38);
  desk.add(occluder(mesh(box(1.3, 0.05, 0.62), wood, 0, 0.76, 0)));
  for (const s of [1, -1]) desk.add(mesh(box(0.05, 0.74, 0.58), woodDark, s * 0.62, 0.37, 0));
  desk.add(mesh(box(0.45, 0.6, 0.5), woodDark, 0.38, 0.37, 0));
  desk.add(mesh(box(0.42, 0.3, 0.04), black, -0.15, 1.06, -0.12, false));
  desk.add(mesh(new THREE.PlaneGeometry(0.36, 0.24), toon('#ffffff', { map: tvScreen(), emissive: '#ffffff', emissiveIntensity: 0.6 }), -0.15, 1.06, -0.098, false));
  desk.add(mesh(box(0.05, 0.12, 0.05), black, -0.15, 0.85, -0.12, false));
  desk.add(mesh(cyl(0.012, 0.06, 0.12, 6), black, 0.45, 0.84, -0.05, false));
  desk.add(mesh(new THREE.SphereGeometry(0.1, 8, 6), toon('#3a6aa8'), 0.45, 1.0, -0.05, false));
  desk.add(mesh(new THREE.SphereGeometry(0.06, 5, 4), toon('#5a9a4a'), 0.48, 1.02, 0.01, false));
  desk.add(mesh(cyl(0.012, 0.012, 0.32, 4), toon('#c42a24'), -0.5, 0.94, -0.05, false));
  desk.add(mesh(cyl(0.04, 0.09, 0.12, 6), toon('#c42a24'), -0.45, 1.1, -0.02, false).rotateZ(-0.5));
  for (const [dx, c] of [[0.1, '#e8e4d8'], [0.15, '#9ab8d8']] as const) desk.add(mesh(cyl(0.025, 0.025, 0.5, 6), toon(c), dx, 0.8, 0.12, false).rotateZ(Math.PI / 2));
  desk.add(mesh(cyl(0.22, 0.22, 0.07, 8), toon('#d96a2a'), -0.15, 0.48, 0.45));
  desk.add(mesh(roundedBox(0.42, 0.4, 0.06, 0.03), toon('#d96a2a'), -0.15, 0.78, 0.66));
  desk.add(mesh(cyl(0.03, 0.03, 0.44, 5), black, -0.15, 0.24, 0.45, false));
  desk.add(mesh(cyl(0.22, 0.22, 0.03, 5), black, -0.15, 0.03, 0.45, false));
  frame(backWall, bx(-0.3), PH + 2.2, 0.03, 0.42, 0.5, 44, 0, '#1a1a1a');

  // drafting table with the GNB tower blueprint, in front of the right window
  const easel = new THREE.Group();
  easel.position.set(1.3, PH, AZB + 0.75);
  easel.rotation.y = -0.45;
  for (const s of [1, -1]) {
    const leg = mesh(box(0.05, 1.05, 0.05), wood, s * 0.3, 0.5, 0, false);
    leg.rotation.z = s * 0.12;
    easel.add(leg);
  }
  easel.add(mesh(box(0.7, 0.04, 0.04), wood, 0, 0.3, 0, false));
  const board = new THREE.Group();
  board.position.set(0, 1.08, 0.05);
  board.rotation.x = -0.9;
  board.add(occluder(mesh(box(0.86, 0.66, 0.03), toon('#e8e2d0'), 0, 0, 0)));
  board.add(mesh(new THREE.PlaneGeometry(0.62, 0.5), toon('#ffffff', { map: blueprint() }), 0, 0.02, 0.017, false));
  board.add(mesh(box(0.9, 0.025, 0.05), black, 0, -0.33, 0.03, false));
  easel.add(board);
  g.add(easel);

  // bookcase with yellow drawers in the corner, the blue French horn on the wall above it
  const shelf = place(backWall, new THREE.Group(), bx(AX1 - 0.5), PH, 0.18);
  shelf.add(occluder(mesh(box(0.8, 1.85, 0.36), woodDark, 0, 0.925, 0)));
  shelf.add(mesh(new THREE.PlaneGeometry(0.7, 1.1), toon('#ffffff', { map: books(5) }), 0, 1.28, 0.185, false));
  for (const y of [0.22, 0.52]) shelf.add(mesh(box(0.7, 0.26, 0.02), toon('#e8c838'), 0, y, 0.185, false));
  shelf.add(mesh(box(0.36, 0.2, 0.24), black, 0.1, 1.95, 0, false)); // stereo
  const hornMat = toon('#2f62c4', { emissive: '#0a1a40', emissiveIntensity: 0.4 });
  const horn = place(backWall, new THREE.Group(), bx(AX1 - 0.55), PH + 2.3, 0.08);
  horn.add(mesh(new THREE.TorusGeometry(0.13, 0.018, 4, 12), hornMat, 0, 0, 0, false));
  horn.add(mesh(new THREE.TorusGeometry(0.08, 0.014, 4, 10), hornMat, 0.02, 0, 0, false));
  horn.add(mesh(cyl(0.12, 0.022, 0.24, 8), hornMat, 0.2, -0.1, 0, false).rotateZ(Math.PI / 2 + 0.5));

  // ---- the angled wall upstage right: the front door ------------------------------------------
  const front = door(doorWall, 0, 0.02, 0, '#7a3a24', { frameColor: '#5a2a1a' });
  front.leaf.add(mesh(box(0.08, 0.12, 0.02), brass, -front.hinge * 0.525, 1.62, 0.01, false)); // peephole plate
  // the yellow umbrella (clear of whoever's working the door), and Ted's red cowboy boots
  const stand = place(doorWall, new THREE.Group(), 1.08, 0, 0.22);
  stand.add(mesh(cyl(0.1, 0.09, 0.45, 8), toon('#2a2a2a'), 0, 0.225, 0));
  stand.add(mesh(cyl(0.012, 0.012, 0.85, 4), black, -0.02, 0.6, 0, false).rotateZ(0.12));
  stand.add(mesh(new THREE.ConeGeometry(0.07, 0.55, 6), toon('#f2c418', { emissive: '#6a4a00', emissiveIntensity: 0.3 }), -0.04, 0.7, 0, false).rotateZ(Math.PI + 0.12));
  const boots = place(doorWall, new THREE.Group(), -0.85, 0, 0.3, 0.3);
  const bootMat = toon('#b8261c');
  for (const dx of [0, 0.16]) {
    boots.add(mesh(box(0.1, 0.32, 0.12), bootMat, dx, 0.2, -0.05));
    boots.add(mesh(box(0.1, 0.08, 0.26), bootMat, dx, 0.04, 0.02));
  }
  frame(doorWall, 0, 2.75, 0.03, 0.45, 0.28, 46, 0, '#1a1a1a');

  // ---- the angled wall upstage left: brick fireplace; the fire flickers in update() ----------
  const fp = place(fireWall, new THREE.Group(), 0, 0, 0);
  const FZ = 0.35;
  fp.add(occluder(mesh(box(1.6, H, 0.35), toon('#ffffff', { map: brick('#9a5a44', '#c8bca8', [3, 6], 21) }), 0, H / 2, 0.175)));
  fp.add(mesh(box(0.84, 0.66, 0.05), toon('#120c08'), 0, 0.43, FZ + 0.005, false));
  for (const s of [1, -1]) fp.add(mesh(box(0.14, 1.05, 0.08), wood, s * 0.52, 0.52, FZ + 0.04, false));
  fp.add(mesh(box(1.2, 0.18, 0.08), wood, 0, 0.88, FZ + 0.04, false));
  fp.add(mesh(box(1.9, 0.07, 0.3), woodDark, 0, 1.2, FZ + 0.1, false));
  fp.add(mesh(box(1.9, 0.06, 0.5), toon('#6a5a4a'), 0, 0.03, FZ + 0.25));
  const flames: THREE.Mesh[] = [];
  for (const [dx, h, c] of [[-0.18, 0.28, '#ff7a1a'], [0.0, 0.38, '#ffb02a'], [0.17, 0.24, '#ff5a10'], [0.08, 0.2, '#ffd060']] as const) {
    const f = mesh(new THREE.ConeGeometry(0.09, h, 5), glow(c, 1.4), dx, 0.12 + h / 2, FZ, false);
    fp.add(f);
    flames.push(f);
  }
  fp.add(mesh(box(0.6, 0.06, 0.1), woodDark, 0, 0.1, FZ + 0.02, false));
  frame(fp, 0, 1.75, FZ + 0.01, 0.62, 0.42, 41, 0, '#c9a227');
  const clock = mesh(cyl(0.2, 0.2, 0.05, 12), [black, toon('#ffffff', { map: clockFace() }), black] as unknown as THREE.Material, 0, 2.65, FZ + 0.03, false);
  clock.rotation.x = Math.PI / 2;
  fp.add(clock);
  // the pineapple. Nobody knows where it came from.
  const pine = mesh(new THREE.SphereGeometry(0.08, 6, 5), toon('#c08a2a'), 0.6, 1.33, FZ + 0.12, false);
  pine.scale.y = 1.4;
  fp.add(pine);
  for (let i = 0; i < 5; i++) {
    const leaf = mesh(new THREE.ConeGeometry(0.025, 0.16, 4), toon('#3f7a3a'), 0.6, 1.5, FZ + 0.12, false);
    leaf.rotation.set(Math.cos(i * 1.26) * 0.4, 0, Math.sin(i * 1.26) * 0.4);
    fp.add(leaf);
  }
  fp.add(mesh(cyl(0.04, 0.04, 0.22, 6), toon('#c94a3a'), -0.7, 1.34, FZ + 0.1, false)); // candle
  fp.add(mesh(box(0.22, 0.28, 0.03), toon('#ffffff', { map: painting(43) }), -0.4, 1.38, FZ + 0.03, false));
  const fire = new THREE.PointLight('#ff8a3a', 3, 5, 1.5);
  fire.position.set(0, 0.6, FZ + 0.6);
  fp.add(fire);
  frame(fireWall, -1.25, 1.9, 0.03, 0.4, 0.55, 48, 0, '#1a1a1a');

  // ---- left wall: the piano, with the swords, the phone box and the intervention banner ------
  const PZ = -0.1;
  g.add(occluder(mesh(box(0.58, 1.28, 1.5), black, LEFT + 0.3, 0.64, PZ)));
  g.add(mesh(box(0.32, 0.08, 1.46), black, LEFT + 0.72, 0.74, PZ));
  g.add(mesh(new THREE.PlaneGeometry(1.4, 0.16).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), toon('#ffffff', { map: stripes('#f4f0e4', '#151515', [24, 1]) }), LEFT + 0.75, 0.785, PZ, false));
  for (const s of [1, -1]) g.add(mesh(box(0.06, 0.7, 0.06), black, LEFT + 0.84, 0.35, PZ + s * 0.68, false));
  g.add(mesh(box(0.02, 0.3, 1.0), toon('#2a2a2a'), LEFT + 0.6, 1.0, PZ, false)); // music desk
  g.add(occluder(mesh(roundedBox(0.4, 0.06, 0.8, 0.02), black, LEFT + 1.2, 0.5, PZ)));
  for (const s of [1, -1]) for (const t of [1, -1]) g.add(mesh(box(0.04, 0.48, 0.04), black, LEFT + 1.2 + t * 0.16, 0.24, PZ + s * 0.36, false));
  // the red English telephone box on the piano
  const booth = new THREE.Group();
  booth.position.set(LEFT + 0.3, 1.28, PZ + 0.45);
  booth.rotation.y = Math.PI / 2 - 0.3;
  booth.add(mesh(box(0.17, 0.42, 0.17), toon('#ffffff', { map: phoneBox() }), 0, 0.23, 0, false));
  booth.add(mesh(box(0.2, 0.03, 0.2), toon('#c4161c'), 0, 0.015, 0, false));
  booth.add(mesh(box(0.19, 0.04, 0.19), toon('#c4161c'), 0, 0.46, 0, false));
  booth.add(mesh(cyl(0.07, 0.11, 0.06, 4), toon('#c4161c'), 0, 0.5, 0, false).rotateY(Math.PI / 4));
  g.add(booth);
  g.add(mesh(cyl(0.05, 0.06, 0.14, 6), toon('#e8e2d0'), LEFT + 0.3, 1.35, PZ - 0.5, false)); // vase
  g.add(mesh(box(0.22, 0.04, 0.3), toon('#c42a24'), LEFT + 0.3, 1.3, PZ - 0.12, false)); // sheet music box
  // the swords
  const zPiano = (FRONT - 0.9) / 2 - PZ; // piano centre in left-wall space
  for (const rz of [0.65, -0.65]) {
    const s = place(leftWall, new THREE.Group(), zPiano, 2.0, 0.04);
    s.rotation.z = rz;
    s.add(mesh(box(0.05, 1.0, 0.015), toon('#d0d4da'), 0, 0.25, 0, false));
    s.add(mesh(box(0.2, 0.04, 0.03), toon('#8a6a2a'), 0, -0.27, 0, false));
    s.add(mesh(box(0.035, 0.2, 0.03), toon('#2a1a10'), 0, -0.39, 0, false));
    s.add(mesh(new THREE.SphereGeometry(0.03, 5, 4), toon('#8a6a2a'), 0, -0.5, 0, false));
  }
  place(leftWall, new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.32), toon('#ffffff', { map: sign('INTERVENTION', '#1a1a1a', '#f2eee2', 192, 32, 'bold 24px Impact, sans-serif') })), zPiano, 2.88, 0.05);
  // Lily's nude portrait of Marshall, stashed behind the piano
  const nude = frame(g, LEFT + 0.14, 0.5, PZ + 0.85, 0.7, 0.85, 47, Math.PI / 2 - 0.2, '#8a6a2a');
  nude.rotation.x = -0.1;
  // floor lamp and a plant downstage of the piano
  g.add(mesh(cyl(0.015, 0.015, 1.55, 4), brass, LEFT + 0.35, 0.78, 1.6, false));
  g.add(mesh(cyl(0.12, 0.2, 0.26, 8), glow('#f5e0b0', 1.0), LEFT + 0.35, 1.65, 1.6, false));
  plant(g, LEFT + 0.4, 2.3, 1.3);

  // ---- the living room: sofa and four mismatched chairs around the coffee table --------------
  const { x: CX, z: CZ } = APARTMENT_SOFA;
  const rugM = mesh(new THREE.PlaneGeometry(5.2, 4.4), toon('#ffffff', { map: patchRug() }), -0.55, 0.012, 0.2, false);
  rugM.rotation.x = -Math.PI / 2;
  rugM.receiveShadow = true;
  g.add(rugM);
  const seating = apartmentSeating(g);
  // coffee table: marble top on a dark wood frame
  const TZ = 0.15;
  g.add(occluder(mesh(box(1.3, 0.05, 0.66), toon('#e8e6e0'), CX, 0.43, TZ)));
  g.add(mesh(box(1.38, 0.06, 0.74), toon('#4a1e14'), CX, 0.39, TZ));
  for (const sx of [1, -1]) for (const sz of [1, -1]) g.add(mesh(box(0.06, 0.36, 0.06), toon('#4a1e14'), CX + sx * 0.62, 0.18, TZ + sz * 0.3));
  g.add(mesh(cyl(0.16, 0.1, 0.08, 8), toon('#d9822a'), CX - 0.2, 0.5, TZ - 0.05, false));
  for (const [dx, dz] of [[-0.25, -0.06], [-0.15, -0.02], [-0.2, 0.05]]) g.add(mesh(new THREE.SphereGeometry(0.045, 5, 4), toon('#7ac03a'), CX + dx, 0.56, TZ + dz, false));
  g.add(mesh(box(0.3, 0.015, 0.22), toon('#c94a3a'), CX + 0.3, 0.465, TZ + 0.02, false).rotateY(0.3));
  g.add(mesh(cyl(0.045, 0.038, 0.15, 6), toon('#e09a2a', { emissive: '#6a3a08', emissiveIntensity: 0.4 }), CX + 0.5, 0.53, TZ - 0.15, false));
  g.add(mesh(box(0.05, 0.02, 0.16), black, CX + 0.1, 0.465, TZ + 0.18, false)); // remote
  // end table with the big lamp and the cordless phone
  const ET = CX + APARTMENT_SOFA.width / 2 + 0.35;
  g.add(occluder(mesh(box(0.5, 0.58, 0.5), toon('#7ab0c0'), ET, 0.29, CZ)));
  g.add(mesh(box(0.4, 0.14, 0.02), toon('#5a8a9a'), ET, 0.4, CZ + 0.26, false));
  g.add(mesh(cyl(0.1, 0.12, 0.38, 6), toon('#3a7a5a'), ET - 0.05, 0.77, CZ - 0.08, false));
  g.add(mesh(cyl(0.2, 0.24, 0.3, 10), glow('#fff2d0', 1.05), ET - 0.05, 1.12, CZ - 0.08, false));
  g.add(mesh(box(0.06, 0.18, 0.04), black, ET + 0.14, 0.67, CZ + 0.1, false));
  plant(g, -3.3, -2.2, 1.0);

  // ---- living-room side of the kitchen wall: the little desk and the round table -------------
  const DZ = (WIN0 + WIN1) / 2;
  const deskWood = toon('#b07a3a');
  g.add(occluder(mesh(box(0.5, 0.04, 0.95), deskWood, LX - 0.27, 0.74, DZ)));
  for (const sz of [1, -1]) for (const sx of [1, -1]) g.add(mesh(box(0.04, 0.72, 0.04), deskWood, LX - 0.27 + sx * 0.2, 0.36, DZ + sz * 0.42, false));
  g.add(mesh(box(0.46, 0.12, 0.9), deskWood, LX - 0.27, 0.66, DZ, false));
  g.add(mesh(box(0.16, 0.07, 0.22), toon('#c9b48a'), LX - 0.2, 0.795, DZ - 0.25, false)); // telephone
  g.add(mesh(box(0.05, 0.04, 0.22), toon('#c9b48a'), LX - 0.2, 0.85, DZ - 0.25, false));
  g.add(mesh(box(0.22, 0.02, 0.3), toon('#f2efe6'), LX - 0.3, 0.77, DZ + 0.1, false).rotateY(0.2)); // papers
  g.add(mesh(cyl(0.035, 0.035, 0.1, 6), toon('#3a6aa8'), LX - 0.15, 0.81, DZ + 0.35, false));
  const deskChair = new THREE.Group();
  deskChair.position.set(LX - 0.72, 0, DZ);
  deskChair.rotation.y = Math.PI / 2;
  const chairWood = toon('#b0682a');
  deskChair.add(mesh(box(0.42, 0.05, 0.42), chairWood, 0, 0.45, 0));
  for (const sx of [1, -1]) {
    deskChair.add(mesh(box(0.04, 0.45, 0.04), chairWood, sx * 0.18, 0.22, 0.18));
    deskChair.add(mesh(box(0.04, 0.9, 0.04), chairWood, sx * 0.18, 0.45, -0.19));
  }
  for (let i = -2; i <= 2; i++) deskChair.add(mesh(box(0.025, 0.3, 0.025), chairWood, i * 0.07, 0.72, -0.19, false));
  deskChair.add(mesh(box(0.42, 0.06, 0.04), chairWood, 0, 0.9, -0.19, false));
  g.add(deskChair);

  // Dining sits outside the lounge-chair group, downstage of the pass-through desk.
  const TX = 3.05, TZ2 = 2.75;
  g.add(occluder(mesh(cyl(0.55, 0.55, 0.05, 14), toon('#b88a50'), TX, 0.76, TZ2)));
  g.add(mesh(cyl(0.07, 0.09, 0.72, 6), toon('#8a5a32'), TX, 0.36, TZ2));
  g.add(mesh(cyl(0.3, 0.34, 0.05, 8), toon('#8a5a32'), TX, 0.025, TZ2, false));
  g.add(mesh(cyl(0.16, 0.1, 0.07, 8), toon('#8a3a1e'), TX + 0.05, 0.82, TZ2 - 0.05, false));
  for (const [dx, dz, c] of [[0.0, -0.08, '#d9822a'], [0.08, 0.0, '#c94a3a'], [0.0, 0.04, '#d9822a']] as const) g.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), toon(c), TX + 0.05 + dx, 0.88, TZ2 - 0.05 + dz, false));
  const chrome = toon('#c8ccd0');
  const tableA = [Math.PI, -Math.PI / 2 - 0.3, Math.PI / 2 + 0.3];
  tableA.forEach((a, i) => {
    const c = new THREE.Group();
    c.position.set(TX + Math.sin(a) * 0.76, 0, TZ2 + Math.cos(a) * 0.76);
    c.rotation.y = a + Math.PI;
    if (i === 0) {
      // Plain wooden dining chair; the woven lounge chair belongs on the living-room rug.
      c.add(mesh(box(0.44, 0.06, 0.42), chairWood, 0, 0.45, 0));
      c.add(mesh(box(0.44, 0.06, 0.05), chairWood, 0, 0.9, -0.2));
      for (const sx of [-1, 1]) {
        c.add(mesh(box(0.04, 0.88, 0.04), chairWood, sx * 0.19, 0.44, -0.18, false));
        c.add(mesh(box(0.04, 0.44, 0.04), chairWood, sx * 0.19, 0.22, 0.18, false));
      }
    } else {
      c.add(mesh(roundedBox(0.4, 0.06, 0.4, 0.02), toon('#e0dccc'), 0, 0.46, 0));
      for (const sx of [1, -1]) {
        c.add(mesh(cyl(0.012, 0.012, 0.46, 4), chrome, sx * 0.17, 0.23, 0.15, false));
        c.add(mesh(cyl(0.012, 0.012, 0.88, 4), chrome, sx * 0.17, 0.44, -0.17, false));
      }
      c.add(mesh(roundedBox(0.38, 0.16, 0.04, 0.02), toon('#e0dccc'), 0, 0.78, -0.18, false));
    }
    g.add(c);
  });
  frame(g, LX - 0.01, 1.85, 2.05, 0.5, 0.7, 53, -Math.PI / 2, '#1a1a1a');

  // ---- the kitchen ----------------------------------------------------------------------
  const cab = toon('#e6dcc0');
  const top = toon('#d2c49a');
  const topEdge = toon('#6a4a2a');
  const counter = (x: number, z: number, w: number, d: number) => {
    g.add(occluder(mesh(box(w, 0.9, d), cab, x, 0.45, z)));
    g.add(mesh(box(w + 0.04, 0.05, d + 0.04), top, x, 0.925, z));
    g.add(mesh(box(w + 0.05, 0.03, d + 0.05), topEdge, x, 0.9, z, false));
  };
  const BX0 = KX + 1.0, RZ0 = KB + 0.62, RZ1 = 1.2, SZ = 0.25;
  counter((BX0 + RIGHT) / 2, KB + 0.31, RIGHT - BX0, 0.62); // back run
  counter(RIGHT - 0.31, (RZ0 + SZ - 0.38) / 2, 0.62, SZ - 0.38 - RZ0); // right run, either side of the stove
  counter(RIGHT - 0.31, (SZ + 0.38 + RZ1) / 2, 0.62, RZ1 - SZ - 0.38);
  counter(KX + KT / 2 + 0.3, DZ, 0.6, WIN1 - WIN0 + 0.4); // under the pass-through
  for (let x = BX0 + 0.3; x < RIGHT - 0.2; x += 0.5) g.add(mesh(box(0.42, 0.55, 0.02), toon('#d4c8a8'), x, 0.45, KB + 0.63, false));
  for (let z = RZ0 + 0.3; z < RZ1 - 0.2; z += 0.5) if (Math.abs(z - SZ) > 0.5) g.add(mesh(box(0.02, 0.55, 0.42), toon('#d4c8a8'), RIGHT - 0.63, 0.45, z, false));
  // sink under the arched niche, glass-fronted cabinets either side
  const SINK = 6.3;
  g.add(mesh(box(0.55, 0.02, 0.4), toon('#9aa0a8'), SINK, 0.955, KB + 0.3, false));
  g.add(mesh(cyl(0.015, 0.015, 0.3, 4), toon('#c0c4c8'), SINK, 1.1, KB + 0.1, false));
  g.add(mesh(box(0.02, 0.02, 0.15), toon('#c0c4c8'), SINK, 1.25, KB + 0.17, false));
  g.add(mesh(new THREE.PlaneGeometry(0.75, 1.1), toon('#ffffff', { map: archNiche() }), SINK, 1.85, KB + 0.012, false));
  g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4), glow('#ffe6b0', 1.4), SINK, 2.3, KB + 0.08, false));
  const glassL = toon('#ffffff', { map: glassCabinet(1) });
  const glassR = toon('#ffffff', { map: glassCabinet(2) });
  g.add(mesh(box(0.6, 0.9, 0.34), [cab, cab, cab, cab, glassL, cab] as unknown as THREE.Material, SINK - 0.72, 2.15, KB + 0.17));
  g.add(mesh(box(0.7, 0.9, 0.34), [cab, cab, cab, cab, glassR, cab] as unknown as THREE.Material, SINK + 0.75, 2.15, KB + 0.17));
  g.add(mesh(box(0.34, 0.9, 1.6), [cab, glassR, cab, cab, cab, cab] as unknown as THREE.Material, RIGHT - 0.17, 2.15, KB + 1.3));
  // dishwasher and the white stove on the right run
  g.add(mesh(box(0.02, 0.8, 0.6), toon('#b8bcc0'), RIGHT - 0.63, 0.45, -1.4, false));
  g.add(mesh(box(0.66, 0.92, 0.76), toon('#f0eee4'), RIGHT - 0.33, 0.46, SZ));
  g.add(mesh(box(0.66, 0.03, 0.76), toon('#2a2a2a'), RIGHT - 0.33, 0.935, SZ, false));
  g.add(mesh(box(0.08, 0.3, 0.76), toon('#f0eee4'), RIGHT - 0.04, 1.08, SZ, false)); // backsplash
  g.add(mesh(box(0.02, 0.36, 0.52), toon('#3a3a3a'), RIGHT - 0.665, 0.5, SZ, false));
  for (const dz of [-0.18, 0.18]) for (const dx of [-0.14, 0.12]) g.add(mesh(cyl(0.07, 0.07, 0.02, 6), toon('#333'), RIGHT - 0.33 + dx, 0.955, SZ + dz, false));
  g.add(mesh(cyl(0.08, 0.1, 0.14, 8), toon('#c42a24'), RIGHT - 0.42, 1.03, SZ - 0.18, false)); // pot
  // clutter: microwave, coffee maker, toaster, canisters, dish rack, the green bowl on the pass-through
  g.add(mesh(box(0.5, 0.3, 0.36), toon('#e8e6de'), BX0 + 0.35, 1.1, KB + 0.3, false));
  g.add(mesh(box(0.32, 0.18, 0.02), toon('#2a2a2a'), BX0 + 0.3, 1.1, KB + 0.49, false));
  g.add(mesh(box(0.22, 0.34, 0.24), black, RIGHT - 0.35, 1.12, -1.9, false));
  g.add(mesh(box(0.26, 0.18, 0.16), toon('#c0c4c8'), RIGHT - 0.33, 1.04, -0.6, false));
  for (const [dz, c] of [[-1.0, '#c94a3a'], [-1.15, '#e8e2d0'], [-1.3, '#3a6aa8']] as const) g.add(mesh(cyl(0.05, 0.05, 0.2, 6), toon(c), RIGHT - 0.4, 1.05, dz, false));
  g.add(mesh(cyl(0.16, 0.1, 0.1, 8), toon('#3aa89a'), KX + 0.4, 1.0, DZ - 0.15, false));
  g.add(mesh(cyl(0.035, 0.04, 0.26, 6), toon('#2e6b3a'), KX + 0.45, 1.08, DZ + 0.3, false));
  // the vintage fridge, plastered with photos and magnets
  const fridge = new THREE.Group();
  fridge.position.set(KX + 0.55, 0, KB + 0.42);
  fridge.add(occluder(mesh(roundedBox(0.8, 1.75, 0.7, 0.09), toon('#f0eee4'), 0, 0.875, 0)));
  fridge.add(mesh(new THREE.PlaneGeometry(0.72, 1.62), toon('#ffffff', { map: fridgePhotos() }), 0, 0.9, 0.352, false));
  fridge.add(mesh(box(0.74, 0.02, 0.02), toon('#b8b6ac'), 0, 1.25, 0.36, false));
  fridge.add(mesh(box(0.04, 0.22, 0.04), toon('#c8ccd0'), 0.3, 1.4, 0.37, false));
  fridge.add(mesh(box(0.04, 0.3, 0.04), toon('#c8ccd0'), 0.3, 0.95, 0.37, false));
  g.add(fridge);
  frame(kRight, 1.9 - (FRONT + KB) / 2, 1.7, 0.03, 0.4, 0.5, 51, 0, '#8a6a2a');

  // ---- lighting --------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#ffe6c4', '#4a3424', 1.5);
  g.add(hemi);
  const key = keyLight(g, '#fff0dc', 1.6, [1.5, 7, 7], [-0.5, 0, -2]);
  const lamp = new THREE.PointLight('#ffc884', 6, 6, 1.4);
  lamp.position.set(ET - 0.05, 1.3, CZ + 0.2);
  g.add(lamp);
  const pianoLamp = new THREE.PointLight('#ffc070', 4, 5, 1.4);
  pianoLamp.position.set(LEFT + 0.6, 1.7, 1.4);
  g.add(pianoLamp);
  const KLX = 5.9, KLZ = -0.6;
  const kitchenLight = new THREE.PointLight('#ffe0a8', 6, 7, 1.4);
  kitchenLight.position.set(KLX, 2.4, KLZ);
  g.add(kitchenLight);
  g.add(mesh(cyl(0.008, 0.008, 0.7, 4), black, KLX, H - 0.35, KLZ, false));
  g.add(mesh(cyl(0.08, 0.3, 0.2, 8), toon('#f2efe6'), KLX, 2.55, KLZ, false));
  g.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), glow('#ffe6b0', 1.5), KLX, 2.46, KLZ, false));
  const tableLight = new THREE.PointLight('#ffd8a0', 3, 4, 1.4);
  tableLight.position.set(TX, 2.2, TZ2);
  g.add(tableLight);
  const windowLight = new THREE.PointLight('#9ab8ff', 2, 6, 1.4);
  windowLight.position.set(-0.3, 2.3, AZB + 0.8);
  g.add(windowLight);
  const landingLight = new THREE.PointLight('#ffe0b0', 3, 5, 1.4);
  landingLight.position.set(-0.3, 2.8, AZB + 1.2);
  g.add(landingLight);

  // the landing is up a step
  const floorAt = (x: number, z: number) => {
    if (x < AX0 || x > AX1 || z < AZB || z > AZM + STEP) return 0;
    return z > AZM ? PH / 2 : PH;
  };

  // spots in front of the angled walls: centre + n * along the wall's inward normal
  const fireN = new THREE.Vector3(0, 0, 1).applyQuaternion(fireWall.quaternion);
  const doorN = new THREE.Vector3(0, 0, 1).applyQuaternion(doorWall.quaternion);
  const off = (w: THREE.Group, n: THREE.Vector3, d: number): [number, number] => [w.position.x + n.x * d, w.position.z + n.z * d];

  const N = nodes({
    front: [-0.4, 1.1], center: [0.75, 0.65], left: [-1.55, 1.15], inner_left: [-1.35, 0.65], piano: [-3.8, 1.35], fire: off(fireWall, fireN, 1.0),
    couch_l: [-2.2, -0.75], couch_r: [1.2, -0.5], back_l: [-2.3, -2.15], back: [-0.4, -2.2], back_r: [1.85, -2.15],
    sofa_left: [CX - 0.9, CZ + 0.75], sofa_center: [CX, CZ + 0.75], sofa_right: [CX + 0.9, CZ + 0.75],
    red_chair: [1.8, 0.15], lounge: [-2.45, 0.98], woven: [0.9, 0.9], rug_front: [-0.7, 1.27],
    outer_left: [-2.5, 2.6], outer_front: [-0.7, 3.2], outer_right: [1.4, 3.2],
    plat_l: [-2.0, -3.5], plat: [-0.4, -3.6], plat_r: [1.8, -3.4],
    door: off(doorWall, doorN, 0.95), right: [3.25, -0.2], dining: [2.35, 1.45], dining_front: [3.05, 3.9],
    kit_out: [3.75, -0.25], kit_in: [5.25, -0.32], kitchen: [5.8, -1.2], pass: [5.6, 0.75],
  });
  const tc = (i: number, hint: string, approach: [number, number], node: string) => {
    const a = tableA[i];
    return mark(TX + Math.sin(a) * 0.7, TZ2 + Math.cos(a) * 0.7, a + Math.PI, node, hint, { seat: 0.47, approach });
  };
  const [fx, fz] = off(fireWall, fireN, 0.72);
  const [dx, dz] = off(doorWall, doorN, 0.45);

  return {
    id: 'apartment',
    name: "Ted & Marshall's Apartment",
    group: g,
    nodes: N,
    edges: [
      ['front', 'center'], ['front', 'left'], ['left', 'lounge'], ['left', 'inner_left'], ['inner_left', 'sofa_left'], ['couch_l', 'fire'], ['fire', 'back_l'],
      ['piano', 'outer_left'], ['outer_left', 'lounge'], ['outer_left', 'outer_front'], ['outer_front', 'outer_right'], ['outer_right', 'dining_front'],
      ['couch_l', 'sofa_left'], ['sofa_left', 'sofa_center'], ['sofa_center', 'sofa_right'], ['sofa_right', 'couch_r'],
      ['center', 'red_chair'], ['center', 'woven'], ['front', 'rug_front'],
      ['couch_l', 'back_l'], ['back_l', 'back'], ['back', 'back_r'], ['couch_r', 'center'],
      ['back_l', 'plat_l'], ['back', 'plat'], ['back_r', 'plat_r'], ['plat_l', 'plat'], ['plat', 'plat_r'],
      ['right', 'door'], ['back_r', 'door'], ['red_chair', 'dining'], ['dining', 'right'],
      ['right', 'kit_out'], ['kit_out', 'kit_in'], ['kit_in', 'kitchen'], ['kit_in', 'pass'], ['kitchen', 'pass'],
    ],
    door: 'door',
    doors: { door: front },
    marks: {
      ...seating,
      piano: mark(LEFT + 1.2, PZ, -Math.PI / 2, 'piano', 'on the piano bench (under the crossed swords)', { seat: 0.53, approach: [LEFT + 1.75, PZ + 0.55] }),
      fireplace: mark(fx, fz, fireWall.rotation.y, 'fire', 'leaning on the mantel by the brick fireplace'),
      desk: mark(0.6, -3.65, 0.15, 'plat', "up on the landing at Ted's desk, behind the couch"),
      window: mark(-1.6, -4.25, Math.PI - 0.35, 'plat_l', 'up on the landing by the window, looking out at the street'),
      landing: mark(-0.4, -2.95, 0, 'plat', 'up on the landing behind the couch, facing the room'),
      bedroom_ted: mark(-2.55, -3.75, 0.9, 'plat_l', "in Ted's bedroom doorway, left end of the landing"),
      bedroom_marshall: mark(2.15, -3.75, -0.9, 'plat_r', "in Marshall & Lily's bedroom doorway, right end of the landing"),
      kitchen: mark(SINK, -1.95, 0, 'kitchen', 'in the kitchen, at the sink under the arched niche'),
      kitchen_stove: mark(6.35, SZ, -1.1, 'pass', 'in the kitchen, at the stove'),
      kitchen_passthrough: mark(KX + 0.95, DZ, -Math.PI / 2, 'pass', 'in the kitchen, leaning on the pass-through window counter'),
      kitchen_doorway: mark(KX, -0.32, -1.0, 'kit_out', 'leaning in the kitchen doorway'),
      dining_chair_1: tc(0, 'round table by the kitchen, wooden chair facing the audience', [2.5, 1.9], 'dining'),
      dining_chair_2: tc(1, 'round table by the kitchen, left chrome chair', [2.15, 3.55], 'dining_front'),
      dining_chair_3: tc(2, 'round table by the kitchen, right chrome chair', [3.8, 3.55], 'dining_front'),
      little_desk: mark(LX - 0.68, DZ, Math.PI / 2, 'right', 'at the little desk under the kitchen pass-through', { seat: 0.47, approach: [3.3, 0.4] }),
      center: mark(0.65, 0.65, -0.2, 'center', 'middle of the living room, beside the coffee table'),
      door: mark(dx, dz, doorWall.rotation.y, 'door', 'the front door, on the angled wall upstage right'),
    },
    wides: [
      { pos: v3(-0.1, 2.3, 6.4), target: v3(-0.3, 0.9, -0.9), fov: 52 },
      { pos: v3(-0.6, 1.6, 4.3), target: v3(-3.2, 1.1, -1.0), fov: 50 },
      { pos: v3(0.2, 1.6, 4.8), target: v3(3.6, 1.1, 0.4), fov: 50 },
      { pos: v3(5.9, 1.65, 4.0), target: v3(5.9, 1.15, -1.4), fov: 52 },
      { pos: v3(-0.3, 1.7, 3.3), target: v3(-0.3, 1.35, -3.5), fov: 50 },
      { pos: v3(-0.4, 1.3, 2.9), target: v3(-0.4, 0.9, -1.3), fov: 46 },
    ],
    // The audience side is open for the cameras, as on the real stage: no angle ever looks out through it.
    openSide: new THREE.Plane(new THREE.Vector3(0, 0, 1), -FRONT),
    ambience: 'apartment',
    doorSound: 'knock',
    background: [],
    floorAt,
    setTime(t) {
      const night = t === 'night';
      for (const p of panes) p.material = night ? nightGlass : dayGlass;
      hemi.intensity = night ? 1.4 : 2.0;
      key.intensity = night ? 1.3 : 2.0;
      windowLight.color.set(night ? '#9ab8ff' : '#fff2d8');
      windowLight.intensity = night ? 2 : 6;
      fire.visible = night;
      for (const f of flames) f.visible = night;
    },
    update(_dt, t) {
      if (!fire.visible) return;
      const n = Math.sin(t * 11) * 0.5 + Math.sin(t * 17.3) * 0.3 + Math.sin(t * 5.1) * 0.2;
      fire.intensity = 3 + n * 0.8;
      flames.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * (9 + i * 3.7) + i) * 0.18));
    },
  };
}
