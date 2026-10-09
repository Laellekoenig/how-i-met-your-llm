import * as THREE from 'three';
import { WALK_SPEED, type Actor, type SitPose } from '../world/actor';
import type { StageSet } from '../world/sets/common';
import { SEATED_SPACE, SPACE, clear, flat, free } from './navigation';

/** How far ahead (seconds of walking) a walker looks for someone in the way, and how finely. */
const HORIZON = 2;
const STEP = 0.1;
/** How long to stand by before letting someone pass, tried in turn. */
const WAITS = [0.25, 0.5, 0.75, 1, 1.5, 2];
/** After finding no way past someone, how long before looking again. */
const RETRY = 0.4;

/** Where someone is and the way they mean to go: a pause first, then along `path` at walking pace. */
interface Plan { from: THREE.Vector3; path: THREE.Vector3[]; wait: number }
interface Body { actor: Actor; plan: Plan; sitting: boolean; walker: boolean }
interface Bump { other: Body; t: number; at: THREE.Vector3 }

/** Whether p is too close to anywhere on the rest of someone's way to share the floor with them. */
function onTheWay(p: THREE.Vector3, plan: Plan) {
  const way = [plan.from, ...plan.path].map((q) => q.clone().setY(0)), foot = new THREE.Vector3(), line = new THREE.Line3();
  return way.some((q, i) => flat(i ? line.set(way[i - 1], q).closestPointToPoint(p.clone().setY(0), true, foot) : q, p) < SPACE);
}

/** Distance from the start of each point along the way. */
function lengths(plan: Plan) {
  const points = [plan.from, ...plan.path], total = [0];
  for (let i = 1; i < points.length; i++) total.push(total[i - 1] + flat(points[i - 1], points[i]));
  return { points, total };
}

/** The point `s` metres along the way, and the way it's heading there. */
function along(plan: Plan, s: number) {
  const { points, total } = lengths(plan);
  for (let i = 1; i < points.length; i++) {
    const length = total[i] - total[i - 1];
    if (s > total[i] && i < points.length - 1) continue;
    if (length < 1e-6) continue;
    const t = THREE.MathUtils.clamp((s - total[i - 1]) / length, 0, 1);
    const heading = points[i].clone().sub(points[i - 1]).setY(0).normalize();
    return { at: points[i - 1].clone().lerp(points[i], t), heading };
  }
  return { at: points.at(-1)!.clone(), heading: new THREE.Vector3() };
}

const arrival = (plan: Plan) => plan.wait + lengths(plan).total.at(-1)! / WALK_SPEED;
const where = (b: Body, t: number) => b.walker ? along(b.plan, (t - b.plan.wait) * WALK_SPEED).at : b.plan.from;

/** The first moment, while still on their way, that this plan brings someone closer to anyone than there's room for. */
function bump(plan: Plan, others: Body[]): Bump | null {
  const end = Math.min(plan.wait + HORIZON, arrival(plan) + STEP);
  for (let t = STEP; t <= end; t += STEP) {
    const p = along(plan, (t - plan.wait) * WALK_SPEED).at;
    for (const other of others) {
      const q = where(other, t), d = flat(p, q);
      // Already close (getting up beside someone): fine as long as they get no closer than they are.
      if (d < (other.sitting ? SEATED_SPACE : SPACE) && d < flat(plan.from, other.plan.from) - 0.02) return { other, t, at: q };
    }
  }
  return null;
}

/** Step around whoever is in the way, on one side, and back onto the way beyond them. */
function detour(set: StageSet, plan: Plan, hit: Bump, room: number, side: number): Plan | null {
  const { points, total } = lengths(plan), length = total.at(-1)!;
  const s = (hit.t - plan.wait) * WALK_SPEED, { at, heading } = along(plan, s);
  const right = new THREE.Vector3(-heading.z, 0, heading.x);
  const past = s + hit.at.clone().sub(at).dot(heading);
  const into = past - room, out = past + room * 2;
  // Someone standing where they're headed can't be walked around.
  if (out >= length) return null;
  const aside = hit.at.clone().addScaledVector(right, side * room).setY(0);
  const corners = [
    ...(into > 0.1 ? [aside.clone().addScaledVector(heading, -room)] : []),
    aside.clone().addScaledVector(heading, room),
  ];
  const kept = points.slice(1).filter((_, i) => total[i + 1] < Math.max(into, 0));
  const rejoin = along(plan, out).at;
  const legs = [kept.at(-1) ?? plan.from, ...corners, rejoin];
  if (corners.some((p) => !free(set, p))) return null;
  for (let i = 1; i < legs.length; i++) if (!clear(set, legs[i - 1], legs[i])) return null;
  return { ...plan, path: [...kept, ...corners, rejoin, ...points.slice(1).filter((_, i) => total[i + 1] > out)] };
}

/** Stop short of someone standing on the spot they're headed for, rather than walking into them. */
function stopShort(plan: Plan, hit: Bump, room: number): Plan | null {
  const { points, total } = lengths(plan);
  for (let s = total.at(-1)!; s > 0.15; s -= 0.05) {
    const { at } = along(plan, s);
    if (flat(at, hit.at) >= room) return { ...plan, path: [...points.slice(1).filter((_, i) => total[i + 1] < s), at] };
  }
  return null;
}

/** The quickest way to get by without walking into anyone: stand by and let them pass, or step around them. */
function giveWayFor(set: StageSet, me: Body, others: Body[], hit: Bump): { plan: Plan; cost: number } | null {
  const before = lengths(me.plan).total.at(-1)!;
  const options: { plan: Plan; cost: number }[] = [];
  if (hit.other.walker) {
    const wait = WAITS.find((w) => !bump({ ...me.plan, wait: me.plan.wait + w }, others));
    if (wait !== undefined) options.push({ plan: { ...me.plan, wait: me.plan.wait + wait }, cost: wait });
  }
  // Pass on the side away from them, or keep right if they're dead ahead.
  const s = (hit.t - me.plan.wait) * WALK_SPEED, { at, heading } = along(me.plan, s);
  const lateral = hit.at.clone().sub(at).dot(new THREE.Vector3(-heading.z, 0, heading.x));
  const room = hit.other.sitting ? SEATED_SPACE : SPACE;
  for (const offset of [room + 0.05, room + 0.25]) for (const side of lateral > 0.05 ? [-1, 1] : [1, -1]) {
    const plan = detour(set, me.plan, hit, offset, side);
    if (plan && !bump(plan, others)) options.push({ plan, cost: (lengths(plan).total.at(-1)! - before) / WALK_SPEED });
  }
  const best = options.sort((a, b) => a.cost - b.cost)[0];
  if (best) return best;
  if (!hit.other.walker && !me.actor.headingToSeat && flat(hit.at, along(me.plan, before).at) < room) {
    const plan = stopShort(me.plan, hit, room);
    if (plan && !bump(plan, others)) return { plan, cost: 0 };
  }
  return null;
}

/** A seat someone gets up out of to let a walker by, and back into after. */
export interface Seat { pos: THREE.Vector3; approach?: THREE.Vector3; facing: number; height: number; pose?: SitPose; prop?: THREE.Object3D; depth?: number; back?: readonly number[] }

/** Someone who stepped out of a walker's way, and how they get back once the walker is past. */
interface Aside { walker: Actor; back: THREE.Vector3[]; final: Parameters<Actor['walk']>[1] }

/**
 * Nobody walks through anybody. Each walker looks a little way ahead, and if they'd bump into someone, whichever
 * of the two gets by quicker (waiting a moment, or stepping around) gives way. If there's no way around (a
 * narrow aisle, the inside of a booth), whoever's in the way steps aside, or gets up, and comes back after.
 */
export class Crowd {
  /** Walkers who just found no way past someone, and how long before they look again. */
  private retry = new Map<Actor, number>();
  private aside = new Map<Actor, Aside>();

  /** `movable`: who may be asked to step aside or take another way (the cast, not the background, nor anyone
   * going through a door); `seatOf`: the seat they're in. */
  constructor(private movable: (a: Actor) => boolean, private seatOf: (a: Actor) => Seat | null) {}

  /** A new scene: nobody owes anybody a step back. */
  clear() {
    this.retry.clear();
    this.aside.clear();
  }

  /** They've been sent somewhere new: no going back to where they stepped aside from. */
  forget(a: Actor) {
    this.aside.delete(a);
    this.retry.delete(a);
  }

  /** `people` is everyone on the set a walker could bump into, walking or not. */
  update(set: StageSet, people: Actor[], dt: number) {
    const bodies: Body[] = people.map((actor) => ({
      actor,
      plan: { from: actor.position.clone().setY(0), path: actor.remainingPath, wait: actor.waiting },
      sitting: actor.isSitting && !actor.isWalking,
      walker: actor.isWalking && !actor.isScooting,
    }));
    for (const [actor, t] of this.retry) if (t <= dt) this.retry.delete(actor); else this.retry.set(actor, t - dt);
    for (const me of bodies) {
      if (!me.walker || this.retry.has(me.actor)) continue;
      const others = bodies.filter((b) => b !== me);
      const hit = bump(me.plan, others);
      if (!hit) continue;
      // (someone going through a door keeps to their way, but others still make way for them)
      const choices = this.movable(me.actor) ? [{ who: me, way: giveWayFor(set, me, others, hit) }] : [];
      const them = hit.other;
      if (them.walker && !this.retry.has(them.actor) && this.movable(them.actor)) {
        const theirs = bump(them.plan, bodies.filter((b) => b !== them));
        if (theirs?.other === me) choices.push({ who: them, way: giveWayFor(set, them, bodies.filter((b) => b !== them), theirs) });
      }
      const pick = choices.filter((c) => c.way).sort((a, b) => a.way!.cost - b.way!.cost)[0];
      if (pick) {
        pick.who.plan = pick.way!.plan;
        pick.who.actor.waiting = pick.way!.plan.wait;
        pick.who.actor.reroute(pick.way!.plan.path);
      } else if (!this.makeWay(set, me, hit, bodies)) this.retry.set(me.actor, RETRY);
    }
    this.comeBack(people);
  }

  /** Whoever's standing (or sitting) in the only way through steps out of it, and the walker waits for them if need be. */
  private makeWay(set: StageSet, me: Body, hit: Bump, bodies: Body[]) {
    const them = hit.other;
    if (them.walker || this.aside.has(them.actor) || !this.movable(them.actor)) return false;
    const seat = them.sitting ? this.seatOf(them.actor) : null;
    if (them.sitting && !seat) return false;
    const home = them.plan.from;
    // Out of the seat first, onto its step (or just in front of it).
    const up = seat ? (seat.approach?.clone() ?? seat.pos.clone().add(new THREE.Vector3(Math.sin(seat.facing), 0, Math.cos(seat.facing)).multiplyScalar(0.55))).setY(0) : null;
    const from = up ?? home;
    const s = (hit.t - me.plan.wait) * WALK_SPEED, { heading } = along(me.plan, s);
    const right = new THREE.Vector3(-heading.z, 0, heading.x);
    const others = bodies.filter((b) => b !== me && b !== them);
    // Any way out of the way will do, the shortest step first: to the side they're already on, then any side, and
    // back towards the walker last.
    const lateral = from.clone().sub(along(me.plan, s).at).dot(right) >= 0 ? 1 : -1;
    const ways = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2, way = right.clone().multiplyScalar(lateral * Math.cos(angle)).addScaledVector(heading, Math.sin(angle));
      return { way, rank: Math.abs(Math.sin(angle)) - Math.cos(angle) * 0.1 + (Math.sin(angle) < -0.1 ? 1 : 0) };
    }).sort((a, b) => a.rank - b.rank).map((w) => w.way);
    for (const reach of [0.4, 0.55, 0.7, 0.85, 1, 1.2]) for (const way of ways) {
      const spot = from.clone().addScaledVector(way, reach);
      if (onTheWay(spot, me.plan) || others.some((b) => flat(b.plan.from, spot) < SPACE) || !free(set, spot)) continue;
      const path = [...(up ? [up] : []), spot];
      if ([from, ...path].some((p, i, all) => i > 0 && !clear(set, all[i - 1], p))) continue;
      const stepping: Body = { ...them, sitting: false, walker: true, plan: { from: home, path, wait: seat ? 0.3 : 0 } };
      if (bump(stepping.plan, others)) continue;
      const wait = [0, ...WAITS].find((w) => !bump({ ...me.plan, wait: me.plan.wait + w }, [...others, stepping]));
      if (wait === undefined) continue;
      me.plan = { ...me.plan, wait: me.plan.wait + wait };
      me.actor.waiting = me.plan.wait;
      them.plan = stepping.plan;
      them.walker = true;
      them.sitting = false;
      const facing = them.actor.facing;
      void them.actor.walk(path, { facing, seat: null });
      this.aside.set(them.actor, seat
        ? { walker: me.actor, back: [up!, seat.pos.clone()], final: { facing: seat.facing, seat: seat.height, pose: seat.pose, prop: seat.prop, depth: seat.depth, back: seat.back } }
        : { walker: me.actor, back: [home.clone()], final: { facing, seat: null } });
      return true;
    }
    return false;
  }

  /** Back to their place once the walker they made way for is past it. */
  private comeBack(people: Actor[]) {
    for (const [a, { walker, back, final }] of this.aside) {
      if (a.isWalking || !a.root.visible) continue;
      // Once they've stopped, go back anyway: if they stopped in the way, they're asked to make way in turn.
      if (walker.isWalking && people.includes(walker)) {
        const way = { from: walker.position, path: walker.remainingPath, wait: 0 };
        if (back.some((p) => onTheWay(p, way))) continue;
      }
      this.aside.delete(a);
      void a.walk(back.map((p) => p.clone()), final);
    }
  }
}
