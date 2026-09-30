import * as THREE from 'three';

export const DoctorPosture = {
  NEUTRAL: 'NEUTRAL',
  RELAXED: 'RELAXED',
  PROFESSIONAL: 'PROFESSIONAL',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  EXPLAINING: 'EXPLAINING',
  CURIOUS: 'CURIOUS',
  HAPPY: 'HAPPY',
  SURPRISED: 'SURPRISED',
  CONCERNED: 'CONCERNED',
} as const;

export type DoctorPosture = (typeof DoctorPosture)[keyof typeof DoctorPosture];

export const DoctorState = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  TALKING: 'TALKING',
  GREETING: 'GREETING',
  WAVING: 'WAVING',
  POINTING: 'POINTING',
  THINKING: 'THINKING',
  CHECKING: 'CHECKING',
  WALKING: 'WALKING',
  GOODBYE: 'GOODBYE',
  REACTION: 'REACTION',
  HOLD_WRIST: 'HOLD_WRIST',
  WELCOME: 'WELCOME',
} as const;

export type DoctorState = (typeof DoctorState)[keyof typeof DoctorState];

export const GesturePhase = {
  NONE: 'NONE',
  PREPARATION: 'PREPARATION',
  MAIN_GESTURE: 'MAIN_GESTURE',
  HOLD: 'HOLD',
  RECOVERY: 'RECOVERY',
  RETURN: 'RETURN',
} as const;

export type GesturePhase = (typeof GesturePhase)[keyof typeof GesturePhase];

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StateConfig {
  name: DoctorState;
  animationClipName: string;
  priority: Priority;
  duration?: number;
  transitionTime: number;
  interruptible: boolean;
  returnState: DoctorState;
}

export interface ModelInspectionReport {
  modelName: string;
  animations: Array<{
    name: string;
    duration: number;
    tracksCount: number;
    channelsCount?: number;
    isAuthenticWalk?: boolean;
    isPlaceholder?: boolean;
  }>;
  skeleton: {
    totalBones: number;
    bonesList: string[];
    hasArmature: boolean;
    hasNeckHead: boolean;
    hasHandsFingers: boolean;
    hasLegsFeet: boolean;
  };
  facialMorphs: {
    available: boolean;
    meshesCount: number;
    morphNames: string[];
  };
  eyeBones: {
    available: boolean;
    eyeBoneNames: string[];
  };
}

export const ModelInspectionReport = {};

export interface SkeletonBones {
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  spine1?: THREE.Bone;
  spine2?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  headTop?: THREE.Bone;
  leftShoulder?: THREE.Bone;
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  rightShoulder?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rightHand?: THREE.Bone;
  leftUpLeg?: THREE.Bone;
  leftLeg?: THREE.Bone;
  leftFoot?: THREE.Bone;
  rightUpLeg?: THREE.Bone;
  rightLeg?: THREE.Bone;
  rightFoot?: THREE.Bone;
  [key: string]: THREE.Bone | undefined;
}
