import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useLowPerformanceMode } from '@/hooks/useLowPerformanceMode';

// ── Shared DRACO loader (one instance for the entire app lifetime) ────────────
// Uses WASM decoder for maximum decompression speed on budget devices.
let _dracoLoader = null;
function getDracoLoader() {
  if (!_dracoLoader) {
    _dracoLoader = new DRACOLoader();
    _dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    // 'wasm' is significantly faster than 'js' on mid/low-end Android SoCs
    _dracoLoader.setDecoderConfig({ type: 'wasm' });
    // Pre-fetch the WASM binary so it's ready when first model loads
    _dracoLoader.preload();
  }
  return _dracoLoader;
}

// ── Detect low-end device heuristic ──────────────────────────────────────────
// Budget Android devices typically report 4 or fewer logical CPU cores and a
// device pixel ratio of exactly 1 (or use software rendering at low DPR).
// Also respects the user-controlled Low Performance Mode flag.
function isLowEndDevice() {
  if (window.__RNS_LOW_PERF) return true;
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  return cores <= 4 || dpr <= 1;
}

// ── Three.js scene ────────────────────────────────────────────────────────────
function ThreeScene({ modelUrl, exerciseName, forceLowPerf }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const mixerRef = useRef(null);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    if (!modelUrl || !mountRef.current) return;

    const lowEnd = forceLowPerf || isLowEndDevice();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const { clientWidth: w, clientHeight: h } = mountRef.current;
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !lowEnd,       // skip MSAA on budget devices
      powerPreference: 'low-power', // hint GPU driver to use efficient path
      precision: lowEnd ? 'mediump' : 'highp',
    });
    renderer.setSize(w, h);
    // Cap DPR: 1.5 on low-end devices, 2 on capable hardware
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowEnd ? 1.5 : 2));
    // Disable shadow maps entirely on low-end devices — expensive fill-rate
    renderer.shadowMap.enabled = !lowEnd;
    if (!lowEnd) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);

    // Lights — simpler lighting on low-end to reduce fragment shader cost
    scene.add(new THREE.AmbientLight(0xffffff, lowEnd ? 0.9 : 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, lowEnd ? 0.6 : 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = !lowEnd;
    scene.add(dirLight);
    if (!lowEnd) {
      const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
      fillLight.position.set(-5, 5, -5);
      scene.add(fillLight);
    }

    // Load GLB with DRACO decompression
    const loader = new GLTFLoader();
    loader.setDRACOLoader(getDracoLoader());

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;

        // Normalise scale & centre the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const scale = 2 / Math.max(size.x, size.y, size.z);
        model.scale.multiplyScalar(scale);
        model.position.x = -center.x * scale;
        model.position.y = -box.min.y * scale;
        model.position.z = -center.z * scale;

        // On low-end devices downgrade materials to MeshLambertMaterial to
        // avoid expensive PBR lighting calculations in the fragment shader.
        if (lowEnd) {
          model.traverse((obj) => {
            if (obj.isMesh && obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              obj.material = mats.map((m) => {
                const lambert = new THREE.MeshLambertMaterial({
                  map: m.map ?? null,
                  color: m.color ?? new THREE.Color(0xcccccc),
                });
                m.dispose();
                return lambert;
              });
              if (!Array.isArray(obj.material)) obj.material = obj.material[0];
            }
          });
        }

        scene.add(model);

        if (gltf.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixerRef.current = mixer;
          const action = mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.play();
        }
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading 3D model:', err);
        setError('Failed to load 3D model');
        setLoading(false);
      }
    );

    // Pause the render loop when the document is hidden (tab switch, modal close)
    // to avoid burning GPU cycles needlessly on low-end devices.
    let animationPaused = false;
    const handleVisibility = () => {
      animationPaused = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (animationPaused) return;
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) mixerRef.current.update(delta);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const { clientWidth: rw, clientHeight: rh } = mountRef.current;
      camera.aspect = rw / rh;
      camera.updateProjectionMatrix();
      renderer.setSize(rw, rh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);

      // 1. Stop animation loop immediately so no further render calls fire
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // 2. Tear down animation mixer
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
        mixerRef.current = null;
      }

      // 3. Dispose orbit controls
      controls.dispose();

      // 4. Walk the scene graph and release every GPU resource
      //    disposeMaterial exhaustively disposes all known PBR texture slots
      //    so nothing is leaked even when the material has non-standard maps.
      const disposeMaterial = (mat) => {
        // Explicit PBR + common texture slots — covers MeshStandardMaterial,
        // MeshPhysicalMaterial, MeshLambertMaterial, MeshPhongMaterial, etc.
        const textureSlots = [
          'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
          'emissiveMap', 'displacementMap', 'bumpMap', 'alphaMap',
          'envMap', 'lightMap', 'gradientMap', 'specularMap', 'matcap',
          'transmissionMap', 'thicknessMap', 'clearcoatMap',
          'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap',
        ];
        textureSlots.forEach((slot) => {
          if (mat[slot]?.isTexture) {
            mat[slot].dispose();
            mat[slot] = null;
          }
        });
        mat.dispose();
      };

      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj.isMesh) {
            if (obj.geometry) {
              obj.geometry.dispose();
              obj.geometry = null;
            }
            if (Array.isArray(obj.material)) {
              obj.material.forEach(disposeMaterial);
            } else if (obj.material) {
              disposeMaterial(obj.material);
            }
            obj.material = null;
          }
        });
        // Remove all children so GC can collect them
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
        sceneRef.current = null;
      }

      // 5. Tear down renderer — nullify domElement ref to prevent stale access
      if (rendererRef.current) {
        if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.renderLists.dispose();
        rendererRef.current.info.reset();
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      // 6. Reset clock so delta is sane if the component remounts
      clockRef.current.stop();
    };
  }, [modelUrl]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full rounded-lg overflow-hidden"
        role="img"
        aria-label={`3D model of ${exerciseName}`}
      />
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg"
          aria-live="polite"
          aria-label="Loading 3D model"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading 3D model…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lazy-mount wrapper ────────────────────────────────────────────────────────
// The Three.js scene is only instantiated when the container scrolls into the
// viewport (IntersectionObserver). This avoids booting WebGL on hidden modals
// and prevents wasted GPU/CPU cycles on budget Android devices.
// Low Performance Mode is read from the global hook so toggling it in Settings
// immediately affects any newly opened 3D viewer.
export default function Exercise3DViewer({ modelUrl, exerciseName }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isLowPerf } = useLowPerformanceMode();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {isVisible ? (
        <ThreeScene modelUrl={modelUrl} exerciseName={exerciseName} forceLowPerf={isLowPerf} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      )}
    </div>
  );
}