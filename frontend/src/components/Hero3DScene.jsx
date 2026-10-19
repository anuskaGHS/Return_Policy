import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Hero3DScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Dimensions
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Group for mouse rotation
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Central Faceted Polyhedron (representing Wealth Core)
    const geometry = new THREE.IcosahedronGeometry(1.6, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      emissive: 0x2e1065,
      roughness: 0.15,
      metalness: 0.7,
      transmission: 0.65,
      ior: 1.45,
      transparent: true,
      opacity: 0.85,
      wireframe: false
    });
    const coreMesh = new THREE.Mesh(geometry, material);
    mainGroup.add(coreMesh);

    // Wireframe overlay for high-tech financial grid feel
    const wireGeo = new THREE.IcosahedronGeometry(1.63, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    mainGroup.add(wireMesh);

    // 2. Orbital Rings (representing Compounding Cycles)
    const ringGeo = new THREE.TorusGeometry(2.3, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.6 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    mainGroup.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.55 });
    const ring2 = new THREE.Mesh(ringGeo, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = -Math.PI / 3;
    mainGroup.add(ring2);

    // 3. Floating Asset Nodes along orbits
    const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const nodeMatEmerald = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const nodeMatPurple = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const nodeMatAmber = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    const node1 = new THREE.Mesh(nodeGeo, nodeMatEmerald);
    const node2 = new THREE.Mesh(nodeGeo, nodeMatPurple);
    const node3 = new THREE.Mesh(nodeGeo, nodeMatAmber);
    mainGroup.add(node1);
    mainGroup.add(node2);
    mainGroup.add(node3);

    // 4. Background Particle Constellation
    const particleCount = 120;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 8 - 2;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0xd8b4fe,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    const particleSystem = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particleSystem);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xa855f7, 3, 20);
    pointLight1.position.set(4, 3, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x10b981, 2.5, 20);
    pointLight2.position.set(-4, -2, 3);
    scene.add(pointLight2);

    // Mouse Interaction Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      const rect = mount.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.45;
      targetY = y * 0.45;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Smooth mouse lerp
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      // Group rotation from idle + mouse
      mainGroup.rotation.y = elapsedTime * 0.35 + mouseX;
      mainGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.15 - mouseY;

      // Inner wireframe counter-rotation
      wireMesh.rotation.y = -elapsedTime * 0.2;
      wireMesh.rotation.z = elapsedTime * 0.15;

      // Orbiting nodes position calculations
      node1.position.x = Math.cos(elapsedTime * 1.2) * 2.3;
      node1.position.z = Math.sin(elapsedTime * 1.2) * 2.3;
      node1.position.y = Math.sin(elapsedTime * 1.5) * 0.6;

      node2.position.x = Math.cos(elapsedTime * 0.9 + 2) * 2.4;
      node2.position.y = Math.sin(elapsedTime * 0.9 + 2) * 2.4;
      node2.position.z = Math.cos(elapsedTime * 1.1) * 0.8;

      node3.position.x = Math.sin(elapsedTime * 1.4 + 4) * 2.1;
      node3.position.z = Math.cos(elapsedTime * 1.4 + 4) * 2.1;
      node3.position.y = -Math.sin(elapsedTime * 1.1) * 0.7;

      // Subtle particle float
      particleSystem.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      const newWidth = mount.clientWidth;
      const newHeight = mount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringGeo.dispose();
      ringMat1.dispose();
      ringMat2.dispose();
      nodeGeo.dispose();
      nodeMatEmerald.dispose();
      nodeMatPurple.dispose();
      nodeMatAmber.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="hero-3d-scene-container"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '380px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    />
  );
}
