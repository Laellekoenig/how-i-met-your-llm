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

/** How far a walker's body reaches either side of the line they walk. */
const BODY = 0.12;

interface Solid {
  shape: THREE.Box3; // in the mesh's own space
  bounds: THREE.Box3; // the same, padded by the walker's body
  inverse: THREE.Matrix4;
  world: THREE.Box3; // padded too, for a quick miss
}

const SCENERY = new WeakMap<StageSet, Solid[]>();
const SIGHT = new WeakMap<StageSet, Map<string, boolean>>();

/** Every visible mesh on the set, walls and thin panels included: anything a shortcut could walk into. */
function scenery(set: StageSet) {
  let solids = SCENERY.get(set);
  if (solids) return solids;
  solids = [];
  set.group.updateWorldMatrix(true, true);
  const scale = new THREE.Vector3();
  const visit = (o: THREE.Object3D) => {
    if (o !== set.group && !o.visible) return;
    if (o instanceof THREE.Mesh && !o.userData.cameraBackdrop) {
      o.geometry.boundingBox ?? o.geometry.computeBoundingBox();
      const shape = o.geometry.boundingBox!.clone();
      scale.setFromMatrixScale(o.matrixWorld);
      solids!.push({
        shape,
        bounds: shape.clone().expandByVector(new THREE.Vector3(BODY / scale.x, BODY / scale.y, BODY / scale.z)),
        inverse: o.matrixWorld.clone().invert(),
        world: shape.clone().applyMatrix4(o.matrixWorld).expandByVector(new THREE.Vector3(BODY, 0, BODY)),
      });
    }
    for (const c of o.children) visit(c);
  };
  visit(set.group);
  SCENERY.set(set, solids);
  return solids;
}

/**
 * Whether someone can walk straight from a to b without their body (knee to head) brushing anything on the set.
 * A spot right up against something (leaning on a partition, standing at the bar) may be walked to or from as
 * long as the walk never brushes it any closer than that.
 */
export function clear(set: StageSet, from: THREE.Vector3, to: THREE.Vector3) {
  const floors = [from, to, from.clone().lerp(to, 0.5)].map(p => set.floorAt?.(p.x, p.z) ?? 0);
  const low = Math.min(...floors) + 0.3, high = Math.max(...floors) + 1.65;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), hit = new THREE.Vector3(), ray = new THREE.Ray();
  return !scenery(set).some(({ shape, bounds, inverse, world }) => {
    if (world.max.y <= low || world.min.y >= high) return false;
    if (Math.max(from.x, to.x) < world.min.x || Math.min(from.x, to.x) > world.max.x) return false;
    if (Math.max(from.z, to.z) < world.min.z || Math.min(from.z, to.z) > world.max.z) return false;
    const y = (Math.max(world.min.y, low) + Math.min(world.max.y, high)) / 2;
    a.set(from.x, y, from.z).applyMatrix4(inverse);
    b.set(to.x, y, to.z).applyMatrix4(inverse);
    if (bounds.containsPoint(a) || bounds.containsPoint(b)) {
      // Already close: fine as long as the walk never gets any closer than it starts or ends.
      const nearest = Math.min(shape.distanceToPoint(a), shape.distanceToPoint(b)) - 0.005;
      const steps = Math.ceil(a.distanceTo(b) / 0.04);
      for (let i = 1; i < steps; i++) if (shape.distanceToPoint(hit.lerpVectors(a, b, i / steps)) < nearest) return true;
      return nearest < 0;
    }
    const length = a.distanceTo(b);
    ray.set(a, b.sub(a).normalize());
    return ray.intersectBox(bounds, hit) !== null && hit.distanceTo(a) < length;
  });
}

/** Whether someone standing here has room for their whole body, touching nothing. */
export function free(set: StageSet, p: THREE.Vector3) {
  const floor = set.floorAt?.(p.x, p.z) ?? 0;
  const local = new THREE.Vector3();
  return !scenery(set).some(({ bounds, inverse, world }) => {
    if (world.max.y <= floor + 0.3 || world.min.y >= floor + 1.65) return false;
    if (p.x < world.min.x || p.x > world.max.x || p.z < world.min.z || p.z > world.max.z) return false;
    return bounds.containsPoint(local.set(p.x, (Math.max(world.min.y, floor + 0.3) + Math.min(world.max.y, floor + 1.65)) / 2, p.z).applyMatrix4(inverse));
  });
}

const flat = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);

/** How close two people may pass (centre to centre) before they'd be walking into each other; less beside a seat. */
export const SPACE = 0.5;
export const SEATED_SPACE = 0.42;

/** Someone a walk should keep clear of, and by how much. */
export interface Person { at: THREE.Vector3; room: number }

/**
 * Whether walking straight from a to b brushes past anyone closer than there's room for. Someone already that
 * close at either end (standing beside them, getting up next to them) is fine as long as the walk gets no closer.
 */
export function crowded(people: Person[], a: THREE.Vector3, b: THREE.Vector3) {
  const foot = new THREE.Vector3(), line = new THREE.Line3(a.clone().setY(0), b.clone().setY(0));
  return people.some(({ at, room }) => {
    const d = flat(line.closestPointToPoint(at.clone().setY(0), true, foot), at);
    return d < room && d < Math.min(flat(a, at), flat(b, at)) - 0.01;
  });
}

/**
 * The walk itself: the shortest way there, along the authored aisles or straight across wherever nothing on
 * the set stands in the way, so nobody heads off from where they're going just to touch a waypoint.
 * `start` is how they set off (where they are, any corners still ahead of them, the step out of their seat),
 * joining the aisles at node `from`; `end` is how they arrive (the step up to the mark, then the mark), joining
 * at node `to`. Only the first point of `end` can be reached cross-country: the rest is the authored arrival.
 * The way also keeps clear of the `people` standing (or sitting) about, wherever it can.
 */
export function walkRoute(set: StageSet, start: THREE.Vector3[], from: string, end: THREE.Vector3[], to: string, people: Person[] = []): THREE.Vector3[] | null {
  const keys = Object.keys(set.nodes), index = new Map(keys.map((k, i) => [k, i]));
  if (!index.has(from) || !index.has(to) || !start.length || !end.length) return null;
  const points = [...keys.map(k => set.nodes[k]), ...start, end[0]];
  const S = keys.length, goal = points.length - 1;
  const linked = points.map(() => new Set<number>());
  const link = (a: number, b: number) => (linked[a].add(b), linked[b].add(a));
  for (const [a, b] of set.edges) if (index.has(a) && index.has(b)) link(index.get(a)!, index.get(b)!);
  for (let i = S; i < goal - 1; i++) link(i, i + 1);
  link(goal - 1, index.get(from)!);
  link(index.get(to)!, goal);
  // Step straight onto the aisle beside the mark too, rather than only at the node at one end of it.
  for (const [at, node] of [[goal - 1, from], [goal, to]] as const) {
    for (const [u, v] of set.edges) {
      if ((u !== node && v !== node) || !index.has(u) || !index.has(v)) continue;
      const foot = new THREE.Line3(set.nodes[u], set.nodes[v]).closestPointToPoint(points[at].clone().setY(0), true, new THREE.Vector3());
      if (flat(foot, set.nodes[u]) < 0.05 || flat(foot, set.nodes[v]) < 0.05) continue;
      if (flat(foot, points[at]) > 0.05 && !clear(set, points[at], foot)) continue;
      const f = points.push(foot) - 1;
      linked.push(new Set());
      link(f, at);
      link(f, index.get(u)!);
      link(f, index.get(v)!);
    }
  }
  let sight = SIGHT.get(set);
  if (!sight) SIGHT.set(set, sight = new Map());
  // Only where they start and where they're going may be right beside someone: no corner on the way is.
  const near = (p: THREE.Vector3) => people.some(({ at, room }) => flat(p, at) < room);
  const cramped = points.map((p, i) => (i < S || i > goal) && near(p));
  const reachable = (a: number, b: number) => !cramped[a] && !cramped[b] && !crowded(people, points[a], points[b]) && walkable(a, b);
  const walkable = (a: number, b: number) => {
    if (linked[a].has(b)) return true;
    if (a < S && b < S) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      let seen = sight!.get(key);
      if (seen === undefined) sight!.set(key, seen = clear(set, points[a], points[b]));
      return seen;
    }
    return clear(set, points[a], points[b]);
  };
  // A*: straight-line distance never overestimates the rest of the way.
  const cost = new Map([[S, 0]]), previous = new Map<number, number>(), done = new Set<number>();
  const guess = (i: number) => cost.get(i)! + flat(points[i], points[goal]);
  const open = new Set([S]);
  while (open.size) {
    const current = [...open].reduce((best, i) => guess(i) < guess(best) ? i : best);
    if (current === goal) {
      const path = [goal];
      while (path[0] !== S) path.unshift(previous.get(path[0])!);
      const route = path.map(i => points[i].clone());
      // Round off each aisle corner: cut in along either leg as far as the way past it stays clear.
      // Getting up, they turn off the step out of their seat as soon as the way on is clear.
      const reach = (ok: (t: number) => boolean) => {
        let best = 0;
        for (let t = 0.5, step = 0.25; step > 0.005; step /= 2) if (ok(t)) best = t, t += step; else t -= step;
        return best;
      };
      for (let k = 1; k < route.length - 1; k++) {
        if (path[k] < S || path[k] > goal) {
          const [last, corner, next] = [route[k - 1], route[k].clone(), route[k + 1]];
          route[k].lerp(next, reach(t => {
            const p = corner.clone().lerp(next, t);
            return free(set, p) && clear(set, last, p) && !near(p) && !crowded(people, last, p) && !crowded(people, p, next);
          }));
          const cut = route[k].clone();
          route[k].lerp(last, reach(t => {
            const p = cut.clone().lerp(last, t);
            return free(set, p) && clear(set, p, next) && !near(p) && !crowded(people, p, next) && !crowded(people, last, p);
          }));
        } else if (path[k] === goal - 1 && path[k - 1] >= S) {
          const [seat, step, next] = [route[k - 1], route[k].clone(), route[k + 1]];
          route[k].lerp(seat, reach(t => {
            const p = step.clone().lerp(seat, t);
            return free(set, p) && clear(set, p, next) && !crowded(people, p, next);
          }));
        }
      }
      return [...route, ...end.slice(1).map(p => p.clone())];
    }
    open.delete(current);
    done.add(current);
    for (let next = 0; next < points.length; next++) {
      if (next === current || done.has(next)) continue;
      const distance = cost.get(current)! + flat(points[current], points[next]);
      if (distance >= (cost.get(next) ?? Infinity) || !reachable(current, next)) continue;
      cost.set(next, distance);
      previous.set(next, current);
      open.add(next);
    }
  }
  return null;
}
