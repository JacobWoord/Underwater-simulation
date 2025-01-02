import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import * as THREE from "three";

function Scene() {
  const [simulate, setSimulate] = useState(false);

  // Generate positions for spheres
  const generateSphereData = (count) => {
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        Math.random() * 10 - 5,
        Math.random() * 10 + 5,
        Math.random() * 10 - 5
      ),
      velocity: new THREE.Vector3(0, 0, 0), // Initial velocity
    }));
  };

  const spheres = useRef(generateSphereData(100000)); // 1000 spheres

  return (
    <>
      <button
        onClick={() => setSimulate(true)}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1,
          padding: "10px 20px",
          fontSize: "16px",
        }}
      >
        Start Simulation
      </button>

      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 5, 2]} intensity={1} />

        {/* Simulated Instanced Spheres */}
        <InstancedPhysics spheres={spheres} simulate={simulate} />

        <OrbitControls />
        <Stats />
      </Canvas>
    </>
  );
}

function InstancedPhysics({ spheres, simulate }) {
  const meshRef = useRef();

  useFrame(() => {
    if (!simulate) return;

    const waterLevel = 0; // Define water surface
    const gravity = -9.81; // Gravity constant
    const densityWater = 1000; // Density of water
    const densityAir = 1.2; // Density of air
    const volume = 0.01; // Volume of the sphere
    const dragCoefficient = 0.47; // Drag coefficient for spheres

    const dummy = new THREE.Object3D();

    spheres.current.forEach((sphere, i) => {
      const { position, velocity } = sphere;

      // Determine medium density
      const isUnderwater = position.y < waterLevel;
      const density = isUnderwater ? densityWater : densityAir;

      // Calculate forces
      const buoyancy = isUnderwater ? density * gravity * volume : 0; // Buoyant force
      const drag = -0.5 * dragCoefficient * density * velocity.y * Math.abs(velocity.y); // Drag force
      const totalForceY = gravity * volume + buoyancy + drag; // Sum of forces

      // Update velocity
      velocity.y += totalForceY * 0.016; // Assuming 60fps, timestep = 1/60

      // Update position
      position.add(velocity.clone().multiplyScalar(0.016)); // dt = 0.016

      // Apply ground constraint
      if (position.y < -5) {
        position.y = -5;
        velocity.y = 0;
      }

      // Update the instanced mesh
      dummy.position.copy(position);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });

    // Mark the instanced mesh for updates
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, spheres.current.length]}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color="blue" />
    </instancedMesh>
  );
}

export default Scene;