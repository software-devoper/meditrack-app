import * as THREE from 'three';
import { DoctorState, GesturePhase } from './DoctorBoyTypes';

/**
 * DoctorBoyGestureSystem
 * 
 * Coordinates intentional human hand gestures and talking behavior.
 * - Enforces gesture lifecycle: PREPARATION -> MAIN GESTURE -> HOLD -> RECOVERY -> RETURN
 * - Probability-based talking: hands move only ~35% of the time, interspersed with calm pauses
 * - Gesture cooldowns and non-repetitive selection
 * - Doctor-specific gestures: Welcome, Hold Wrist, Thinking, Point, Wave, Reassure
 */

export class DoctorBoyGestureSystem {
  private currentPhase: GesturePhase = 'NONE';
  private phaseStartTime = 0;
  private currentGesture: string = 'none';

  // Cooldown tracking
  private lastGestureTime = 0;
  private gestureCooldown = 2.5; // Seconds between voluntary gestures

  // Talking gesture probability state
  private isTalking = false;
  private nextTalkGestureTime = 0;
  private currentTalkAction: 'none' | 'small' | 'palm' | 'point' = 'none';

  public startGesture(name: string, now: number) {
    this.currentGesture = name;
    this.currentPhase = 'PREPARATION';
    this.phaseStartTime = now;
  }

  public setTalking(talking: boolean, now: number) {
    if (this.isTalking === talking) return;
    this.isTalking = talking;
    if (talking) {
      this.nextTalkGestureTime = now + 0.8 + Math.random() * 1.5;
    } else {
      this.currentTalkAction = 'none';
    }
  }

  public update(now: number): {
    phase: GesturePhase;
    shouldTriggerGesture: boolean;
    gestureClipName?: string;
  } {
    // If actively in a structured gesture lifecycle
    if (this.currentPhase !== 'NONE') {
      const elapsedInPhase = now - this.phaseStartTime;

      switch (this.currentPhase) {
        case 'PREPARATION':
          if (elapsedInPhase > 0.4) {
            this.currentPhase = 'MAIN_GESTURE';
            this.phaseStartTime = now;
          }
          break;
        case 'MAIN_GESTURE':
          if (elapsedInPhase > 1.2) {
            this.currentPhase = 'HOLD';
            this.phaseStartTime = now;
          }
          break;
        case 'HOLD':
          if (elapsedInPhase > 0.8) {
            this.currentPhase = 'RECOVERY';
            this.phaseStartTime = now;
          }
          break;
        case 'RECOVERY':
          if (elapsedInPhase > 0.5) {
            this.currentPhase = 'RETURN';
            this.phaseStartTime = now;
          }
          break;
        case 'RETURN':
          this.currentPhase = 'NONE';
          this.lastGestureTime = now;
          break;
      }

      return {
        phase: this.currentPhase,
        shouldTriggerGesture: false,
      };
    }

    // Talking behavior gesture scheduling
    if (this.isTalking && now >= this.nextTalkGestureTime) {
      // Choose gesture based on probability:
      // 40% subtle chest gesture, 25% open palm / explain, 15% point, 20% pause
      const roll = Math.random();
      let chosen: string = 'talk';

      if (roll < 0.25) {
        chosen = 'welcome'; // open palm
      } else if (roll < 0.45) {
        chosen = 'think'; // thoughtful pause
      } else if (roll < 0.8) {
        chosen = 'talk'; // rhythmic conversation
      } else {
        chosen = 'idle'; // still pause while speaking
      }

      this.nextTalkGestureTime = now + 2.2 + Math.random() * 2.0;

      return {
        phase: 'MAIN_GESTURE',
        shouldTriggerGesture: true,
        gestureClipName: chosen,
      };
    }

    return {
      phase: 'NONE',
      shouldTriggerGesture: false,
    };
  }

  public canTriggerGesture(now: number): boolean {
    return this.currentPhase === 'NONE' && (now - this.lastGestureTime > this.gestureCooldown);
  }

  public getCurrentPhase(): GesturePhase {
    return this.currentPhase;
  }
}
