import * as THREE from 'three';
import { DoctorPosture, SkeletonBones } from './DoctorBoyTypes';

/**
 * DoctorBoyLookController
 * 
 * Implements biomechanically sound head, neck, and gaze tracking.
 * - Smooth damped slerp interpolation (never snap)
 * - Coordinated human turn chain:
 *   Gaze shifts -> Head leads -> Neck follows -> Spine2/Shoulders provide subtle supportive twist
 * - Micro-saccades & natural gaze aversion (humans glance away briefly rather than staring unnaturally)
 * - Safe fallback: If eye bones or morph targets are absent, operates seamlessly without errors.
 */

export class DoctorBoyLookController {
  private bones: SkeletonBones;
  
  // Target tracking coordinates (normalized -1 to 1)
  private currentLook = new THREE.Vector2(0, 0);
  private targetLook = new THREE.Vector2(0, 0);

  // Gaze aversion / micro-saccade timing
  private lastGazeShiftTime = 0;
  private gazeOffset = new THREE.Vector2(0, 0);
  private isAvertingGaze = false;

  // Rest quaternions to layer relative procedural offsets
  private headBaseQuat = new THREE.Quaternion();
  private neckBaseQuat = new THREE.Quaternion();
  private spineBaseQuat = new THREE.Quaternion();

  private hasCapturedBase = false;

  // Scratch quaternions to avoid per-frame allocations
  private qHeadDelta = new THREE.Quaternion();
  private qNeckDelta = new THREE.Quaternion();
  private qSpineDelta = new THREE.Quaternion();
  private eulerScratch = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(bones: SkeletonBones) {
    this.bones = bones;
  }

  public captureBaseRotations() {
    if (this.bones.head) this.headBaseQuat.copy(this.bones.head.quaternion);
    if (this.bones.neck) this.neckBaseQuat.copy(this.bones.neck.quaternion);
    if (this.bones.spine2) this.spineBaseQuat.copy(this.bones.spine2.quaternion);
    this.hasCapturedBase = true;
  }

  public setTarget(x: number, y: number) {
    // Clamp to realistic anatomical gaze cone
    this.targetLook.x = THREE.MathUtils.clamp(x, -0.9, 0.9);
    this.targetLook.y = THREE.MathUtils.clamp(y, -0.6, 0.6);
  }

  public update(delta: number, elapsed: number, posture: DoctorPosture = 'NEUTRAL') {
    if (!this.bones.head && !this.bones.neck) return;

    // 1. Natural Gaze Aversion & Micro-Saccade Logic
    // Real humans do not maintain a permanent locked stare; every 4-8s they glance briefly away
    if (elapsed - this.lastGazeShiftTime > (this.isAvertingGaze ? 1.0 : 5.5 + Math.sin(elapsed) * 1.5)) {
      this.lastGazeShiftTime = elapsed;
      this.isAvertingGaze = !this.isAvertingGaze;

      if (this.isAvertingGaze) {
        // Natural small glance downward or to the side
        this.gazeOffset.set(
          (Math.random() - 0.5) * 0.25,
          -0.08 - Math.random() * 0.12
        );
      } else {
        this.gazeOffset.set(0, 0);
      }
    }

    // Micro-saccades (tiny imperceptible eye/head twitches)
    const saccadeX = Math.sin(elapsed * 9.5) * 0.008;
    const saccadeY = Math.cos(elapsed * 8.2) * 0.006;

    // 2. Posture specific head tilts
    let posturePitch = 0;
    let postureYaw = 0;
    let postureRoll = 0;

    switch (posture) {
      case 'LISTENING':
        postureRoll = -0.08; // Inquisitive head tilt
        posturePitch = 0.04;
        break;
      case 'THINKING':
        postureYaw = 0.12;
        posturePitch = -0.06; // Tilting slightly up & aside
        postureRoll = 0.06;
        break;
      case 'CONCERNED':
        posturePitch = 0.06;
        postureRoll = -0.05;
        break;
      case 'HAPPY':
        posturePitch = -0.03;
        postureRoll = 0.02;
        break;
      default:
        break;
    }

    // 3. Smooth Damped Interpolation of Look Vector
    const finalTargetX = this.targetLook.x + this.gazeOffset.x + saccadeX;
    const finalTargetY = this.targetLook.y + this.gazeOffset.y + saccadeY;

    // Smooth head movement (lerp damping: ~5.5s^-1 for human neck muscle response)
    this.currentLook.x += (finalTargetX - this.currentLook.x) * Math.min(delta * 5.5, 1.0);
    this.currentLook.y += (finalTargetY - this.currentLook.y) * Math.min(delta * 5.5, 1.0);

    // 4. Biomechanical Distribution across Head, Neck, and Spine2
    // Head carries 55% of yaw and pitch, Neck carries 35%, Spine2 carries 10%
    const totalYaw = -this.currentLook.x * 0.65 + postureYaw;
    const totalPitch = this.currentLook.y * 0.45 + posturePitch;
    const totalRoll = -this.currentLook.x * 0.08 + postureRoll;

    // Head rotation
    if (this.bones.head) {
      this.eulerScratch.set(totalPitch * 0.55, totalYaw * 0.55, totalRoll * 0.6, 'YXZ');
      this.qHeadDelta.setFromEuler(this.eulerScratch);
      if (this.hasCapturedBase) {
        this.bones.head.quaternion.copy(this.headBaseQuat).multiply(this.qHeadDelta);
      } else {
        this.bones.head.quaternion.multiply(this.qHeadDelta);
      }
    }

    // Neck follows slightly softer and laggy
    if (this.bones.neck) {
      this.eulerScratch.set(totalPitch * 0.35, totalYaw * 0.35, totalRoll * 0.3, 'YXZ');
      this.qNeckDelta.setFromEuler(this.eulerScratch);
      if (this.hasCapturedBase) {
        this.bones.neck.quaternion.copy(this.neckBaseQuat).multiply(this.qNeckDelta);
      } else {
        this.bones.neck.quaternion.multiply(this.qNeckDelta);
      }
    }

    // Upper Spine / Thoracic posture provides subtle supportive torso rotation
    if (this.bones.spine2) {
      this.eulerScratch.set(totalPitch * 0.1, totalYaw * 0.12, 0, 'YXZ');
      this.qSpineDelta.setFromEuler(this.eulerScratch);
      if (this.hasCapturedBase) {
        this.bones.spine2.quaternion.copy(this.spineBaseQuat).multiply(this.qSpineDelta);
      } else {
        this.bones.spine2.quaternion.multiply(this.qSpineDelta);
      }
    }
  }

  public reset() {
    this.currentLook.set(0, 0);
    this.targetLook.set(0, 0);
    this.gazeOffset.set(0, 0);
  }
}
