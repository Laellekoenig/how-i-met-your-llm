import * as THREE from 'three';
import { box, mesh, toon } from '../../engine/materials';

/** A stage shell with a one-sided fourth wall for reverse dialogue coverage. */
export function interior(g: THREE.Group, w: number, d: number, h: number, floor: THREE.Material, wall: THREE.Material, ceiling: string) {
  // Extend the shell behind the master camera, so wide shots never see a black
  // gap above the ceiling or beyond the sides of the three-wall stage.
  const back = -d / 2, front = 16, depth = front - back, center = (front + back) / 2;
  g.add(mesh(new THREE.PlaneGeometry(w, depth), floor, 0, 0, center, false).rotateX(-Math.PI / 2));
  g.add(mesh(new THREE.PlaneGeometry(w, h), wall, 0, h / 2, back, false));
  g.add(mesh(new THREE.PlaneGeometry(depth, h), wall, -w / 2, h / 2, center, false).rotateY(Math.PI / 2));
  g.add(mesh(new THREE.PlaneGeometry(depth, h), wall, w / 2, h / 2, center, false).rotateY(-Math.PI / 2));
  g.add(mesh(new THREE.PlaneGeometry(w, depth), toon(ceiling), 0, h, center, false).rotateX(Math.PI / 2));
  const reverse = mesh(new THREE.PlaneGeometry(w, h), wall, 0, h / 2, d / 2 + 1.8, false).rotateY(Math.PI);
  reverse.userData.cameraBackdrop = true;
  g.add(reverse);
}

export function ceilingPanel(g: THREE.Group, x: number, y: number, z: number, w = 1.4, d = 0.5) {
  g.add(mesh(box(w, 0.05, d), toon('#edf4ed', { emissive: '#eef6ef', emissiveIntensity: 0.65 }), x, y, z, false));
}

export function table(g: THREE.Group, x: number, z: number, w: number, d: number, h = 0.76, color = '#9b754c') {
  const top = toon(color), legs = toon('#47413c');
  g.add(mesh(box(w, 0.07, d), top, x, h, z));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    g.add(mesh(box(0.07, h, 0.07), legs, x + sx * (w / 2 - 0.08), h / 2, z + sz * (d / 2 - 0.08)));
}
