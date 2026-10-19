import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Exit3DVisualizer: Real-time interactive 3D WebGL scene depicting the
 * investment holding horizon, the 365-day LTCG threshold gateway,
 * and the investor's current position with dynamic particle physics.
 */
export default function Exit3DVisualizer({ holdingDays = 200, thresholdDays = 365, isHold = true, savings = 5200 }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const daysRef = useRef(holdingDays);
  daysRef.current = holdingDays;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 360;
    const height = mount.clientHeight || 180;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0.8, 5.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Main Interactive Group
    const group = new THREE.Group();
    scene.add(group);

    // 2. Trajectory Arc (Torus segment representing the holding timeline)
    const curveRadius = 2.0;
    const trajectoryGeo = new THREE.TorusGeometry(curveRadius, 0.035, 16, 120, Math.PI);
    const trajectoryMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.45
    });
    const trajectoryMesh = new THREE.Mesh(trajectoryGeo, trajectoryMat);
    trajectoryMesh.rotation.x = Math.PI / 2;
    trajectoryMesh.rotation.z = Math.PI;
    group.add(trajectoryMesh);

    // 3. Milestone Gateway Ring at Day 365 (End of Arc)
    const gateGeo = new THREE.TorusGeometry(0.35, 0.04, 16, 32);
    const gateMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      roughness: 0.2,
      metalness: 0.8
    });
    const gateMesh = new THREE.Mesh(gateGeo, gateMat);
    // Position at angle = 0 (right end of semicircle)
    gateMesh.position.set(curveRadius, 0, 0);
    gateMesh.rotation.y = Math.PI / 2;
    group.add(gateMesh);

    // Glow aura around gate
    const gateAuraGeo = new THREE.RingGeometry(0.3, 0.5, 32);
    const gateAuraMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const gateAura = new THREE.Mesh(gateAuraGeo, gateAuraMat);
    gateAura.position.set(curveRadius, 0, 0);
    gateAura.rotation.y = Math.PI / 2;
    group.add(gateAura);

    // 4. Origin Marker at Day 0 (Left end of semicircle)
    const originGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const originMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x6b21a8,
      roughness: 0.3,
      metalness: 0.7
    });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    originMesh.position.set(-curveRadius, 0, 0);
    group.add(originMesh);

    // 5. Active Investor Token (Gemstone Sphere moving along the arc)
    const tokenGeo = new THREE.IcosahedronGeometry(0.24, 2);
    const tokenMat = new THREE.MeshPhysicalMaterial({
      color: 0xc084fc,
      emissive: 0x7c3aed,
      roughness: 0.1,
      metalness: 0.8,
      transmission: 0.6,
      transparent: true,
      opacity: 0.95
    });
    const tokenMesh = new THREE.Mesh(tokenGeo, tokenMat);
    group.add(tokenMesh);

    // Wireframe halo around investor token
    const haloGeo = new THREE.IcosahedronGeometry(0.32, 1);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf3e8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    tokenMesh.add(haloMesh);

    // 6. Particle Cloud (Floating Ambient Dust in Purple & Emerald)
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 6;
      particlePositions[i + 1] = (Math.random() - 0.5) * 3 + 0.3;
      particlePositions[i + 2] = (Math.random() - 0.5) * 3;

      // Color variation: violet/purple and emerald
      if (Math.random() > 0.4) {
        particleColors[i] = 0.75;     // R
        particleColors[i + 1] = 0.4;  // G
        particleColors[i + 2] = 0.98; // B
      } else {
        particleColors[i] = 0.2;      // R
        particleColors[i + 1] = 0.85; // G
        particleColors[i + 2] = 0.55; // B
      }
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    group.add(particleSystem);

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 10);
    purpleLight.position.set(-2, 2, 3);
    scene.add(purpleLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 2.2, 10);
    emeraldLight.position.set(2, 1.5, 3);
    scene.add(emeraldLight);

    // 8. Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e) => {
      const rect = mount.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / height - 0.5) * 2;
      targetRotationY = mouseX * 0.4;
      targetRotationX = -mouseY * 0.25;
    };

    mount.addEventListener('mousemove', handleMouseMove);

    // 9. Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse rotation
      group.rotation.y += (targetRotationY - group.rotation.y) * 0.08;
      group.rotation.x += (targetRotationX - group.rotation.x) * 0.08;

      // Position Token along the arc based on holdingDays
      // Angle goes from PI (Day 0) to 0 (Day 365+)
      const ratio = Math.min(1.0, Math.max(0, daysRef.current / thresholdDays));
      const angle = Math.PI - ratio * Math.PI;

      tokenMesh.position.x = curveRadius * Math.cos(angle);
      tokenMesh.position.z = -curveRadius * Math.sin(angle) * 0.4; // subtle depth offset
      tokenMesh.position.y = Math.sin(elapsedTime * 2.5) * 0.08; // gentle float

      // Rotate token and halo
      tokenMesh.rotation.y = elapsedTime * 1.5;
      tokenMesh.rotation.x = elapsedTime * 0.8;
      haloMesh.rotation.y = -elapsedTime * 2.0;

      // Gate pulse
      gateMesh.rotation.z = elapsedTime * 1.2;
      const pulseScale = 1 + Math.sin(elapsedTime * 3) * 0.06;
      gateMesh.scale.set(pulseScale, pulseScale, pulseScale);

      // Particle gentle drift
      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize handler
    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (mount) {
        mount.removeEventListener('mousemove', handleMouseMove);
        if (renderer.domElement && mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      }
      renderer.dispose();
    };
  }, [thresholdDays]);

  const ratio = Math.min(100, Math.round((holdingDays / thresholdDays) * 100));
  const isPast = holdingDays >= thresholdDays;

  return (
    <div className="exit-3d-visualizer-container">
      <div className="exit-3d-canvas-wrap" ref={mountRef}>
        {/* Real-time 3D Three.js canvas mounts here */}
      </div>

      {/* Floating 3D HUD Badges */}
      <div className="exit-3d-hud">
        <div className="hud-metric hud-left">
          <span className="hud-label">Origin (Day 0)</span>
          <span className="hud-val">STCG Active (20%)</span>
        </div>

        <div className={`hud-center-pill ${isPast ? 'hud-pill-success' : 'hud-pill-warning'}`}>
          <span className="hud-dot"></span>
          <span>{isPast ? "LTCG Window Active (0% Load)" : `${thresholdDays - holdingDays} Days to 0% Load Gateway`}</span>
        </div>

        <div className="hud-metric hud-right">
          <span className="hud-label">Gateway (Day {thresholdDays})</span>
          <span className="hud-val text-emerald">LTCG (12.5% + ₹1.25L Free)</span>
        </div>
      </div>
    </div>
  );
}
