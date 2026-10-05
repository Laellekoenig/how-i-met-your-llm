import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { walkingBlockers } from './helpers/geometry';
import { routeNodes } from '../src/show/navigation';
import { Director } from '../src/show/director';
import type { Actor } from '../src/world/actor';
import type { CharacterId } from '../src/script/types';
import { RERUNS } from '../src/script/samples';
import type { CutawayBeat } from '../src/script/types';

const stage = testStage();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
const director = new Director(camera, stage);

function expectVisible(actor: Actor, label: string) {
  camera.updateMatrixWorld();
  for (const dy of [0, -0.25]) {
    const point = actor.headWorld.add(new THREE.Vector3(0, dy, 0));
    const projected = point.clone().project(camera);
    expect(Math.abs(projected.x), label).toBeLessThan(0.9);
    expect(Math.abs(projected.y), label).toBeLessThan(0.9);
    expect(projected.z, label).toBeGreaterThan(-1);
    expect(projected.z, label).toBeLessThan(1);
    const ray = new THREE.Raycaster(camera.position.clone(), point.clone().sub(camera.position).normalize(), 0, camera.position.distanceTo(point) - 0.12);
    const others = [...Object.values(stage.actors), ...stage.extras.filter(e => e.set === stage.current.id).map(e => e.actor)]
      .filter(a => a !== actor && a.root.visible).flatMap(a => {
        a.root.updateWorldMatrix(true, true);
        return a.bodyMeshes;
      });
    expect(ray.intersectObjects([...stage.occluders(), ...others], false).length, label).toBe(0);
    ray.set(point, camera.position.clone().sub(point).normalize());
    expect(ray.intersectObjects(stage.occluders(), false).filter(hit => hit.distance >= 0.12 && !hit.object.userData.cameraBackdrop).length, label).toBe(0);
  }
}

function expectBackdrop(label: string) {
  if (director.current!.kind === 'wide') return;
  camera.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  for (const x of [-0.85, 0, 0.85]) for (const y of [-0.1, 0.25, 0.7]) {
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    expect(ray.intersectObjects(stage.occluders(), false).length, `${label}/backdrop/${x}/${y}`).toBeGreaterThan(0);
  }
}

function finishMove(id: 'ted', maxSeconds = 60) {
  const a = stage.actors[id];
  for (let tick = 0; tick < maxSeconds * 30 && a.isWalking; tick++) stage.update(1 / 30, tick / 30);
  expect(a.isWalking).toBe(false);
}

describe('current set navigation', () => {
  for (const set of Object.values(stage.sets)) {
    test(`${set.id}: every mark is reachable from its entrance`, () => {
      for (const [name, mark] of Object.entries(set.marks)) {
        expect(set.nodes[mark.node], name).toBeDefined();
        const entrance = set.entrances?.[mark.node] ?? set.door;
        expect(routeNodes(set, set.marks[entrance].node, mark.node), name).not.toBeNull();
        for (const value of [...mark.pos.toArray(), mark.facing, ...set.nodes[mark.node].toArray()]) expect(Number.isFinite(value)).toBe(true);
      }
      for (const [a, b] of set.edges) {
        expect(set.nodes[a]).toBeDefined();
        expect(set.nodes[b]).toBeDefined();
      }
    });
    if (!set.seated) test(`${set.id}: walking aisles and approaches clear the actual furniture`, () => {
      for (const [a, b] of set.edges) expect(walkingBlockers(set, set.nodes[a], set.nodes[b]), `${a} → ${b}`).toEqual([]);
      for (const [name, mark] of Object.entries(set.marks)) {
        // The final step into a seat is deliberately allowed to overlap its cushion.
        expect(walkingBlockers(set, set.nodes[mark.node], mark.approach ?? mark.pos), name).toEqual([]);
      }
    });
  }

  test('short moves still go around the coffee table and use the original seat approach', () => {
    stage.setLocation('apartment', 'day');
    stage.place('ted', 'couch_center');
    void stage.moveTo('ted', 'center');
    const path = stage.actors.ted.remainingPath;
    expect(path[0].distanceTo(stage.current.marks.couch_center.approach!)).toBeLessThan(0.001);
    for (let i = 1; i < path.length; i++) expect(walkingBlockers(stage.current, path[i - 1], path[i])).toEqual([]);
    finishMove('ted');
    expect(stage.actors.ted.position.distanceTo(stage.current.marks.center.pos)).toBeLessThan(0.01);
  });

  test('an interrupted walk keeps its remaining corners before taking the next route', () => {
    stage.setLocation('apartment', 'day');
    stage.place('ted', 'kitchen');
    void stage.moveTo('ted', 'center');
    stage.update(0.05, 0);
    const pending = stage.actors.ted.remainingPath;
    void stage.moveTo('ted', 'bedroom_ted');
    expect(stage.actors.ted.remainingPath.slice(0, pending.length)).toEqual(pending);
    finishMove('ted');
    expect(stage.actors.ted.position.y).toBeCloseTo(0.3, 2);
  });

  test('unconnected nodes never fabricate a straight route through a partition', () => {
    expect(routeNodes(stage.sets.taxi, 'back', 'front')).toBeNull();
    expect(routeNodes(stage.sets.limo, 'bench_r', 'driver')).toBeNull();
  });

  test('front passengers and drivers enter and exit through their own compartment doors', async () => {
    for (const [location, mark] of [['taxi', 'front_passenger'], ['limo', 'driver']] as const) {
      stage.setLocation(location, 'night');
      const entering = stage.enter('ted', mark);
      const door = stage.current.marks[stage.current.entrances![stage.current.marks[mark].node]];
      expect(stage.actors.ted.position.distanceTo(door.pos)).toBeLessThan(0.01);
      finishMove('ted'); await entering;
      expect(stage.markOf('ted')).toBe(mark);
      const exiting = stage.exit('ted');
      finishMove('ted'); await exiting;
      expect(stage.onStage('ted')).toBe(false);
    }
  });

  test('moving between vehicle compartments exits and reenters without crossing the divider', async () => {
    stage.setLocation('taxi', 'night'); stage.place('ted', 'back_right');
    const moved = stage.moveTo('ted', 'front_passenger');
    expect(stage.actors.ted.remainingPath.every(p => p.z < 0)).toBe(true);
    finishMove('ted'); await Promise.resolve(); await Promise.resolve();
    expect(stage.actors.ted.remainingPath.every(p => p.z > 0)).toBe(true);
    finishMove('ted'); await moved;
    expect(stage.markOf('ted')).toBe('front_passenger');
  });

  test('background occupants yield before the first camera cut', () => {
    stage.setLocation('restaurant', 'day');
    const diner = stage.extras.find(e => e.set === 'restaurant' && e.mark === 'table_2_left')!;
    expect(diner.actor.root.visible).toBe(true);
    stage.place('ted', 'table_2_left');
    expect(diner.actor.root.visible).toBe(false);
  });
});

const rerunScenes = RERUNS.flatMap((ep) => ep.scenes.flatMap((scene, i) => [
  { ...scene, guests: ep.guests, label: `${ep.meta.title} ${i + 1}: ${scene.location}` },
  ...scene.beats.filter((b): b is CutawayBeat => b.type === 'cutaway').map((c) => ({ ...c, guests: ep.guests, label: `${ep.meta.title} ${i + 1}: ${c.style} cutaway at ${c.location}` })),
]));

describe('camera coverage on the current sets', () => {
  for (const scene of rerunScenes) test(`${scene.label} covers the cast and both sides of each conversation`, () => {
    stage.castGuests(scene.guests);
    stage.setLocation(scene.location, scene.time);
    for (const c of scene.cast) {
      expect(stage.current.marks[c.mark], `${c.character}/${c.mark}`).toBeDefined();
      stage.place(c.character, c.mark);
      expect(stage.markOf(c.character)).toBe(c.mark);
    }
    director.coverage(stage.castIds());
    for (const c of scene.cast) expectVisible(stage.actors[c.character], `${scene.location}/${c.character}/wide`);
    for (const a of scene.cast) {
      director.closeup(a.character);
      expectVisible(stage.actors[a.character], `${a.character}/closeup`);
      expectBackdrop(`${a.character}/closeup`);
      for (const b of scene.cast) if (a !== b) {
        for (const shot of ['twoShot', 'overShoulder'] as const) {
          director[shot](a.character, b.character);
          expectVisible(stage.actors[a.character], `${a.character}/${b.character}/${shot}`);
          expectBackdrop(`${a.character}/${b.character}/${shot}`);
          if (director.current!.kind === 'two') expectVisible(stage.actors[b.character], `${b.character}/two`);
        }
      }
    }
  });

  for (const set of Object.values(stage.sets)) test(`${set.id}: every mark has unobstructed, in-frame dialogue coverage`, () => {
    const cast: CharacterId[] = set.id === 'future' ? ['penny', 'luke'] : ['ted', 'marshall', 'patrice'];
    for (const id of cast) {
      stage.setLocation(set.id, 'day');
      for (const name of Object.keys(set.marks)) {
        stage.place(id, name);
        director.closeup(id);
        expectVisible(stage.actors[id], `${set.id}/${name}/${id}`);
      }
    }
  });

  test('two-shots and shoulder shots keep the speaker visible across every pair of marks', () => {
    for (const set of Object.values(stage.sets)) {
      const marks = Object.keys(set.marks).filter(m => !m.includes('door'));
      for (const [i, first] of marks.entries()) for (const second of marks.slice(i + 1)) {
        stage.setLocation(set.id, 'day');
        stage.place('ted', first); stage.place('robin', second);
        for (const shot of ['twoShot', 'overShoulder'] as const) {
          director[shot]('ted', 'robin');
          expectVisible(stage.actors.ted, `${set.id}/${first}/${second}/${shot}`);
        }
      }
    }
  });

  test('new master wides cover every mark, including short actors behind reception', () => {
    for (const location of ['subway', 'laser_tag', 'wesleyan_dorm', 'hospital', 'elevator', 'canadian_mall'] as const) {
      for (const id of ['marshall', 'patrice'] as const) for (const name of Object.keys(stage.sets[location].marks)) {
        stage.setLocation(location, 'day');
        stage.place(id, name);
        director.wide(0, 0);
        expectVisible(stage.actors[id], `${location}/${name}/${id}/master`);
      }
    }
  });

  test('subway and elevator group coverage keeps people large enough in the picture', () => {
    for (const [location, minimumHeight] of [['subway', 0.25], ['elevator', 0.30]] as const) {
      const scene = RERUNS.flatMap(ep => ep.scenes).find(s => s.location === location)!;
      stage.setLocation(location, 'day');
      for (const c of scene.cast) stage.place(c.character, c.mark);
      director.coverage(stage.castIds());
      expect(director.current!.kind).toBe('wide');
      camera.updateMatrixWorld();
      for (const id of stage.castIds()) {
        const actor = stage.actors[id];
        const head = actor.headWorld.add(new THREE.Vector3(0, 0.1, 0)).project(camera);
        const floor = actor.position.clone().project(camera);
        expect((head.y - floor.y) / 2, `${location}/${id}/picture height`).toBeGreaterThan(minimumHeight);
        expectVisible(actor, `${location}/${id}/closer coverage`);
      }
    }
  });

  test('opposite subway benches get close-ups instead of a distant generated two-shot', () => {
    stage.setLocation('subway', 'day');
    stage.place('ted', 'seat_left'); stage.place('robin', 'seat_right_window');
    for (const [speaker, listener] of [['ted', 'robin'], ['robin', 'ted']] as const) {
      director.twoShot(speaker, listener);
      expect(director.current!.kind).toBe('closeup');
      expectVisible(stage.actors[speaker], `${speaker}/opposite benches`);
    }
    // With both people on one bench, the authored close pair stays preferred.
    stage.place('robin', 'seat_left_inner');
    director.coverage(['ted', 'robin']);
    expect(director.current!.pos.distanceTo(stage.sets.subway.wides[3].pos)).toBeLessThan(0.01);
  });

  test('a reverse-facing apartment chair gets a face angle backed by scenery', () => {
    stage.setLocation('apartment', 'day'); stage.place('robin', 'woven_chair');
    director.closeup('robin');
    const actor = stage.actors.robin;
    const forward = new THREE.Vector3(Math.sin(actor.facing), 0, Math.cos(actor.facing));
    expect(camera.position.clone().sub(actor.headWorld).normalize().dot(forward)).toBeGreaterThan(0.1);
    const ray = new THREE.Raycaster();
    camera.updateMatrixWorld(); ray.setFromCamera(new THREE.Vector2(0.65, 0.7), camera);
    expect(ray.intersectObjects(stage.occluders(), false).length).toBeGreaterThan(0);
    expectVisible(actor, 'woven chair reverse');
  });

  test('group wides cover both the professor and students, and the whole limo bench', () => {
    for (const [location, cast] of [
      ['lecture_hall', [['ted', 'lectern'], ['robin', 'student_1_4'], ['barney', 'student_2_3'], ['marshall', 'student_3_5']]],
      ['limo', [['ted', 'rear_seat_left'], ['robin', 'rear_seat_right'], ['marshall', 'bench_1'], ['lily', 'bench_2'], ['barney', 'bench_3']]],
    ] as const) {
      stage.setLocation(location, 'day');
      for (const [id, mark] of cast) stage.place(id, mark);
      director.coverage(stage.castIds());
      expect(director.current!.kind).toBe('wide');
      for (const [id] of cast) expectVisible(stage.actors[id], `${location}/${id}/group wide`);
    }
  });

  test('students get reverse coverage facing the chalkboard', () => {
    stage.setLocation('lecture_hall', 'day'); stage.place('ted', 'student_3_6');
    director.closeup('ted');
    expect(director.current!.pos.z).toBeLessThan(stage.actors.ted.position.z);
    expectVisible(stage.actors.ted, 'student reverse');
  });

  test('long held shots stop pushing before they enter the set', () => {
    stage.setLocation('apartment', 'day'); stage.place('ted', 'couch_left');
    director.closeup('ted');
    for (let i = 0; i < 100; i++) director.update(0.05);
    const settled = director.current!.pos.clone();
    for (let i = 0; i < 100; i++) director.update(0.5);
    expect(director.current!.pos.distanceTo(settled)).toBeLessThan(0.001);
    expectVisible(stage.actors.ted, 'held closeup');
  });

  test('placement updates head height and facing before selecting the first shot', () => {
    stage.setLocation('apartment', 'day'); stage.place('ted', 'couch_left');
    const seatedHead = stage.actors.ted.headWorld.y;
    stage.place('ted', 'bedroom_ted');
    expect(stage.actors.ted.headWorld.y - seatedHead).toBeGreaterThan(0.5);
    expect(stage.actors.ted.root.rotation.y).toBe(stage.current.marks.bedroom_ted.facing);
    director.closeup('ted'); expectVisible(stage.actors.ted, 'landing first frame');
  });
});
