import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import doctorModelUrl from '../assets/DoctorBoy.glb';
import { DoctorBoyAnimationController } from './doctor/DoctorBoyAnimationController';
import './PharmacyWelcomeAnimation.css';

/**
 * PharmacyWelcomeAnimation
 * 
 * Cinematic 3D Healthcare Scene powered by the DoctorBoy 3D Behavior & Biomechanics Engine.
 * 
 * Timeline:
 * 1. (0.0s - 4.5s) Walks in from off-screen left with authentic Mixamo skeletal gait.
 * 2. (4.5s - 8.5s) Decelerates, turns to camera, waves warmly with speech bubble, transitions to speaking.
 * 3. (8.5s - 11.5s) Turns rightward and walks towards the sign-in area.
 * 4. (11.5s - 14.8s) Extends hand to point and pulls the sign-in card smoothly into view.
 * 5. (> 14.8s) Settles at his post on the left:
 *    - Organic thoracic breathing (slow 4.2s cycle with ribcage expansion & subtle shoulder rise)
 *    - Natural weight shifts between feet (asymmetric stance every 14-25s)
 *    - Gaze tracking: head leads, neck follows, micro-saccades, and gaze aversion
 *    - Live credential context:
 *      * Typing username -> Attentive listening / thoughtful posture
 *      * Typing password -> Respectfully glances aside, holds wrist / checks watch
 *      * Submitting -> Pointing at card
 *      * Error -> Empathetic concern
 *      * Success -> Joyous acknowledgment & wave
 */

export function PharmacyWelcomeAnimation({
  children,
  loginStatus = 'idle',
  activeField = null,
  isTyping = false,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  // Character 3D nodes & Controller
  const doctorGroupRef = useRef(null);
  const characterWrapperRef = useRef(null);
  const controllerRef = useRef(null);
  const ringMeshRef = useRef(null);
  const floatingItemsRef = useRef([]);
  const animFrameIdRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Scene state
  const [cardProgress, setCardProgress] = useState(0);
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(false);

  // Debug & Diagnostics State
  const [inspectionReport, setInspectionReport] = useState(null);
  const [debugState, setDebugState] = useState('IDLE');
  const [debugAction, setDebugAction] = useState('idle');
  const [debugPosture, setDebugPosture] = useState('PROFESSIONAL');
  const [debugMixerTime, setDebugMixerTime] = useState(0);

  // Status and credential tracking refs for Three.js render loop
  const loginStatusRef = useRef(loginStatus);
  const statusChangeTimeRef = useRef(0);
  const activeFieldRef = useRef(activeField);
  const isTypingRef = useRef(isTyping);
  const manualOverrideRef = useRef({ state: null, until: 0 });
  const introSkippedRef = useRef(false);

  const handleSkipIntro = () => {
    introSkippedRef.current = true;
    setIsIntroComplete(true);
    setCardProgress(1.0);
    setShowGreetingBubble(false);
    if (controllerRef.current) {
      controllerRef.current.playState('IDLE', performance.now() / 1000, true);
    }
  };

  useEffect(() => {
    loginStatusRef.current = loginStatus;
    statusChangeTimeRef.current = performance.now() / 1000;
  }, [loginStatus]);

  useEffect(() => {
    activeFieldRef.current = activeField;
    isTypingRef.current = isTyping;
    if ((activeField || isTyping) && !isIntroComplete) {
      handleSkipIntro();
    }
  }, [activeField, isTyping, isIntroComplete]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let isDisposed = false;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const isMobile = width < 768;
    const isSmallScreen = width < 1024;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const defaultCamX = isSmallScreen ? 0 : -0.2;
    const defaultCamY = isMobile ? 1.45 : 1.3;
    const defaultCamZ = isMobile ? 5.6 : 4.6;

    camera.position.set(defaultCamX, defaultCamY, defaultCamZ);
    camera.lookAt(defaultCamX, 1.15, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      rendererRef.current = renderer;
    } catch (err) {
      console.error('[PharmacyWelcomeAnimation] WebGL initialization failed:', err);
      return;
    }

    // Studio environment map for realistic soft PBR lighting
    let envTexture = null;
    let pmremGenerator = null;
    try {
      pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
    } catch (e) {
      console.warn('[PharmacyWelcomeAnimation] RoomEnvironment setup warning:', e);
    }

    // 4. Clinical Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xf1f5f9, 1.4);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.025;
    scene.add(keyLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 1.3);
    frontLight.position.set(0, 2, 4.5);
    scene.add(frontLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(-4, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.0);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // 5. Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(20, 20);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.16 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Glowing medical pedestal ring that moves with doctor
    const ringGeo = new THREE.RingGeometry(0.75, 0.88, 48);
    const ringMat = new THREE.MeshBasicMaterial({ 
      color: 0x0ea5e9, 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.35 
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.005;
    scene.add(ringMesh);
    ringMeshRef.current = ringMesh;

    // 6. Master Doctor Group (Starts off-screen to the left, facing right)
    const doctorGroup = new THREE.Group();
    doctorGroup.position.set(-4.8, 0, 0);
    doctorGroup.rotation.y = Math.PI / 2; // Facing right (profile view)
    scene.add(doctorGroup);
    doctorGroupRef.current = doctorGroup;

    // Inner Local Character Wrapper (for stride bobbing, tilting, breathing, and reactions)
    const characterWrapper = new THREE.Group();
    doctorGroup.add(characterWrapper);
    characterWrapperRef.current = characterWrapper;

    // 7. Load DoctorBoy.glb Model
    const gltfLoader = new GLTFLoader();
    const modelUrl = doctorModelUrl || '/DoctorBoy.glb';

    gltfLoader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;

        // Process skinned meshes: enable shadows, double-sided materials, and disable frustum culling
        model.traverse((child) => {
          if (child.isMesh || child.isSkinnedMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;

            if (child.material) {
              child.material.metalness = 0.04;
              child.material.roughness = 0.65;
              child.material.side = THREE.DoubleSide;

              if (child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
                child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                child.material.map.magFilter = THREE.LinearFilter;
                child.material.map.generateMipmaps = true;
                child.material.map.needsUpdate = true;
              }
              child.material.needsUpdate = true;
            }
          }
        });

        // Initialize comprehensive DoctorBoy animation and behavior controller
        const controller = new DoctorBoyAnimationController(
          model,
          gltf.animations || [],
          (nextState, clipName) => {
            setDebugState(nextState);
            setDebugAction(clipName);
          }
        );

        controllerRef.current = controller;
        setInspectionReport(controller.inspectionReport);

        // Start with Walking state for Phase 1 intro
        controller.playState('WALKING', 0, true);

        // Scale and position model accurately
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const targetHeight = 2.15;
        const modelHeight = size.y > 0.001 ? size.y : 1.0;
        const scale = targetHeight / modelHeight;
        model.scale.set(scale, scale, scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        model.rotation.set(0, 0, 0);

        characterWrapper.add(model);
      },
      undefined,
      (err) => {
        console.error('[PharmacyWelcomeAnimation] Failed to load DoctorBoy.glb:', err);
      }
    );

    // 8. Floating Medical Capsules in background
    const floatingItems = [];
    const createCapsule = (colorTop, colorBottom, x, y, z, scale = 1) => {
      const capGroup = new THREE.Group();
      capGroup.position.set(x, y, z);
      capGroup.scale.set(scale, scale, scale);

      const topGeo = new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const topMat = new THREE.MeshStandardMaterial({ color: colorTop, roughness: 0.2 });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 0.07;
      capGroup.add(topMesh);

      const cylGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.14, 20);
      const cylMat = new THREE.MeshStandardMaterial({ color: colorBottom, roughness: 0.2 });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      capGroup.add(cylMesh);

      const botGeo = new THREE.SphereGeometry(0.09, 20, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
      const botMesh = new THREE.Mesh(botGeo, cylMat);
      botMesh.position.y = -0.07;
      capGroup.add(botMesh);

      scene.add(capGroup);
      floatingItems.push({
        group: capGroup,
        baseY: y,
        speed: 1.2 + Math.random() * 0.8,
        rotSpeedX: 0.8 + Math.random() * 0.5,
        rotSpeedY: 0.6 + Math.random() * 0.6,
        amplitude: 0.1 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    };

    createCapsule(0x10b981, 0xffffff, -2.8, 2.2, 0.4, 0.85);
    createCapsule(0x0ea5e9, 0x06b6d4, 2.6, 2.4, 0.2, 0.75);
    createCapsule(0xf59e0b, 0xffffff, -2.4, 0.8, 0.6, 0.6);
    createCapsule(0x6366f1, 0x38bdf8, 2.8, 0.9, 0.5, 0.65);

    floatingItemsRef.current = floatingItems;

    // --- CINEMATIC ANIMATION & TIMELINE ENGINE ---
    const timer = new THREE.Timer();
    const finalDoctorX = isSmallScreen ? 0 : -1.8;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const animate = () => {
      if (isDisposed) return;
      animFrameIdRef.current = requestAnimationFrame(animate);

      timer.update();
      const delta = Math.min(timer.getDelta(), 0.1);
      const elapsed = timer.getElapsed();

      // Smooth cursor interpolation
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * delta * 5;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * delta * 5;

      const currentStatus = loginStatusRef.current;
      const statusElapsed = elapsed - (statusChangeTimeRef.current || 0);
      const ctrl = controllerRef.current;

      // =========================================================================
      // SCENE TIMELINE
      // =========================================================================

      // =========================================================================
      // SCENE TIMELINE: Fluid, Natural Entrance & Welcoming Sequence
      // =========================================================================

      // Skip support: If user already focused or clicked skip
      if (introSkippedRef.current) {
        if (!isIntroComplete) {
          setIsIntroComplete(true);
          setCardProgress(1.0);
          setShowGreetingBubble(false);
        }
      }

      // -------------------------------------------------------------------------
      // PHASE 1: NATURAL WALK-IN (0.0s - 2.2s)
      // Doctor walks gracefully in from the left directly to his station
      // -------------------------------------------------------------------------
      if (elapsed < 2.2 && !introSkippedRef.current) {
        if (ctrl) ctrl.playState('WALKING', elapsed);

        const p = Math.min(elapsed / 2.2, 1.0);
        const easeP = easeOutCubic(p);
        const startX = isSmallScreen ? -2.5 : -4.2;
        const currentX = THREE.MathUtils.lerp(startX, finalDoctorX, easeP);

        doctorGroup.position.x = currentX;
        doctorGroup.position.y = 0;
        doctorGroup.position.z = 0;

        // Smooth turn from walking direction into facing user
        const turnAngle = THREE.MathUtils.lerp(Math.PI * 0.42, 0.15, Math.pow(p, 1.8));
        doctorGroup.rotation.y = turnAngle;

        characterWrapper.rotation.x = 0.02 * (1 - p);
        characterWrapper.rotation.z = 0;

        // Form reveals smoothly
        if (elapsed > 0.6) {
          const cardP = Math.min((elapsed - 0.6) / 1.5, 1.0);
          setCardProgress(easeOutCubic(cardP));
        }
      }

      // -------------------------------------------------------------------------
      // PHASE 2: WARM GREETING & FORM PRESENTATION (2.2s - 3.8s)
      // -------------------------------------------------------------------------
      else if (elapsed < 3.8 && !introSkippedRef.current) {
        const subT = elapsed - 2.2; // 0.0s - 1.6s

        doctorGroup.position.x = finalDoctorX;
        doctorGroup.rotation.y = 0.15; // Facing user & sign-in card

        if (ctrl) {
          if (subT < 0.9) {
            ctrl.playState('GREETING', elapsed);
            if (!showGreetingBubble) setShowGreetingBubble(true);
          } else {
            ctrl.playState('WELCOME', elapsed);
            if (showGreetingBubble && subT > 1.3) setShowGreetingBubble(false);
          }
        }

        setCardProgress(1.0);
        characterWrapper.rotation.x = THREE.MathUtils.lerp(characterWrapper.rotation.x, 0, delta * 6);
        characterWrapper.rotation.z = THREE.MathUtils.lerp(characterWrapper.rotation.z, 0, delta * 6);
      }

      // -------------------------------------------------------------------------
      // PHASE 3: ATTENTIVE INTERACTIVE MEDICAL ASSISTANT (> 3.8s or Skipped)
      // -------------------------------------------------------------------------
      else {
        if (!isIntroComplete) {
          setIsIntroComplete(true);
          setCardProgress(1.0);
          if (showGreetingBubble) setShowGreetingBubble(false);
        }

        // Doctor is anchored at resting post on the left
        doctorGroup.position.x = THREE.MathUtils.lerp(doctorGroup.position.x, finalDoctorX, delta * 8);
        doctorGroup.rotation.y = THREE.MathUtils.lerp(doctorGroup.rotation.y, 0.15, delta * 6);

        // --- 1. CREDENTIALS VALIDATION PRIORITY BEHAVIORS ---
        if (currentStatus === 'error') {
          if (ctrl) ctrl.showErrorConcern(elapsed);

          // Pedestal turns soft red/amber
          if (ringMeshRef.current) {
            ringMeshRef.current.material.color.setHex(0xef4444);
            ringMeshRef.current.material.opacity = 0.6;
          }
        } 
        else if (currentStatus === 'success') {
          if (ctrl) ctrl.celebrateSuccess(elapsed);

          // Pedestal turns bright emerald
          if (ringMeshRef.current) {
            ringMeshRef.current.material.color.setHex(0x10b981);
            ringMeshRef.current.material.opacity = 0.7;
          }
        } 
        else if (currentStatus === 'submitting') {
          if (ctrl) {
            ctrl.setPosture('PROFESSIONAL');
            ctrl.playState('POINTING', elapsed);
          }
        } 
        // --- 2. LIVE CREDENTIAL FILLING & REALISTIC HUMAN POSTURES ---
        else {
          const nowSec = performance.now() / 1000;
          const isManualActive =
            manualOverrideRef.current.state &&
            nowSec < manualOverrideRef.current.until;

          if (isManualActive && ctrl) {
            ctrl.playState(manualOverrideRef.current.state, elapsed, true);
          } else if (activeFieldRef.current === 'username' && ctrl) {
            // Client is entering username: doctor shows attentive, thoughtful listening posture
            ctrl.setPosture('LISTENING');
            ctrl.playState('THINKING', elapsed);
          } else if (activeFieldRef.current === 'password' && ctrl) {
            // Client is entering secret password: doctor tactfully checks wrist/watch or glances aside politely
            ctrl.setPosture('PROFESSIONAL');
            ctrl.playState('HOLD_WRIST', elapsed);
          } else if (ctrl) {
            // Natural resting human idle (subtle respiration, organic weight shift, eye gaze)
            ctrl.setPosture('PROFESSIONAL');
            ctrl.playState('IDLE', elapsed);
          }

          characterWrapper.position.y = 0;
          characterWrapper.rotation.x = THREE.MathUtils.lerp(characterWrapper.rotation.x, 0, delta * 6);
          characterWrapper.rotation.z = THREE.MathUtils.lerp(characterWrapper.rotation.z, 0, delta * 6);

          if (ringMeshRef.current) {
            ringMeshRef.current.material.color.setHex(0x0ea5e9);
            ringMeshRef.current.material.opacity = 0.35;
          }
        }
      }

      // Sync pedestal position with doctor
      if (ringMeshRef.current && doctorGroup) {
        ringMeshRef.current.position.x = doctorGroup.position.x;
        ringMeshRef.current.position.z = doctorGroup.position.z;
      }

      // Floating background capsules
      floatingItemsRef.current.forEach((item) => {
        item.group.position.y = item.baseY + Math.sin(elapsed * item.speed + item.phase) * item.amplitude;
        item.group.rotation.x += delta * item.rotSpeedX;
        item.group.rotation.y += delta * item.rotSpeedY;
      });

      // Update character controller (advances mixer + procedural breathing, weight shifts, and look tracking)
      if (ctrl) {
        ctrl.update(delta, elapsed, mousePosRef.current.x, mousePosRef.current.y);

        // Update diagnostics state for debug panel
        setDebugMixerTime(ctrl.mixer.time);
        setDebugPosture(ctrl.idleController.getPosture());
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse Tracking Handler
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current.targetX = THREE.MathUtils.clamp(x, -1, 1);
      mousePosRef.current.targetY = THREE.MathUtils.clamp(y, -1, 1);
    };

    // Interactive Tap / Click to interact with Doctor
    const handleCanvasClick = (e) => {
      const rect = container.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / rect.width;
      if (clickX < 0.48 && controllerRef.current) {
        const states = ['GREETING', 'HOLD_WRIST', 'THINKING', 'WELCOME', 'TALKING'];
        const current = manualOverrideRef.current.state;
        const nextIdx = (states.indexOf(current) + 1) % states.length;
        const chosen = states[nextIdx];

        manualOverrideRef.current = {
          state: chosen,
          until: performance.now() / 1000 + 4.0,
        };
        controllerRef.current.playState(chosen, performance.now() / 1000, true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleCanvasClick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;

      const mob = w < 768;
      const small = w < 1024;
      const camX = small ? 0 : -0.2;
      const camY = mob ? 1.45 : 1.3;
      const camZ = mob ? 5.6 : 4.6;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(camX, 1.15, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', handleResize);

      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
      if (pmremGenerator) pmremGenerator.dispose();
      if (envTexture) envTexture.dispose();
      if (renderer) renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    };
  }, []);

  const cardSlideStyle = {
    transform: isIntroComplete 
      ? 'translateX(0) scale(1)' 
      : `translateX(${(1 - cardProgress) * 180}px) scale(${0.85 + (cardProgress * 0.15)})`,
    opacity: isIntroComplete ? 1 : Math.max(0, cardProgress * 1.2),
    pointerEvents: (isIntroComplete || cardProgress > 0.7) ? 'auto' : 'none',
    transition: isIntroComplete ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',
  };

  const triggerSpecificPosture = (stateName, durationSec = 4.0) => {
    manualOverrideRef.current = {
      state: stateName,
      until: performance.now() / 1000 + durationSec,
    };
    if (controllerRef.current) {
      controllerRef.current.playState(stateName, performance.now() / 1000, true);
    }
  };

  const handleTriggerPosture = (posture) => {
    if (controllerRef.current) {
      controllerRef.current.setPosture(posture);
      setDebugPosture(posture);
    }
  };

  return (
    <div ref={containerRef} className="pwa-stage-root">
      {/* Ambient background glow & soft grid */}
      <div className="pwa-stage-ambient" />

      {/* Full-screen 3D WebGL Canvas Layer */}
      <div className="pwa-canvas-layer">
        <canvas ref={canvasRef} />
      </div>

      {/* Floating Greeting Speech Bubble in Center during Phase 2 */}
      {showGreetingBubble && (
        <div className="pwa-greeting-bubble animate-bounce-subtle">
          <span className="text-xl">👋</span>
          <span className="font-semibold text-slate-900 dark:text-white">Hello! Welcome to MediTrack Pro</span>
        </div>
      )}

      {/* Interactive Body Language Badges for Doctor on Left */}
      {isIntroComplete && (
        <div className="pwa-posture-selector">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Doctor Posture:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => triggerSpecificPosture('GREETING')}
              className="pwa-posture-pill hover:scale-105 active:scale-95 transition-all text-xs font-semibold py-1 px-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
              title="Friendly Greeting Wave"
            >
              👋 Say Hi
            </button>
            <button
              type="button"
              onClick={() => triggerSpecificPosture('HOLD_WRIST')}
              className="pwa-posture-pill hover:scale-105 active:scale-95 transition-all text-xs font-semibold py-1 px-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
              title="Calmly check wrist / watch"
            >
              ⌚ Hold Wrist
            </button>
            <button
              type="button"
              onClick={() => triggerSpecificPosture('THINKING')}
              className="pwa-posture-pill hover:scale-105 active:scale-95 transition-all text-xs font-semibold py-1 px-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
              title="Thoughtful chin touch posture"
            >
              🤔 Thinking
            </button>
            <button
              type="button"
              onClick={() => triggerSpecificPosture('WELCOME')}
              className="pwa-posture-pill hover:scale-105 active:scale-95 transition-all text-xs font-semibold py-1 px-2.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400"
              title="Welcoming open hands"
            >
              👐 Welcome
            </button>
          </div>
        </div>
      )}

      {/* Quick Skip Intro Button */}
      {!isIntroComplete && (
        <button
          type="button"
          onClick={handleSkipIntro}
          className="absolute top-4 right-4 z-40 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-white/70 dark:bg-slate-850/70 backdrop-blur rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800"
          title="Skip to Sign In"
        >
          Skip Intro &rarr;
        </button>
      )}

      {/* Main Content: Pulled-out Sign-in Card */}
      <div className="pwa-stage-container">
        <div className="pwa-empty-space" />
        
        <div className="pwa-login-slot" style={cardSlideStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default PharmacyWelcomeAnimation;
