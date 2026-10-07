import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { facade, planks, riverWater, skyGradient } from '../../engine/textures';
import { label } from './furnishings';

/** Period Atlantic City geography: ocean, boardwalk and Taj Mahal-era casino domes.
 * A new establishing composition, not a claim to reproduce a particular episode frame. */
export function buildAtlanticCityExterior(dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh) {
  const g = new THREE.Group();
  g.name = 'exterior_atlantic_city';
  const cream = toon('#cdbb96');
  const gold = toon('#bd9650');
  const sky = dn(
    mesh(new THREE.SphereGeometry(280, 32, 16), toon('#ffffff'), 0, 0, 0, false),
    new THREE.MeshBasicMaterial({ map: skyGradient(false, 1978), side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: skyGradient(true, 1978), side: THREE.BackSide }),
  );
  g.add(sky);
  const dayWater = riverWater(false);
  const nightWater = riverWater(true);
  const water = dn(
    mesh(new THREE.PlaneGeometry(200, 160), toon('#ffffff'), 0, -0.35, 70, false).rotateX(-Math.PI / 2),
    toon('#ffffff', { map: dayWater }),
    toon('#ffffff', { map: nightWater, emissive: '#6a789d', emissiveIntensity: 0.4 }),
  );
  g.add(water);
  g.add(mesh(box(160, 0.2, 100), toon('#bfae81'), 0, -0.18, -32));
  g.add(mesh(box(160, 0.03, 82), toon('#8f9089'), 0, -0.055, -36));
  g.add(mesh(box(145, 0.22, 6), toon('#ffffff', { map: planks('#998361', [36, 2]) }), 0, 0.06, 8));
  // Continuous boardwalk railing and period globe lamps.
  for (let x = -55; x <= 55; x += 2) {
    g.add(mesh(cyl(0.035, 0.035, 0.85, 6), toon('#707d74'), x, 0.52, 11));
  }
  for (const y of [0.35, 0.94]) g.add(mesh(box(115, 0.045, 0.045), toon('#849088'), 0, y, 11));
  for (let x = -45; x < 50; x += 7) {
    g.add(mesh(cyl(0.055, 0.075, 3.5, 8), toon('#59645d'), x, 1.75, 9.7));
    for (const dx of [-0.3, 0.3])
      g.add(
        dn(mesh(new THREE.SphereGeometry(0.16, 8, 6), toon('#f1e1b9'), x + dx, 3.45, 9.7, false), toon('#d1c7a7'), glow('#ffd694', 1.1)),
      );
  }
  // A broad pale tower with vertical fins behind the casino's onion-domed frontage.
  for (const [x, z, w, h, color] of [
    [7, -16, 16, 30, '#d2c8ad'],
    [-17, -21, 11, 20, '#939999'],
    [30, -24, 13, 24, '#bbafa0'],
    [-35, -27, 12, 15, '#827a72'],
  ] as const) {
    const day = toon('#ffffff', { map: facade(false, color, Math.abs(x), Math.round(w), Math.round(h / 1.1)) });
    const night = toon('#ffffff', {
      map: facade(true, color, Math.abs(x), Math.round(w), Math.round(h / 1.1)),
      emissive: '#d6bb7e',
      emissiveIntensity: 0.5,
    });
    g.add(dn(mesh(box(w, h, 6), day, x, h / 2, z, false), day, night));
    if (x === 7) for (let i = 0; i < 14; i++) g.add(mesh(box(0.16, h + 0.35, 0.28), cream, x - w / 2 + 0.3 + i * 1.16, h / 2, z + 3.2));
  }
  g.add(mesh(box(38, 6.4, 8), cream, 5, 3.2, -1));
  for (const y of [0.5, 5.8, 6.45]) g.add(mesh(box(39, 0.18, 8.5), gold, 5, y, -1));
  for (let x = -12; x <= 22; x += 2.5) {
    g.add(mesh(box(0.4, 5.5, 0.45), cream, x, 2.8, 3.2));
    g.add(mesh(box(1.8, 3.3, 0.1), toon('#3e5355'), x + 1.1, 2.4, 3.1));
  }
  for (const x of [-12, -4, 5, 14, 22]) {
    const h = x === 5 ? 9.1 : 7.6;
    g.add(mesh(cyl(1, 1.15, h, 12), cream, x, h / 2, 2.5));
    g.add(mesh(cyl(1.23, 1.23, 0.18, 16), gold, x, h, 2.5));
    // Lathed onion profile instead of a generic spherical roof.
    const profile = [
      new THREE.Vector2(0, 2.9),
      new THREE.Vector2(0.23, 2.5),
      new THREE.Vector2(0.45, 2.15),
      new THREE.Vector2(0.98, 1.55),
      new THREE.Vector2(1.34, 0.95),
      new THREE.Vector2(1.15, 0.25),
      new THREE.Vector2(0.86, 0),
    ];
    g.add(mesh(new THREE.LatheGeometry(profile, 20), toon(x === 5 ? '#6c9698' : '#bfac6d'), x, h + 0.15, 2.5));
    g.add(mesh(cyl(0.025, 0.035, 1, 6), gold, x, h + 3.25, 2.5));
  }
  // Red/blue neon strips evoke the period frontage without importing photographs.
  for (const y of [4.5, 4.8, 5.1]) g.add(dn(mesh(box(37, 0.06, 0.06), gold, 5, y, 3.35, false), gold, glow('#eb6680')));
  label(g, 'TAJ MAHAL', 7, 31.1, -12.91, 12, 1.25, '#ebc77d', '#5d4137', 'bold 50px Georgia');
  label(g, 'ATLANTIC CITY', 5, 5.0, 4.1, 7.4, 0.82, '#e9c98c', '#704235', 'bold 45px Georgia');
  label(g, 'CASINO', 5, 3.9, 4.12, 4.0, 0.65, '#e7bb77', '#563b35');
  const litStone = toon('#d4bc8d', { emissive: '#d99a48', emissiveIntensity: 0.45 });
  const litGold = toon('#cba256', { emissive: '#e6af49', emissiveIntensity: 0.4 });
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      if (o.material === cream) dn(o, cream, litStone);
      if (o.material === gold) dn(o, gold, litGold);
    }
  });
  return {
    group: g,
    update(dt: number) {
      dayWater.offset.x += dt * 0.008;
      nightWater.offset.x += dt * 0.008;
    },
  };
}
