import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function FitnessAvatar3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const size = Math.min(mountRef.current.clientWidth, 400);
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00a9ff,
      shininess: 30,
      emissive: 0x001a33
    });

    // Create body parts
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 32, 32),
      bodyMaterial
    );
    head.position.y = 1.8;

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.8, 32),
      bodyMaterial
    );
    torso.position.y = 1.0;

    const leftArm = new THREE.Group();
    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.6, 16),
      bodyMaterial
    );
    leftUpperArm.position.set(-0.5, 1.2, 0);
    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.6, 16),
      bodyMaterial
    );
    leftForearm.position.set(-0.5, 0.5, 0);
    leftArm.add(leftUpperArm, leftForearm);

    const rightArm = new THREE.Group();
    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.6, 16),
      bodyMaterial
    );
    rightUpperArm.position.set(0.5, 1.2, 0);
    const rightForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.6, 16),
      bodyMaterial
    );
    rightForearm.position.set(0.5, 0.5, 0);
    rightArm.add(rightUpperArm, rightForearm);

    const leftLeg = new THREE.Group();
    const leftThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.7, 16),
      bodyMaterial
    );
    leftThigh.position.set(-0.2, 0.3, 0);
    const leftCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.6, 16),
      bodyMaterial
    );
    leftCalf.position.set(-0.2, -0.3, 0);
    leftLeg.add(leftThigh, leftCalf);

    const rightLeg = new THREE.Group();
    const rightThigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.7, 16),
      bodyMaterial
    );
    rightThigh.position.set(0.2, 0.3, 0);
    const rightCalf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.6, 16),
      bodyMaterial
    );
    rightCalf.position.set(0.2, -0.3, 0);
    rightLeg.add(rightThigh, rightCalf);

    const body = new THREE.Group();
    body.add(head, torso, leftArm, rightArm, leftLeg, rightLeg);
    scene.add(body);

    camera.position.z = 5;
    camera.position.y = 1;

    // Animation state
    let time = 0;
    let currentExercise = 0;
    let morphProgress = 0;

    // Animate
    function animate() {
      requestAnimationFrame(animate);
      time += 0.016;
      morphProgress = Math.min(morphProgress + 0.0003, 1);

      // Morph body to more fit over time
      const fitScale = 1 + morphProgress * 0.3;
      torso.scale.y = fitScale;
      torso.scale.x = 1 - morphProgress * 0.15;
      leftUpperArm.scale.y = fitScale * 1.1;
      rightUpperArm.scale.y = fitScale * 1.1;
      leftThigh.scale.y = fitScale * 1.05;
      rightThigh.scale.y = fitScale * 1.05;

      // Cycle through exercises every 4 seconds
      const exerciseCycle = Math.floor(time / 4) % 4;

      if (exerciseCycle === 0) {
        // Walking
        leftThigh.rotation.x = Math.sin(time * 2) * 0.5;
        rightThigh.rotation.x = -Math.sin(time * 2) * 0.5;
        leftUpperArm.rotation.x = -Math.sin(time * 2) * 0.3;
        rightUpperArm.rotation.x = Math.sin(time * 2) * 0.3;
        body.position.y = 0;
      } else if (exerciseCycle === 1) {
        // Lunges
        const lungeCycle = Math.sin(time * 1.5);
        leftThigh.rotation.x = lungeCycle * 0.8;
        rightThigh.rotation.x = -lungeCycle * 0.8;
        body.position.y = -0.3 + Math.abs(lungeCycle) * 0.2;
        leftUpperArm.rotation.x = 0;
        rightUpperArm.rotation.x = 0;
      } else if (exerciseCycle === 2) {
        // Push-ups
        const pushUpCycle = Math.sin(time * 2);
        body.rotation.x = Math.PI / 2.5;
        body.position.y = -0.5 + pushUpCycle * 0.2;
        leftUpperArm.rotation.x = pushUpCycle * 0.5;
        rightUpperArm.rotation.x = pushUpCycle * 0.5;
      } else {
        // Burpees
        const burpeeCycle = Math.sin(time * 2.5);
        body.rotation.x = burpeeCycle > 0 ? Math.PI / 2.5 : 0;
        body.position.y = burpeeCycle > 0 ? -0.5 : 0.3;
        leftThigh.rotation.x = burpeeCycle < 0 ? -0.8 : 0;
        rightThigh.rotation.x = burpeeCycle < 0 ? -0.8 : 0;
        leftUpperArm.rotation.x = burpeeCycle < 0 ? -Math.PI / 2 : 0;
        rightUpperArm.rotation.x = burpeeCycle < 0 ? -Math.PI / 2 : 0;
      }

      // Smooth rotation
      body.rotation.y += 0.005;

      renderer.render(scene, camera);
    }

    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full max-w-md mx-auto aspect-square"
      style={{ minHeight: '300px' }}
    />
  );
}