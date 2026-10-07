import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { Director } from '../src/show/director';

const stage = testStage();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 60);
const director = new Director(camera, stage);
const ray = new THREE.Raycaster();

/** Sample independently of the director's selection grid, including the picture edges. */
function exposedFrame(columns = 20, rows = 12, rejectSky = false) {
  camera.updateMatrixWorld(true);
  const scenery = stage.occluders();
  const gaps: string[] = [];
  ray.near = camera.near;
  ray.far = camera.far;
  for (let column = 0; column <= columns; column++) for (let row = 0; row <= rows; row++) {
    const x = -0.99 + 1.98 * column / columns, y = -0.99 + 1.98 * row / rows;
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const hit = ray.intersectObjects(scenery, false)[0];
    if (!hit || (rejectSky && hit.object.userData.cameraBackdrop)) gaps.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return gaps;
}

describe('complete camera backgrounds', () => {
  for (const set of Object.values(stage.sets)) for (const time of ['day', 'night'] as const) {
    test(`${set.id}/${time}: every authored wide and every mark's single fills the frame`, () => {
      stage.setLocation(set.id, time);
      for (let index = 0; index < set.wides.length; index++) {
        director.wide(index, 0);
        expect(exposedFrame(), `wide ${index}`).toEqual([]);
      }
      const id = set.id === 'future' ? 'penny' : 'ted';
      for (const mark of Object.keys(set.marks)) {
        stage.place(id, mark);
        director.closeup(id);
        expect(director.current!.kind, mark).toBe('closeup');
        expect(exposedFrame(), mark).toEqual([]);
      }
    });
  }

  test('MacLaren’s block has no sky seams between its buildings in either direction', () => {
    for (const time of ['day', 'night'] as const) {
      stage.setLocation('maclarens_sidewalk', time);
      for (let index = 0; index < stage.current.wides.length; index++) {
        director.wide(index, 0);
        expect(exposedFrame(100, 24, true), `${time}/wide ${index}`).toEqual([]);
      }
      for (const mark of Object.keys(stage.current.marks)) {
        stage.place('ted', mark);
        director.closeup('ted');
        expect(exposedFrame(40, 16, true), `${time}/${mark}`).toEqual([]);
      }
    }
  });

  test('reverse-facing foreground seats and the storytelling mark get face coverage', () => {
    for (const [location, mark, minimum] of [['apartment', 'striped_chair', -0.3], ['apartment', 'woven_chair', 0.1], ['future', 'center', 0.1]] as const) {
      stage.setLocation(location, 'day');
      stage.place('ted', mark);
      director.closeup('ted');
      const actor = stage.actors.ted;
      const front = new THREE.Vector3(Math.sin(actor.facing), 0, Math.cos(actor.facing));
      expect(director.current!.kind).toBe('closeup');
      // A chair facing straight upstage has no reverse on an open set, so it gets a profile.
      expect(camera.position.clone().sub(actor.headWorld).normalize().dot(front)).toBeGreaterThan(minimum);
      expect(exposedFrame()).toEqual([]);
    }
  });

  test('no apartment angle looks out through the open audience side', () => {
    const open = stage.sets.apartment.openSide!;
    const outside = () => {
      camera.updateMatrixWorld(true);
      const scenery = stage.occluders(), seen: string[] = [];
      for (let column = 0; column <= 20; column++) for (let row = 0; row <= 12; row++) {
        ray.setFromCamera(new THREE.Vector2(-0.99 + 1.98 * column / 20, -0.99 + 1.98 * row / 12), camera);
        const hit = ray.intersectObjects(scenery, false)[0];
        if (!hit || open.distanceToPoint(hit.point) > -0.05) seen.push(`${column},${row}`);
      }
      return seen;
    };
    stage.setLocation('apartment', 'night');
    const marks = Object.keys(stage.current.marks);
    for (let index = 0; index < stage.current.wides.length; index++) {
      director.wide(index, 0);
      expect(outside(), `wide ${index}`).toEqual([]);
    }
    for (const [i, a] of marks.entries()) for (const b of marks.slice(i + 1)) {
      stage.setLocation('apartment', 'night');
      stage.place('ted', a);
      stage.place('marshall', b);
      for (const [label, shoot] of [
        ['closeup', () => director.closeup('ted', 'marshall')],
        ['reverse closeup', () => director.closeup('marshall', 'ted')],
        ['push-in', () => director.pushIn('ted', 'marshall')],
        ['two-shot', () => director.twoShot('ted', 'marshall')],
        ['shoulder', () => director.overShoulder('ted', 'marshall')],
        ['reverse shoulder', () => director.overShoulder('marshall', 'ted')],
      ] as const) {
        shoot();
        expect(outside(), `${label}: ted at ${a}, marshall at ${b}`).toEqual([]);
      }
    }
  }, 60000);
});
