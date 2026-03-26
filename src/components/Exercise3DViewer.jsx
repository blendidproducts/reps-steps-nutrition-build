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

// ── Global WebGL context memory observer ─────────────────────────────────────
// Tracks the total number of live WebGL contexts across the app.
// Most Android WebViews cap concurrent contexts at 8–16; iOS WKWebView at 8.
// When the count approaches the cap we log a warning. If the context is lost
// (GPU driver eviction, OOM, or tab backgrounding), we surface a recoverable
// error state instead of a silent blank canvas.
const _webglContextCount = { active: 0 };

function incrementWebGLCount() {
  _webglContextCount.active += 1;
  if (_webglContextCount.active >= 6) {
    console.warn(
      `[WebGL] ${_webglContextCount.active} active contexts — approaching device limit. ` +
      "Consider closing unused 3D viewers to prevent context eviction."
    );
  }
}

function decrementWebGLCount() {
  _webglContextCount.active = Math.max(0, _webglContextCount.active - 1);
}

// ── Three.js scene ────────────────────────────────────────────────────────────
function ThreeScene({ modelUrl, exerciseName, forceLowPerf }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contextLost, setContextLost] = useState(false);
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

    // ── WebGL context loss/restore monitoring ──────────────────────────────
    // `webglcontextlost` fires when the GPU driver evicts this context (OOM,
    // too many concurrent contexts, or Android backgrounding). We surface a
    // recoverable error UI instead of a silent freeze.
    // `webglcontextrestored` fires if the driver later reinstates the context
    // (common on Android after returning from background). We reload the page
    // or notify the user they can retry.
    incrementWebGLCount();

    const canvas = renderer.domElement;
    const handleContextLost = (e) => {
      e.preventDefault(); // required to allow context restoration
      console.warn("[WebGL] Context lost for", exerciseName);
      setContextLost(true);
      // Stop the animation loop so we don't call render() on a dead context.
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
    const handleContextRestored = () => {
      console.info("[WebGL] Context restored for", exerciseName);
      setContextLost(false);
      // The scene state (GPU buffers) is gone after a context loss. Signal
      // the user to retry rather than attempting a silent hot-reload which
      // would likely fail due to stale GPU handles.
      setError("3D context was lost. Tap to retry.");
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

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

    // Pause the render loop when:
    //  a) the document is hidden (tab switch, app backgrounded on Android), or
    //  b) the canvas container is scrolled out of the viewport (IntersectionObserver)
    // Both paths set the same `animationPaused` flag checked every rAF tick.
    let animationPaused = false;
    const handleVisibility = () => { animationPaused = document.hidden; };
    document.addEventListener('visibilitychange', handleVisibility);

    // IntersectionObserver: pause when the canvas is off-screen
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => { animationPaused = !entry.isIntersecting || document.hidden; },
      { threshold: 0 }
    );
    if (mountRef.current) intersectionObserver.observe(mountRef.current);

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
      intersectionObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      decrementWebGLCount();

      // 1. Stop animation loop immediately so no further render calls fire
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // 2. Tear down animation mixer — uncache all clips and the root object
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(mixerRef.current.getRoot());
        mixerRef.current.timeScale = 0;
        mixerRef.current = null;
      }

      // 3. Dispose orbit controls
      controls.dispose();

      // 4. Walk the scene graph and release every GPU resource.
      //    disposeMaterial exhaustively disposes all known PBR texture slots.
      const disposeMaterial = (mat) => {
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
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
        sceneRef.current = null;
      }

      // 5. Tear down renderer.
      //    - renderLists.dispose() releases all internal draw-call buffers.
      //    - forceContextLoss() is the most aggressive step: it tells the GPU
      //      driver to immediately reclaim the WebGL context and all associated
      //      VRAM. This is the single most effective action for preventing
      //      "too many WebGL contexts" crashes on low-end Android devices that
      //      cap the number of concurrent GL contexts at 4–8.
      if (rendererRef.current) {
        if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.renderLists.dispose();
        rendererRef.current.info.reset();
        // Force the WebGL context loss — reclaims GPU memory immediately.
        const ext = rendererRef.current.getContext()
          ?.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
        rendererRef.current.dispose();
        rendererRef.current = null;
      }

      // 6. Reset clock so delta is sane if the component remounts
      clockRef.current.stop();
    };
  }, [modelUrl]);

  if (error) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-lg gap-3 cursor-pointer"
        onClick={() => { setError(null); setContextLost(false); }}
        role="button"
        aria-label="Retry loading 3D model"
      >
        <p className="text-sm text-red-400 text-center px-4">{error}</p>
        <span className="text-xs text-gray-500">Tap to retry</span>
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
    <div ref={containerRef} className="w-full relative" style={{ paddingBottom: "56.25%" /* 16:9 */ }}>
      <div className="absolute inset-0">
        {isVisible ? (
          <ThreeScene modelUrl={modelUrl} exerciseName={exerciseName} forceLowPerf={isLowPerf} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
          </div>
        )}
      </div>
    </div>
  );
}