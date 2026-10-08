import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { facade, riverWater, sign, skyGradient } from '../../engine/textures';
import { mulberry32 } from '../../util';
import { v3 } from './common';
import type { EstablishingShot } from './establishing';
import type { NYC_TRANSITIONS } from '../../script/types';

type DayNight = (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh;
type Landmark = (typeof NYC_TRANSITIONS)[number];
export interface CityCutaway {
  group: THREE.Group;
  shots: readonly EstablishingShot[];
  update(dt: number): void;
}

const shot = (p: number[], t: number[], fov: number, m: number[], l = m): EstablishingShot => ({
  pos: v3(p[0], p[1], p[2]), target: v3(t[0], t[1], t[2]), fov,
  move: v3(m[0], m[1], m[2]), look: v3(l[0], l[1], l[2]),
});

/** Original, procedural landmark footage in the same low-poly style as the story sets. */
export function buildNycEstablishing(dn: DayNight): Record<Landmark, CityCutaway> {
  return {
    flatiron: flatiron(dn), washington_square: washingtonSquare(dn),
    central_park: centralPark(dn), brooklyn_bridge: brooklynBridge(dn),
  };
}

function environment(name: Landmark, dn: DayNight, ground: string) {
  const g = new THREE.Group(); g.name = `exterior_${name}`;
  // A surrounding sky keeps both camera moves inside the scenery, including their upper corners.
  g.add(dn(mesh(new THREE.SphereGeometry(220, 24, 16), toon('#ffffff'), 0, 0, 0, false),
    new THREE.MeshBasicMaterial({ map: skyGradient(false), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: skyGradient(true), side: THREE.BackSide })));
  g.add(mesh(box(360, .12, 360), toon(ground), 0, -.12, 0, false));
  return g;
}

function building(g: THREE.Group, dn: DayNight, x: number, z: number, w: number, h: number, d: number, seed: number, color = '#a68d78', rooftop = true) {
  const day = toon('#ffffff', { map: facade(false, color, seed, Math.max(3, Math.round(w)), Math.round(h / 1.5)) });
  const night = toon('#ffffff', { map: facade(true, color, seed, Math.max(3, Math.round(w)), Math.round(h / 1.5)), emissive: '#ffffff', emissiveIntensity: .5 });
  g.add(dn(mesh(box(w, h, d), day, x, h / 2, z, false), day, night));
  g.add(mesh(box(w + .25, .35, d + .25), toon('#786a5b'), x, h + .12, z, false));
  if (!rooftop) return;
  // A few quiet roof silhouettes make the city blocks feel lived in without crowding the landmarks.
  if (seed % 4 === 0) g.add(mesh(box(w * .5, 1.2, d * .5), toon(color), x, h + .7, z, false));
  if (seed % 5 === 0 && w >= 5) {
    const tx = x - w * .22, tz = z - d * .2, iron = toon('#54544d');
    for (const dx of [-.55, .55]) for (const dz of [-.55, .55]) {
      g.add(mesh(box(.09, 1.1, .09), iron, tx + dx, h + .8, tz + dz, false));
    }
    g.add(mesh(cyl(.85, .85, 1.45, 10), toon('#76604c'), tx, h + 2.05, tz, false));
    for (const y of [h + 1.5, h + 2.6]) g.add(mesh(cyl(.87, .87, .07, 10), iron, tx, y, tz, false));
    g.add(mesh(cyl(0, .92, .55, 10), toon('#645d50'), tx, h + 3.05, tz, false));
  }
}

function rod(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
  const m = mesh(cyl(radius, radius, a.distanceTo(b), 5), mat, 0, 0, 0, false);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(m); return m;
}

function tree(g: THREE.Group, x: number, z: number, h: number, color: string) {
  const trunk = toon('#635044');
  g.add(mesh(cyl(.16, .3, h * .72, 6), trunk, x, h * .36, z, false));
  const leaves = mesh(new THREE.IcosahedronGeometry(h * .37, 1), toon(color), x, h * .77, z, false);
  leaves.scale.set(1, 1.1, .85); g.add(leaves);
  for (const side of [-1, 1]) g.add(mesh(new THREE.IcosahedronGeometry(h * .24, 0), toon(color), x + side * h * .22, h * .66, z + .25, false));
}

function lamp(g: THREE.Group, dn: DayNight, x: number, z: number) {
  const iron = toon('#253833');
  g.add(mesh(cyl(.08, .13, 4, 6), iron, x, 2, z, false));
  g.add(mesh(cyl(.28, .4, .25, 6), iron, x, .13, z, false));
  g.add(dn(mesh(new THREE.SphereGeometry(.3, 8, 6), toon('#e6dec7'), x, 4.15, z, false), toon('#e6dec7'), glow('#ffe2a2', 1.8)));
  g.add(mesh(cyl(.05, .38, .3, 6), iron, x, 4.5, z, false));
}

function bench(g: THREE.Group, x: number, z: number, turn = 0) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = turn;
  const wood = toon('#745640'), iron = toon('#293a31');
  for (let i = 0; i < 4; i++) {
    b.add(mesh(box(2.6, .09, .15), wood, 0, .66, i * .17, false));
    b.add(mesh(box(2.6, .12, .08), wood, 0, .91 + i * .16, -.08, false));
  }
  for (const side of [-1, 1]) {
    b.add(mesh(box(.09, .68, .66), iron, side * 1.04, .34, .23, false));
    b.add(mesh(box(.1, .12, .82), iron, side * 1.12, .95, .22, false));
  }
  g.add(b);
}

function water(g: THREE.Group, dn: DayNight, width: number, depth: number, z: number, lake = false) {
  const day = riverWater(false, 824), night = riverWater(!lake, 824);
  day.repeat.set(12, 8); night.repeat.set(12, 8);
  const surface = dn(mesh(new THREE.PlaneGeometry(width, depth), toon('#ffffff'), 0, .02, z, false),
    toon('#b2d3c6', { map: day }), toon(lake ? '#567386' : '#bcc6d4', { map: night, emissive: lake ? '#819aae' : '#ffffff', emissiveIntensity: lake ? .22 : .38 }));
  surface.rotation.x = -Math.PI / 2; g.add(surface);
  return (dt: number) => { day.offset.x += dt * .009; night.offset.x += dt * .009; };
}

function cab(g: THREE.Group, dn: DayNight, x: number, z: number, direction: number) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = direction > 0 ? 0 : Math.PI;
  const yellow = toon('#e9b723');
  c.add(mesh(box(3.6, .55, 1.5), yellow, 0, .55, 0, false));
  c.add(mesh(box(1.9, .6, 1.28), toon('#344c59'), -.12, 1.05, 0, false));
  c.add(mesh(box(1.75, .08, 1.32), yellow, -.12, 1.38, 0, false));
  c.add(mesh(box(.58, .18, .32), toon('#f9e7ae'), 0, 1.52, 0, false));
  for (const sx of [-1.1, 1.1]) for (const sz of [-.74, .74]) {
    c.add(mesh(cyl(.28, .28, .14, 8), toon('#242428'), sx, .28, sz, false).rotateX(Math.PI / 2));
  }
  for (const sz of [-.48, .48]) c.add(dn(mesh(box(.06, .16, .28), toon('#e7e0cd'), 1.82, .64, sz, false), toon('#e7e0cd'), glow('#fff1c8', 1.8)));
  g.add(c); return c;
}

function flatiron(dn: DayNight): CityCutaway {
  const g = environment('flatiron', dn, '#343840');
  const stone = toon('#c4b7a0'), trim = toon('#d8ccb8');
  // Rounded wedge at the meeting of Broadway and Fifth Avenue, with windows following both long faces.
  const footprint = new THREE.Shape();
  footprint.moveTo(-.45, -2); footprint.quadraticCurveTo(0, -3.1, .45, -2);
  footprint.lineTo(6.8, 16); footprint.lineTo(-6.8, 16); footprint.closePath();
  const prism = (height: number, scale: number, y: number, mat: THREE.Material) => {
    const geo = new THREE.ExtrudeGeometry(footprint, { depth: height, bevelEnabled: false, curveSegments: 8 });
    geo.rotateX(-Math.PI / 2); geo.scale(scale, 1, scale);
    g.add(mesh(geo, mat, 0, y, -9, false));
  };
  prism(28, 1, 0, stone);
  for (const y of [3, 5, 24, 27.8]) prism(.32, 1.035, y, trim);
  prism(.7, 1.05, 28.1, trim);
  const winDay = toon('#536574'), winNight = glow('#dbb97b', .8);
  for (const side of [-1, 1]) {
    const a = v3(side * .45, 0, -7), b = v3(side * 6.8, 0, -25);
    const along = b.clone().sub(a), normal = v3(side * 18, 0, 6.35).normalize();
    for (let row = 0; row < 14; row++) for (let col = 0; col < 14; col++) {
      const p = a.clone().addScaledVector(along, (col + .5) / 14).addScaledVector(normal, .04);
      const window = dn(mesh(new THREE.PlaneGeometry(.63, 1.05), winDay, p.x, 4.2 + row * 1.62, p.z, false), winDay, (row + col) % 4 ? winNight : winDay);
      window.rotation.y = Math.atan2(normal.x, normal.z); g.add(window);
      rod(g, v3(p.x, 3.61 + row * 1.62, p.z), v3(p.x, 4.79 + row * 1.62, p.z), .035, trim);
    }
  }
  for (let row = 0; row < 14; row++) g.add(dn(mesh(new THREE.PlaneGeometry(.48, 1.05), winDay, 0, 4.2 + row * 1.62, -6.45, false), winDay, winNight));
  const rng = mulberry32(2305);
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    building(g, dn, side * (22 + i * 7), -22 - rng() * 14, 6.5, 13 + rng() * 22, 7, 960 + i, i % 2 ? '#937f6d' : '#bcac98');
  }
  for (const [i, x] of [-23, -8, 9, 25].entries()) {
    building(g, dn, x, -57 - i % 2 * 5, 10, [25, 31, 23, 28][i], 9, 980 + i, ['#9b978c', '#b2a38f', '#879394', '#a59684'][i]);
  }
  for (let x = -48; x <= 48; x += 3.2) g.add(mesh(box(1.3, .025, 4.2), toon('#d7d3bd'), x, .015, 3.5, false));
  g.add(mesh(box(13, .2, 19), toon('#a8a397'), 0, .06, -18, false));
  for (const x of [-12, 12]) for (let z = -42; z < 0; z += 6) g.add(mesh(box(.13, .02, 3), toon('#e2cd77'), x, .015, z, false));
  const pole = toon('#3d4746');
  g.add(mesh(cyl(.1, .13, 7, 8), pole, -10, 3.5, -2, false));
  g.add(mesh(box(18, .12, .12), pole, -1, 6.8, -2, false));
  for (const x of [-8, 7]) {
    g.add(mesh(box(.48, 1.3, .38), toon('#d2a634'), x, 6.12, -2, false));
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.SphereGeometry(.14, 8, 6), i === 2 ? glow('#72b896') : toon('#3a3830'), x, 6.5 - i * .38, -1.79, false));
  }
  for (const [text, y] of [['BROADWAY', 4.7], ['W 23 ST', 4.15]] as const) g.add(mesh(new THREE.PlaneGeometry(2.35, .4), new THREE.MeshBasicMaterial({ map: sign(text, '#f6f3e4', '#285440', 256, 48, 'bold 28px Arial') }), -10, y, -1.86, false));
  tree(g, 18, -4, 8, '#6a7e4b'); lamp(g, dn, 13, -1);
  const cars = [-26, -4, 24].map((x, i) => ({ c: cab(g, dn, x, 7 + i % 2 * 2.2, i % 2 ? -1 : 1), dir: i % 2 ? -1 : 1 }));
  return { group: g, shots: [
    shot([21, 7, 35], [0, 12.6, -14], 42, [-.2, .02, -.16], [0, .08, 0]),
    shot([-17, 4, 30], [0, 13, -12], 45, [.17, .06, -.14], [0, .12, 0]),
  ], update(dt) { for (const { c, dir } of cars) { c.position.x += dt * dir * 10; if (Math.abs(c.position.x) > 52) c.position.x = -Math.sign(c.position.x) * 52; } } };
}

function washingtonSquare(dn: DayNight): CityCutaway {
  const g = environment('washington_square', dn, '#7f8870');
  const stone = toon('#d6cbb7'), detail = toon('#bdae93');
  g.add(mesh(box(35, .1, 45), toon('#b5afa0'), 0, -.005, 3, false));
  const arch = new THREE.Shape();
  arch.moveTo(-6, 0); arch.lineTo(-6, 11); arch.lineTo(6, 11); arch.lineTo(6, 0);
  arch.lineTo(3.2, 0); arch.lineTo(3.2, 5.4); arch.absarc(0, 5.4, 3.2, 0, Math.PI, false);
  arch.lineTo(-3.2, 0); arch.closePath();
  const geo = new THREE.ExtrudeGeometry(arch, { depth: 2.2, bevelEnabled: false, curveSegments: 18 });
  g.add(mesh(geo, stone, 0, 0, -8, false));
  for (const x of [-4.65, 4.65]) {
    g.add(mesh(box(3, .35, 2.7), stone, x, .18, -6.9, false));
    for (const dx of [-.97, .97]) g.add(mesh(box(.2, 7.2, .18), detail, x + dx, 4.3, -5.68, false));
    g.add(mesh(box(1.2, 1.6, .15), detail, x, 6.3, -5.67, false));
    g.add(mesh(new THREE.SphereGeometry(.3, 6, 5), stone, x, 6.5, -5.49, false));
  }
  for (const [y, w, h] of [[9.25, 12.25, .35], [11, 12.9, .45], [11.9, 13.3, .35]] as const) g.add(mesh(box(w, h, 2.7), stone, 0, y, -6.9, false));
  g.add(mesh(box(12, .8, 2.25), stone, 0, 11.45, -6.9, false));
  for (let x = -5.5; x <= 5.5; x += .5) g.add(mesh(box(.2, .25, .18), detail, x, 10.55, -5.64, false));
  const lit = new Map<THREE.Material, THREE.Material>([
    [stone, toon('#d6cbb7', { emissive: '#e4c69a', emissiveIntensity: .38 })],
    [detail, toon('#bdae93', { emissive: '#d4b788', emissiveIntensity: .28 })],
  ]);
  for (const o of g.children) if (o instanceof THREE.Mesh && lit.has(o.material)) dn(o, o.material, lit.get(o.material)!);
  // Fifth Avenue continues through the arch, with the village's brick buildings framing it.
  g.add(mesh(box(6, .03, 60), toon('#555e62'), 0, .01, -40, false));
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) building(g, dn, side * (9 + i * 7), -27 - i * 2, 6.7, 12 + i % 3 * 3, 9, 1040 + i, i % 2 ? '#9d7056' : '#ac9b81');
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    building(g, dn, side * (15 + i * 15), -60 - i % 2 * 6, 11, [23, 28, 21][i], 10, 1060 + i, i % 2 ? '#a59c8c' : '#9a8e80');
  }
  // Circular sunken fountain and a light spray, kept below the arch's opening.
  g.add(mesh(cyl(5.7, 5.7, .18, 48), detail, 0, .09, 6, false));
  const basin = mesh(new THREE.TorusGeometry(5.3, .19, 6, 48), stone, 0, .32, 6, false); basin.rotation.x = -Math.PI / 2; g.add(basin);
  const pool = mesh(new THREE.CircleGeometry(5.05, 48), toon('#83a7a1'), 0, .2, 6, false); pool.rotation.x = -Math.PI / 2; g.add(pool);
  const spray = new THREE.Group(); spray.position.set(0, .2, 6); g.add(spray);
  const white = toon('#c8e4df');
  spray.add(mesh(cyl(.06, .22, 1.8, 8), white, 0, .9, 0, false));
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2;
    const path = new THREE.QuadraticBezierCurve3(v3(0, .1, 0), v3(Math.cos(angle), 2.4, Math.sin(angle)), v3(Math.cos(angle) * 2, .05, Math.sin(angle) * 2));
    spray.add(mesh(new THREE.TubeGeometry(path, 12, .027, 4, false), white, 0, 0, 0, false));
  }
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    tree(g, side * (15 + i % 2 * 4), -10 + i * 8, 8 + i % 2 * 2, ['#717e4b', '#9c874b', '#567a55', '#c39b5a'][i]);
    lamp(g, dn, side * (i < 2 ? 12 : 19), -1 + i * 7);
    bench(g, side * 9, i * 7, side * Math.PI / 2);
  }
  return { group: g, shots: [
    shot([14, 5.2, 29], [0, 4.7, -4], 44, [-.15, 0, -.13]),
    shot([-12, 3.6, 26], [0, 5.3, -6], 44, [.15, .015, -.09]),
  ], update(dt) { spray.rotation.y += dt * .08; } };
}

function centralPark(dn: DayNight): CityCutaway {
  const g = environment('central_park', dn, '#5e7850');
  const shimmer = water(g, dn, 160, 72, 5, true);
  const bridge = new THREE.Group(); bridge.position.set(0, 0, -3); bridge.rotation.y = -.16; g.add(bridge);
  const cream = toon('#d6d4bd', { emissive: '#677a88', emissiveIntensity: .24 }), iron = toon('#abae99', { emissive: '#677a88', emissiveIntensity: .15 });
  const height = (x: number) => 1.15 + 1.05 * (1 - (x / 11) ** 2);
  for (let i = 0; i < 36; i++) {
    const x = -11 + (i + .5) * 22 / 36;
    const deck = mesh(box(22 / 36 + .025, .23, 2.6), cream, x, height(x), 0, false);
    deck.rotation.z = Math.atan(-2.1 * x / 121); bridge.add(deck);
    for (const z of [-1.32, 1.32]) {
      rod(bridge, v3(x, height(x), z), v3(x, height(x) + 1, z), .035, iron);
      if (i % 2 === 0) bridge.add(mesh(new THREE.TorusGeometry(.21, .025, 4, 12), iron, x, height(x) + .5, z, false));
      const next = x + 22 / 36;
      rod(bridge, v3(x, height(x) + 1.02, z), v3(next, height(next) + 1.02, z), .07, cream);
      rod(bridge, v3(x, height(x) - .16, z), v3(next, height(next) - .16, z), .1, iron);
    }
  }
  for (const x of [-11, 11]) for (const z of [-1.3, 1.3]) {
    bridge.add(mesh(cyl(.34, .23, .5, 8), cream, x, height(x) + 1.2, z, false));
    bridge.add(mesh(new THREE.IcosahedronGeometry(.42, 1), toon('#597947'), x, height(x) + 1.6, z, false));
  }
  for (const x of [-28, 28]) {
    const bank = mesh(new THREE.SphereGeometry(25, 18, 10), toon('#6d8153'), x, -20, -4, false);
    bank.scale.z = 1.4; g.add(bank);
  }
  g.add(mesh(box(160, .3, 75), toon('#667e54'), 0, -.08, -64, false));
  const rng = mulberry32(7405), colors = ['#b18b4d', '#9d6c3c', '#697e49', '#ba9a50', '#4d7354'];
  for (let i = 0; i < 38; i++) {
    const x = -60 + i * 3.2;
    tree(g, x, -28 - rng() * 8, 7 + rng() * 5, colors[i % colors.length]);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) tree(g, side * (18 + i * 4), -15 + i * 4, 8 + i % 3, colors[i % colors.length]);
  // A sparse Central Park West roofline peeks above the canopy; the twin crowns remain tallest.
  for (const [i, x] of [-45, -30, -19, 12, 26, 42].entries()) {
    building(g, dn, x, -60 - i % 2 * 4, 9 + i % 2 * 2, [21, 25, 20, 23, 27, 22][i], 8, 1140 + i, ['#a99881', '#aaa899', '#8d9692'][i % 3]);
  }
  // San Remo's recognizable twin crowns rise beyond the trees.
  building(g, dn, -6, -48, 15, 18, 7, 1120, '#b7a18b', false);
  for (const x of [-11, -1]) {
    building(g, dn, x, -48, 3.2, 28, 3.2, 1121, '#bba991', false);
    g.add(mesh(cyl(1, 1.65, 2, 10), toon('#bfad91'), x, 29, -48, false));
    g.add(mesh(cyl(0, 1, 2.1, 10), toon('#6d816e'), x, 31, -48, false));
  }
  const boat = new THREE.Group(); boat.position.set(5, .24, 11); boat.rotation.y = -.3;
  const hull = mesh(new THREE.SphereGeometry(1, 12, 6), toon('#895b3b'), 0, 0, 0, false); hull.scale.set(1.6, .23, .57); boat.add(hull);
  boat.add(mesh(box(2.1, .07, .6), toon('#ba8e5b'), 0, .13, 0, false));
  rod(boat, v3(-.1, .2, -1.4), v3(.1, .2, 1.4), .035, toon('#c7ab7b')); g.add(boat);
  let elapsed = 0;
  return { group: g, shots: [
    shot([14, 4.4, 28], [0, 5, -12], 44, [-.18, 0, -.06]),
    shot([-16, 3.2, 23], [-1, 5, -9], 46, [.14, .015, -.07]),
  ], update(dt) { elapsed += dt; shimmer(dt); boat.position.y = .24 + Math.sin(elapsed * .7) * .035; boat.position.x = 5 + Math.sin(elapsed * .08) * 1.5; } };
}

function brooklynBridge(dn: DayNight): CityCutaway {
  const g = environment('brooklyn_bridge', dn, '#5b645e');
  const shimmer = water(g, dn, 260, 180, -26);
  const rng = mulberry32(1883);
  for (let i = 0; i < 22; i++) building(g, dn, -65 + i * 6, -64 - rng() * 18, 5.2, 6 + rng() * 19, 6, 1200 + i, ['#93785e', '#9c9588', '#6d7d83'][i % 3]);
  // Continue the waterfront behind both reverse angles, with a subdued second layer of blocks.
  for (const [i, x] of [-164, -132, -100, -68, -36, -4, 28, 60, 104, 146].entries()) {
    building(g, dn, x, -92 + x * x * .003, 18 + i % 3 * 3, [26, 33, 25, 31, 23, 32, 22, 29, 26, 30][i], 12, 1240 + i, ['#8e9695', '#a39987', '#879197'][i % 3]);
  }
  const bridge = new THREE.Group(); bridge.position.set(0, 0, -13); bridge.rotation.y = -.35; g.add(bridge);
  const stone = toon('#b7a486'), ledge = toon('#c4b396'), steel = toon('#596164');
  const litStone = toon('#b7a486', { emissive: '#d5b58a', emissiveIntensity: .42 });
  const length = 96, top = 18.5, deck = 5.2;
  bridge.add(mesh(box(length, .65, 5.6), steel, 0, deck, 0, false));
  for (const tx of [-22, 22]) {
    bridge.add(dn(mesh(box(4.8, 3.8, 9.4), stone, tx, 1.9, 0, false), stone, litStone));
    // Twin pointed Gothic openings, rather than a generic rectangular suspension tower.
    const shape = new THREE.Shape();
    shape.moveTo(-4.3, 0); shape.lineTo(-4.3, 16); shape.lineTo(4.3, 16); shape.lineTo(4.3, 0);
    for (const cx of [2.15, -2.15]) {
      shape.lineTo(cx + 1.35, 0); shape.lineTo(cx + 1.35, 9);
      shape.quadraticCurveTo(cx + 1.1, 11.4, cx, 12.5);
      shape.quadraticCurveTo(cx - 1.1, 11.4, cx - 1.35, 9); shape.lineTo(cx - 1.35, 0);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.3, bevelEnabled: false, curveSegments: 14 });
    geo.rotateY(Math.PI / 2);
    bridge.add(dn(mesh(geo, stone, tx - 1.65, 3.8, 0, false), stone, litStone));
    for (const y of [18, 19.6]) bridge.add(mesh(box(3.8, .5, 9.1), ledge, tx, y, 0, false));
    for (const z of [-4.3, 0, 4.3]) bridge.add(mesh(box(3.45, .65, .22), ledge, tx, 5.15, z, false));
    const flagpole = mesh(cyl(.035, .035, 2.8, 6), steel, tx, 21.3, 0, false); bridge.add(flagpole);
    bridge.add(mesh(new THREE.PlaneGeometry(1.7, .85), toon('#bc6b5c', { side: THREE.DoubleSide }), tx + .86, 22.05, 0, false));
  }
  const cableHeight = (x: number) => Math.abs(x) > 22
    ? top - (Math.abs(x) - 22) / 26 * (top - deck - .5)
    : deck + 3.2 + (top - deck - 3.2) * (x / 22) ** 2;
  for (const z of [-2.6, 2.6]) {
    for (let i = 0; i < 64; i++) {
      const x = -48 + i * 1.5;
      rod(bridge, v3(x, cableHeight(x), z), v3(x + 1.5, cableHeight(x + 1.5), z), .065, steel);
      rod(bridge, v3(x, deck + .4, z), v3(x, cableHeight(x), z), .024, steel);
    }
    for (const tx of [-22, 22]) for (let i = -8; i <= 8; i++) rod(bridge, v3(tx, top, z), v3(tx + i * 2.1, deck + .4, z), .021, steel);
    for (let x = -46; x <= 46; x += 4) bridge.add(dn(mesh(new THREE.SphereGeometry(.09, 5, 4), toon('#d6ceb5'), x, deck + .5, z, false), toon('#d6ceb5'), glow('#ffdba2', 1.6)));
  }
  g.add(mesh(box(90, .6, 9), toon('#9b9687'), 0, .2, 30, false));
  for (let x = -38; x < 42; x += 2) {
    g.add(mesh(cyl(.045, .045, 1.35, 6), steel, x, 1, 26, false));
    g.add(mesh(box(2.1, .06, .06), steel, x + 1, 1.65, 26, false));
  }
  lamp(g, dn, -18, 29); bench(g, 12, 28, Math.PI);
  return { group: g, shots: [
    shot([62, 5.8, 35], [-6, 7.5, -17], 39, [-.28, 0, -.12]),
    shot([-68, 4, 14], [3, 8.5, -17], 41, [.25, .015, -.1]),
  ], update: shimmer };
}
