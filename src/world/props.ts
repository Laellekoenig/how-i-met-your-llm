import * as THREE from 'three';
import type { Prop } from '../script/types';
import { toon, glow, mesh, cyl, box, roundedBox } from '../engine/materials';
import { ellipsoid } from '../engine/shapes';

// Hand props, built procedurally like everything else. Each is modeled upright (+y up, +z away from the holder)
// with its grip at the origin; the actor turns it to fit the hand.

/**
 * How a prop is carried: `hand` held up in front in the right hand, `hang` dangling from it at the side,
 * `arms` cradled against the chest in both arms.
 */
export type Grip = 'hand' | 'hang' | 'arms';

export const GRIP: Record<Prop, Grip> = {
  phone: 'hand', ring: 'hand', envelope: 'hand', beer: 'hand', glass: 'hand', flowers: 'hand', book: 'hand',
  umbrella: 'hang', pineapple: 'hand', goat: 'arms', gift: 'arms', sword: 'hand', briefcase: 'hang',
  microphone: 'hand', french_horn: 'arms', sandwich: 'hand', laptop: 'arms', videotape: 'hand',
};

/** What the transcript calls it. */
export const PROP_NAME: Record<Prop, string> = {
  phone: 'a phone', ring: 'a ring box', envelope: 'an envelope', beer: 'a beer', glass: 'a scotch', flowers: 'flowers',
  book: 'a book', umbrella: 'a yellow umbrella', pineapple: 'a pineapple', goat: 'a goat', gift: 'a gift', sword: 'a sword',
  briefcase: 'a briefcase', microphone: 'a microphone', french_horn: 'a blue French horn', sandwich: 'a sandwich',
  laptop: 'a laptop', videotape: 'a videotape',
};

const part = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = mesh(geo, mat, x, y, z);
  parent.add(m);
  return m;
};

export function buildProp(kind: Prop): THREE.Group {
  const g = new THREE.Group();
  g.name = `prop:${kind}`;
  switch (kind) {
    case 'phone': {
      part(g, roundedBox(0.072, 0.145, 0.012, 0.006), toon('#1a1a1e'), 0, 0.05, 0);
      // the screen faces whoever is holding it, and lights up their face a little
      part(g, box(0.062, 0.128, 0.002), glow('#9fd0ff', 0.9), 0, 0.05, -0.007);
      break;
    }
    case 'ring': {
      const velvet = toon('#7a1a2a');
      part(g, roundedBox(0.06, 0.04, 0.06, 0.008), velvet, 0, 0.02, 0);
      const lid = part(g, roundedBox(0.06, 0.012, 0.06, 0.005), velvet, 0, 0.055, -0.026);
      lid.rotation.x = -1.2;
      const band = part(g, new THREE.TorusGeometry(0.014, 0.0035, 6, 14), toon('#e8c25a', { emissive: '#5a3a08', emissiveIntensity: 0.6 }), 0, 0.052, 0.004);
      band.rotation.x = 0.2;
      part(g, new THREE.OctahedronGeometry(0.008), glow('#ffffff', 1.4), 0, 0.068, 0.004);
      break;
    }
    case 'envelope': {
      part(g, box(0.16, 0.1, 0.004), toon('#efe6d0'), 0, 0.05, 0);
      // the flap: a darker triangle on the back
      const flap = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.08, 0.1, 0), new THREE.Vector3(0.08, 0.1, 0), new THREE.Vector3(0, 0.045, 0)]);
      flap.computeVertexNormals();
      part(g, flap, toon('#cfc2a2', { side: THREE.DoubleSide }), 0, 0, -0.0025);
      part(g, new THREE.CircleGeometry(0.009, 10), toon('#9a1c22', { side: THREE.DoubleSide }), 0, 0.048, -0.003);
      break;
    }
    case 'beer': {
      const brown = toon('#4a2a10', { emissive: '#2a1204', emissiveIntensity: 0.4 });
      part(g, cyl(0.03, 0.03, 0.15, 10), brown, 0, 0.04, 0);
      part(g, cyl(0.012, 0.028, 0.05, 10), brown, 0, 0.14, 0);
      part(g, cyl(0.012, 0.012, 0.03, 8), brown, 0, 0.18, 0);
      part(g, cyl(0.031, 0.031, 0.05, 10), toon('#e8d48a'), 0, 0.03, 0);
      break;
    }
    case 'glass': {
      // A hollow tumbler: the lip touches the mouth, with the drink below the rim.
      const wall = new THREE.LatheGeometry([
        new THREE.Vector2(0, -0.032), new THREE.Vector2(0.031, -0.032),
        new THREE.Vector2(0.038, 0.09), new THREE.Vector2(0.033, 0.09),
        new THREE.Vector2(0.026, -0.025), new THREE.Vector2(0, -0.025),
      ], 16);
      const glass = toon('#dbe9e9', { side: THREE.DoubleSide }).clone();
      glass.transparent = true; glass.opacity = 0.32; glass.depthWrite = false;
      part(g, wall, glass);
      part(g, cyl(0.031, 0.027, 0.065, 16), toon('#c77d24', { emissive: '#5a3008', emissiveIntensity: 0.35 }), 0, 0.009, 0);
      const rim = part(g, new THREE.TorusGeometry(0.0355, 0.0025, 6, 16), toon('#dbe9e9'), 0, 0.09, 0);
      rim.rotation.x = Math.PI / 2;
      break;
    }
    case 'flowers': {
      part(g, cyl(0.06, 0.012, 0.2, 8), toon('#f2efe6', { side: THREE.DoubleSide }), 0, 0.04, 0);
      const colors = ['#d0283a', '#f08aa8', '#f2c840', '#d0283a', '#f4f0f2', '#e05a7a', '#d0283a'];
      colors.forEach((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.04;
        part(g, ellipsoid(0.026, 0.022, 0.026, 8, 6), toon(c), Math.cos(a) * r, 0.16 + (i ? 0 : 0.02), Math.sin(a) * r);
      });
      for (const a of [0.6, 2.4, 4.2]) {
        const leaf = part(g, ellipsoid(0.012, 0.045, 0.02, 6, 4), toon('#3a7a34'), Math.cos(a) * 0.05, 0.13, Math.sin(a) * 0.05);
        leaf.rotation.z = Math.cos(a) * 0.6;
      }
      break;
    }
    case 'book': {
      part(g, roundedBox(0.035, 0.22, 0.16, 0.004), toon('#2a1414'), 0, 0.09, 0.02);
      part(g, box(0.028, 0.21, 0.154), toon('#efe6d0'), 0.004, 0.09, 0.02);
      part(g, box(0.002, 0.04, 0.1), toon('#d4a83a', { emissive: '#3a2a08', emissiveIntensity: 0.5 }), -0.018, 0.13, 0.02);
      break;
    }
    case 'umbrella': {
      // a closed yellow umbrella, carried by its hooked handle
      const handle = part(g, new THREE.TorusGeometry(0.035, 0.009, 6, 10, Math.PI), toon('#3a2414'), 0.035, -0.01, 0);
      handle.rotation.z = Math.PI;
      part(g, cyl(0.006, 0.006, 0.8, 5), toon('#3a3a3a'), 0, -0.4, 0);
      part(g, cyl(0.045, 0.008, 0.62, 8), toon('#f2c418'), 0, -0.42, 0);
      part(g, cyl(0.01, 0.004, 0.06, 5), toon('#3a3a3a'), 0, -0.82, 0);
      break;
    }
    case 'pineapple': {
      part(g, ellipsoid(0.065, 0.095, 0.065, 10, 8), toon('#c4902a'), 0, 0.06, 0);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leaf = part(g, cyl(0.001, 0.016, 0.12, 4), toon('#3a7a2a'), Math.cos(a) * 0.012, 0.19, Math.sin(a) * 0.012);
        leaf.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      }
      break;
    }
    case 'goat': {
      // a small, unbothered goat, lying across the holder's arms (its head on their left)
      const coat = toon('#e8e2d4'), dark = toon('#3a3430'), horn = toon('#b8a888');
      part(g, ellipsoid(0.24, 0.13, 0.12, 12, 8), coat, 0, 0, 0);
      const neck = part(g, ellipsoid(0.06, 0.1, 0.06, 8, 6), coat, 0.2, 0.08, 0.02);
      neck.rotation.z = -0.6;
      const head = new THREE.Group();
      head.position.set(0.28, 0.16, 0.04);
      g.add(head);
      part(head, ellipsoid(0.09, 0.055, 0.05, 10, 6), coat, 0.02, 0, 0);
      part(head, ellipsoid(0.03, 0.02, 0.035, 6, 4), toon('#c4b8a8'), 0.1, -0.012, 0);
      for (const z of [0.035, -0.035]) {
        part(head, ellipsoid(0.008, 0.008, 0.006, 6, 4), dark, 0.06, 0.02, z + Math.sign(z) * 0.012);
        const h = part(head, cyl(0.003, 0.012, 0.07, 5), horn, -0.02, 0.06, z * 0.7);
        h.rotation.z = 0.5;
        const ear = part(head, ellipsoid(0.035, 0.01, 0.018, 6, 4), coat, -0.03, 0.02, z * 1.5);
        ear.rotation.y = Math.sign(z) * 0.5;
      }
      part(head, cyl(0.002, 0.012, 0.05, 5), toon('#d8d0c0'), 0.08, -0.05, 0);
      for (const [x, z] of [[0.14, 0.06], [0.14, -0.06], [-0.14, 0.06], [-0.14, -0.06]]) part(g, cyl(0.016, 0.012, 0.22, 6), coat, x, -0.15, z);
      for (const [x, z] of [[0.14, 0.06], [0.14, -0.06], [-0.14, 0.06], [-0.14, -0.06]]) part(g, cyl(0.014, 0.014, 0.03, 6), dark, x, -0.27, z);
      const tail = part(g, ellipsoid(0.03, 0.012, 0.012, 6, 4), coat, -0.25, 0.06, 0);
      tail.rotation.z = 0.8;
      break;
    }
    case 'gift': {
      const ribbon = toon('#e8c040', { emissive: '#3a2a08', emissiveIntensity: 0.4 });
      part(g, roundedBox(0.26, 0.2, 0.22, 0.01), toon('#b82a3a'), 0, 0, 0);
      part(g, box(0.27, 0.205, 0.035), ribbon, 0, 0, 0);
      part(g, box(0.035, 0.205, 0.23), ribbon, 0, 0, 0);
      for (const s of [1, -1]) {
        const loop = part(g, ellipsoid(0.05, 0.03, 0.02, 8, 6), ribbon, s * 0.04, 0.12, 0);
        loop.rotation.z = s * 0.5;
      }
      break;
    }
    case 'sword': {
      const steel = toon('#d4d8e0', { emissive: '#3a3e48', emissiveIntensity: 0.4 });
      part(g, cyl(0.014, 0.014, 0.13, 6), toon('#3a2414'), 0, 0, 0);
      part(g, box(0.15, 0.02, 0.025), toon('#c8a040'), 0, 0.075, 0);
      part(g, box(0.035, 0.62, 0.006), steel, 0, 0.395, 0);
      part(g, new THREE.ConeGeometry(0.0175, 0.05, 4), steel, 0, 0.73, 0);
      part(g, ellipsoid(0.018, 0.018, 0.018, 6, 4), toon('#c8a040'), 0, -0.07, 0);
      break;
    }
    case 'briefcase': {
      const leather = toon('#4a2c18');
      part(g, roundedBox(0.4, 0.3, 0.09, 0.015), leather, 0, -0.19, 0);
      const handle = part(g, new THREE.TorusGeometry(0.04, 0.008, 5, 10, Math.PI), toon('#2a1a10'), 0, -0.04, 0);
      handle.rotation.z = 0;
      for (const x of [-0.12, 0.12]) part(g, box(0.035, 0.02, 0.095), toon('#c8a040'), x, -0.07, 0);
      break;
    }
    case 'microphone': {
      part(g, cyl(0.016, 0.012, 0.16, 8), toon('#1c1c20'), 0, 0.04, 0);
      part(g, ellipsoid(0.03, 0.032, 0.03, 10, 8), toon('#9a9ca4', { emissive: '#2a2a30', emissiveIntensity: 0.4 }), 0, 0.14, 0);
      break;
    }
    case 'french_horn': {
      // the blue French horn: two coils, a flaring bell and a little mouthpiece
      const blue = toon('#2a5ac8', { emissive: '#0a1a4a', emissiveIntensity: 0.5 });
      const coil = part(g, new THREE.TorusGeometry(0.13, 0.018, 6, 20), blue, 0, 0, 0);
      coil.rotation.x = 0.1;
      part(g, new THREE.TorusGeometry(0.09, 0.012, 6, 16), blue, 0, 0, 0.03);
      const bell = part(g, new THREE.CylinderGeometry(0.11, 0.025, 0.18, 12, 1, true), toon('#2a5ac8', { side: THREE.DoubleSide }), 0.16, 0.1, 0.02);
      bell.rotation.z = -0.9;
      part(g, cyl(0.008, 0.012, 0.08, 6), toon('#c8a040'), -0.13, 0.08, 0);
      break;
    }
    case 'sandwich': {
      // a deli sandwich, cut on the diagonal: two slices of bread, lettuce, tomato and a toothpick
      const bread = toon('#e2b878'), crust = toon('#a8743a');
      for (const y of [0.02, 0.085]) {
        part(g, roundedBox(0.12, 0.022, 0.1, 0.008), bread, 0, y, 0);
        part(g, box(0.124, 0.006, 0.104), crust, 0, y + (y < 0.05 ? -0.012 : 0.012), 0);
      }
      part(g, box(0.13, 0.012, 0.106), toon('#5aa040'), 0, 0.042, 0);
      part(g, box(0.11, 0.01, 0.09), toon('#d0443a'), 0, 0.054, 0);
      part(g, box(0.112, 0.012, 0.092), toon('#f0c8b8'), 0, 0.066, 0);
      part(g, cyl(0.0025, 0.0025, 0.12, 4), toon('#e8d8a8'), 0.02, 0.1, 0.01);
      break;
    }
    case 'laptop': {
      // open, held out level on both palms the way you'd read it: the hinge away from the holder, the lid tipped
      // back so the screen faces them, and the lit logo on its back to everyone else
      const shell = toon('#9aa0a8', { emissive: '#2a2e34', emissiveIntensity: 0.3 });
      part(g, roundedBox(0.34, 0.016, 0.24, 0.006), shell, 0, 0, 0.09);
      part(g, box(0.3, 0.003, 0.11), toon('#2a2c30'), 0, 0.009, 0.13);
      part(g, box(0.1, 0.002, 0.06), toon('#82878e'), 0, 0.009, 0.03);
      const lid = new THREE.Group();
      lid.position.set(0, 0.008, 0.205);
      lid.rotation.x = 0.3;
      g.add(lid);
      part(lid, roundedBox(0.34, 0.22, 0.012, 0.006), shell, 0, 0.11, 0);
      part(lid, box(0.31, 0.19, 0.002), glow('#9fd0ff', 0.8), 0, 0.11, -0.007);
      part(lid, new THREE.CircleGeometry(0.018, 14), glow('#e8f2ff', 0.9), 0, 0.12, 0.0065);
      break;
    }
    case 'videotape': {
      // a VHS cassette with a hand-written label
      part(g, roundedBox(0.19, 0.105, 0.026, 0.004), toon('#1a1a1e'), 0, 0.05, 0);
      part(g, box(0.12, 0.05, 0.002), toon('#f2ead2'), 0, 0.06, 0.014);
      part(g, box(0.1, 0.004, 0.002), toon('#c8302a'), 0, 0.07, 0.0155);
      for (const x of [-0.045, 0.045]) part(g, cyl(0.016, 0.016, 0.004, 10), toon('#5a5a5e'), x, 0.05, -0.014).rotation.x = Math.PI / 2;
      break;
    }
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}
