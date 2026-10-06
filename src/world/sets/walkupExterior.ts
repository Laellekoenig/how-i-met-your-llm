import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { brick, sign } from '../../engine/textures';
import { v3 } from './common';
import { mulberry32 } from '../../util';

/** Shared MacLaren's / apartment facade. See docs/maclarens-reference.md for episode stills. */
export function buildWalkupExterior(
  g: THREE.Group,
  dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh,
  nightLights: [THREE.Light, number][],
  streetFront: number,
  curb: number,
) {
  // The recessed building line leaves room for the tall stoop and the basement areaway.
  const front = streetFront - 1.2, width = 11, height = 14.7;
  const pavement = 0.16, basement = -0.9, landing = 2.56;
  const pubX = -2.05, stoopX = 1.3, stoopWidth = 2.1;
  const stone = toon('#625f55'), trim = toon('#8a8170');
  const base = toon('#303638'), green = toon('#254e43'), iron = toon('#263433');
  const brass = toon('#b79e67'), wood = toon('#49312a');
  const glassDay = toon('#52616a'), glassDark = toon('#182127');
  const amber = glow('#e9b877', 0.75), glassWarm = glow('#e2c494', 0.75);
  const block = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, name?: string) => {
    const m = mesh(box(w, h, d), mat, x, y, z, false);
    if (name) m.name = name;
    g.add(m); return m;
  };
  const rod = (a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) => {
    const m = mesh(cyl(radius, radius, a.distanceTo(b), 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(m);
  };
  const pane = (x: number, y: number, z: number, w: number, h: number, night = glassWarm, day = glassDay) => {
    const m = mesh(new THREE.PlaneGeometry(w, h), day, x, y, z, false);
    g.add(dn(m, day, night)); return m;
  };

  block(width, height + 1.2, 8, toon('#ffffff', { map: brick('#887c67', '#6d6559', [7, 12]) }), 0, (height - 1.2) / 2, front - 4);
  block(width, 4.2, 0.18, base, 0, 0.9, front + 0.09);
  block(width + 0.1, 0.22, 0.34, stone, 0, 3.04, front + 0.12);
  for (const [y, w, h, depth] of [[height - 0.42, width, 0.18, 0.3], [height - 0.15, width + 0.35, 0.3, 0.55], [height + 0.06, width + 0.55, 0.14, 0.7]]) {
    block(w, h, depth, stone, 0, y, front + 0.12);
  }
  for (let x = -5.2; x < 5.3; x += 0.42) block(0.16, 0.22, 0.24, trim, x, height - 0.36, front + 0.24);

  // Tall sash windows with dark frames, stone sills and half-drawn blinds.
  const r = mulberry32(42);
  let apartmentWindow = v3(0, 0, 0);
  for (let floor = 0; floor < 4; floor++) for (const x of [-4.25, -2.15, 1.3, 4.15]) {
    if (floor === 0 && x === stoopX) continue; // the raised residential doorway occupies this bay
    const y = 4.2 + floor * 2.8, w = 1.22, h = 1.85;
    block(w + 0.22, h + 0.18, 0.14, stone, x, y, front + 0.13);
    block(w + 0.06, h + 0.02, 0.07, wood, x, y, front + 0.23);
    const theirs = floor === 2 && x === -2.15;
    pane(x, y, front + 0.28, w - 0.1, h - 0.1, theirs || r() < 0.35 ? glassWarm : glassDark);
    block(w + 0.42, 0.17, 0.32, trim, x, y - h / 2 - 0.09, front + 0.22);
    block(w + 0.34, 0.21, 0.23, trim, x, y + h / 2 + 0.12, front + 0.15);
    block(w, 0.07, 0.06, wood, x, y - 0.08, front + 0.3);
    const blind = toon(theirs ? '#aea188' : '#777c79');
    for (let i = 0; i < (theirs ? 5 : 9); i++) block(w - 0.12, 0.055, 0.035, blind, x, y + h / 2 - 0.09 - i * 0.07, front + 0.31);
    if (theirs) apartmentWindow = v3(x, y, front + 0.3);
  }

  // Cut the sidewalk into pieces around a real opening; a flat slab would cover the descending steps.
  const pitLeft = -3.65, pitRight = -0.4, pitEnd = front + 2.55;
  const sidewalk = toon('#8c8980'), seam = toon('#716f68');
  const paving = (x0: number, x1: number, z0: number, z1: number) => {
    block(x1 - x0, pavement, z1 - z0, sidewalk, (x0 + x1) / 2, pavement / 2, (z0 + z1) / 2);
  };
  paving(-width / 2, pitLeft, front, pitEnd);
  paving(pitRight, width / 2, front, pitEnd);
  paving(-width / 2, width / 2, pitEnd, curb);
  for (let x = -5.5; x <= 5.5; x += 1.1) block(0.014, 0.008, curb - pitEnd, seam, x, pavement + 0.004, (pitEnd + curb) / 2);
  block(width, 0.008, 0.014, seam, 0, pavement + 0.004, (pitEnd + curb) / 2);
  block(pitRight - pitLeft, 0.15, 2.55, stone, (pitLeft + pitRight) / 2, basement - 0.075, front + 1.275, 'pub_areaway_floor');
  block(0.13, pavement - basement, 2.55, base, pitLeft, (basement + pavement) / 2, front + 1.275);
  block(pitRight - pitLeft, pavement - basement, 0.13, base, (pitLeft + pitRight) / 2, (basement + pavement) / 2, pitEnd);
  // Enter beside the apartment stoop and descend left, behind the front railing.
  const steps = 5, tread = 0.29, rise = (pavement - basement) / steps;
  for (let i = 0; i < steps; i++) {
    const top = pavement - i * rise;
    block(tread, top - basement, 0.95, stone, pitRight - tread * (i + 0.5), (top + basement) / 2, front + 1.94, `pub_step_${i}`);
    block(tread + 0.025, 0.035, 0.98, trim, pitRight - tread * (i + 0.5), top, front + 1.94);
  }
  const rail = (x0: number, x1: number, z: number) => {
    for (let x = x0; x <= x1 + 0.01; x += 0.19) block(0.026, 0.84, 0.026, green, x, pavement + 0.47, z);
    for (const y of [pavement + 0.1, pavement + 0.91]) block(x1 - x0, 0.045, 0.055, green, (x0 + x1) / 2, y, z);
    for (const x of [x0, x1]) {
      block(0.1, 1.02, 0.1, green, x, pavement + 0.51, z);
      block(0.17, 0.08, 0.17, green, x, pavement + 1.04, z);
    }
  };
  rail(pitLeft, pitRight - 0.72, pitEnd);
  for (let z = front + 0.4; z < pitEnd; z += 0.2) block(0.025, 0.92, 0.025, green, pitLeft, pavement + 0.48, z);
  block(0.055, 0.045, 2.2, green, pitLeft, pavement + 0.94, front + 1.45);

  // Compact basement pub entrance: dark surround, glazed door and transom under the green/gold sign.
  block(2.5, 2.4, 0.16, green, pubX, basement + 1.2, front + 0.25);
  pane(pubX, basement + 1.2, front + 0.34, 2.18, 2.12, amber, toon('#79715b'));
  for (const x of [pubX - 0.9, pubX, pubX + 0.9]) block(0.075, 2.15, 0.075, wood, x, basement + 1.18, front + 0.39);
  for (const y of [basement + 0.4, basement + 1.6, basement + 2.15]) block(2.25, 0.08, 0.07, wood, pubX, y, front + 0.39);
  block(2.18, 0.39, 0.075, green, pubX, basement + 0.22, front + 0.39);
  block(0.045, 0.3, 0.065, brass, pubX + 0.17, basement + 1.02, front + 0.47);
  block(2.7, 0.19, 0.3, trim, pubX, 1.5, front + 0.29);
  block(3.04, 0.61, 0.18, brass, pubX, 2.23, front + 0.27);
  block(2.94, 0.51, 0.04, green, pubX, 2.23, front + 0.38);
  const name = toon('#ffffff', { map: sign("MacLaren's Pub", '#d6c597', '#34574b', 512, 80, '58px Georgia'), emissive: '#ffffff', emissiveIntensity: 0.16 });
  const pubSign = mesh(new THREE.PlaneGeometry(2.86, 0.44), name, pubX, 2.23, front + 0.405, false);
  pubSign.name = 'maclarens_pub_sign'; g.add(pubSign);
  for (const x of [pubX - 1.05, pubX, pubX + 1.05]) {
    rod(v3(x, 2.73, front + 0.25), v3(x, 2.87, front + 0.64), 0.025, iron);
    g.add(mesh(cyl(0.06, 0.13, 0.12, 8), iron, x, 2.77, front + 0.64, false));
    g.add(dn(mesh(cyl(0.11, 0.11, 0.025, 8), glassDay, x, 2.7, front + 0.64, false), glassDay, glow('#ffdf9c', 1.1)));
  }

  const lantern = (x: number, y: number, z: number) => {
    block(0.1, 0.32, 0.12, iron, x, y, z);
    rod(v3(x, y + 0.1, z), v3(x, y + 0.1, z + 0.24), 0.028, iron);
    block(0.23, 0.36, 0.23, brass, x, y - 0.1, z + 0.25);
    pane(x, y - 0.1, z + 0.37, 0.17, 0.26, amber, toon('#c2b393'));
    block(0.25, 0.05, 0.25, iron, x, y - 0.29, z + 0.25);
    g.add(mesh(cyl(0.045, 0.19, 0.14, 4), iron, x, y + 0.15, z + 0.25, false));
  };
  for (const x of [pubX - 1.69, pubX + 1.69]) lantern(x, 1.94, front + 0.25);

  // Frosted, small-pane window and the poster case to the left of the areaway.
  block(1.45, 1.75, 0.15, green, -4.63, 1.0, front + 0.29);
  pane(-4.63, 1.0, front + 0.38, 1.28, 1.55, glow('#ded5a9', 0.7), toon('#bcc0ad'));
  for (let x = -5.27; x <= -3.98; x += 0.256) block(0.035, 1.6, 0.04, green, x, 1, front + 0.41);
  for (let y = 0.23; y < 1.8; y += 0.31) block(1.31, 0.035, 0.04, green, -4.63, y, front + 0.41);
  block(1.5, 0.9, 0.18, base, -4.63, 2.35, front + 0.32);
  const posters = ['#9c5147', '#a79363', '#647e7a', '#8e4d65'];
  for (let i = 0; i < 4; i++) {
    const x = -5.15 + i * 0.34;
    block(0.3, 0.7 - (i % 2) * 0.12, 0.015, toon(posters[i]), x, 2.36, front + 0.42);
    for (let j = 0; j < 4; j++) block(0.21, 0.018, 0.008, trim, x, 2.6 - j * 0.1, front + 0.433);
  }

  // Ten stone steps rise beside the pub to the apartment's paneled door.
  const topZ = front + 0.7, bottomZ = topZ + 3, count = 10;
  block(stoopWidth, landing - pavement, 0.75, stone, stoopX, (landing + pavement) / 2, front + 0.34);
  for (let i = 0; i < count; i++) {
    const top = pavement + (landing - pavement) * (i + 1) / count, z = bottomZ - (i + 0.5) * 0.3;
    block(stoopWidth, top - pavement, 0.3, stone, stoopX, (top + pavement) / 2, z, `apartment_step_${i}`);
    block(stoopWidth + 0.04, 0.055, 0.33, trim, stoopX, top, z + 0.015);
  }
  // Solid sloping stone cheeks, with modeled newel posts (not fire-escape-style rails).
  for (const x of [stoopX - 1.22, stoopX + 1.22]) {
    const profile = new THREE.Shape();
    profile.moveTo(bottomZ, pavement); profile.lineTo(bottomZ, pavement + 0.92);
    profile.lineTo(topZ, landing + 0.83); profile.lineTo(front, landing + 0.83); profile.lineTo(front, pavement); profile.closePath();
    const geometry = new THREE.ExtrudeGeometry(profile, { depth: 0.28, bevelEnabled: false });
    // Shape x becomes world z; extrusion becomes world x.
    geometry.rotateY(-Math.PI / 2);
    g.add(mesh(geometry, base, x + 0.14, 0, 0, false));
    const a = v3(x, pavement + 0.96, bottomZ), b = v3(x, landing + 0.87, topZ);
    const cap = mesh(box(0.38, 0.13, a.distanceTo(b)), stone);
    cap.position.copy(a).add(b).multiplyScalar(0.5); cap.rotation.x = Math.atan2(b.y - a.y, a.z - b.z); g.add(cap);
    block(0.38, 0.13, 0.75, stone, x, landing + 0.87, front + 0.33);
    block(0.52, 0.95, 0.5, base, x, pavement + 0.475, bottomZ);
    for (const [y, w, h] of [[0.08, 0.64, 0.16], [0.6, 0.57, 0.09], [0.97, 0.6, 0.12]]) block(w, h, w, stone, x, pavement + y, bottomZ);
    g.add(mesh(new THREE.SphereGeometry(0.17, 8, 6), stone, x, pavement + 1.08, bottomZ, false));
  }
  block(2.74, 3.05, 0.24, trim, stoopX, landing + 1.5, front + 0.2);
  block(2.18, 2.86, 0.12, base, stoopX, landing + 1.42, front + 0.35);
  block(1.64, 2.52, 0.09, toon('#603e32'), stoopX, landing + 1.26, front + 0.44, 'apartment_front_door');
  for (const x of [stoopX - 0.4, stoopX + 0.4]) for (const [y, h] of [[0.42, 0.54], [1.58, 1.35]]) {
    block(0.62, h, 0.05, trim, x, landing + y, front + 0.5);
    block(0.53, h - 0.09, 0.055, wood, x, landing + y, front + 0.53);
  }
  block(0.05, 0.29, 0.07, brass, stoopX + 0.16, landing + 1.09, front + 0.59);
  pane(stoopX, landing + 2.68, front + 0.44, 1.68, 0.23, glassWarm);
  for (const x of [stoopX - 1.14, stoopX + 1.14]) {
    block(0.25, 2.72, 0.33, stone, x, landing + 1.36, front + 0.33);
    block(0.37, 0.18, 0.39, trim, x, landing + 0.09, front + 0.36);
  }
  block(2.94, 0.19, 0.52, stone, stoopX, landing + 3.02, front + 0.3);
  for (const x of [stoopX - 1.52, stoopX + 1.52]) lantern(x, landing + 2.1, front + 0.25);

  // Basement window and galvanized bins seen to the right of the stoop in “Come On”.
  block(1.65, 2.2, 0.13, stone, 4.2, 1.33, front + 0.24);
  pane(4.2, 1.33, front + 0.32, 1.44, 1.98, glassDark, toon('#858477'));
  rail(3.27, 5.28, front + 1.03);
  const zinc = toon('#8d9390');
  for (const x of [3.55, 4.3, 5.05]) {
    g.add(mesh(cyl(0.27, 0.24, 0.78, 12), zinc, x, pavement + 0.39, front + 1.52, false));
    g.add(mesh(cyl(0.3, 0.28, 0.07, 12), zinc, x, pavement + 0.81, front + 1.52, false));
    block(0.16, 0.055, 0.06, iron, x, pavement + 0.875, front + 1.52);
  }
  // A curbside parking meter; kept out of the pub sign's sightline.
  g.add(mesh(cyl(0.035, 0.045, 1.2, 6), zinc, -5.04, pavement + 0.6, curb - 0.25, false));
  block(0.23, 0.38, 0.2, zinc, -5.04, pavement + 1.34, curb - 0.25);
  block(0.15, 0.11, 0.025, glassDark, -5.04, pavement + 1.39, curb - 0.135);

  // The small autumn street tree beside the poster window in the establishing frame.
  const bark = toon('#635747'), treeZ = curb - 0.65;
  block(0.76, 0.015, 0.92, toon('#464337'), -5.28, pavement + 0.01, treeZ);
  const fork = v3(-5.12, 3.05, treeZ - 0.1);
  rod(v3(-5.28, pavement, treeZ), fork, 0.075, bark);
  for (const [x, y, z] of [[-5.6, 4.1, treeZ], [-4.75, 4.4, treeZ - 0.3], [-5.05, 5.3, treeZ - 0.2]]) {
    rod(fork, v3(x, y, z), 0.045, bark);
    for (let i = 0; i < 5; i++) {
      const leaves = mesh(new THREE.IcosahedronGeometry(0.3 + r() * 0.18, 0), toon(i % 2 ? '#967044' : '#b19458'), x + (r() - 0.5) * 0.75, y + (r() - 0.5) * 0.65, z + (r() - 0.5) * 0.6, false);
      leaves.scale.set(1, 0.55, 0.85); g.add(leaves);
    }
  }

  for (const [x, y, z, intensity] of [[pubX, 2.35, front + 1.1, 5], [stoopX, landing + 2.2, front + 1.3, 3]]) {
    const light = new THREE.PointLight('#ffcf94', 0, 7, 1.6); light.position.set(x, y, z);
    g.add(light); nightLights.push([light, intensity]);
  }

  // Preserve the roof's continuity with the apartment rooftop set.
  for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) block(0.1, 1.8, 0.1, iron, 2.6 + dx, height + 0.9, front - 2.6 + dz);
  g.add(mesh(cyl(0.85, 0.85, 1.5, 12), toon('#7a5a3e'), 2.6, height + 2.55, front - 2.6, false));
  g.add(mesh(cyl(0.05, 0.95, 0.55, 12), stone, 2.6, height + 3.57, front - 2.6, false));

  return { pub: v3(pubX, 1.75, front), entrance: v3(stoopX, landing + 1.2, front), window: apartmentWindow, roof: v3(1, height, front) };
}
