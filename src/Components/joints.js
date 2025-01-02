import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function NetSimulation() {
  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Net />
    </Canvas>
  );
}

function Net() {
  const sphereCount = 1000; // Number of spheres
  const gridSize = 10; // Size of the grid
  const spacing = 1; // Distance between spheres
  const restLength = spacing; // Desired length of the "joints"

  const spherePositions = useRef([]);
  const sphereVelocities = useRef([]);
  const linePositions = useRef([]);
  const dummy = new THREE.Object3D();
  const spheresRef = useRef();
  const linesRef = useRef();

  useEffect(() => {
    // Initialize sphere positions, velocities, and line positions
    for (let i = 0; i < sphereCount; i++) {
      const x = (i % gridSize) * spacing;
      const y = Math.floor(i / gridSize) * spacing;
      const z = 0;
      spherePositions.current[i] = new THREE.Vector3(x, y, z);
      sphereVelocities.current[i] = new THREE.Vector3(0, 0, 0);
    }

    // Initialize line positions
    linePositions.current = new Float32Array((sphereCount - 1) * 6);
  }, []);

  const applyPhysics = () => {
    const waterLevel = 5; // Water surface height
    const gravity = -9.81; // Gravity constant
    const densityWater = 1000; // Water density
    const densityAir = 1.2; // Air density
    const volume = 0.01; // Sphere volume
    const dragCoefficient = 0.47; // Drag coefficient for spheres

    spherePositions.current.forEach((position, i) => {
      const velocity = sphereVelocities.current[i];

      // Determine if the sphere is underwater
      const isUnderwater = position.y < waterLevel;
      const density = isUnderwater ? densityWater : densityAir;

      // Calculate forces
      const buoyancy = isUnderwater ? density * gravity * volume : 0; // Buoyancy force
      const drag = -0.5 * dragCoefficient * density * velocity.y * Math.abs(velocity.y); // Drag force
      const totalForceY = gravity * volume + buoyancy + drag; // Total vertical force

      // Update velocity
      velocity.y += totalForceY * 0.016; // Assuming 60fps, timestep = 1/60

      // Update position
      position.add(velocity.clone().multiplyScalar(0.016)); // dt = 0.016
    });
  };

  const applyConstraints = () => {
    for (let i = 0; i < sphereCount - 1; i++) {
      const posA = spherePositions.current[i];
      const posB = spherePositions.current[i + 1];
      const distance = posA.distanceTo(posB);
      if (distance > restLength) {
        const delta = posB.clone().sub(posA).normalize();
        const offset = delta.multiplyScalar((distance - restLength) / 2);
        posA.add(offset);
        posB.sub(offset);
      }
    }
  };

  useFrame(() => {
    applyPhysics();
    applyConstraints();

    // Update sphere positions in the instanced mesh
    spherePositions.current.forEach((position, i) => {
      dummy.position.copy(position);
      dummy.updateMatrix();
      spheresRef.current.setMatrixAt(i, dummy.matrix);
    });
    spheresRef.current.instanceMatrix.needsUpdate = true;

    // Update line positions
    const lineArray = linePositions.current;
    for (let i = 0; i < sphereCount - 1; i++) {
      const posA = spherePositions.current[i];
      const posB = spherePositions.current[i + 1];

      lineArray[i * 6 + 0] = posA.x;
      lineArray[i * 6 + 1] = posA.y;
      lineArray[i * 6 + 2] = posA.z;
      lineArray[i * 6 + 3] = posB.x;
      lineArray[i * 6 + 4] = posB.y;
      lineArray[i * 6 + 5] = posB.z;
    }
    linesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      {/* Instanced Spheres */}
      <instancedMesh ref={spheresRef} args={[null, null, sphereCount]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="blue" />
      </instancedMesh>
      {/* Lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions.current}
            count={(sphereCount - 1) * 2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="black" />
      </lineSegments>
    </>
  );
}

export default NetSimulation;