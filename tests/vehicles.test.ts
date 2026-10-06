import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { Director } from '../src/show/director';
import { routeNodes } from '../src/show/navigation';
import { validateEpisode } from '../src/script/validate';
import type { CharacterId, LocationId } from '../src/script/types';

const stage = testStage();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
const director = new Director(camera, stage);
const casts: Partial<Record<LocationId, [CharacterId, string][]>> = {
  car: [['marshall', 'driver'], ['ted', 'front_passenger'], ['lily', 'back_middle'], ['robin', 'back_left'], ['barney', 'back_right']],
  taxi: [['ted', 'back_left'], ['robin', 'back_right'], ['lily', 'back_middle'], ['barney', 'front_passenger'], ['ranjit', 'driver']],
  limo: [['barney', 'rear_seat_left'], ['robin', 'rear_seat_right'], ['ted', 'bench_1'], ['lily', 'bench_2'], ['marshall', 'bench_3'], ['ranjit', 'driver']],
};

describe('vehicle coverage', () => {
  for (const location of ['car', 'taxi', 'limo'] as const) {
    test(`${location}: occupied seats get fixed, unobstructed singles and matching reverses`, () => {
      stage.setLocation(location, 'day');
      const cast = casts[location]!;
      for (const [id, mark] of cast) stage.place(id, mark);
      for (const [id] of cast) {
        director.closeup(id);
        expect(director.current!.kind, `${location}/${id}`).toBe('closeup');
        expect(stage.current.dialogueCameras!.some(p => p.equals(camera.position))).toBe(true);
        const head = stage.actors[id].headWorld;
        camera.updateMatrixWorld();
        const ndc = head.clone().project(camera);
        expect(Math.abs(ndc.x)).toBeLessThan(0.85);
        expect(Math.abs(ndc.y)).toBeLessThan(0.85);
        const ray = new THREE.Raycaster(camera.position, head.clone().sub(camera.position).normalize(), 0, camera.position.distanceTo(head) - 0.12);
        expect(ray.intersectObjects(stage.occluders(), false)).toHaveLength(0);
        const position = camera.position.clone();
        const partner = cast.find(([other]) => other !== id)![0];
        director.overShoulder(id, partner);
        expect(director.current!.kind).toBe('closeup');
        expect(camera.position.equals(position)).toBe(true);
        director.pushIn(id);
        director.update(2);
        expect(camera.position.equals(position)).toBe(true);
      }
      director.twoShot(cast[0][0], cast[1][0]);
      expect(director.current!.kind).toBe('two');
      director.twoShot(cast[1][0], cast[0][0]);
      expect(director.current!.kind).toBe('two');
    });
  }

  test('ordinary car is scriptable, has no chauffeur and enters each row through its own door', () => {
    stage.setLocation('car', 'day');
    expect(stage.castIds()).toEqual([]);
    expect(stage.extras.filter(e => e.set === 'car')).toHaveLength(0);
    expect(routeNodes(stage.current, 'back', 'front')).toBeNull();
    expect(stage.current.entrances!.front).toBe('front_door');
    const episode = {
      code: 'S99E01', title: 'The Drive', logline: 'A normal drive.',
      scenes: [{ location: 'car', time: 'day', cast: [
        { character: 'marshall', mark: 'driver' }, { character: 'ted', mark: 'front_passenger' },
      ], beats: [{ type: 'say', character: 'ted', to: 'marshall', line: 'Next exit.', shot: 'two' }] }],
    };
    expect(validateEpisode(episode, stage.sets).errors).toEqual([]);
  });

  test('rear-center passenger single stays in the rear compartment, not on the hood', () => {
    stage.setLocation('car', 'day');
    for (const [id, mark] of casts.car!) stage.place(id, mark);
    director.closeup('lily');
    expect(camera.position.z).toBeLessThan(0);
  });
});
