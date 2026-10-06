import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import './helpers/sets'; // canvas shim for the procedural textures
import { buildEstablishing } from '../src/world/sets/establishing';

const exterior = buildEstablishing();
const facade = exterior.group.getObjectByName('exterior_walkup')!;

function visibleMeshes() {
  exterior.group.updateMatrixWorld(true);
  const meshes: THREE.Object3D[] = [];
  exterior.group.traverseVisible(o => { if (o instanceof THREE.Mesh) meshes.push(o); });
  return meshes;
}

describe('shared MacLaren’s and apartment exterior', () => {
  test('pub, apartment and rooftop reuse the facade; other destinations switch it off', () => {
    for (const location of ['maclarens', 'apartment', 'rooftop'] as const) {
      exterior.show('exterior', location, 'day');
      expect(facade.visible).toBe(true);
      for (const sibling of facade.parent!.children.filter(o => o.name.startsWith('exterior_') && o !== facade)) expect(sibling.visible).toBe(false);
    }
    for (const location of ['barneys', 'office', 'store', 'restaurant', 'metro_news_one'] as const) {
      exterior.show('exterior', location, 'day');
      expect(facade.visible).toBe(false);
      // A destination without a basement must still have a continuous sidewalk.
      const hits = new THREE.Raycaster(new THREE.Vector3(-2.8, 0.7, -5), new THREE.Vector3(0, -1, 0)).intersectObjects(visibleMeshes(), false);
      expect(hits[0].point.y).toBeCloseTo(0.16);
    }
  });

  test('the pub landing is below the sidewalk and the apartment door is above it', () => {
    exterior.show('exterior', 'maclarens', 'day');
    const floor = facade.getObjectByName('pub_areaway_floor')!;
    const door = facade.getObjectByName('apartment_front_door')!;
    expect(new THREE.Box3().setFromObject(floor).max.y).toBeLessThan(0);
    expect(new THREE.Box3().setFromObject(door).min.y).toBeGreaterThan(2);
    // Catch a continuous sidewalk/road accidentally filling the basement opening.
    const origin = floor.position.clone().add(new THREE.Vector3(-0.6, 6, 0));
    const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0)).intersectObjects(visibleMeshes(), false)[0];
    expect(hit.object).toBe(floor);
  });

  for (const time of ['day', 'night'] as const) for (const location of ['maclarens', 'apartment'] as const) {
    test(`${location} / ${time}: entrance landmarks remain framed and unobstructed throughout the move`, () => {
      const shot = exterior.show('exterior', location, time);
      const meshes = visibleMeshes();
      const sign = facade.getObjectByName('maclarens_pub_sign')!;
      const door = facade.getObjectByName('apartment_front_door')!;
      const points = [sign.position.clone().add(new THREE.Vector3(0, 0, 0.02))];
      if (location === 'apartment') points.push(door.position.clone().add(new THREE.Vector3(0, 0, 0.22)));
      const camera = new THREE.PerspectiveCamera(shot.fov, 16 / 9, 0.1, 600);
      for (const seconds of [0, 1, 2, 3, 4]) {
        camera.position.copy(shot.pos).addScaledVector(shot.move, seconds);
        camera.lookAt(shot.target.clone().addScaledVector(shot.look, seconds));
        camera.updateMatrixWorld(true);
        for (const point of points) {
          const projected = point.clone().project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.9);
          expect(Math.abs(projected.y)).toBeLessThan(0.9);
          const delta = point.clone().sub(camera.position);
          const ray = new THREE.Raycaster(camera.position, delta.clone().normalize(), 0, delta.length() - 0.03);
          expect(ray.intersectObjects(meshes, false)).toHaveLength(0);
        }
      }
    });
  }
});
