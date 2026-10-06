import * as THREE from 'three';
import { mesh } from '../engine/materials';
import { ellipsoid } from '../engine/shapes';
import { damp, lerp } from '../util';

export type HandShape = 'relaxed' | 'open' | 'grip' | 'fist' | 'point' | 'thumbs_up' | 'quotes';

/** A wrist, palm, four two-jointed fingers and an opposing thumb. Local -y is the
 * fingers, +z the thumb, and -side*x the palm. Props share the same moving wrist. */
export class Hand {
  readonly wrist = new THREE.Group();
  readonly socket = new THREE.Group();
  readonly fingers: { base: THREE.Group; tip: THREE.Group }[] = [];
  readonly thumb = new THREE.Group();
  readonly palm: THREE.Mesh;
  private shoulderPose = new THREE.Quaternion();
  private elbowPose = new THREE.Quaternion();
  private handPose = new THREE.Quaternion();

  constructor(readonly side: number, readonly scale: number, skin: THREE.Material) {
    const s = scale;
    this.wrist.name = side > 0 ? 'left-wrist' : 'right-wrist';
    this.palm = mesh(ellipsoid(0.016 * s, 0.029 * s, 0.033 * s, 10, 8), skin, 0, -0.03 * s, 0);
    this.wrist.add(this.palm);
    for (let i = 0; i < 4; i++) {
      const base = new THREE.Group(), tip = new THREE.Group();
      const length = [0.018, 0.024, 0.026, 0.023][i] * s;
      base.position.set(0, -0.051 * s, (i - 1.5) * 0.016 * s);
      base.add(mesh(ellipsoid(0.009 * s, length * 0.6, 0.0085 * s, 7, 6), skin, 0, -length / 2, 0));
      tip.position.y = -length;
      tip.add(mesh(ellipsoid(0.008 * s, length * 0.53, 0.008 * s, 7, 6), skin, 0, -length * 0.4, 0));
      base.add(tip);
      this.wrist.add(base);
      this.fingers.push({ base, tip });
    }
    this.thumb.position.set(-side * 0.012 * s, -0.017 * s, 0.027 * s);
    this.thumb.add(mesh(ellipsoid(0.011 * s, 0.013 * s, 0.024 * s, 8, 6), skin, 0, 0, 0.013 * s));
    this.wrist.add(this.thumb);
    this.socket.name = 'grip';
    this.socket.position.set(-side * 0.045 * s, -0.035 * s, 0);
    this.socket.rotation.x = Math.PI / 2;
    this.wrist.add(this.socket);
    this.shape('relaxed', 1);
  }

  shape(shape: HandShape, weight: number, curl = 0) {
    this.fingers.forEach(({ base, tip }, i) => {
      let bend = shape === 'open' ? 0.04 : shape === 'grip' ? 0.85 : shape === 'relaxed' ? 0.18 : 1.45;
      if (shape === 'point' && i === 3) bend = 0.02;
      if (shape === 'quotes' && i >= 2) bend = 0.06 + curl * 1.05;
      base.rotation.z = lerp(base.rotation.z, -this.side * bend, weight);
      tip.rotation.z = lerp(tip.rotation.z, -this.side * (shape === 'grip' ? 1.35 : bend * 0.8), weight);
    });
    this.thumb.rotation.y = lerp(this.thumb.rotation.y, -this.side * (shape === 'thumbs_up' ? -0.12 : shape === 'open' ? 0.3 : 0.95), weight);
    this.thumb.rotation.x = lerp(this.thumb.rotation.x, shape === 'thumbs_up' ? -0.1 : 0.45, weight);
  }

  /** Ease the complete solved arm across interruptions and prop changes. A held
   * object's orientation stays controlled even while its elbow catches up. */
  settle(shoulder: THREE.Group, elbow: THREE.Group, dt: number, snap: boolean, holding: boolean) {
    const amount = snap ? 1 : damp(30, dt);
    const orientation = shoulder.quaternion.clone().multiply(elbow.quaternion).multiply(this.wrist.quaternion);
    const step = (from: THREE.Quaternion, to: THREE.Quaternion) => snap ? 1 : Math.min(amount, dt * 6 / Math.max(0.001, from.angleTo(to)));
    this.shoulderPose.slerp(shoulder.quaternion, step(this.shoulderPose, shoulder.quaternion));
    this.elbowPose.slerp(elbow.quaternion, step(this.elbowPose, elbow.quaternion));
    this.handPose.slerp(orientation, holding ? 1 : amount);
    shoulder.quaternion.copy(this.shoulderPose);
    elbow.quaternion.copy(this.elbowPose);
    this.wrist.quaternion.copy(this.shoulderPose).multiply(this.elbowPose).invert().multiply(this.handPose);
  }
}

/** Orientation from the direction the fingers point and the outward palm normal. */
export function handOrientation(side: number, fingers: THREE.Vector3, palm: THREE.Vector3) {
  const y = fingers.clone().normalize().negate();
  const x = palm.clone().addScaledVector(y, -palm.dot(y)).normalize().multiplyScalar(-side);
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Two-bone IK in the shoulder parent's space. The elbow bends forward in a plane
 * chosen by its pole; length is preserved and unreachable targets never stretch it. */
export function reachArm(shoulder: THREE.Group, elbow: THREE.Group, wrist: THREE.Group, target: THREE.Vector3, pole: THREE.Vector3, weight: number) {
  const upper = -elbow.position.y, lower = -wrist.position.y;
  const direction = target.clone().sub(shoulder.position);
  const distance = THREE.MathUtils.clamp(direction.length(), Math.abs(upper - lower) + 0.001, upper + lower - 0.001);
  direction.normalize();
  const bend = pole.clone().addScaledVector(direction, -pole.dot(direction)).normalize();
  if (bend.lengthSq() < 0.001) bend.set(1, 0, 0).addScaledVector(direction, -direction.x).normalize();
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const joint = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
  const upperDir = joint.clone().normalize();
  const lowerDir = direction.clone().multiplyScalar(distance).sub(joint).normalize();
  const y = upperDir.clone().negate();
  const z = lowerDir.clone().addScaledVector(upperDir, -lowerDir.dot(upperDir)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  shoulder.quaternion.slerp(q, weight);
  elbow.rotation.x = lerp(elbow.rotation.x, -Math.acos(THREE.MathUtils.clamp(upperDir.dot(lowerDir), -1, 1)), weight);
}
