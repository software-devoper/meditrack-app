import * as THREE from 'three';
import { DoctorState, Priority, StateConfig } from './DoctorBoyTypes';

/**
 * DoctorBoyStateMachine
 * 
 * Manages character animation states, priorities, crossfading, and return lifecycles.
 * Avoids abrupt pops; uses AnimationAction fadeIn/fadeOut/crossFadeTo smoothly.
 */

export const STATE_CONFIGS: Record<DoctorState, StateConfig> = {
  IDLE: {
    name: 'IDLE',
    animationClipName: 'idle',
    priority: 'LOW',
    transitionTime: 0.45,
    interruptible: true,
    returnState: 'IDLE',
  },
  LISTENING: {
    name: 'LISTENING',
    animationClipName: 'think',
    priority: 'LOW',
    transitionTime: 0.4,
    interruptible: true,
    returnState: 'IDLE',
  },
  TALKING: {
    name: 'TALKING',
    animationClipName: 'talk',
    priority: 'MEDIUM',
    transitionTime: 0.35,
    interruptible: true,
    returnState: 'IDLE',
  },
  GREETING: {
    name: 'GREETING',
    animationClipName: 'wave',
    priority: 'HIGH',
    duration: 3.0,
    transitionTime: 0.35,
    interruptible: false,
    returnState: 'IDLE',
  },
  WAVING: {
    name: 'WAVING',
    animationClipName: 'wave',
    priority: 'MEDIUM',
    duration: 3.0,
    transitionTime: 0.35,
    interruptible: true,
    returnState: 'IDLE',
  },
  POINTING: {
    name: 'POINTING',
    animationClipName: 'point',
    priority: 'MEDIUM',
    duration: 2.8,
    transitionTime: 0.3,
    interruptible: true,
    returnState: 'IDLE',
  },
  THINKING: {
    name: 'THINKING',
    animationClipName: 'think',
    priority: 'MEDIUM',
    duration: 3.5,
    transitionTime: 0.4,
    interruptible: true,
    returnState: 'IDLE',
  },
  HOLD_WRIST: {
    name: 'HOLD_WRIST',
    animationClipName: 'holdWrist',
    priority: 'MEDIUM',
    duration: 3.5,
    transitionTime: 0.4,
    interruptible: true,
    returnState: 'IDLE',
  },
  WELCOME: {
    name: 'WELCOME',
    animationClipName: 'welcome',
    priority: 'MEDIUM',
    duration: 3.0,
    transitionTime: 0.4,
    interruptible: true,
    returnState: 'IDLE',
  },
  CHECKING: {
    name: 'CHECKING',
    animationClipName: 'holdWrist',
    priority: 'MEDIUM',
    duration: 2.5,
    transitionTime: 0.35,
    interruptible: true,
    returnState: 'IDLE',
  },
  WALKING: {
    name: 'WALKING',
    animationClipName: 'walk',
    priority: 'MEDIUM',
    transitionTime: 0.35,
    interruptible: true,
    returnState: 'IDLE',
  },
  GOODBYE: {
    name: 'GOODBYE',
    animationClipName: 'wave',
    priority: 'HIGH',
    duration: 3.0,
    transitionTime: 0.35,
    interruptible: false,
    returnState: 'IDLE',
  },
  REACTION: {
    name: 'REACTION',
    animationClipName: 'talk',
    priority: 'HIGH',
    duration: 2.5,
    transitionTime: 0.25,
    interruptible: false,
    returnState: 'IDLE',
  },
};

const PRIORITY_ORDER: Record<Priority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

export class DoctorBoyStateMachine {
  private currentState: DoctorState = 'IDLE';
  private stateStartTime = 0;
  private actions: Record<string, THREE.AnimationAction> = {};
  private currentAction: THREE.AnimationAction | null = null;
  private onStateChangeCallback?: (state: DoctorState, clipName: string) => void;

  constructor(
    actions: Record<string, THREE.AnimationAction>,
    onStateChange?: (state: DoctorState, clipName: string) => void
  ) {
    this.actions = actions;
    this.onStateChangeCallback = onStateChange;
  }

  public setActions(actions: Record<string, THREE.AnimationAction>) {
    this.actions = actions;
  }

  public getCurrentState(): DoctorState {
    return this.currentState;
  }

  public getCurrentAction(): THREE.AnimationAction | null {
    return this.currentAction;
  }

  public transitionTo(
    nextState: DoctorState,
    now: number,
    force = false,
    customFadeTime?: number
  ): boolean {
    if (this.currentState === nextState && this.currentAction?.isRunning()) {
      return true;
    }

    const currentConfig = STATE_CONFIGS[this.currentState];
    const nextConfig = STATE_CONFIGS[nextState];

    // Check priority if not forced
    if (!force) {
      const currentPriority = PRIORITY_ORDER[currentConfig.priority];
      const nextPriority = PRIORITY_ORDER[nextConfig.priority];

      if (currentPriority > nextPriority && !currentConfig.interruptible) {
        // Current high priority non-interruptible state is still running
        const timeInState = now - this.stateStartTime;
        if (currentConfig.duration && timeInState < currentConfig.duration) {
          return false;
        }
      }
    }

    // Determine target clip action
    let targetAction = this.actions[nextConfig.animationClipName];
    // Fallback if specific clip doesn't exist
    if (!targetAction) {
      if (nextConfig.animationClipName === 'walk') targetAction = this.actions.walking;
      else targetAction = this.actions.idle;
    }

    const fadeDuration = customFadeTime ?? nextConfig.transitionTime;

    if (targetAction && targetAction !== this.currentAction) {
      if (this.currentAction) {
        this.currentAction.fadeOut(fadeDuration);
      }
      targetAction.reset().fadeIn(fadeDuration).play();
      this.currentAction = targetAction;
    }

    this.currentState = nextState;
    this.stateStartTime = now;

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(nextState, nextConfig.animationClipName);
    }

    return true;
  }

  public update(now: number) {
    const config = STATE_CONFIGS[this.currentState];
    if (config.duration) {
      const elapsed = now - this.stateStartTime;
      if (elapsed >= config.duration) {
        // Return to configured returnState
        this.transitionTo(config.returnState, now);
      }
    }
  }
}
