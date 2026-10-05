import * as THREE from 'three';
import { box, cyl, mesh, roundedBox, toon } from '../../engine/materials';
import { sign } from '../../engine/textures';

/** Small shared props for public interiors; chairs face local +z. */
export function chair(g: THREE.Group, x: number, z: number, facing = 0, color = '#343b42', y = 0) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = facing;
  c.add(mesh(roundedBox(0.5, 0.08, 0.48), toon(color), 0, 0.45, 0));
  c.add(mesh(roundedBox(0.48, 0.44, 0.06), toon(color), 0, 0.74, -0.23));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    c.add(mesh(box(0.035, 0.42, 0.035), toon('#39332e'), sx * 0.21, 0.21, sz * 0.19, false));
  g.add(c);
  return c;
}

export function label(g: THREE.Group, text: string, x: number, y: number, z: number, w: number, h: number,
  fg = '#f5e5c8', bg = '#243c38', font = 'bold 28px Helvetica') {
  const p = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: sign(text, fg, bg, 512, 96, font),
  }), x, y, z, false);
  g.add(p);
  return p;
}

export function mug(g: THREE.Group, x: number, y: number, z: number, color = '#b52b29') {
  const mat = toon(color);
  g.add(mesh(cyl(0.065, 0.055, 0.14, 10), mat, x, y + 0.07, z, false));
  g.add(mesh(cyl(0.053, 0.053, 0.004, 10), toon('#3b251b'), x, y + 0.142, z, false));
  g.add(mesh(new THREE.TorusGeometry(0.043, 0.012, 4, 8), mat, x + 0.067, y + 0.075, z, false));
}
