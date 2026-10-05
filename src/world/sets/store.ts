import * as THREE from 'three';
import { box, cyl, glow, mesh, occluder, roundedBox, toon } from '../../engine/materials';
import { checker, clockFace, drinksCooler, magazineRack, sign, stripes, street } from '../../engine/textures';
import { band, door, keyLight, mark, nodes, room, type StageSet, v3, window_ } from './common';
import { label } from './furnishings';

/**
 * A small neighborhood shop: checkout, stocked shelves, a sale island, street windows. Behind the
 * counter, a wall of small packaged goods; along the left wall, a humming drinks fridge and the
 * newsstand. Produce sits under a striped awning on the right, with flower buckets and cases of
 * water by the front.
 */
export function buildStore(): StageSet {
  const g = new THREE.Group(); g.name = 'store';
  const cream = toon('#eee4c9'), green = toon('#466a56'), wood = toon('#aa7749');
  room(g, { w: 12, d: 8, h: 3.2, floor: toon('#ffffff', { map: checker('#c6bfa9', '#888f82', [12, 10]) }), back: cream, ceiling: '#e6ddc8' });
  const day = toon('#ffffff', { map: street(false, 118), emissive: '#ffffff', emissiveIntensity: 0.3 });
  const night = toon('#ffffff', { map: street(true, 118), emissive: '#ffffff', emissiveIntensity: 0.5 });
  const panes = [-4.8, -2.95].map((x) => window_(g, x, 1.7, -3.94, 1.55, 1.7, day, '#42624d', 0, 1));
  const entrance = door(g, -0.9, -3.95, 0, '#42624d', { glass: day });
  entrance.traverse((o) => { if (o instanceof THREE.Mesh && o.material === day) panes.push(o); });
  label(g, 'NEIGHBORHOOD GOODS', -3.8, 2.86, -3.84, 3.95, 0.38);
  label(g, 'OPEN', -2.95, 1.5, -3.82, 0.66, 0.3, '#f7d490', '#874532');

  // The back wall shelves leave the doorway and checkout aisle clear.
  const colors = ['#c65341', '#e9bd50', '#608a7a', '#5e7fa2', '#e2d3a4'];
  const shelf = (x: number, z: number, w: number, height: number, rows: number) => {
    g.add(occluder(mesh(box(w, height, 0.14), green, x, height / 2, z - 0.22)));
    for (let row = 0; row < rows; row++) {
      const y = 0.22 + row * 0.51;
      g.add(mesh(box(w + 0.08, 0.065, 0.62), cream, x, y, z, false));
      const count = Math.floor(w / 0.29);
      for (let i = 0; i < count; i++) {
        const px = x - w / 2 + 0.18 + i * 0.29;
        const h = 0.24 + (i % 3) * 0.055;
        g.add(mesh(box(0.2, h, 0.23), toon(colors[(i + row) % colors.length]), px, y + h / 2 + 0.04, z, false));
        g.add(mesh(box(0.13, 0.07, 0.005), cream, px, y + 0.17, z + 0.12, false));
      }
      g.add(mesh(box(w, 0.05, 0.01), toon('#e4bd65'), x, y - 0.01, z + 0.32, false));
    }
  };
  shelf(2.55, -3.55, 4.5, 2.38, 4);
  label(g, 'PANTRY  /  EVERYDAY ESSENTIALS', 2.55, 2.72, -3.43, 4.6, 0.28);
  // A low aisle island: sightlines remain open above the merchandise.
  shelf(2.7, 0.25, 2.3, 1.05, 2);
  label(g, 'SPECIALS', 2.7, 1.36, 0.0, 1.8, 0.26, '#fff1cf', '#a43f30');

  // Checkout faces the open floor; customers queue to its right.
  g.add(occluder(mesh(box(2.0, 0.9, 0.9), wood, -3.9, 0.45, -0.6)));
  g.add(occluder(mesh(box(2.1, 0.07, 1.0), toon('#39443d'), -3.9, 0.94, -0.6)));
  g.add(mesh(box(0.43, 0.13, 0.32), toon('#323838'), -3.75, 1.04, -0.65, false));
  g.add(mesh(box(0.36, 0.28, 0.05), toon('#323838'), -3.75, 1.24, -0.76, false));
  label(g, '8.99', -3.75, 1.24, -0.728, 0.28, 0.14, '#9ae6a7', '#203129');
  label(g, 'CHECKOUT', -3.9, 0.57, -0.138, 1.6, 0.23);
  // Paper shopping bags and baskets.
  for (const x of [-4.5, -4.15]) {
    g.add(mesh(box(0.24, 0.33, 0.2), toon('#cba46f'), x, 1.14, -0.48, false));
    g.add(mesh(new THREE.TorusGeometry(0.065, 0.008, 4, 8), toon('#7d5e3b'), x, 1.33, -0.48, false));
  }
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.5, 0.12, 0.36), toon('#9e493c'), -1.75, 0.15 + i * 0.075, -3.15, false));
  // Produce bins along the right wall.
  for (let i = 0; i < 3; i++) {
    const z = -2.45 + i * 0.9;
    g.add(mesh(box(0.75, 0.7, 0.76), wood, 5.15, 0.35, z));
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.12, 0), toon(['#b84d33', '#799846', '#db9b37'][i]), 4.93 + (k % 3) * 0.21, 0.78, z - 0.17 + Math.floor(k / 3) * 0.31, false));
  }
  for (const x of [-3, 0, 3]) g.add(mesh(box(1.35, 0.05, 0.55), toon('#ffffe8', { emissive: '#fff2cd', emissiveIntensity: 0.7 }), x, 3.15, -0.9, false));
  // A small bell over the door.
  g.add(mesh(cyl(0.025, 0.08, 0.09), toon('#c7a153'), -0.9, 2.35, -3.77, false));
  // Baseboards and a green dado rail, so the walls read as a shop and not a gallery.
  const trim = toon('#2f4a3b');
  band(g, trim, 0, -3.97, 12, 0.14);
  for (const x of [-5.97, 5.97]) band(g, trim, x, 1, 10, 0.14, Math.PI / 2);
  for (const x of [-5.96, 5.96]) g.add(mesh(box(0.04, 0.05, 10), trim, x, 1.05, 1, false));

  // ---- left wall: the cigarette-style wall of small goods behind the counter -------------------------
  g.add(occluder(mesh(box(0.36, 2.1, 1.9), toon('#5a3e2a'), -5.82, 1.05, -2.6)));
  const packs = ['#d8d4c8', '#c83a2a', '#2a4a8a', '#e8c040', '#3a7a4a', '#f0f0ea', '#8a2a4a'];
  for (let row = 0; row < 5; row++) {
    const y = 0.95 + row * 0.22;
    g.add(mesh(box(0.06, 0.025, 1.8), toon('#d8c6a0'), -5.62, y - 0.02, -2.6, false));
    for (let i = 0; i < 9; i++) g.add(mesh(box(0.08, 0.15, 0.16), toon(packs[(i * 3 + row * 2) % packs.length]), -5.66, y + 0.075, -3.38 + i * 0.195, false));
  }
  // cabinet doors below, and a lit sign on top
  for (const z of [-3.1, -2.1]) {
    g.add(mesh(box(0.02, 0.62, 0.86), toon('#6e4c33'), -5.63, 0.4, z, false));
    g.add(mesh(box(0.02, 0.05, 0.2), toon('#c7a153'), -5.615, 0.62, z + 0.3, false));
  }
  const lotto = label(g, 'LOTTO  ·  PHONE CARDS', -5.63, 2.28, -2.6, 1.8, 0.24, '#fff1cf', '#a43f30');
  lotto.rotation.y = Math.PI / 2;

  // ---- left wall: the drinks fridge and the newsstand ---------------------------------------------
  const COOL_Z = 2.0;
  g.add(occluder(mesh(roundedBox(0.72, 2.3, 2.5, 0.03), toon('#3a3e42'), -5.64, 1.15, COOL_Z)));
  const coolerGlass = mesh(new THREE.PlaneGeometry(2.3, 1.75), toon('#ffffff', { map: drinksCooler(3, 97), emissive: '#ffffff', emissiveIntensity: 0.55 }), -5.275, 1.1, COOL_Z, false);
  coolerGlass.rotation.y = Math.PI / 2;
  g.add(coolerGlass);
  const coolSign = mesh(new THREE.PlaneGeometry(2.3, 0.3), new THREE.MeshBasicMaterial({ map: sign('ICE COLD DRINKS', '#ffffff', '#2a6ab8', 256, 32, 'bold 22px Helvetica') }), -5.27, 2.12, COOL_Z, false);
  coolSign.rotation.y = Math.PI / 2;
  g.add(coolSign);
  g.add(mesh(box(0.06, 0.12, 2.4), toon('#24282c'), -5.29, 0.12, COOL_Z, false)); // kick plate vent
  const coolLight = new THREE.PointLight('#d4f0ff', 1.2, 3.2, 1.6);
  coolLight.position.set(-4.9, 1.3, COOL_Z);
  g.add(coolLight);
  // the newsstand rack, angled into the corner by the checkout
  const rack = new THREE.Group();
  rack.position.set(-5.55, 0, 0.0);
  rack.rotation.y = Math.PI / 2 - 0.25;
  rack.add(occluder(mesh(box(1.0, 1.2, 0.3), toon('#4a4a4c'), 0, 0.6, 0)));
  const covers = mesh(new THREE.PlaneGeometry(0.95, 0.8), toon('#ffffff', { map: magazineRack(101) }), 0, 0.82, 0.16, false);
  covers.rotation.x = -0.18;
  rack.add(covers);
  rack.add(mesh(box(0.95, 0.18, 0.1), toon('#e8e4d8'), 0, 0.3, 0.17, false)); // folded papers
  for (let i = 0; i < 5; i++) rack.add(mesh(box(0.15, 0.005, 0.08), toon('#3a3a3a'), -0.38 + i * 0.19, 0.39, 0.2, false));
  g.add(rack);

  // ---- the counter: register, card reader, a candy rack, a conveyor belt --------------------------
  g.add(mesh(box(0.55, 0.012, 0.42), toon('#1e2220'), -3.15, 0.982, -0.55, false));
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.01, 0.014, 0.42), toon('#3e4440'), -3.4 + i * 0.16, 0.984, -0.55, false));
  g.add(mesh(box(0.08, 0.14, 0.06), toon('#1a1a1c'), -3.42, 1.05, -0.3, false)); // card reader
  g.add(mesh(box(0.06, 0.03, 0.005), toon('#3aa05a', { emissive: '#3aa05a', emissiveIntensity: 0.8 }), -3.42, 1.09, -0.268, false));
  for (let t = 0; t < 3; t++) {
    const y = 0.99 + t * 0.07, z = -0.22 - t * 0.08;
    g.add(mesh(box(0.42, 0.05, 0.08), toon('#c7a153'), -2.95 - 0.22, y + 0.025, z, false));
    for (let i = 0; i < 5; i++) g.add(mesh(box(0.065, 0.06, 0.05), toon(colors[(i + t) % colors.length]), -3.33 + i * 0.08, y + 0.08, z, false));
  }
  g.add(mesh(cyl(0.05, 0.045, 0.13, 8), toon('#cfe2e0'), -4.05, 1.04, -0.25, false)); // tip jar
  g.add(mesh(cyl(0.035, 0.035, 0.02, 8), toon('#c7a153'), -4.3, 0.985, -0.22, false)); // service bell
  g.add(mesh(new THREE.SphereGeometry(0.03, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), toon('#c7a153'), -4.3, 0.995, -0.22, false));
  // a gumball machine at the end of the counter
  g.add(mesh(cyl(0.025, 0.06, 0.82, 6), toon('#a43f30'), -2.6, 0.41, -0.35, false));
  g.add(mesh(box(0.2, 0.14, 0.2), toon('#a43f30'), -2.6, 0.89, -0.35, false));
  g.add(mesh(new THREE.SphereGeometry(0.14, 8, 6), toon('#e8f2f0', { emissive: '#ffffff', emissiveIntensity: 0.15 }), -2.6, 1.08, -0.35, false));
  for (let i = 0; i < 7; i++) g.add(mesh(new THREE.SphereGeometry(0.03, 4, 3), toon(colors[i % colors.length]), -2.6 + Math.cos(i * 1.7) * 0.07, 1.02 + (i % 3) * 0.04, -0.35 + Math.sin(i * 1.7) * 0.07, false));

  // ---- the right wall: an awning over the produce, crates of water, flower buckets ----------------
  const awning = mesh(box(0.7, 0.03, 2.9), toon('#ffffff', { map: stripes('#c65341', '#f3e8cf', [1, 6], false) }), 5.64, 2.2, -1.55, false);
  awning.rotation.z = 0.38;
  g.add(awning);
  for (let i = 0; i < 12; i++) g.add(mesh(box(0.02, 0.09, 0.2), toon(i % 2 ? '#f3e8cf' : '#c65341'), 5.31, 2.02, -2.92 + i * 0.25, false));
  const produceSign = label(g, 'FRESH PRODUCE', 5.97, 2.72, -1.55, 2.2, 0.32, '#fff1cf', '#466a56');
  produceSign.rotation.y = -Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const tag = mesh(new THREE.PlaneGeometry(0.26, 0.14), new THREE.MeshBasicMaterial({ map: sign(['.99/lb', '2 FOR 3', '1.49'][i], '#1e2a26', '#f8f2dc', 64, 32, 'bold 16px Helvetica') }), 4.76, 0.5, -2.45 + i * 0.9, false);
    tag.rotation.y = -Math.PI / 2;
    g.add(tag);
  }
  for (const [z, n] of [[0.55, 3], [1.2, 2]] as const) for (let k = 0; k < n; k++) {
    g.add(mesh(box(0.58, 0.32, 0.58), toon('#d6e4ec'), 5.55, 0.16 + k * 0.33, z));
    g.add(mesh(box(0.6, 0.06, 0.6), toon('#2a6ab8'), 5.55, 0.2 + k * 0.33, z, false));
  }
  // a stepped stand of flower buckets
  g.add(mesh(box(0.7, 0.3, 0.9), toon('#5a4030'), 5.55, 0.15, 2.3));
  g.add(mesh(box(0.35, 0.3, 0.9), toon('#5a4030'), 5.72, 0.45, 2.3));
  const blooms = ['#e85a7a', '#f2d24a', '#f4f0e8', '#c84a9a', '#f08a3a', '#e84a3a'];
  for (let i = 0; i < 6; i++) {
    const x = i < 3 ? 5.35 : 5.72, y = i < 3 ? 0.3 : 0.6, z = 2.0 + (i % 3) * 0.3;
    g.add(mesh(cyl(0.11, 0.09, 0.24, 8), toon('#8e9aa0'), x, y + 0.12, z, false));
    for (let k = 0; k < 4; k++) g.add(mesh(new THREE.IcosahedronGeometry(0.06, 0), toon(blooms[(i + k) % blooms.length]), x + Math.cos(k * 1.6) * 0.06, y + 0.42 + (k % 2) * 0.05, z + Math.sin(k * 1.6) * 0.06, false));
    g.add(mesh(box(0.14, 0.2, 0.14), toon('#4a7a3a'), x, y + 0.32, z, false));
  }

  // ---- back wall extras: clock, window flyers, a cart, a doormat ------------------------------------
  g.add(mesh(cyl(0.22, 0.22, 0.04, 14).rotateX(Math.PI / 2), toon('#2f4a3b'), 0.0, 2.72, -3.96, false));
  g.add(mesh(new THREE.CircleGeometry(0.19, 14), toon('#ffffff', { map: clockFace() }), 0.0, 2.72, -3.935, false));
  for (const [x, y, text, fg, bg] of [[-5.25, 1.25, 'MILK 2.49', '#203129', '#f8f2dc'], [-4.35, 1.3, 'SALE!', '#ffffff', '#c65341'], [-2.45, 1.12, 'WE DELIVER', '#203129', '#f7d490']] as const)
    label(g, text, x, y, -3.86, 0.5, 0.32, fg, bg, 'bold 40px Helvetica');
  // shopping cart parked under the window
  const cart = new THREE.Group();
  cart.position.set(-2.95, 0, -3.35);
  cart.rotation.y = 0.12;
  const wire = toon('#aab0b4');
  cart.add(mesh(box(0.55, 0.36, 0.02), wire, 0, 0.72, 0.4, false));
  cart.add(mesh(box(0.5, 0.36, 0.02), wire, 0, 0.72, -0.35, false));
  for (const s of [-1, 1]) cart.add(mesh(box(0.02, 0.36, 0.75), wire, s * 0.27, 0.72, 0.02, false));
  cart.add(mesh(box(0.55, 0.02, 0.75), wire, 0, 0.55, 0.02, false));
  cart.add(mesh(box(0.6, 0.04, 0.04), toon('#a43f30'), 0, 1.0, 0.45, false)); // handle
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cart.add(mesh(box(0.02, 0.5, 0.02), wire, sx * 0.24, 0.3, sz * 0.32, false));
    cart.add(mesh(cyl(0.05, 0.05, 0.03, 8).rotateZ(Math.PI / 2), toon('#1a1a1a'), sx * 0.24, 0.05, sz * 0.32, false));
  }
  g.add(cart);
  const mat = mesh(new THREE.PlaneGeometry(1.2, 0.7), toon('#3a3430'), -0.9, 0.006, -3.4, false);
  mat.rotation.x = -Math.PI / 2;
  g.add(mat);
  // the security mirror in the far corner
  g.add(mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2 + 0.6).rotateY(-Math.PI / 4), toon('#9aa6ae'), 5.72, 2.85, -3.72, false));
  g.add(mesh(box(0.05, 0.05, 0.4).rotateY(-Math.PI / 4), toon('#3a3a3a'), 5.86, 2.95, -3.86, false));
  // a yellow wet-floor sign, because someone always slips
  const wet = new THREE.Group();
  wet.position.set(1.0, 0, -1.25);
  wet.rotation.y = -0.5;
  for (const s of [-1, 1]) {
    const leaf = mesh(box(0.3, 0.62, 0.015), toon('#f2c230'), 0, 0.3, s * 0.09, false);
    leaf.rotation.x = s * 0.28;
    wet.add(leaf);
  }
  const wetText = mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: sign('CAUTION', '#1a1a1a', '#f2c230', 64, 32, 'bold 14px Helvetica') }), 0, 0.38, 0.19, false);
  wetText.rotation.x = -0.28;
  wet.add(wetText);
  g.add(wet);
  // glowing OPEN sign tube at night
  const neon = mesh(box(0.72, 0.36, 0.02), glow('#ff6a4a', 1.2), -2.95, 1.5, -3.86, false);
  g.add(neon);

  const hemi = new THREE.HemisphereLight('#fff3d7', '#51604a', 1.9); g.add(hemi);
  keyLight(g, '#ffefcf', 2.1, [-3, 6, 5], [0, 0, -1]);
  return {
    id: 'store', name: 'The Store', group: g,
    nodes: nodes({ door: [-0.9, -3.25], back: [0, -2.5], shelves: [2.7, -2.4], right: [4.4, -1.1], island_end: [4.4, 1.5], center: [0, 0.5], front: [2.8, 1.5], checkout: [-2.3, 0.6], cooler: [-4.3, 1.9], clerk: [-3.9, -1.7], clerk_aisle: [-1, -1.7] }),
    edges: [['door', 'back'], ['back', 'shelves'], ['shelves', 'right'], ['right', 'island_end'], ['island_end', 'front'], ['front', 'center'], ['center', 'back'], ['center', 'checkout'], ['checkout', 'door'], ['checkout', 'cooler'], ['door', 'clerk_aisle'], ['clerk_aisle', 'clerk']],
    door: 'door', reserved: ['cashier'],
    marks: {
      cashier: mark(-3.9, -1.5, 0, 'clerk', 'behind the checkout counter; shopkeeper'),
      checkout: mark(-3.75, 0.45, Math.PI - 0.3, 'checkout', 'paying at the checkout'),
      queue: mark(-2.3, 0.65, -0.65, 'checkout', 'waiting in line beside the checkout'),
      shelves: mark(2.4, -2.5, -0.4, 'shelves', 'browsing the back-wall shelves'),
      produce: mark(4.2, -1.35, 0.6, 'right', 'beside the fresh produce bins'),
      display: mark(2.7, 1.5, 0.3, 'front', 'at the sale display in the middle aisle'),
      drinks: mark(-4.7, 2.0, 0.65, 'cooler', 'by the glowing drinks fridge on the left wall'),
      center: mark(0, 0.5, 0, 'center', 'open shop aisle'),
      door: mark(-0.9, -3.5, 0, 'door', 'shop entrance with the doorbell'),
    },
    wides: [
      { pos: v3(0, 2.6, 8.7), target: v3(0, 1.25, -1.6), fov: 49 },
      { pos: v3(-0.4, 1.85, 4.1), target: v3(-3.4, 1.2, -0.8), fov: 48 },
      { pos: v3(0, 1.9, 4.8), target: v3(3.1, 1.25, -1.6), fov: 48 },
    ],
    ambience: 'city', background: [], doorSound: 'bell',
    setTime(t) { for (const p of panes) p.material = t === 'day' ? day : night; hemi.intensity = t === 'day' ? 1.9 : 1.45; },
  };
}
