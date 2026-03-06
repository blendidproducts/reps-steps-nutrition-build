import { useEffect, useRef, useCallback } from "react";

// Step detection thresholds (tuned for walking/jogging/sprinting)
const ACCEL_THRESHOLD = 1.2;       // Minimum acceleration spike to count as a step (m/s²)
const MIN_STEP_INTERVAL_MS = 250;  // Minimum time between steps (prevents double-counting) ~240 steps/min max
const SMOOTHING_WINDOW = 3;        // Number of samples to average for noise reduction

export default function StepTracker({ isActive, onStepUpdate }) {
  const stepsRef = useRef(0);
  const lastStepTimeRef = useRef(0);
  const accelBufferRef = useRef([]);
  const permissionGrantedRef = useRef(false);
  const cleanupRef = useRef(null);

  const detectStep = useCallback((acceleration) => {
    const now = Date.now();
    
    // Calculate magnitude of acceleration (removes gravity direction dependency)
    const magnitude = Math.sqrt(
      (acceleration.x || 0) ** 2 + 
      (acceleration.y || 0) ** 2 + 
      (acceleration.z || 0) ** 2
    );
    
    // Smooth with rolling average to reduce noise
    accelBufferRef.current.push(magnitude);
    if (accelBufferRef.current.length > SMOOTHING_WINDOW) {
      accelBufferRef.current.shift();
    }
    
    const avgMagnitude = accelBufferRef.current.reduce((a, b) => a + b, 0) / accelBufferRef.current.length;
    
    // Detect step: spike above threshold + minimum interval between steps
    if (avgMagnitude > ACCEL_THRESHOLD && (now - lastStepTimeRef.current) > MIN_STEP_INTERVAL_MS) {
      stepsRef.current += 1;
      lastStepTimeRef.current = now;
      
      // Report every step to parent
      onStepUpdate(stepsRef.current);
    }
  }, [onStepUpdate]);

  const startTracking = useCallback(async () => {
    // iOS 13+ requires explicit permission for DeviceMotion
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          console.warn('[StepTracker] Motion permission denied');
          return false;
        }
        permissionGrantedRef.current = true;
      } catch (err) {
        console.error('[StepTracker] Permission request failed:', err);
        return false;
      }
    }

    const handleMotion = (event) => {
      // Use accelerationIncludingGravity as fallback if linear acceleration unavailable
      const accel = event.acceleration || event.accelerationIncludingGravity;
      if (accel) {
        detectStep(accel);
      }
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });
    console.log('[StepTracker] Accelerometer step tracking started');

    cleanupRef.current = () => {
      window.removeEventListener('devicemotion', handleMotion);
      console.log('[StepTracker] Accelerometer step tracking stopped');
    };

    return true;
  }, [detectStep]);

  useEffect(() => {
    if (isActive) {
      startTracking();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [isActive, startTracking]);

  // Reset steps when tracker becomes active
  useEffect(() => {
    if (isActive) {
      stepsRef.current = 0;
      lastStepTimeRef.current = 0;
      accelBufferRef.current = [];
    }
  }, [isActive]);

  // This component renders nothing — it's a behavior-only hook component
  return null;
}