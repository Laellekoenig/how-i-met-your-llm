import * as THREE from 'three';
import type { StageSet } from '../../src/world/sets/common';

/** Intersect the walking corridor with each actual mesh in its local coordinates. */
export function walkingBlockers(set: StageSet, from: THREE.Vector3, to: THREE.Vector3, radius = 0.12) {
  set.group.updateWorldMatrix(true, true);
  const hits: string[] = [];
  const midpoint = from.clone().lerp(to, 0.5);
  const floor = set.floorAt?.(midpoint.x, midpoint.z) ?? 0;
  set.group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    // Extras are actors, not part of the navigation scenery.
    for (let p = o.parent; p && p !== set.group; p = p.parent) if (p.name.startsWith('extra')) return;
    o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox!;
    const world = local.clone().applyMatrix4(o.matrixWorld);
    const size = world.getSize(new THREE.Vector3());
    if (world.max.y <= floor + 0.3 || world.min.y >= floor + 1.65) return;
    if (!o.userData.occluder && (size.x * size.z < 0.12 || Math.min(size.x, size.z) < 0.08)) return;
    const y = (Math.max(world.min.y, floor + 0.3) + Math.min(world.max.y, floor + 1.65)) / 2;
    const inverse = o.matrixWorld.clone().invert();
    const a = from.clone().setY(y).applyMatrix4(inverse), b = to.clone().setY(y).applyMatrix4(inverse);
    const direction = b.clone().sub(a), length = direction.length();
    const bounds = local.clone().expandByVector(new THREE.Vector3(radius, 0, radius));
    const ray = new THREE.Ray(a, direction.normalize());
    const point = ray.intersectBox(bounds, new THREE.Vector3());
    if (bounds.containsPoint(a) || (point && point.distanceTo(a) < length - 0.01)) {
      const center = world.getCenter(new THREE.Vector3()).toArray().map(n => n.toFixed(2));
      hits.push(`${o.name || o.geometry.type} at ${center.join(',')}`);
    }
  });
  return hits;
}
