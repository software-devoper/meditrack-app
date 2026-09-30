import * as THREE from 'three';

/**
 * DoctorBoySkeletalClips
 * 
 * Generates natural human skeletal animation clips designed specifically for the
 * Doctor Boy armature.
 * 
 * Features:
 * - Human resting arm positions (arms naturally relaxed by hips, slight inward drape, relaxed elbows)
 * - Biomechanically accurate shoulder elevation and forearm rotation
 * - Curled relaxed fingers (not stiff open paddles)
 * - Phase-based movement: Anticipation -> Motion -> Hold -> Recovery
 * - Extraction and filtering of authentic Mixamo walk cycle from the GLB
 */

export function buildDoctorSkeletalClips(model: THREE.Object3D, gltfAnimations: THREE.AnimationClip[] = []) {
  // Discover actual bone naming convention used in the loaded GLTF model
  const bones: THREE.Bone[] = [];
  model.traverse((child) => {
    if ((child as any).isBone) {
      bones.push(child as THREE.Bone);
    }
  });

  const boneNameMap = new Map<string, string>();
  bones.forEach((b) => {
    const rawName = b.name;
    // Map standard key without prefixes/colons to the exact bone name in the scene
    const normalized = rawName.replace(/^mixamorig:?/, '').toLowerCase();
    boneNameMap.set(normalized, rawName);
    boneNameMap.set(rawName.toLowerCase(), rawName);
  });

  const getBoneName = (key: string): string => {
    const norm = key.replace(/^mixamorig:?/, '').toLowerCase();
    return boneNameMap.get(norm) || (bones.some((b) => b.name.includes(':')) ? `mixamorig:${key}` : `mixamorig${key}`);
  };

  const getBone = (key: string): THREE.Bone | undefined => {
    const exactName = getBoneName(key);
    return bones.find((b) => b.name === exactName);
  };

  const createQuatTrack = (key: string, times: number[], eulerKeyframes: number[][]) => {
    const boneName = getBoneName(key);
    const values: number[] = [];
    eulerKeyframes.forEach(([x, y, z]) => {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
      values.push(q.x, q.y, q.z, q.w);
    });
    return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
  };

  const createStaticQuatTrack = (key: string, duration: number, q: THREE.Quaternion) => {
    const boneName = getBoneName(key);
    return new THREE.QuaternionKeyframeTrack(
      `${boneName}.quaternion`,
      [0, duration],
      [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]
    );
  };

  // Capture stable standing rest orientations from the rest skeleton
  const defaultHipQuat = getBone('Hips')?.quaternion.clone() || new THREE.Quaternion(-0.7071, 0, 0, 0.7071);
  const defaultLUpLeg = getBone('LeftUpLeg')?.quaternion.clone() || new THREE.Quaternion(0.0001, 0.0073, -0.9999, 0.013);
  const defaultRUpLeg = getBone('RightUpLeg')?.quaternion.clone() || new THREE.Quaternion(0.0002, -0.0149, 0.9998, 0.013);
  const defaultLLeg = getBone('LeftLeg')?.quaternion.clone() || new THREE.Quaternion(-0.0113, -0.0001, 0.0113, 0.9999);
  const defaultRLeg = getBone('RightLeg')?.quaternion.clone() || new THREE.Quaternion(-0.0012, 0.0, -0.0113, 0.9999);
  const defaultLFoot = getBone('LeftFoot')?.quaternion.clone() || new THREE.Quaternion(0.4789, -0.0794, 0.0435, 0.8732);
  const defaultRFoot = getBone('RightFoot')?.quaternion.clone() || new THREE.Quaternion(0.4822, 0.0777, -0.043, 0.8715);

  const getStandingLegTracks = (duration: number) => [
    createStaticQuatTrack('Hips', duration, defaultHipQuat),
    createStaticQuatTrack('LeftUpLeg', duration, defaultLUpLeg),
    createStaticQuatTrack('RightUpLeg', duration, defaultRUpLeg),
    createStaticQuatTrack('LeftLeg', duration, defaultLLeg),
    createStaticQuatTrack('RightLeg', duration, defaultRLeg),
    createStaticQuatTrack('LeftFoot', duration, defaultLFoot),
    createStaticQuatTrack('RightFoot', duration, defaultRFoot),
  ];

  // Natural relaxed finger curvature tracks (slight curl on indices & thumbs)
  const getRelaxedFingerTracks = (duration: number) => {
    const leftIndexQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.05, 0.15));
    const rightIndexQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.05, -0.15));
    const leftThumbQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0.1, 0.1));
    const rightThumbQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, -0.1, -0.1));

    return [
      createStaticQuatTrack('LeftHandIndex1', duration, leftIndexQ),
      createStaticQuatTrack('LeftHandIndex2', duration, leftIndexQ),
      createStaticQuatTrack('RightHandIndex1', duration, rightIndexQ),
      createStaticQuatTrack('RightHandIndex2', duration, rightIndexQ),
      createStaticQuatTrack('LeftHandThumb1', duration, leftThumbQ),
      createStaticQuatTrack('RightHandThumb1', duration, rightThumbQ),
    ];
  };

  // =========================================================================
  // 1. Natural Human Idle (4.0s smooth loop with arms down, thoracic breathing)
  // =========================================================================
  const idleDuration = 4.0;
  const idleTimes = [0.0, 1.0, 2.0, 3.0, 4.0];
  const idleTracks = [
    ...getStandingLegTracks(idleDuration),
    ...getRelaxedFingerTracks(idleDuration),
    // Left arm relaxed down by hip with slight elbow bend and subtle breathing sway
    createQuatTrack('LeftArm', idleTimes, [
      [1.08, 0.08, 0.05],
      [1.11, 0.07, 0.06],
      [1.08, 0.08, 0.05],
      [1.05, 0.09, 0.04],
      [1.08, 0.08, 0.05],
    ]),
    createQuatTrack('RightArm', idleTimes, [
      [1.08, -0.08, -0.05],
      [1.11, -0.07, -0.06],
      [1.08, -0.08, -0.05],
      [1.05, -0.09, -0.04],
      [1.08, -0.08, -0.05],
    ]),
    createQuatTrack('LeftForeArm', idleTimes, [
      [-0.12, 0.0, 0.36],
      [-0.11, 0.0, 0.38],
      [-0.12, 0.0, 0.36],
      [-0.13, 0.0, 0.34],
      [-0.12, 0.0, 0.36],
    ]),
    createQuatTrack('RightForeArm', idleTimes, [
      [-0.12, 0.0, -0.36],
      [-0.11, 0.0, -0.38],
      [-0.12, 0.0, -0.36],
      [-0.13, 0.0, -0.34],
      [-0.12, 0.0, -0.36],
    ]),
    // Thoracic spine breath expansion (rise & fall)
    createQuatTrack('Spine1', idleTimes, [
      [0.0, 0.0, 0.0],
      [0.025, 0.005, 0.0],
      [0.0, 0.0, 0.0],
      [-0.015, -0.005, 0.0],
      [0.0, 0.0, 0.0],
    ]),
    createQuatTrack('Spine2', idleTimes, [
      [0.0, 0.0, 0.0],
      [0.02, 0.0, 0.005],
      [0.0, 0.0, 0.0],
      [-0.01, 0.0, -0.005],
      [0.0, 0.0, 0.0],
    ]),
    // Natural head tilt & micro-settle
    createQuatTrack('Head', idleTimes, [
      [0.0, 0.0, 0.0],
      [-0.02, 0.02, 0.01],
      [0.0, 0.0, 0.0],
      [0.015, -0.015, -0.008],
      [0.0, 0.0, 0.0],
    ]),
  ];
  const naturalIdleClip = new THREE.AnimationClip('NaturalIdle', idleDuration, idleTracks);

  // =========================================================================
  // 2. Natural Greeting Wave (3.0s: Prep -> Raise -> Wave -> Lower -> Settle)
  // =========================================================================
  const waveDuration = 3.0;
  const waveTimes = [0.0, 0.5, 0.9, 1.3, 1.7, 2.1, 2.6, 3.0];
  const waveTracks = [
    ...getStandingLegTracks(waveDuration),
    // Right shoulder anticipates and supports arm raise
    createQuatTrack('RightShoulder', waveTimes, [
      [0.57, -0.42, 0.58],
      [0.65, -0.45, 0.65],
      [0.67, -0.45, 0.68],
      [0.66, -0.45, 0.67],
      [0.67, -0.45, 0.68],
      [0.66, -0.45, 0.67],
      [0.60, -0.43, 0.60],
      [0.57, -0.42, 0.58],
    ]),
    // Right arm lifts smoothly beside head, waves, then settles back down
    createQuatTrack('RightArm', waveTimes, [
      [1.08, -0.08, -0.05],
      [-0.45, -0.1, -0.5],
      [-0.95, -0.05, -0.65],
      [-1.02, 0.0, -0.68],
      [-0.92, -0.08, -0.62],
      [-1.02, 0.0, -0.68],
      [0.25, -0.1, -0.3],
      [1.08, -0.08, -0.05],
    ]),
    createQuatTrack('RightForeArm', waveTimes, [
      [-0.12, 0.0, -0.36],
      [-0.3, 0.0, -1.0],
      [-0.25, 0.0, -1.45],
      [-0.22, 0.0, -1.05],
      [-0.25, 0.0, -1.45],
      [-0.22, 0.0, -1.05],
      [-0.18, 0.0, -0.6],
      [-0.12, 0.0, -0.36],
    ]),
    createQuatTrack('RightHand', waveTimes, [
      [0.05, -0.14, 0.03],
      [0.1, -0.2, 0.15],
      [0.05, -0.1, 0.35],
      [0.05, -0.25, -0.2],
      [0.05, -0.1, 0.35],
      [0.05, -0.25, -0.2],
      [0.05, -0.15, 0.1],
      [0.05, -0.14, 0.03],
    ]),
    // Left arm remains relaxed with slight organic compensation
    createQuatTrack('LeftArm', waveTimes, [
      [1.08, 0.08, 0.05],
      [1.09, 0.08, 0.05],
      [1.1, 0.07, 0.06],
      [1.1, 0.07, 0.06],
      [1.1, 0.07, 0.06],
      [1.1, 0.07, 0.06],
      [1.09, 0.08, 0.05],
      [1.08, 0.08, 0.05],
    ]),
    // Friendly head tilt and welcoming acknowledgment
    createQuatTrack('Head', waveTimes, [
      [0.0, 0.0, 0.0],
      [0.03, 0.04, -0.06],
      [0.06, 0.08, -0.09],
      [0.04, 0.06, -0.07],
      [0.06, 0.08, -0.09],
      [0.04, 0.06, -0.07],
      [0.02, 0.03, -0.03],
      [0.0, 0.0, 0.0],
    ]),
  ];
  const naturalWaveClip = new THREE.AnimationClip('NaturalWave', waveDuration, waveTracks);

  // =========================================================================
  // 3. Natural Conversational Talking (3.2s: Chest-height gestures with pauses)
  // =========================================================================
  const talkDuration = 3.2;
  const talkTimes = [0.0, 0.8, 1.6, 2.4, 3.2];
  const talkTracks = [
    ...getStandingLegTracks(talkDuration),
    ...getRelaxedFingerTracks(talkDuration),
    createQuatTrack('RightArm', talkTimes, [
      [0.6, -0.12, -0.25],
      [0.72, -0.16, -0.32],
      [0.55, -0.1, -0.2],
      [0.68, -0.14, -0.28],
      [0.6, -0.12, -0.25],
    ]),
    createQuatTrack('RightForeArm', talkTimes, [
      [-0.15, 0.0, -0.85],
      [-0.22, 0.0, -1.05],
      [-0.12, 0.0, -0.72],
      [-0.18, 0.0, -0.92],
      [-0.15, 0.0, -0.85],
    ]),
    createQuatTrack('LeftArm', talkTimes, [
      [0.85, 0.1, 0.15],
      [0.78, 0.08, 0.12],
      [0.92, 0.12, 0.18],
      [0.82, 0.09, 0.14],
      [0.85, 0.1, 0.15],
    ]),
    createQuatTrack('LeftForeArm', talkTimes, [
      [-0.12, 0.0, 0.55],
      [-0.1, 0.0, 0.48],
      [-0.16, 0.0, 0.65],
      [-0.12, 0.0, 0.52],
      [-0.12, 0.0, 0.55],
    ]),
    // Conversational head nods and emphasis tilts
    createQuatTrack('Head', talkTimes, [
      [0.02, 0.01, 0.0],
      [0.08, 0.04, 0.02],
      [-0.03, -0.02, -0.01],
      [0.06, 0.03, 0.01],
      [0.02, 0.01, 0.0],
    ]),
    createQuatTrack('Spine1', talkTimes, [
      [0.01, 0.0, 0.0],
      [0.035, 0.0, 0.01],
      [-0.01, 0.0, -0.005],
      [0.025, 0.0, 0.005],
      [0.01, 0.0, 0.0],
    ]),
  ];
  const naturalTalkClip = new THREE.AnimationClip('NaturalTalk', talkDuration, talkTracks);

  // =========================================================================
  // 4. Natural Pointing (Look -> Shoulder Prepares -> Arm Extends -> Hold -> Recover)
  // =========================================================================
  const pointDuration = 2.8;
  const pointTimes = [0.0, 0.6, 1.4, 2.2, 2.8];
  const pointTracks = [
    ...getStandingLegTracks(pointDuration),
    createQuatTrack('RightArm', pointTimes, [
      [1.08, -0.08, -0.05],
      [0.32, -0.06, -0.42],
      [0.30, -0.05, -0.45],
      [0.35, -0.07, -0.38],
      [1.08, -0.08, -0.05],
    ]),
    createQuatTrack('RightForeArm', pointTimes, [
      [-0.12, 0.0, -0.36],
      [-0.12, 0.0, -0.78],
      [-0.10, 0.0, -0.80],
      [-0.15, 0.0, -0.65],
      [-0.12, 0.0, -0.36],
    ]),
    // Hand points with extended index and curled rest
    createQuatTrack('RightHandIndex1', pointTimes, [
      [0.2, -0.05, -0.15],
      [-0.15, 0.0, 0.0],
      [-0.18, 0.0, 0.0],
      [-0.10, 0.0, 0.0],
      [0.2, -0.05, -0.15],
    ]),
    createQuatTrack('LeftArm', pointTimes, [
      [1.08, 0.08, 0.05],
      [1.08, 0.08, 0.05],
      [1.08, 0.08, 0.05],
      [1.08, 0.08, 0.05],
      [1.08, 0.08, 0.05],
    ]),
    // Head looks attentively toward the pointing target first
    createQuatTrack('Head', pointTimes, [
      [0.0, 0.0, 0.0],
      [0.04, -0.28, -0.05],
      [0.04, -0.28, -0.05],
      [0.02, -0.18, -0.03],
      [0.0, 0.0, 0.0],
    ]),
  ];
  const naturalPointClip = new THREE.AnimationClip('NaturalPoint', pointDuration, pointTracks);

  // =========================================================================
  // 5. Thoughtful / Chin-Touch Listening (3.2s loop)
  // =========================================================================
  const thinkDuration = 3.2;
  const thinkTimes = [0.0, 0.8, 1.6, 2.4, 3.2];
  const thinkTracks = [
    ...getStandingLegTracks(thinkDuration),
    createQuatTrack('RightArm', thinkTimes, [
      [-0.24, -0.34, -0.42],
      [-0.22, -0.32, -0.40],
      [-0.24, -0.34, -0.42],
      [-0.26, -0.36, -0.44],
      [-0.24, -0.34, -0.42],
    ]),
    createQuatTrack('RightForeArm', thinkTimes, [
      [-0.34, 0.0, -2.04],
      [-0.32, 0.0, -2.00],
      [-0.34, 0.0, -2.04],
      [-0.36, 0.0, -2.08],
      [-0.34, 0.0, -2.04],
    ]),
    createQuatTrack('LeftArm', thinkTimes, [
      [0.74, 0.34, 0.64],
      [0.76, 0.36, 0.66],
      [0.74, 0.34, 0.64],
      [0.72, 0.32, 0.62],
      [0.74, 0.34, 0.64],
    ]),
    createQuatTrack('LeftForeArm', thinkTimes, [
      [-0.20, 0.0, 1.44],
      [-0.18, 0.0, 1.42],
      [-0.20, 0.0, 1.44],
      [-0.22, 0.0, 1.46],
      [-0.20, 0.0, 1.44],
    ]),
    createQuatTrack('Head', thinkTimes, [
      [0.10, 0.16, 0.12],
      [0.12, 0.14, 0.14],
      [0.10, 0.16, 0.12],
      [0.08, 0.18, 0.10],
      [0.10, 0.16, 0.12],
    ]),
  ];
  const naturalThinkClip = new THREE.AnimationClip('Thinking', thinkDuration, thinkTracks);

  // =========================================================================
  // 6. Hold on Wrist / Watch Check (Patient & Respectful Doctor Posture)
  // =========================================================================
  const wristDuration = 3.0;
  const wristTimes = [0.0, 0.75, 1.5, 2.25, 3.0];
  const wristTracks = [
    ...getStandingLegTracks(wristDuration),
    createQuatTrack('LeftArm', wristTimes, [
      [0.72, 0.38, 0.84],
      [0.70, 0.36, 0.82],
      [0.72, 0.38, 0.84],
      [0.74, 0.40, 0.86],
      [0.72, 0.38, 0.84],
    ]),
    createQuatTrack('LeftForeArm', wristTimes, [
      [-0.28, 0.0, 1.68],
      [-0.26, 0.0, 1.66],
      [-0.28, 0.0, 1.68],
      [-0.30, 0.0, 1.70],
      [-0.28, 0.0, 1.68],
    ]),
    createQuatTrack('RightArm', wristTimes, [
      [0.74, -0.38, -0.84],
      [0.76, -0.40, -0.86],
      [0.74, -0.38, -0.84],
      [0.72, -0.36, -0.82],
      [0.74, -0.38, -0.84],
    ]),
    createQuatTrack('RightForeArm', wristTimes, [
      [-0.28, 0.0, -1.58],
      [-0.30, 0.0, -1.62],
      [-0.28, 0.0, -1.58],
      [-0.26, 0.0, -1.54],
      [-0.28, 0.0, -1.58],
    ]),
    // Patient downward gaze toward wrist / polite attentiveness
    createQuatTrack('Head', wristTimes, [
      [0.22, -0.14, 0.04],
      [0.24, -0.14, 0.05],
      [0.22, -0.14, 0.04],
      [0.18, -0.10, 0.03],
      [0.22, -0.14, 0.04],
    ]),
    createQuatTrack('Spine1', wristTimes, [
      [0.03, 0.0, 0.0],
      [0.04, 0.0, 0.01],
      [0.03, 0.0, 0.0],
      [0.02, 0.0, -0.01],
      [0.03, 0.0, 0.0],
    ]),
  ];
  const naturalWristClip = new THREE.AnimationClip('HoldWrist', wristDuration, wristTracks);

  // =========================================================================
  // 7. Welcoming Open Arms (Hospitality & Warm Patient Greeting)
  // =========================================================================
  const welcomeDuration = 2.8;
  const welcomeTimes = [0.0, 0.7, 1.4, 2.1, 2.8];
  const welcomeTracks = [
    ...getStandingLegTracks(welcomeDuration),
    createQuatTrack('LeftArm', welcomeTimes, [
      [0.44, 0.16, 0.36],
      [0.48, 0.20, 0.42],
      [0.44, 0.16, 0.36],
      [0.40, 0.14, 0.30],
      [0.44, 0.16, 0.36],
    ]),
    createQuatTrack('RightArm', welcomeTimes, [
      [0.44, -0.16, -0.36],
      [0.48, -0.20, -0.42],
      [0.44, -0.16, -0.36],
      [0.40, -0.14, -0.30],
      [0.44, -0.16, -0.36],
    ]),
    createQuatTrack('LeftForeArm', welcomeTimes, [
      [-0.24, 0.0, 1.08],
      [-0.20, 0.0, 1.12],
      [-0.24, 0.0, 1.08],
      [-0.26, 0.0, 1.02],
      [-0.24, 0.0, 1.08],
    ]),
    createQuatTrack('RightForeArm', welcomeTimes, [
      [-0.24, 0.0, -1.08],
      [-0.20, 0.0, -1.12],
      [-0.24, 0.0, -1.08],
      [-0.26, 0.0, -1.02],
      [-0.24, 0.0, -1.08],
    ]),
    createQuatTrack('Head', welcomeTimes, [
      [-0.02, 0.04, 0.0],
      [0.02, 0.0, 0.0],
      [-0.02, -0.04, 0.0],
      [0.02, 0.0, 0.0],
      [-0.02, 0.04, 0.0],
    ]),
  ];
  const naturalWelcomeClip = new THREE.AnimationClip('Welcome', welcomeDuration, welcomeTracks);

  // =========================================================================
  // 8. Authentic in-place walk cycle from DoctorBoy.glb (mixamo.com)
  // =========================================================================
  let walkClip: THREE.AnimationClip | null = null;
  const rawWalk = gltfAnimations.find(
    (c) =>
      c.name.toLowerCase() === 'walking' ||
      c.name.toLowerCase() === 'walk' ||
      c.name.toLowerCase().includes('walk') ||
      c.name === 'mixamo.com'
  );

  if (rawWalk) {
    // Retain all bone rotations, but strip translational X/Z hip drift to create seamless in-place walking
    const inPlaceTracks = rawWalk.tracks.filter((t) => {
      if (t.name.includes('Hips.position') || t.name.includes('Hips.translation')) {
        return false;
      }
      return true;
    });
    walkClip = new THREE.AnimationClip('walking', rawWalk.duration, inPlaceTracks);
  }

  return {
    idleClip: naturalIdleClip,
    waveClip: naturalWaveClip,
    talkClip: naturalTalkClip,
    pointClip: naturalPointClip,
    thinkClip: naturalThinkClip,
    wristClip: naturalWristClip,
    welcomeClip: naturalWelcomeClip,
    walkClip,
  };
}
