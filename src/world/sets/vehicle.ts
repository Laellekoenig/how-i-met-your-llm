import * as THREE from 'three';
import { toon, glow, mesh, cyl, box } from '../../engine/materials';

// Shared bits for the car sets: the city sliding past, and streetlamps going by whose light washes
// through the cabin at night.

/** The car's cruising speed, metres per second. */
const SPEED = 7;

/** Scroll a texture on a plane `length` metres long (along its u axis) so it slides past at road speed. */
export function scroll(tex: THREE.Texture, length: number, dt: number, dir = 1) {
  tex.offset.x = (((tex.offset.x + (dir * SPEED * dt * tex.repeat.x) / length) % 1) + 1) % 1;
}

/**
 * Streetlamps on the sidewalk, sliding past the car along `axis` and wrapping around.
 * `across` is the sidewalk's coordinate on the other axis; the arm reaches toward `armDir` on that axis.
 */
export function lampposts(g: THREE.Group, o: { axis: 'x' | 'z'; across: number; armDir: number; from: number; to: number; count: number; ground: number }) {
  const pole = toon('#2a2c30');
  const lampOn = glow('#ffd890', 1.6);
  const lampOff = toon('#b8b4a8');
  const span = o.to - o.from;
  const posts: { grp: THREE.Group; light: THREE.PointLight; head: THREE.Mesh; u: number }[] = [];
  for (let i = 0; i < o.count; i++) {
    const grp = new THREE.Group();
    grp.add(mesh(cyl(0.07, 0.1, 4.6, 6), pole, 0, 2.3, 0, false));
    grp.add(mesh(box(0.06, 0.06, 1.1), pole, 0, 4.55, o.armDir * 0.5, false));
    const head = mesh(box(0.2, 0.08, 0.36), lampOn, 0, 4.48, o.armDir * 1.0, false);
    grp.add(head);
    const light = new THREE.PointLight('#ffcf80', 0, 10, 1.3);
    light.position.set(0, 4.2, o.armDir * 1.0);
    grp.add(light);
    if (o.axis === 'z') grp.rotation.y = Math.PI / 2;
    g.add(grp);
    posts.push({ grp, light, head, u: i / o.count });
  }
  const place = () => {
    for (const p of posts) {
      const along = o.from + p.u * span;
      if (o.axis === 'x') p.grp.position.set(along, o.ground, o.across);
      else p.grp.position.set(o.across, o.ground, along);
    }
  };
  place();
  return {
    setNight(n: boolean) {
      for (const p of posts) {
        p.light.intensity = n ? 9 : 0;
        p.head.material = n ? lampOn : lampOff;
      }
    },
    /** `dir` is which way the scenery moves along the axis (opposite to the car). */
    update(dt: number, dir: number) {
      for (const p of posts) p.u = (((p.u + (dir * SPEED * dt) / span) % 1) + 1) % 1;
      place();
    },
  };
}
