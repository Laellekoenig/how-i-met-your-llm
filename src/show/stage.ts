import * as THREE from 'three';
import { Actor } from '../world/actor';
import { CHARACTERS, dressed, outfitAt, setGuests, type CharacterDef } from '../world/characters';
import type { StageSet, Mark } from '../world/sets/common';
import { buildSets } from '../world/sets';
import { KID_MARKS } from '../world/sets/future';
import { buildEstablishing, type Establishing } from '../world/sets/establishing';
import { CHARACTER_IDS, KIDS, isCharacterId, isGuest, isKid, type CharacterId, type Costume, type GuestStar, type LocationId, type Outfit, type Prop, type TimeOfDay } from '../script/types';
import { pick, rand } from '../util';
import { joinRoute, routeNodes } from './navigation';

export interface FrozenScene {
  set: StageSet;
  time: TimeOfDay;
  occupancy: Map<string, CharacterId>;
  actorMark: Map<CharacterId, string>;
  actorNode: Map<CharacterId, string>;
  background: Set<CharacterId>;
  outfits: Map<CharacterId, Outfit>;
  actors: {
    id: CharacterId; pos: THREE.Vector3; facing: number; seat: number | null; pose?: Mark['pose']; prop?: THREE.Object3D;
    emotion: Actor['emotion']; holdingGlass: boolean; held: Prop | null;
  }[];
}

/** Owns the sets and actors; knows how to place and move people around. */
export class Stage {
  readonly sets: Record<LocationId, StageSet>;
  readonly actors = {} as Record<CharacterId, Actor>;
  /** Background people. `chatty` ones talk among themselves; one with a `mark` gives it up to anyone the script puts there. */
  readonly extras: { actor: Actor; set: LocationId; talkT: number; chatty: boolean; mark?: string }[] = [];
  current: StageSet;
  private sceneVersion = 0;
  private scenery = new Map<StageSet, THREE.Mesh[]>();
  private occupancy = new Map<string, CharacterId>(); // mark -> character
  private actorMark = new Map<CharacterId, string>();
  private actorNode = new Map<CharacterId, string>();
  private backgroundIds = new Set<CharacterId>();
  /** Who's in their work clothes. Everyone else is in their own. */
  private outfits = new Map<CharacterId, Outfit>();
  /** This episode's and scene's costumes, worn over casual or work clothes. */
  private costumes = new Map<CharacterId, Costume>();
  /** What each actor in `actors` was built to wear (an outfit, plus any costume); casual if missing. */
  private wearing = new Map<CharacterId, string>();
  /** Actors built for the clothes people aren't wearing right now, keyed `id|clothes`. */
  private wardrobe = new Map<string, Actor>();
  /** A freeze frame: nobody moves until it's lifted. */
  frozen = false;
  /** The scene we cut away from while we're on the 2030 couch. */
  private paused: { set: StageSet; visible: CharacterId[] } | null = null;
  private time: TimeOfDay = 'night';
  private establishing: Establishing | null = null;
  private establishingCast: CharacterId[] | null = null;
  /** Stop-motion: when set, the world only moves in steps this many seconds apart, like a burst of photos. */
  strobe = 0;
  private strobeDt = 0;

  constructor(private scene: THREE.Scene) {
    this.sets = buildSets();
    for (const s of Object.values(this.sets)) {
      s.group.visible = false;
      scene.add(s.group);
      const meshes: THREE.Mesh[] = [];
      s.group.traverse(o => { if (o instanceof THREE.Mesh) meshes.push(o); });
      this.scenery.set(s, meshes);
    }
    for (const id of CHARACTER_IDS) {
      const a = new Actor(CHARACTERS[id]);
      a.root.visible = false;
      scene.add(a.root);
      this.actors[id] = a;
    }
    this.buildExtras();
    this.current = this.sets.maclarens;
    this.current.group.visible = true;
  }

  private extra(i: number, name: string, look: Partial<CharacterDef['look']>) {
    const def: CharacterDef = {
      id: `extra${i}` as CharacterId,
      name,
      color: '#999',
      main: false,
      voice: CHARACTERS.carl.voice,
      look: { ...CHARACTERS.carl.look, extras: [], pants: '#2a2a30', build: 1, ...look } as CharacterDef['look'],
    };
    return new Actor(def);
  }

  /** Background patrons, crew, students and the cabbie; named marks yield to the cast. */
  private buildExtras() {
    const looks: Partial<CharacterDef['look']>[] = [
      { female: false, hair: '#2a1a12', hairStyle: 'short', top: '#5a6b7a', topStyle: 'polo', skin: '#c48a64', height: 1.8 },
      { female: true, hair: '#1a1210', hairStyle: 'ponytail', top: '#9a3a4a', topStyle: 'tee', skin: '#e8b996', height: 1.68 },
      { female: false, hair: '#8a6a3a', hairStyle: 'messy', top: '#3a5a3a', topStyle: 'flannel', plaid: ['#1a2a1a', '#9a8a5a'], skin: '#f0c4a4', height: 1.85 },
    ];
    // Corner/window seating, the neighboring booth, and both perimeter bays.
    // Background pairs belong to actual seats, outside the cast's walking aisles.
    const spots: [number, number, number, number][] = [
      [-6.42, -3.0, Math.PI / 2, 0.47], [-5.4, -3.92, 0, 0.47], [1.3, -3.78, 0, 0.48],
      [-3.78, 1.6, Math.PI / 2, 0.47], [-2.25, 0.95, -Math.PI / 2, 0.47],
      [-6.5, 2.9, Math.PI / 2, 0.47], [-4.81, 4.25, -Math.PI / 2, 0.48],
      [6.5, 3.2, -Math.PI / 2, 0.47], [4.81, 4.55, Math.PI / 2, 0.48],
    ];
    spots.forEach((spot, i) => {
      const a = this.extra(i, 'Patron', { ...looks[i % looks.length], top: ['#5a6b7a', '#9a3a4a', '#3a5a3a', '#756249', '#4f6570', '#72534a', '#605c76', '#6e7358', '#8a6550'][i] });
      a.place(new THREE.Vector3(spot[0], 0, spot[1]), spot[2], spot[3]);
      a.holdingGlass = true;
      this.sets.maclarens.group.add(a.root);
      this.extras.push({ actor: a, set: 'maclarens', talkT: rand(0, 3), chatty: true });
      if (i >= 3) {
        const partner = spots[i % 2 ? i + 1 : i - 1];
        a.lookAt = new THREE.Vector3(partner[0], 1.25, partner[1]);
      }
    });
    // they chat with each other
    this.extras[0].actor.lookAt = new THREE.Vector3(-5.4, 1.25, -3.92);
    this.extras[1].actor.lookAt = new THREE.Vector3(-6.42, 1.25, -3.0);

    // a cab always comes with a cabbie, unless Ranjit (or someone) takes the wheel
    const cabbie = this.extra(this.extras.length, 'Cabbie', {
      female: false, hair: '#3a2a20', hairStyle: 'receding', top: '#4a4238', topStyle: 'flannel', plaid: ['#2a2620', '#6a5a40'],
      skin: '#a8724c', height: 1.74, build: 1.15, extras: ['cap'],
    });
    const wheel = this.sets.taxi.marks.driver;
    cabbie.place(wheel.pos.clone(), wheel.facing, wheel.seat, { pose: wheel.pose });
    this.sets.taxi.group.add(cabbie.root);
    this.extras.push({ actor: cabbie, set: 'taxi', talkT: 0, chatty: false, mark: 'driver' });

    const atMark = (set: LocationId, markName: string, name: string, look: Partial<CharacterDef['look']>, chatty = false) => {
      const s = this.sets[set], m = s.marks[markName];
      const a = this.extra(this.extras.length, name, look);
      const p = m.pos.clone(); p.y = s.floorAt?.(p.x, p.z) ?? 0;
      a.place(p, m.facing, m.seat);
      s.group.add(a.root);
      this.extras.push({ actor: a, set, talkT: rand(0, 3), chatty, mark: markName });
    };
    atMark('hoser_hut', 'bartender', 'Canadian bartender', { ...looks[0], top: '#6c3038', topStyle: 'flannel', plaid: ['#312b29', '#a67258'] });
    atMark('hoser_hut', 'patron_left', 'Hockey fan', { ...looks[2], top: '#254974', topStyle: 'sweater' }, true);
    atMark('hoser_hut', 'patron_right', 'Hockey fan', looks[1], true);
    atMark('atlantic_city_casino', 'dealer', 'Dealer', { ...looks[0], top: '#eeeece', topStyle: 'shirt', vest: '#743641', tie: '#25212b' });
    atMark('atlantic_city_casino', 'slots', 'Casino guest', looks[1]);
    atMark('courtroom', 'judge', 'Judge', { ...looks[0], top: '#292831', topStyle: 'blazer', under: '#e8e0cd', hair: '#b9b5a6', height: 1.86 });
    atMark('courtroom', 'jury', 'Juror', looks[1]);
    atMark('lusty_leopard', 'patron_left', 'Lounge guest', { ...looks[0], top: '#3e3d4a', topStyle: 'blazer' }, true);
    atMark('lusty_leopard', 'patron_right', 'Lounge guest', looks[1], true);
    atMark('store', 'cashier', 'Shopkeeper', { ...looks[0], top: '#567754' });
    atMark('metro_news_one', 'camera_operator', 'Camera operator', { ...looks[2], top: '#41464c', topStyle: 'tee' });
    atMark('restaurant', 'table_2_left', 'Diner', looks[0], true);
    atMark('restaurant', 'table_2_right', 'Diner', looks[1], true);
    for (const [i, spot] of ['student_1_2', 'student_1_5', 'student_2_1', 'student_2_4', 'student_3_3', 'student_3_6'].entries()) {
      atMark('lecture_hall', spot, 'Student', looks[i % looks.length]);
    }
  }

  /** Rebuild the guest-star slots this episode recasts. Call between scenes, never mid-scene. */
  castGuests(guests: GuestStar[] = []) {
    for (const id of setGuests(guests)) {
      this.discard(this.actors[id]);
      const a = new Actor(CHARACTERS[id]);
      a.root.visible = false;
      this.scene.add(a.root);
      this.actors[id] = a;
    }
  }

  /**
   * Remember the scene exactly as it is, to come back to after a cutaway that may reuse the same people.
   * Anyone still walking is put where they were headed.
   */
  freeze(): FrozenScene {
    return {
      set: this.current,
      time: this.time,
      occupancy: new Map(this.occupancy),
      actorMark: new Map(this.actorMark),
      actorNode: new Map(this.actorNode),
      background: new Set(this.backgroundIds),
      outfits: new Map(this.outfits),
      actors: this.onStageIds().map((id) => {
        const a = this.actors[id];
        const mark = this.current.marks[this.actorMark.get(id) ?? ''];
        const pos = a.isWalking ? (a.remainingPath.at(-1) ?? a.position.clone()) : a.position.clone();
        return {
          id, pos, facing: mark && (a.isWalking || mark.seat !== null) ? mark.facing : a.targetFacing,
          seat: mark?.seat ?? null, pose: mark?.pose, prop: mark?.prop, emotion: a.emotion, holdingGlass: a.holdingGlass,
          held: a.prop,
        };
      }),
    };
  }

  /** Back from a cutaway to the frozen scene. */
  thaw(f: FrozenScene) {
    this.setLocation(f.set.id, f.time);
    for (const id of CHARACTER_IDS) this.dress(id, f.outfits.get(id) ?? 'casual');
    for (const [k, v] of f.occupancy) this.occupancy.set(k, v);
    for (const [k, v] of f.actorMark) this.actorMark.set(k, v);
    for (const [k, v] of f.actorNode) this.actorNode.set(k, v);
    for (const id of f.background) this.backgroundIds.add(id);
    for (const s of f.actors) {
      const a = this.actors[s.id];
      a.place(s.pos, s.facing, s.seat, { pose: s.pose, prop: s.prop });
      a.setEmotion(s.emotion);
      a.holdingGlass = s.holdingGlass;
      a.hold(s.held);
      a.root.visible = true;
    }
    this.syncExtras();
  }

  setLocation(id: LocationId, time: TimeOfDay) {
    this.sceneVersion++;
    this.endEstablishing();
    this.paused = null;
    for (const s of Object.values(this.sets)) s.group.visible = false;
    this.current = this.sets[id] ?? this.sets.maclarens;
    this.current.group.visible = true;
    this.current.setTime(time);
    this.time = time;
    for (const c of CHARACTER_IDS) this.dress(c, outfitAt(c, id));
    for (const a of Object.values(this.actors)) {
      a.root.visible = false;
      a.place(new THREE.Vector3(0, 0, 0), 0, null);
      a.resetFace();
      a.holdingGlass = false;
      a.hold(null);
    }
    this.occupancy.clear();
    this.actorMark.clear();
    this.actorNode.clear();
    this.backgroundIds.clear();
    this.syncExtras();
  }

  /**
   * Change someone into their work clothes or back into their own, with their costume (if any) on top. Swaps in
   * another actor (built the first time it's needed), so only call it before they're placed in a scene.
   */
  dress(id: CharacterId, outfit: Outfit) {
    const costume = this.costumes.get(id);
    if (!CHARACTERS[id].work) outfit = 'casual';
    else if (outfit === 'casual') this.outfits.delete(id);
    else this.outfits.set(id, outfit);
    const clothes = costume ? `${outfit}:${costumeKey(costume)}` : outfit;
    const wearing = this.wearing.get(id) ?? 'casual';
    if (wearing === clothes) return;
    const old = this.actors[id];
    let a = this.wardrobe.get(`${id}|${clothes}`);
    if (!a) {
      a = new Actor(dressed(CHARACTERS[id], outfit, costume));
      this.scene.add(a.root);
    }
    this.wardrobe.delete(`${id}|${clothes}`);
    this.wardrobe.set(`${id}|${wearing}`, old);
    old.root.visible = false;
    old.hold(null);
    a.root.visible = false;
    a.place(new THREE.Vector3(0, 0, 0), 0, null);
    a.resetFace();
    a.holdingGlass = a.talking = false;
    a.lookAt = null;
    this.actors[id] = a;
    if (clothes === 'casual') this.wearing.delete(id);
    else this.wearing.set(id, clothes);
  }

  /**
   * Costumes for the scenes ahead (the episode's, with the scene's over them). They go on at the next location
   * change; actors built for costumes nobody wears any more are thrown away.
   */
  setWardrobe(costumes: Costume[] = []) {
    this.costumes.clear();
    for (const c of costumes) if (!isGuest(c.character) && !isKid(c.character)) this.costumes.set(c.character, c);
    for (const [k, a] of this.wardrobe) {
      const [id, clothes] = k.split('|') as [CharacterId, string];
      const costume = this.costumes.get(id);
      if (!clothes.includes(':') || (costume && clothes.endsWith(`:${costumeKey(costume)}`))) continue;
      this.discard(a);
      this.wardrobe.delete(k);
    }
  }

  /** Take an actor out of the scene for good, freeing its geometry. */
  private discard(a: Actor) {
    this.scene.remove(a.root);
    a.root.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
  }

  outfitOf(id: CharacterId): Outfit {
    return this.outfits.get(id) ?? 'casual';
  }

  /** Temporarily replace the story with an actor-free view of New York. Built only when first needed. */
  establish(kind: 'skyline' | 'exterior' | 'atlantic_city', location: LocationId, time: TimeOfDay) {
    this.endEstablishing();
    if (!this.establishing) {
      this.establishing = buildEstablishing();
      this.scene.add(this.establishing.group);
    }
    this.establishingCast = this.onStageIds();
    for (const id of this.establishingCast) this.actors[id].root.visible = false;
    this.current.group.visible = false;
    this.establishing.group.visible = true;
    return this.establishing.show(kind, location, time);
  }

  endEstablishing() {
    if (!this.establishingCast) return;
    this.establishing!.group.visible = false;
    this.current.group.visible = true;
    for (const id of this.establishingCast) this.actors[id].root.visible = true;
    this.establishingCast = null;
  }

  onStage(id: CharacterId) {
    return this.actors[id]?.root.visible ?? false;
  }

  onStageIds(): CharacterId[] {
    return CHARACTER_IDS.filter((id) => this.onStage(id));
  }

  /** On-stage characters who are part of the scene (excludes background like Carl behind the bar). */
  castIds(): CharacterId[] {
    return this.onStageIds().filter((id) => !this.backgroundIds.has(id));
  }

  setBackground(id: CharacterId, on: boolean) {
    if (on) this.backgroundIds.add(id);
    else this.backgroundIds.delete(id);
  }

  markOf(id: CharacterId) {
    return this.actorMark.get(id);
  }

  /** Resolve a mark name loosely (LLMs improvise). Falls back to a free standing spot. */
  resolveMark(name: string | undefined, forChar?: CharacterId): string {
    const marks = this.current.marks;
    if (name && marks[name] && this.isFree(name, forChar)) return name;
    if (name) {
      const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const hit = Object.keys(marks).find((k) => k === n) ?? Object.keys(marks).find((k) => k.includes(n) || n.includes(k));
      if (hit && this.isFree(hit, forChar)) return hit;
      // occupied: look for a free mark of the same family (booth_*, couch_*, bar_stool_*)
      const family = (hit ?? n).split('_')[0];
      const sibling = Object.keys(marks).find((k) => k.startsWith(family) && this.isFree(k, forChar));
      if (sibling) return sibling;
    }
    const reserved = this.current.reserved ?? [];
    const free = Object.keys(marks).filter((k) => this.isFree(k, forChar) && k !== this.current.door && !reserved.includes(k));
    const seats = free.filter((k) => marks[k].seat !== null);
    if (seats.length) return pick(seats);
    if (free.length) return pick(free);
    // a full house: squeeze in somewhere
    return marks.center ? 'center' : pick(Object.keys(marks).filter((k) => k !== this.current.door && !reserved.includes(k)));
  }

  private isFree(mark: string, forChar?: CharacterId) {
    if (mark === this.current.door || Object.values(this.current.entrances ?? {}).includes(mark)) return true;
    const who = this.occupancy.get(mark);
    return !who || who === forChar;
  }

  private occupy(id: CharacterId, mark: string | null) {
    const prev = this.actorMark.get(id);
    if (prev && this.occupancy.get(prev) === id) this.occupancy.delete(prev);
    this.actorMark.delete(id);
    this.actorNode.delete(id);
    if (mark) {
      this.occupancy.set(mark, id);
      this.actorMark.set(id, mark);
      this.actorNode.set(id, this.current.marks[mark].node);
    }
    this.syncExtras();
  }

  private syncExtras() {
    for (const e of this.extras) if (e.set === this.current.id && e.mark) e.actor.root.visible = !this.occupancy.has(e.mark);
  }

  /** Standing spot near a mark, nudged if a standing mark is taken (people can share floor space). */
  private markPosition(m: Mark, name: string, id: CharacterId) {
    const p = m.pos.clone();
    if (m.seat === null) {
      const who = this.occupancy.get(name);
      if (who && who !== id) p.add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(0.3, 0.6)));
    }
    return p;
  }

  place(id: CharacterId, markName: string) {
    const name = this.resolveMark(markName, id);
    const m = this.current.marks[name];
    const a = this.actors[id];
    const pos = this.markPosition(m, name, id);
    pos.y = this.floorY(pos.x, pos.z);
    a.place(pos, m.facing, m.seat, { pose: m.pose, prop: m.prop });
    a.root.visible = true;
    this.occupy(id, name);
  }

  /** The current set's floor height here (raised in a few sets: a stage, the judge's bench). */
  private floorY(x: number, z: number) {
    return this.current.floorAt?.(x, z) ?? 0;
  }

  /** Stand someone anywhere on the floor, off the marks (the main titles' huddle). */
  stand(id: CharacterId, x: number, z: number, facing: number) {
    const a = this.actors[id];
    a.place(new THREE.Vector3(x, this.floorY(x, z), z), facing, null);
    a.root.visible = true;
  }

  /** Penny and Luke, in their spots on the couch. */
  seatKids() {
    for (const id of KIDS) {
      const m = this.sets.future.marks[KID_MARKS[id]];
      const a = this.actors[id];
      a.place(m.pos.clone(), m.facing, m.seat, { pose: m.pose, prop: m.prop });
      a.setEmotion('bored');
      a.root.visible = true;
    }
  }

  get inCutaway() {
    return this.paused !== null;
  }

  /** Cut to the kids on the couch in 2030, freezing the scene in progress. */
  cutToKids() {
    if (this.paused) return;
    const visible = this.onStageIds();
    this.paused = { set: this.current, visible };
    for (const id of visible) this.actors[id].root.visible = false;
    this.current.group.visible = false;
    this.current = this.sets.future;
    this.current.group.visible = true;
    this.current.setTime('night');
    this.seatKids();
  }

  /** Back to the story, exactly where we left it. */
  cutBack() {
    if (!this.paused) return;
    for (const id of KIDS) this.actors[id].root.visible = false;
    this.current.group.visible = false;
    this.current = this.paused.set;
    this.current.group.visible = true;
    for (const id of this.paused.visible) this.actors[id].root.visible = true;
    this.paused = null;
  }

  private nearestNode(p: THREE.Vector3) {
    let best = '';
    let bd = Infinity;
    for (const [k, v] of Object.entries(this.current.nodes)) {
      const d = v.distanceTo(p);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  /** Walk to a mark or next to another character. */
  moveTo(id: CharacterId, target: string): Promise<void> {
    const a = this.actors[id];
    if (!a.root.visible) return this.enter(id, target);
    const prevMarkName = this.actorMark.get(id);
    let name: string;
    let dest: THREE.Vector3;
    let facing: number;
    let seat: number | null = null;
    let approach: THREE.Vector3 | undefined;
    let node: string;
    const other = isCharacterId(target) ? target : null;
    // in a car you can't go stand next to someone: slide over to the free seat nearest them
    if (other && this.current.seated) target = this.seatNear(other, id) ?? (prevMarkName || target);
    if (other && other !== id && this.onStage(other) && !this.current.seated) {
      const o = this.actors[other];
      // Where they'll stand: someone still on their way is met at the end of their walk, not on top of it.
      const op = (o.remainingPath.at(-1) ?? o.position).clone();
      // Approach via their authored aisle, never an arbitrary offset inside a desk or wall.
      const otherMark = this.current.marks[this.actorMark.get(other) ?? ''];
      node = otherMark?.node ?? this.nearestNode(op);
      dest = (otherMark?.approach ?? this.current.nodes[node]).clone();
      if (dest.distanceTo(op) < 0.4) {
        const adjacent = this.current.edges.flatMap(([x, y]) => x === node ? [y] : y === node ? [x] : []);
        const nearby = adjacent.sort((x, y) => this.current.nodes[x].distanceTo(op) - this.current.nodes[y].distanceTo(op))[0];
        if (nearby) dest.lerp(this.current.nodes[nearby], Math.min(1, 0.85 / dest.distanceTo(this.current.nodes[nearby])));
      }
      facing = Math.atan2(op.x - dest.x, op.z - dest.z) * 0.6;
      name = '';
    } else {
      name = this.resolveMark(target, id);
      const m = this.current.marks[name];
      dest = this.markPosition(m, name, id);
      facing = m.facing;
      seat = m.seat;
      approach = m.approach;
      node = m.node;
    }
    if (prevMarkName === name && !a.isWalking) return Promise.resolve();
    const curMark = prevMarkName ? this.current.marks[prevMarkName] : undefined;
    const pts = a.remainingPath;
    const start = pts.at(-1) ?? a.position;
    const fromNode = curMark?.node ?? this.actorNode.get(id) ?? this.nearestNode(start);
    const route = routeNodes(this.current, fromNode, node);
    if (!route) {
      // Separate vehicle compartments are entered through their own doors.
      if (this.current.seated && name) {
        const version = this.sceneVersion;
        return this.exit(id).then(() => {
          if (version === this.sceneVersion) return this.enter(id, name);
        });
      }
      return Promise.resolve();
    }
    this.occupy(id, name || null);
    this.actorNode.set(id, node);
    if (curMark?.approach) pts.push(curMark.approach.clone());
    pts.push(...route);
    if (approach) pts.push(approach.clone());
    pts.push(dest);
    const m = this.current.marks[name];
    return a.walk(joinRoute(pts), { facing, seat, scoot: this.current.seated, pose: m?.pose, prop: m?.prop });
  }

  /** The free seat closest to someone (for sliding over to them in a car). */
  private seatNear(other: CharacterId, id: CharacterId) {
    if (!this.onStage(other)) return undefined;
    const p = this.actors[other].position;
    const reserved = this.current.reserved ?? [];
    let best: string | undefined;
    let bd = Infinity;
    for (const [k, m] of Object.entries(this.current.marks)) {
      if (m.seat === null || k === this.current.door || reserved.includes(k) || !this.isFree(k, id)) continue;
      const d = m.pos.distanceTo(p);
      if (d > 0.1 && d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  /** Sit down in the nearest free seat they can get to. */
  sitDown(id: CharacterId): Promise<void> {
    const a = this.actors[id];
    if (!this.onStage(id) || a.isSitting || this.current.seated) return Promise.resolve();
    const from = this.actorNode.get(id) ?? this.nearestNode(a.position);
    const doors = [this.current.door, ...Object.values(this.current.entrances ?? {}), ...(this.current.reserved ?? [])];
    let best: string | undefined;
    let bd = Infinity;
    for (const [k, m] of Object.entries(this.current.marks)) {
      if (m.seat === null || doors.includes(k) || !this.isFree(k, id) || !routeNodes(this.current, from, m.node)) continue;
      const d = m.pos.distanceTo(a.position);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best ? this.moveTo(id, best) : Promise.resolve();
  }

  /** Get up out of a seat and step into the aisle beside it (there's no standing up in a car). */
  standUp(id: CharacterId): Promise<void> {
    const a = this.actors[id];
    if (!this.onStage(id) || !a.isSitting || this.current.seated) return Promise.resolve();
    const m = this.current.marks[this.actorMark.get(id) ?? ''];
    const node = m?.node ?? this.nearestNode(a.position);
    const dest = (m?.approach ?? this.current.nodes[node]).clone();
    this.occupy(id, null);
    this.actorNode.set(id, node);
    return a.walk([dest], { facing: a.facing, seat: null });
  }

  private entrance(markName?: string) {
    const node = this.current.marks[markName ?? '']?.node;
    return this.current.entrances?.[node] ?? this.current.door;
  }

  enter(id: CharacterId, target?: string): Promise<void> {
    const name = this.resolveMark(target && target !== this.current.door ? target : 'center', id);
    const doorName = this.entrance(name), door = this.current.marks[doorName];
    const a = this.actors[id];
    const pos = door.pos.clone();
    pos.y = this.floorY(pos.x, pos.z);
    a.place(pos, door.facing, this.current.seated ? door.seat : null);
    a.root.visible = true;
    this.occupy(id, doorName);
    return this.moveTo(id, name);
  }

  /** Gone, without walking to the door (a scene picked up after they left). */
  leave(id: CharacterId) {
    this.actors[id].root.visible = false;
    this.actors[id].hold(null);
    this.occupy(id, null);
  }

  /**
   * Split screen: light up another set beside the current one, ready for its own people to be placed on its
   * marks. Everyone already placed stays where they are (on their own set); `setLocation` or `thaw` ends it.
   */
  openPanel(id: LocationId, time: TimeOfDay) {
    this.current = this.sets[id] ?? this.current;
    this.current.group.visible = true;
    this.current.setTime(time);
    this.occupancy.clear();
    this.actorMark.clear();
    this.actorNode.clear();
    this.syncExtras();
  }

  /** Look at one panel's set as the current one (for framing it), without moving anyone. */
  focusPanel(id: LocationId) {
    this.current = this.sets[id] ?? this.current;
  }

  async exit(id: CharacterId) {
    if (!this.onStage(id)) return;
    const version = this.sceneVersion, door = this.entrance(this.actorMark.get(id));
    await this.moveTo(id, door);
    // A skipped scene or a subsequent move must not let an old exit hide the new cast.
    if (version !== this.sceneVersion || this.actorMark.get(id) !== door) return;
    this.actors[id].root.visible = false;
    this.occupy(id, null);
  }

  update(dt: number, t: number) {
    if (this.frozen) return;
    if (this.strobe) {
      this.strobeDt += dt;
      if (this.strobeDt < this.strobe) return;
      dt = this.strobeDt;
      this.strobeDt = 0;
    }
    if (this.establishingCast) {
      this.establishing!.update(dt);
      return;
    }
    for (const a of Object.values(this.actors)) if (a.root.visible) a.update(dt, t);
    // step actors up onto raised floors
    const floorAt = this.current.floorAt;
    if (floorAt)
      for (const a of Object.values(this.actors)) {
        if (!a.root.visible) continue;
        const p = a.root.position;
        p.y += (floorAt(p.x, p.z) - p.y) * Math.min(1, dt * 14);
      }
    for (const e of this.extras) {
      if (!this.sets[e.set].group.visible) continue;
      if (e.mark) e.actor.root.visible = !this.occupancy.has(e.mark);
      if (!e.chatty) {
        e.actor.update(dt, t);
        continue;
      }
      e.talkT -= dt;
      if (e.talkT < 0) {
        e.actor.talking = !e.actor.talking;
        e.talkT = e.actor.talking ? rand(1, 3) : rand(1.5, 5);
        if (!e.actor.talking && Math.random() < 0.3) e.actor.doGesture('drink');
        if (Math.random() < 0.15) e.actor.setEmotion(pick(['happy', 'neutral', 'neutral'] as const));
      }
      e.actor.update(dt, t);
    }
    this.current.update?.(dt, t);
  }

  occluders(): THREE.Mesh[] {
    // Include walls, chair backs and new props automatically, even without a legacy tag.
    this.current.group.updateWorldMatrix(true, true);
    return (this.scenery.get(this.current) ?? []).filter(o => {
      for (let parent: THREE.Object3D | null = o; parent; parent = parent.parent) if (!parent.visible) return false;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      return materials.some(m => m.visible && (!m.transparent || m.opacity >= 0.8));
    });
  }
}

const costumeKey = ({ character: _, ...look }: Costume) => JSON.stringify(look);
