import * as THREE from 'three';
import type { StageSet } from '../world/sets/common';

/** Keep every authored corner: proximity alone never permits cutting through scenery. */
export function routeNodes(set: StageSet, from: string, to: string): THREE.Vector3[] | null {
  const { nodes, edges } = set;
  if (!nodes[from] || !nodes[to]) return null;
  const distances = new Map([[from, 0]]), previous = new Map<string, string>();
  const pending = new Set(Object.keys(nodes));
  while (pending.size) {
    const current = [...pending].reduce<string | undefined>((best, key) =>
      distances.has(key) && (best === undefined || distances.get(key)! < distances.get(best)!) ? key : best, undefined);
    if (current === undefined) return null;
    if (current === to) {
      const path = [to];
      while (path[0] !== from) path.unshift(previous.get(path[0])!);
      return path.map(key => nodes[key].clone());
    }
    pending.delete(current);
    for (const [a, b] of edges) {
      const next = a === current ? b : b === current ? a : undefined;
      if (!next || !pending.has(next)) continue;
      const distance = distances.get(current)! + nodes[current].distanceTo(nodes[next]);
      if (distance < (distances.get(next) ?? Infinity)) {
        distances.set(next, distance);
        previous.set(next, current);
      }
    }
  }
  return null;
}

/** Remove repeated waypoints without dropping routing corners. */
export function joinRoute(points: THREE.Vector3[]): THREE.Vector3[] {
  return points.filter((p, i) => !i || Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z) > 0.01);
}
