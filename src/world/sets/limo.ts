import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { street, road, skyline, tufted, speckle } from '../../engine/textures';
import { type StageSet, mark, nodes, bottles, keyLight, v3 } from './common';
import { scroll, lampposts } from './vehicle';

// Barney's stretch limo, cruising through Manhattan with Ranjit at the wheel, front of the car to +x.
// A closed car, shot from inside the cabin: the long leather bench along the far side, the rear bench
// across the back, the bar by the partition with a side seat facing back down the cabin, a low console
// under the near windows, and through the open partition window, Ranjit. Purple LED strips, a
// starlight ceiling. Out of the tinted windows on both sides the street slides by and the streetlamps
// sweep light through the car. Everyone sits: people slide between seats, and get in and out by the
// door in the far side.
export function buildLimo(): StageSet {
  const g = new THREE.Group();
  g.name = 'limo';
  const REAR = -3.0, PART = 2.15, NOSE = 3.45, FAR = -0.9, NEAR = 0.9, ROOF = 1.62;
  const SILL = 0.72, HEAD = 1.3; // window opening
  const GROUND = -0.42;

  const paint = toon('#0c0c0e');
  const paintHi = toon('#1c1c22');
  const chrome = toon('#c4c8ce');
  const leather = toon('#2a2220');
  const leatherHi = toon('#3a302c');
  const trim = toon('#4a2a1a'); // burl wood
  const purple = glow('#a070ff', 1.3);
  const tint = new THREE.MeshBasicMaterial({ color: '#2a2a3a', transparent: true, opacity: 0.35, depthWrite: false });

  // ---- the street ------------------------------------------------------------------------------
  // Buildings down both sides of the avenue, facing each other across the road, and the avenue
  // running on ahead and behind.
  const BD_W = 80, BD_H = 10.5;
  const sides = [-1, 1].map((s) => {
    const night = street(true, s < 0 ? 52 : 54), day = street(false, s < 0 ? 52 : 54);
    for (const t of [night, day]) t.repeat.set(3.2, 1);
    const matNight = toon('#ffffff', { map: night, emissive: '#ffffff', emissiveIntensity: 0.75 });
    const matDay = toon('#ffffff', { map: day, emissive: '#ffffff', emissiveIntensity: 0.6 });
    const m = mesh(new THREE.PlaneGeometry(BD_W, BD_H), matNight, 0, GROUND + BD_H / 2 - 0.2, s * 7.5, false);
    if (s > 0) m.rotation.y = Math.PI;
    g.add(m);
    const sidewalk = mesh(new THREE.PlaneGeometry(BD_W, 2.6), toon('#ffffff', { map: speckle('#6a6866', [20, 1], 59, 0.2) }), 0, GROUND + 0.15, s * 6.2, false);
    sidewalk.rotation.x = -Math.PI / 2;
    g.add(sidewalk);
    g.add(mesh(box(BD_W, 0.15, 0.2), toon('#8a8682'), 0, GROUND + 0.075, s * 4.9, false)); // curb
    // the two facades face each other, so their textures run opposite ways along the street
    return { m, night, day, matNight, matDay, dir: -s };
  });
  const roadTex = road(57);
  roadTex.repeat.set(12, 1);
  const roadMesh = mesh(new THREE.PlaneGeometry(BD_W, 10), toon('#ffffff', { map: roadTex }), 0, GROUND, 0, false);
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.receiveShadow = true;
  g.add(roadMesh);
  const lampsFar = lampposts(g, { axis: 'x', across: -5.4, armDir: 1, from: -24, to: 24, count: 3, ground: GROUND + 0.15 });
  const lampsNear = lampposts(g, { axis: 'x', across: 5.4, armDir: -1, from: -16, to: 32, count: 3, ground: GROUND + 0.15 });
  // up the avenue through the windshield, back down it through the rear window
  const aheadNight = toon('#ffffff', { map: skyline(true, 78), emissive: '#ffffff', emissiveIntensity: 0.9 });
  const aheadDay = toon('#ffffff', { map: skyline(false, 78), emissive: '#ffffff', emissiveIntensity: 0.85 });
  const ends = [-1, 1].map((s) => {
    const m = mesh(new THREE.PlaneGeometry(16, 12), aheadNight, s * 30, GROUND + 5.8, 0, false);
    m.rotation.y = -s * Math.PI / 2;
    g.add(m);
    return m;
  });

  // ---- the body ----------------------------------------------------------------------------------
  // floor, roof slab, the far side wall around the windows and the door
  const floor = mesh(new THREE.PlaneGeometry(NOSE - REAR, NEAR - FAR), toon('#ffffff', { map: speckle('#1e1a1c', [6, 2], 61, 0.2) }), (REAR + NOSE) / 2, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  g.add(mesh(box(NOSE - REAR + 0.1, 0.12, NEAR - FAR + 0.1), paint, (REAR + NOSE) / 2, ROOF + 0.06, 0, false));
  const ceiling = mesh(new THREE.PlaneGeometry(NOSE - REAR, NEAR - FAR), toon('#141018'), (REAR + NOSE) / 2, ROOF - 0.005, 0, false);
  ceiling.rotation.x = Math.PI / 2;
  g.add(ceiling);
  // starlight ceiling
  for (let i = 0; i < 40; i++) {
    const x = REAR + 0.2 + ((i * 0.6180339) % 1) * (PART - REAR - 0.4);
    const z = FAR + 0.15 + ((i * 0.381966 + 0.2) % 1) * (NEAR - FAR - 0.3);
    g.add(mesh(box(0.015, 0.005, 0.015), glow('#e8e0ff', 1.6), x, ROOF - 0.01, z, false));
  }
  // under the car: sill and chassis, the near-side wheels
  g.add(mesh(box(NOSE - REAR + 1.8, 0.3, NEAR - FAR), paint, (REAR + NOSE) / 2 + 0.2, -0.15, 0, false));
  for (const x of [REAR - 0.1, NOSE + 0.6]) {
    g.add(mesh(cyl(0.36, 0.36, 0.25, 12).rotateX(Math.PI / 2), toon('#141414'), x, GROUND + 0.36, NEAR - 0.05, false));
    g.add(mesh(cyl(0.2, 0.2, 0.26, 10).rotateX(Math.PI / 2), chrome, x, GROUND + 0.36, NEAR - 0.04, false));
  }
  // the side walls: below the sill, above the windows, the pillars between, and tinted glass. Both
  // sides are closed, so every angle is shot from inside the car.
  const DOOR: [number, number] = [-2.2, -1.35];
  for (const side of [FAR, NEAR]) {
    const out = Math.sign(side); // the outward direction
    const wall = (x0: number, x1: number, y0: number, y1: number, mat: THREE.Material = paintHi) => g.add(mesh(box(x1 - x0, y1 - y0, 0.08), mat, (x0 + x1) / 2, (y0 + y1) / 2, side + out * 0.04, false));
    wall(REAR, NOSE, 0, SILL, leather);
    wall(REAR, NOSE, HEAD, ROOF);
    // (on the far side the bar's mirror fills the last bay; the near side keeps its window)
    const bar = side === FAR ? 1.45 : PART - 0.06;
    for (const [x0, x1] of [[REAR, REAR + 0.1], [-2.35, DOOR[0]], [DOOR[1], DOOR[1] + 0.12], [bar, PART + 0.1], [NOSE - 0.15, NOSE]] as const) wall(x0, x1, SILL, HEAD);
    g.add(mesh(new THREE.PlaneGeometry(NOSE - REAR, HEAD - SILL), tint, (REAR + NOSE) / 2, (SILL + HEAD) / 2, side + out * 0.02, false));
    // the door's outline, handle and window frame
    for (const x of DOOR) g.add(mesh(box(0.02, HEAD, 0.02), toon('#000'), x, HEAD / 2, side - out * 0.005, false));
    g.add(mesh(box(0.14, 0.03, 0.04), chrome, DOOR[1] - 0.15, 0.62, side - out * 0.02, false));
    g.add(mesh(box(DOOR[1] - DOOR[0], 0.05, 0.04), chrome, (DOOR[0] + DOOR[1]) / 2, SILL, side - out * 0.02, false));
  }
  // rear wall with its little window onto the avenue behind, the back of the car
  g.add(mesh(box(0.1, ROOF, NEAR - FAR), leather, REAR - 0.05, ROOF / 2, 0, false));
  const rearWindow = mesh(new THREE.PlaneGeometry(1.1, 0.4), aheadNight, REAR + 0.005, 1.15, 0, false).rotateY(Math.PI / 2);
  g.add(rearWindow);
  g.add(mesh(roundedBox(0.95, 0.55, NEAR - FAR + 0.05, 0.08), paint, REAR - 0.5, 0.25, 0, false)); // trunk
  for (const z of [FAR + 0.2, NEAR - 0.2]) g.add(mesh(box(0.04, 0.12, 0.3), glow('#ff3030', 1.2), REAR - 0.98, 0.35, z, false));
  // a low console along the near side, under the windows
  const CX0 = -1.2, CX1 = 1.35, CZ = NEAR - 0.11;
  g.add(mesh(box(CX1 - CX0, 0.42, 0.22), paintHi, (CX0 + CX1) / 2, 0.21, CZ));
  g.add(mesh(box(CX1 - CX0 + 0.02, 0.03, 0.24), trim, (CX0 + CX1) / 2, 0.435, CZ, false));
  for (const x of [-0.6, 0.35]) g.add(mesh(cyl(0.035, 0.035, 0.01, 8), toon('#0a0a0c'), x, 0.452, CZ, false)); // cup holders
  // LED strips
  g.add(mesh(box(PART - REAR, 0.02, 0.02), purple, (REAR + PART) / 2, ROOF - 0.04, FAR + 0.06, false));
  g.add(mesh(box(PART - REAR, 0.02, 0.02), purple, (REAR + PART) / 2, ROOF - 0.04, NEAR - 0.06, false));
  g.add(mesh(box(PART - REAR, 0.015, 0.015), purple, (REAR + PART) / 2, 0.03, FAR + 0.58, false));
  g.add(mesh(box(CX1 - CX0, 0.015, 0.015), purple, (CX0 + CX1) / 2, 0.38, CZ - 0.115, false));

  // ---- seats ----------------------------------------------------------------------------------------
  const SEAT = 0.42;
  /** Bench running along local x, facing local +z. */
  const bench = (x: number, z: number, len: number, rotY: number, backTop = 0.95) => {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    b.rotation.y = rotY;
    b.add(occluder(mesh(roundedBox(len, SEAT - 0.08, 0.55, 0.03), leather, 0, (SEAT - 0.08) / 2, 0)));
    b.add(mesh(roundedBox(len - 0.04, 0.1, 0.55, 0.04), leatherHi, 0, SEAT - 0.04, 0.01));
    b.add(occluder(mesh(roundedBox(len, backTop - SEAT, 0.14, 0.04), toon('#ffffff', { map: tufted('#2a2220', [Math.round(len * 3), 2]) }), 0, (SEAT + backTop) / 2, -0.3)));
    b.add(mesh(box(len, 0.03, 0.03), trim, 0, SEAT - 0.1, 0.28, false));
    g.add(b);
  };
  const LB: [number, number] = [-1.15, 1.4]; // the long bench's x extent
  bench((LB[0] + LB[1]) / 2, FAR + 0.42, LB[1] - LB[0], 0);
  bench(REAR + 0.42, 0, NEAR - FAR - 0.1, Math.PI / 2);
  // the side seat by the bar, backed against the partition
  bench(PART - 0.4, 0.42, 0.75, -Math.PI / 2, 0.9);

  // ---- the bar --------------------------------------------------------------------------------------
  const BX0 = 1.48, BX1 = PART - 0.02, BZ0 = FAR + 0.02, BZ1 = FAR + 0.55;
  g.add(occluder(mesh(box(BX1 - BX0, 0.64, BZ1 - BZ0), paintHi, (BX0 + BX1) / 2, 0.32, (BZ0 + BZ1) / 2)));
  g.add(mesh(box(BX1 - BX0 + 0.02, 0.03, BZ1 - BZ0 + 0.02), trim, (BX0 + BX1) / 2, 0.655, (BZ0 + BZ1) / 2, false));
  g.add(mesh(box(BX1 - BX0, 0.015, 0.015), purple, (BX0 + BX1) / 2, 0.6, BZ1 + 0.01, false));
  bottles(g, BX0 + 0.12, 0.67, FAR + 0.15, 4, 0.13, 0, 88);
  for (const dx of [0.15, 0.32]) {
    const gl = toon('#c8dce8', { emissive: '#203040', emissiveIntensity: 0.3 });
    g.add(mesh(cyl(0.03, 0.006, 0.06, 6), gl, BX0 + dx, 0.7, BZ1 - 0.12, false));
    g.add(mesh(cyl(0.004, 0.004, 0.08, 3), gl, BX0 + dx, 0.71, BZ1 - 0.12, false));
  }
  g.add(mesh(cyl(0.08, 0.07, 0.14, 8), chrome, BX1 - 0.15, 0.74, BZ1 - 0.15, false)); // champagne bucket
  g.add(mesh(cyl(0.03, 0.035, 0.3, 6), toon('#1e4a2a', { emissive: '#0a2010', emissiveIntensity: 0.4 }), BX1 - 0.15, 0.85, BZ1 - 0.15, false).rotateZ(0.25));
  g.add(mesh(new THREE.PlaneGeometry(BX1 - BX0, 0.5), toon('#3a3e48', { emissive: '#14161c', emissiveIntensity: 0.6 }), (BX0 + BX1) / 2, 1.0, FAR + 0.01, false));

  // ---- the partition and the driver's compartment ---------------------------------------------------
  const PZ = (FAR + NEAR) / 2;
  g.add(mesh(box(0.07, 0.78, NEAR - FAR), leather, PART + 0.04, 0.39, PZ));
  g.add(mesh(box(0.07, ROOF - 1.22, NEAR - FAR), leather, PART + 0.04, (ROOF + 1.22) / 2, PZ, false));
  g.add(mesh(box(0.09, 0.03, NEAR - FAR), trim, PART + 0.04, 0.79, PZ, false));
  g.add(mesh(box(0.05, 0.02, NEAR - FAR - 0.1), tint, PART + 0.04, 0.8, PZ, false)); // the privacy glass, rolled down
  // front seats
  for (const z of [-0.42, 0.42]) {
    g.add(mesh(roundedBox(0.5, 0.12, 0.5, 0.03), leatherHi, 2.95, SEAT - 0.06, z));
    g.add(mesh(roundedBox(0.12, 0.65, 0.5, 0.04), leather, 2.62, SEAT + 0.3, z));
    g.add(mesh(roundedBox(0.1, 0.18, 0.3, 0.04), leather, 2.6, SEAT + 0.75, z, false));
    g.add(mesh(box(0.5, SEAT - 0.12, 0.45), paintHi, 2.95, (SEAT - 0.12) / 2, z, false));
  }
  // dash, steering wheel, a glowing cluster
  g.add(mesh(box(0.35, 0.3, NEAR - FAR), paintHi, NOSE - 0.18, 0.72, PZ));
  g.add(mesh(box(0.38, 0.03, NEAR - FAR), trim, NOSE - 0.18, 0.88, PZ, false));
  g.add(mesh(box(0.02, 0.1, 0.3), glow('#6ad0ff', 0.9), NOSE - 0.36, 0.8, -0.42, false));
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 12), toon('#141414'), NOSE - 0.45, 0.92, -0.42, false);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = -0.4;
  g.add(wheel);
  g.add(mesh(cyl(0.025, 0.025, 0.3, 4), toon('#141414'), NOSE - 0.35, 0.86, -0.42, false).rotateZ(1.1));
  // windshield and hood
  const ws = mesh(new THREE.PlaneGeometry(0.95, NEAR - FAR), tint, NOSE + 0.2, 1.25, PZ, false);
  ws.rotation.set(0, -Math.PI / 2, 0);
  ws.rotateX(-0.9);
  g.add(ws);
  g.add(mesh(roundedBox(1.3, 0.5, NEAR - FAR + 0.05, 0.1), paint, NOSE + 0.85, 0.3, PZ, false));
  g.add(mesh(box(0.06, 0.25, NEAR - FAR - 0.2), chrome, NOSE + 1.5, 0.3, PZ, false)); // grille
  for (const z of [FAR + 0.2, NEAR - 0.2]) g.add(mesh(box(0.04, 0.1, 0.25), glow('#fff4d0', 1.4), NOSE + 1.51, 0.42, z, false));
  g.add(mesh(cyl(0.02, 0.02, 0.1, 4), chrome, NOSE + 1.4, 0.6, PZ, false)); // hood ornament

  // ---- lights -----------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#a8a0d8', '#1a141c', 1.5);
  g.add(hemi);
  const key = keyLight(g, '#e8e0ff', 1.0, [1, 6, 6], [0, 0.6, 0]);
  // the cabin lights, down the length of the car
  const cabin = [-2.1, -0.4, 1.0].map((x) => {
    const l = new THREE.PointLight('#c8a0ff', 2.2, 3.5, 1.4);
    l.position.set(x, 1.4, 0.3);
    g.add(l);
    return l;
  });
  const barGlow = new THREE.PointLight('#b080ff', 1.8, 2.5, 1.4);
  barGlow.position.set(1.8, 0.9, -0.2);
  g.add(barGlow);
  const front = new THREE.PointLight('#ffe0c0', 1.2, 2.5, 1.4);
  front.position.set(2.9, 1.3, 0.3);
  g.add(front);

  const N = nodes({ rear: [-2.55, 0.1], door: [-1.75, -0.4], bench_l: [-0.7, -0.45], bench_r: [0.9, -0.45], side: [1.5, 0.3], driver: [2.95, -0.42], driver_door: [2.95, -0.72] });
  const benchSeat = (x: number, hint: string) => mark(x, FAR + 0.47, 0, x < 0 ? 'bench_l' : 'bench_r', hint, { seat: SEAT });
  const rearSeat = (z: number, hint: string) => mark(REAR + 0.47, z, Math.PI / 2 - 0.4, 'rear', hint, { seat: SEAT });
  return {
    id: 'limo',
    name: "Barney's Limo",
    group: g,
    nodes: N,
    edges: [['rear', 'door'], ['door', 'bench_l'], ['bench_l', 'bench_r'], ['bench_r', 'side'], ['driver_door', 'driver']],
    door: 'door',
    entrances: { driver: 'driver_door', driver_door: 'driver_door' },
    marks: {
      rear_seat_left: rearSeat(-0.35, 'the rear bench across the back of the limo, far side (the power seat)'),
      rear_seat_right: rearSeat(0.4, 'the rear bench across the back of the limo, near side'),
      bench_1: benchSeat(-0.75, 'the long leather side bench, end nearest the back'),
      bench_2: benchSeat(0.1, 'the long leather side bench, middle'),
      bench_3: benchSeat(0.95, 'the long leather side bench, by the bar'),
      bar_seat: mark(PART - 0.47, 0.42, -Math.PI / 2 + 0.45, 'side', 'the side seat by the bar and the champagne, facing back down the limo', { seat: SEAT }),
      driver_door: mark(2.95, -0.72, Math.PI / 2, 'driver_door', 'driver compartment door', { seat: SEAT }),
      driver: mark(2.97, -0.42, Math.PI / 2, 'driver', "the driver's seat beyond the open partition window (Ranjit's)", { seat: SEAT }),
      door: mark(-1.75, FAR + 0.47, 0.3, 'door', 'the limo door in the far side, by the rear bench', { seat: SEAT }),
    },
    wides: [
      // back down the cabin from the near front corner, by the bar seat: the rear bench and the long bench
      { pos: v3(2.0, 1.42, 0.68), target: v3(-1.6, 0.85, -0.25), fov: 56 },
      // up the cabin from the rear corner: the long bench, the bar seat and Ranjit through the partition
      { pos: v3(-2.15, 1.42, 0.72), target: v3(1.2, 0.85, -0.25), fov: 60 },
      // across from the console: the long bench and the street going by behind it
      { pos: v3(0.1, 1.36, 0.74), target: v3(0.1, 0.92, -0.7), fov: 64 },
      // the rear bench, from by the door
      { pos: v3(-0.9, 1.38, 0.55), target: v3(-2.7, 0.95, 0.05), fov: 52 },
      // the dashboard, back at Ranjit
      { pos: v3(3.48, 1.24, -0.12), target: v3(2.95, 1.06, -0.42), fov: 62 },
    ],
    cameraBounds: new THREE.Box3(v3(REAR + 0.12, 0.45, FAR + 0.1), v3(NOSE + 0.05, ROOF - 0.08, NEAR - 0.1)), // up to the windshield
    ambience: 'car',
    background: [{ character: 'ranjit', mark: 'driver' }],
    doorSound: 'car',
    seated: true,
    reserved: ['driver', 'driver_door'],
    setTime(t) {
      const night = t === 'night';
      for (const sd of sides) sd.m.material = night ? sd.matNight : sd.matDay;
      for (const m of [...ends, rearWindow]) m.material = night ? aheadNight : aheadDay;
      lampsFar.setNight(night);
      lampsNear.setNight(night);
      hemi.color.set(night ? '#a8a0d8' : '#e8ecf8');
      hemi.intensity = night ? 1.5 : 2.4;
      key.intensity = night ? 0.8 : 2.0;
      for (const l of cabin) l.intensity = night ? 2.4 : 1.0;
    },
    update(dt) {
      for (const sd of sides) {
        scroll(sd.night, BD_W, dt, sd.dir);
        sd.day.offset.x = sd.night.offset.x;
      }
      scroll(roadTex, BD_W, dt);
      lampsFar.update(dt, -1);
      lampsNear.update(dt, -1);
    },
  };
}
