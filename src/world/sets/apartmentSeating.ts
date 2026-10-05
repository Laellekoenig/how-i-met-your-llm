import * as THREE from 'three';
import { box, cyl, mesh, occluder, roundedBox, toon } from '../../engine/materials';
import { stripes } from '../../engine/textures';
import { couch, mark, type Mark } from './common';

// Set photographs by the show's set decorator, Susan Eschelbach:
// https://susaneschelbach.com/how-i-met-your-mother (Ted's with Lights / DSC_0388).
// The sofa is parallel to the landing; four mismatched chairs wrap around the coffee table.
export const APARTMENT_SOFA = { x: -0.4, z: -1.4, width: 3.0 };

export function apartmentSeating(g: THREE.Group): Record<string, Mark> {
  const seats: Record<string, Mark> = {};
  const wood = toon('#986b39');
  const chrome = toon('#9b9c99');
  const leather = toon('#693d29');

  // Model and actor share the same transform, including the approach in front of the seat.
  const seat = (name: string, x: number, z: number, facing: number, height: number, node: string, hint: string) => {
    const chair = new THREE.Group();
    chair.name = name;
    chair.position.set(x, 0, z);
    chair.rotation.y = facing;
    g.add(chair);
    seats[name] = mark(x + Math.sin(facing) * 0.1, z + Math.cos(facing) * 0.1, facing, node, hint, {
      seat: height,
      approach: [x + Math.sin(facing) * 0.78, z + Math.cos(facing) * 0.78],
    });
    return chair;
  };
  const rail = (parent: THREE.Group, a: [number, number, number], b: [number, number, number], width: number, material: THREE.Material) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const part = mesh(box(width, start.distanceTo(end), width), material);
    part.position.copy(start).add(end).multiplyScalar(0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    parent.add(part);
  };
  const pillow = (parent: THREE.Group, x: number, color: string, tilt: number) => {
    const p = mesh(roundedBox(0.38, 0.34, 0.13, 0.045), toon(color), x, 0.68, -0.2, false);
    p.rotation.set(-0.22, 0, tilt);
    parent.add(p);
    return p;
  };

  const { x: cx, z: cz, width } = APARTMENT_SOFA;
  const sofa = couch(g, cx, cz, width, '#9b381e', '#362016');
  sofa.name = 'apartment_sofa';
  for (const [name, offset, node, label] of [
    ['couch_left', -0.9, 'sofa_left', 'left'],
    ['couch_center', 0, 'sofa_center', 'middle'],
    ['couch_right', 0.9, 'sofa_right', 'right'],
  ] as const) {
    seats[name] = mark(cx + offset, cz + 0.1, 0, node, `the rust-orange sofa, ${label} cushion`, {
      seat: 0.45, approach: [cx + offset, cz + 0.75],
    });
  }
  // Dark wood fronts on the upholstered arms, plus the red throw over the middle of the back.
  for (const side of [-1, 1]) {
    sofa.add(mesh(roundedBox(0.13, 0.47, 0.04, 0.015), toon('#57321f'), side * 1.39, 0.38, 0.455));
    for (const dx of [-0.035, 0.035]) sofa.add(mesh(box(0.012, 0.43, 0.012), wood, side * 1.39 + dx, 0.38, 0.48, false));
  }
  const throwMat = toon('#ffffff', { map: stripes('#7e1923', '#a72c32', [5, 1]) });
  sofa.add(mesh(box(0.65, 0.46, 0.025), throwMat, 0.1, 0.71, -0.235, false));
  sofa.add(mesh(box(0.65, 0.025, 0.25), throwMat, 0.1, 0.956, -0.35, false));
  sofa.add(mesh(roundedBox(0.67, 0.025, 0.45, 0.01), throwMat, 0.1, 0.487, 0, false));
  pillow(sofa, -1.05, '#bd8728', 0.28);
  pillow(sofa, -0.79, '#708b95', -0.2);
  const patterned = pillow(sofa, 1.02, '#603c22', -0.22);
  patterned.add(mesh(box(0.24, 0.23, 0.012), toon('#cfaa46'), 0, 0, 0.067, false));
  patterned.add(mesh(box(0.13, 0.13, 0.014), toon('#ede1bf'), 0.015, 0.015, 0.076, false));

  // Red tub chair just forward of the sofa's right arm, mostly facing the audience.
  const red = seat('armchair', 2.0, -0.65, -0.25, 0.45, 'red_chair', 'red tub armchair beside the right end of the sofa');
  const redFabric = toon('#b21e2d');
  red.add(occluder(mesh(roundedBox(1.0, 0.28, 0.86, 0.09), redFabric, 0, 0.29, 0)));
  red.add(mesh(roundedBox(0.73, 0.14, 0.68, 0.06), toon('#bf2834'), 0, 0.4, 0.07));
  // Segmented horseshoe shell gives this its curved back rather than another square sofa.
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 10;
    const panel = mesh(roundedBox(0.2, 0.56, 0.2, 0.06), redFabric, Math.sin(a) * 0.44, 0.64, -Math.cos(a) * 0.35);
    panel.rotation.y = -a;
    red.add(occluder(panel));
  }
  for (const sx of [-1, 1]) {
    red.add(occluder(mesh(roundedBox(0.2, 0.45, 0.42, 0.07), redFabric, sx * 0.44, 0.58, 0.15)));
    for (const sz of [-1, 1]) red.add(mesh(cyl(0.025, 0.018, 0.16, 6), chrome, sx * 0.36, 0.08, sz * 0.3));
  }

  // Brown leather sling chair and its separate matching ottoman, on the fireplace side.
  const lounge = seat('leather_chair', -2.95, 0.05, 1.18, 0.43, 'lounge', 'brown leather lounge chair left of the coffee table, beside the piano');
  lounge.add(mesh(roundedBox(0.76, 0.13, 0.68, 0.05), leather, 0, 0.38, 0.02));
  const leatherBack = occluder(mesh(roundedBox(0.76, 0.84, 0.14, 0.06), leather, 0, 0.82, -0.35));
  leatherBack.rotation.x = -0.2;
  lounge.add(leatherBack);
  for (const sx of [-1, 1]) {
    rail(lounge, [sx * 0.43, 0.05, 0.33], [sx * 0.43, 1.18, -0.44], 0.025, chrome);
    rail(lounge, [sx * 0.43, 0.05, -0.36], [sx * 0.43, 0.58, 0.26], 0.025, chrome);
    lounge.add(mesh(roundedBox(0.1, 0.055, 0.6, 0.02), leather, sx * 0.43, 0.61, -0.01));
  }
  // Keep the approach beside the ottoman instead of walking through it.
  seats.leather_chair.approach!.set(-2.45, 0, 0.98);
  const ottoman = new THREE.Group();
  ottoman.name = 'leather_ottoman';
  ottoman.position.set(0, 0, 1.0);
  lounge.add(ottoman);
  ottoman.add(mesh(roundedBox(0.65, 0.13, 0.5, 0.05), leather, 0, 0.34, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ottoman.add(mesh(cyl(0.012, 0.012, 0.3, 5), chrome, sx * 0.28, 0.15, sz * 0.2));

  // Folding woven lounge chair downstage right, turned back toward the sofa.
  const woven = seat('woven_chair', 1.5, 1.4, -2.3, 0.4, 'woven', 'woven folding lounge chair at the front-right of the rug, facing the sofa');
  const rope = toon('#c9b889'), ropeShade = toon('#b5a477');
  for (const sx of [-1, 1]) {
    rail(woven, [sx * 0.42, 0.035, 0.43], [sx * 0.42, 1.02, -0.49], 0.065, wood);
    rail(woven, [sx * 0.42, 0.035, -0.43], [sx * 0.42, 0.45, 0.4], 0.065, wood);
  }
  const weave = (parent: THREE.Group, height: number) => {
    parent.add(occluder(mesh(box(0.75, height, 0.026), ropeShade)));
    for (let i = 0; i < 12; i++) parent.add(mesh(box(0.044, height, 0.034), rope, -0.346 + i * 0.063, 0, 0, false));
    for (let i = 0; i < Math.round(height / 0.055); i++) parent.add(mesh(box(0.75, 0.025, 0.044), ropeShade, 0, -height / 2 + 0.03 + i * 0.055, 0, false));
  };
  const wovenBack = new THREE.Group();
  wovenBack.position.set(0, 0.72, -0.34);
  wovenBack.rotation.x = -0.29;
  weave(wovenBack, 0.57);
  woven.add(wovenBack);
  const wovenSeat = new THREE.Group();
  wovenSeat.position.set(0, 0.38, 0.025);
  wovenSeat.rotation.x = -Math.PI / 2;
  weave(wovenSeat, 0.61);
  woven.add(wovenSeat);

  // Low wooden chair in the foreground: its striped back faces the audience.
  const striped = seat('striped_chair', -0.7, 2.05, Math.PI, 0.44, 'rug_front', 'striped wooden chair at the front of the rug, facing back toward the sofa');
  striped.add(mesh(box(0.78, 0.07, 0.66), wood, 0, 0.38, 0));
  striped.add(mesh(roundedBox(0.68, 0.08, 0.59, 0.025), toon('#b19a65'), 0, 0.43, 0.02));
  for (const sx of [-1, 1]) {
    rail(striped, [sx * 0.4, 0.02, 0.28], [sx * 0.4, 0.65, 0.28], 0.06, wood);
    rail(striped, [sx * 0.4, 0.02, -0.3], [sx * 0.4, 0.94, -0.38], 0.065, wood);
    striped.add(mesh(box(0.085, 0.06, 0.75), wood, sx * 0.4, 0.63, -0.025));
  }
  for (const y of [0.51, 0.91]) striped.add(mesh(box(0.86, 0.065, 0.065), wood, 0, y, -0.37));
  const colors = ['#8c693e', '#3c3024', '#a73923', '#d2bf8d', '#463629', '#a78551'];
  colors.forEach((color, i) => striped.add(occluder(mesh(box(0.12, 0.34, 0.055), toon(color), -0.3 + i * 0.12, 0.71, -0.37))));
  return seats;
}
