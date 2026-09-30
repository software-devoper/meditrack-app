import * as THREE from 'three';
import { DoctorPosture, SkeletonBones } from './DoctorBoyTypes';

/**
 * DoctorBoyIdleController
 * 
 * Implements a natural human procedural idle system:
 * - Subtle thoracic breathing: Slow (3.5 - 4.5s cycle) with ribcage expansion and soft shoulder rise
 * - Asymmetrical weight shifts: Natural human tendency to settle weight over one hip (intermittent, not continuous)
 * - Posture states: NEUTRAL, RELAXED, PROFESSIONAL, LISTENING, THINKING, EXPLAINING, CURIOUS, HAPPY, CONCERNED
 * - Irregular movement timing to avoid mechanical looping appearance
 */

export class DoctorBoyIdleController {
  private bones: SkeletonBones;

  // Posture blending
  private currentPosture: DoctorPosture = 'PROFESSIONAL';
  private targetPosture: DoctorPosture = 'PROFESSIONAL';
  private postureBlend = 1.0;

  // Weight shifting state
  private weightShiftTarget = 0.0; // -1 (left hip), 0 (centered), 1 (right hip)
  private currentWeightShift = 0.0;
  private lastWeightShiftTime = 0;
  private nextWeightShiftDuration = 14;

  // Reusable math objects to prevent garbage collection spikes
  private eulerScratch = new THREE.Euler(0, 0, 0, 'XYZ');
  private quatScratch = new THREE.Quaternion();

  // Captured base quaternions
  private spineBaseQuat = new THREE.Quaternion();
  private spine1BaseQuat = new THREE.Quaternion();
  private spine2BaseQuat = new THREE.Quaternion();
  private leftShoulderBaseQuat = new THREE.Quaternion();
  private rightShoulderBaseQuat = new THREE.Quaternion();
  private hipsBaseQuat = new THREE.Quaternion();
  private hasCapturedBase = false;

  constructor(bones: SkeletonBones) {
    this.bones = bones;
  }

  public captureBaseRotations() {
    if (this.bones.spine) this.spineBaseQuat.copy(this.bones.spine.quaternion);
    if (this.bones.spine1) this.spine1BaseQuat.copy(this.bones.spine1.quaternion);
    if (this.bones.spine2) this.spine2BaseQuat.copy(this.bones.spine2.quaternion);
    if (this.bones.leftShoulder) this.leftShoulderBaseQuat.copy(this.bones.leftShoulder.quaternion);
    if (this.bones.rightShoulder) this.rightShoulderBaseQuat.copy(this.bones.rightShoulder.quaternion);
    if (this.bones.hips) this.hipsBaseQuat.copy(this.bones.hips.quaternion);
    this.hasCapturedBase = true;
  }

  public setPosture(posture: DoctorPosture) {
    if (this.targetPosture === posture) return;
    this.targetPosture = posture;
    this.postureBlend = 0.0;
  }

  public getPosture(): DoctorPosture {
    return this.targetPosture;
  }

  public update(delta: number, elapsed: number, isWalking = false) {
    // If character is actively walking, preserve the authentic skeletal walk cycle
    if (isWalking) return;

    // 1. Smooth Posture Transition Interpolation
    if (this.postureBlend < 1.0) {
      this.postureBlend = Math.min(this.postureBlend + delta * 2.0, 1.0);
      if (this.postureBlend >= 1.0) {
        this.currentPosture = this.targetPosture;
      }
    }

    // 2. Intermittent Human Weight Shift
    // Humans shift weight once every 12 to 25 seconds, holding the pose calmly
    if (elapsed - this.lastWeightShiftTime > this.nextWeightShiftDuration) {
      this.lastWeightShiftTime = elapsed;
      this.nextWeightShiftDuration = 12 + Math.random() * 15;
      
      // Select new weight shift position (-0.8 left, 0.0 balanced, +0.8 right)
      const options = [-0.65, 0.0, 0.65];
      const nextChoice = options[Math.floor(Math.random() * options.length)];
      this.weightShiftTarget = nextChoice;
    }

    // Smooth ease toward weight shift target (gentle 1.5s muscle transition)
    this.currentWeightShift += (this.weightShiftTarget - this.currentWeightShift) * Math.min(delta * 1.5, 1.0);

    // 3. Natural Organic Breathing Cycle
    // Human respiration at rest: ~14 breaths/min = ~4.2s per breath
    const breathPhase = elapsed * (Math.PI * 2 / 4.2);
    // Smooth asymmetric breath: inhalation is ~1.8s, exhalation is ~2.4s
    const rawBreath = Math.sin(breathPhase);
    const breath = rawBreath > 0 
      ? Math.pow(rawBreath, 1.2) * 0.024 
      : -Math.pow(-rawBreath, 0.9) * 0.016;

    // Apply procedural breathing & spine posture (relative to captured base)
    if (this.bones.spine1 && this.hasCapturedBase) {
      this.eulerScratch.set(breath * 0.6, 0, -this.currentWeightShift * 0.015);
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.spine1.quaternion.copy(this.spine1BaseQuat).multiply(this.quatScratch);
    }

    if (this.bones.spine2 && this.hasCapturedBase) {
      this.eulerScratch.set(breath * 0.4, 0, -this.currentWeightShift * 0.02);
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.spine2.quaternion.copy(this.spine2BaseQuat).multiply(this.quatScratch);
    }

    // Shoulders rise very subtly during deep inhalation
    const shoulderRise = breath * 0.25;
    if (this.bones.leftShoulder && this.hasCapturedBase) {
      this.eulerScratch.set(0, 0, shoulderRise + (this.currentWeightShift * 0.02));
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.leftShoulder.quaternion.copy(this.leftShoulderBaseQuat).multiply(this.quatScratch);
    }
    if (this.bones.rightShoulder && this.hasCapturedBase) {
      this.eulerScratch.set(0, 0, -shoulderRise + (this.currentWeightShift * 0.02));
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.rightShoulder.quaternion.copy(this.rightShoulderBaseQuat).multiply(this.quatScratch);
    }

    // Pelvis/Hips slight tilt to support weight shift
    if (this.bones.hips && this.hasCapturedBase) {
      const hipTiltZ = this.currentWeightShift * 0.035;
      const hipYawY = this.currentWeightShift * 0.025;
      this.eulerScratch.set(0, hipYawY, hipTiltZ);
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.hips.quaternion.copy(this.hipsBaseQuat).multiply(this.quatScratch);
    }

    // 4. Subtle Posture Modifiers
    this.applyPostureOffsets(this.targetPosture, delta);
  }

  private applyPostureOffsets(posture: DoctorPosture, delta: number) {
    let spinePitch = 0.0;
    let spineRoll = 0.0;

    switch (posture) {
      case 'RELAXED':
        spinePitch = 0.03; // Relaxed casual slump
        break;
      case 'PROFESSIONAL':
        spinePitch = -0.015; // Tall, confident doctor posture
        break;
      case 'LISTENING':
        spinePitch = 0.02; // Attentive lean forward
        spineRoll = -0.015;
        break;
      case 'THINKING':
        spinePitch = 0.025;
        spineRoll = 0.02;
        break;
      case 'CONCERNED':
        spinePitch = 0.04; // Gentle forward concern
        break;
      case 'CURIOUS':
        spinePitch = 0.03;
        break;
      default:
        break;
    }

    if (this.bones.spine && this.hasCapturedBase && Math.abs(spinePitch) > 0.001) {
      this.eulerScratch.set(spinePitch * 0.4, 0, spineRoll * 0.5);
      this.quatScratch.setFromEuler(this.eulerScratch);
      this.bones.spine.quaternion.copy(this.spineBaseQuat).multiply(this.quatScratch);
    }
  }

  public reset() {
    this.currentWeightShift = 0.0;
    this.weightShiftTarget = 0.0;
    this.lastWeightShiftTime = 0;
  }
}
