import * as THREE from 'three';
import {
  DoctorPosture,
  DoctorState,
  ModelInspectionReport,
  SkeletonBones,
} from './DoctorBoyTypes';
import { buildDoctorSkeletalClips } from './DoctorBoySkeletalClips';
import { DoctorBoyLookController } from './DoctorBoyLookController';
import { DoctorBoyIdleController } from './DoctorBoyIdleController';
import { DoctorBoyGestureSystem } from './DoctorBoyGestureSystem';
import { DoctorBoyStateMachine } from './DoctorBoyStateMachine';

/**
 * DoctorBoyAnimationController
 * 
 * Master coordinator for the Doctor Boy 3D character in the application.
 * Integrates:
 * 1. Three.js AnimationMixer with smooth crossfading
 * 2. Skeletal animation clips (Mixamo walk + custom anatomically grounded clips)
 * 3. Layered procedural motion (thoracic breathing, weight shifts, natural posture)
 * 4. Human look/gaze tracking (head leads, neck follows, micro-saccades, gaze aversion)
 * 5. State machine with priorities and gesture lifecycles
 * 6. Non-breaking fallback architecture for missing morph targets or eye bones
 */

export class DoctorBoyAnimationController {
  public model: THREE.Object3D;
  public mixer: THREE.AnimationMixer;
  public actions: Record<string, THREE.AnimationAction> = {};
  public bones: SkeletonBones = {};
  public inspectionReport: ModelInspectionReport;

  // Sub-controllers
  public lookController: DoctorBoyLookController;
  public idleController: DoctorBoyIdleController;
  public gestureSystem: DoctorBoyGestureSystem;
  public stateMachine: DoctorBoyStateMachine;

  // Extensible lip sync / facial control state
  private hasFacialMorphs = false;
  private morphMesh: THREE.Mesh | null = null;

  constructor(
    model: THREE.Object3D,
    gltfClips: THREE.AnimationClip[] = [],
    onStateChange?: (state: DoctorState, clipName: string) => void
  ) {
    this.model = model;

    // 1. Inspect GLB and build full diagnostics report
    this.inspectionReport = this.inspectModel(model, gltfClips);

    // 2. Discover and index skeleton bones
    this.discoverBones(model);

    // 3. Initialize AnimationMixer
    this.mixer = new THREE.AnimationMixer(model);

    // 4. Generate skeletal clips and register actions
    const clips = buildDoctorSkeletalClips(model, gltfClips);

    this.registerAction('idle', clips.idleClip, true);
    this.registerAction('wave', clips.waveClip, true);
    this.registerAction('talk', clips.talkClip, true);
    this.registerAction('point', clips.pointClip, true);
    this.registerAction('think', clips.thinkClip, true);
    this.registerAction('holdWrist', clips.wristClip, true);
    this.registerAction('welcome', clips.welcomeClip, true);

    if (clips.walkClip) {
      this.registerAction('walk', clips.walkClip, true);
      this.registerAction('walking', clips.walkClip, true);
    }

    // 5. Initialize Sub-Controllers
    this.lookController = new DoctorBoyLookController(this.bones);
    this.idleController = new DoctorBoyIdleController(this.bones);
    this.gestureSystem = new DoctorBoyGestureSystem();
    this.stateMachine = new DoctorBoyStateMachine(this.actions, onStateChange);

    // Capture resting orientations
    this.lookController.captureBaseRotations();
    this.idleController.captureBaseRotations();

    // 6. Check for facial morph targets
    this.initFacialControls(model);

    // Print initial diagnostics to console as requested in Section 1
    this.printDiagnosticReport();
  }

  private inspectModel(model: THREE.Object3D, clips: THREE.AnimationClip[]): ModelInspectionReport {
    const bonesList: string[] = [];
    let morphMeshesCount = 0;
    const morphNames: string[] = [];
    const eyeBones: string[] = [];

    model.traverse((obj) => {
      if ((obj as any).isBone) {
        bonesList.push(obj.name);
        if (/eye/i.test(obj.name)) {
          eyeBones.push(obj.name);
        }
      }
      if ((obj as any).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.morphTargetDictionary) {
          morphMeshesCount++;
          Object.keys(mesh.morphTargetDictionary).forEach((k) => {
            if (!morphNames.includes(k)) morphNames.push(k);
          });
        }
      }
    });

    const parsedClips = clips.map((c) => ({
      name: c.name,
      duration: c.duration,
      tracksCount: c.tracks.length,
      channelsCount: c.tracks.length,
      isAuthenticWalk: c.name === 'mixamo.com' || c.name.toLowerCase().includes('walk'),
      isPlaceholder: c.tracks.length > 0 && c.tracks[0].times.length <= 2,
    }));

    return {
      modelName: 'Doctor Boy',
      animations: parsedClips,
      skeleton: {
        totalBones: bonesList.length,
        bonesList,
        hasArmature: bonesList.length > 0,
        hasNeckHead: bonesList.some((b) => /head|neck/i.test(b)),
        hasHandsFingers: bonesList.some((b) => /hand|finger|index|thumb/i.test(b)),
        hasLegsFeet: bonesList.some((b) => /leg|foot/i.test(b)),
      },
      facialMorphs: {
        available: morphMeshesCount > 0,
        meshesCount: morphMeshesCount,
        morphNames,
      },
      eyeBones: {
        available: eyeBones.length > 0,
        eyeBoneNames: eyeBones,
      },
    };
  }

  private printDiagnosticReport() {
    console.log('==============================================');
    console.log('MODEL:');
    console.log('Doctor Boy');
    console.log('\nANIMATIONS:');
    this.inspectionReport.animations.forEach((a) => {
      console.log(
        `- "${a.name}" (duration: ${a.duration.toFixed(2)}s, tracks: ${a.tracksCount}${
          a.isAuthenticWalk ? ', authentic Mixamo walk cycle' : a.isPlaceholder ? ', static 2-frame pose' : ''
        })`
      );
    });
    console.log('\nSKELETON:');
    console.log(`- Armature with ${this.inspectionReport.skeleton.totalBones} bones detected`);
    console.log(`- Sample bones: ${this.inspectionReport.skeleton.bonesList.slice(0, 8).join(', ')}...`);
    console.log('\nFACIAL MORPHS:');
    console.log(this.inspectionReport.facialMorphs.available ? 'available' : 'unavailable (Mesh is un-morphed skinned mesh)');
    console.log('\nEYE CONTROLS:');
    console.log(this.inspectionReport.eyeBones.available ? 'available' : 'unavailable (Handled via head/neck gaze tracking)');
    console.log('==============================================');
  }

  private discoverBones(model: THREE.Object3D) {
    model.traverse((child) => {
      if ((child as any).isBone) {
        const bone = child as THREE.Bone;
        const norm = bone.name.replace(/^mixamorig:?/, '').toLowerCase();

        switch (norm) {
          case 'hips': this.bones.hips = bone; break;
          case 'spine': this.bones.spine = bone; break;
          case 'spine1': this.bones.spine1 = bone; break;
          case 'spine2': this.bones.spine2 = bone; break;
          case 'neck': this.bones.neck = bone; break;
          case 'head': this.bones.head = bone; break;
          case 'headtop_end': this.bones.headTop = bone; break;
          case 'leftshoulder': this.bones.leftShoulder = bone; break;
          case 'leftarm': this.bones.leftArm = bone; break;
          case 'leftforearm': this.bones.leftForeArm = bone; break;
          case 'lefthand': this.bones.leftHand = bone; break;
          case 'rightshoulder': this.bones.rightShoulder = bone; break;
          case 'rightarm': this.bones.rightArm = bone; break;
          case 'rightforearm': this.bones.rightForeArm = bone; break;
          case 'righthand': this.bones.rightHand = bone; break;
          case 'leftupleg': this.bones.leftUpLeg = bone; break;
          case 'leftleg': this.bones.leftLeg = bone; break;
          case 'leftfoot': this.bones.leftFoot = bone; break;
          case 'rightupleg': this.bones.rightUpLeg = bone; break;
          case 'rightleg': this.bones.rightLeg = bone; break;
          case 'rightfoot': this.bones.rightFoot = bone; break;
          default:
            this.bones[norm] = bone;
            break;
        }
      }
    });
  }

  private registerAction(name: string, clip: THREE.AnimationClip | null, loop = true) {
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    this.actions[name] = action;
  }

  private initFacialControls(model: THREE.Object3D) {
    model.traverse((child) => {
      if ((child as any).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
        this.morphMesh = child as THREE.Mesh;
        this.hasFacialMorphs = true;
      }
    });
  }

  /**
   * Main per-frame update loop
   */
  public update(delta: number, elapsed: number, lookTargetX = 0, lookTargetY = 0) {
    // 1. Advance skeletal AnimationMixer tracks
    this.mixer.update(delta);

    // 2. Update look controller target
    this.lookController.setTarget(lookTargetX, lookTargetY);

    // 3. State machine tick
    this.stateMachine.update(elapsed);

    // 4. Gesture system tick
    const gestureTick = this.gestureSystem.update(elapsed);
    if (gestureTick.shouldTriggerGesture && gestureTick.gestureClipName) {
      const stateMapping: Record<string, DoctorState> = {
        wave: 'WAVING',
        point: 'POINTING',
        think: 'THINKING',
        talk: 'TALKING',
        welcome: 'WELCOME',
        idle: 'IDLE',
      };
      const nextState = stateMapping[gestureTick.gestureClipName] || 'IDLE';
      this.stateMachine.transitionTo(nextState, elapsed);
    }

    // 5. Layer procedural human motion directly onto skeleton
    // This executes after the base clip poses are evaluated by the mixer, adding organic life
    const isWalking = this.stateMachine.getCurrentState() === 'WALKING';
    const currentPosture = this.idleController.getPosture();
    this.idleController.update(delta, elapsed, isWalking);
    this.lookController.update(delta, elapsed, currentPosture);
  }

  // High-level behavior API
  public playState(state: DoctorState, now: number, force = false): boolean {
    return this.stateMachine.transitionTo(state, now, force);
  }

  public setPosture(posture: DoctorPosture) {
    this.idleController.setPosture(posture);
  }

  public triggerPoint(now: number) {
    this.gestureSystem.startGesture('point', now);
    this.stateMachine.transitionTo('POINTING', now, true);
  }

  public triggerWave(now: number) {
    this.gestureSystem.startGesture('wave', now);
    this.stateMachine.transitionTo('GREETING', now, true);
  }

  public triggerHoldWrist(now: number) {
    this.stateMachine.transitionTo('HOLD_WRIST', now, true);
  }

  public triggerWelcome(now: number) {
    this.stateMachine.transitionTo('WELCOME', now, true);
  }

  public triggerThink(now: number) {
    this.stateMachine.transitionTo('THINKING', now, true);
  }

  public setTalking(isTalking: boolean, now: number) {
    this.gestureSystem.setTalking(isTalking, now);
    if (isTalking) {
      this.stateMachine.transitionTo('TALKING', now);
    } else if (this.stateMachine.getCurrentState() === 'TALKING') {
      this.stateMachine.transitionTo('IDLE', now);
    }
  }

  public celebrateSuccess(now: number) {
    this.setPosture('HAPPY');
    this.stateMachine.transitionTo('GREETING', now, true);
  }

  public showErrorConcern(now: number) {
    this.setPosture('CONCERNED');
    this.stateMachine.transitionTo('TALKING', now, true);
  }

  public dispose() {
    this.mixer.stopAllAction();
  }
}
