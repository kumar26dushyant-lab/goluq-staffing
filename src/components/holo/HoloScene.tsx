import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Float } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/**
 * Full-screen cinematic WebGL reactor — runs behind the whole page like a sci-fi
 * movie. A white-hot core inside gyro rings, a wide ring of reflective "digital
 * employee" glass cubes orbiting in depth, and energy particles streaming inward
 * to the core. Bloom gives the volumetric glow. Lazy-loaded + parallax to pointer.
 */

const CORE = "#7FFBFF"; // white-hot cyan
const TEAL = "#22D3EE";
const NEON = "#2DD4BF";
const VIOLET = "#6D5CE7";
const BLUE = "#3B82F6";

function Core() {
  const inner = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (inner.current) inner.current.scale.setScalar(1 + Math.sin(t * 1.7) * 0.07);
    if (wire.current) {
      wire.current.rotation.y += dt * 0.45;
      wire.current.rotation.x += dt * 0.2;
    }
  });
  return (
    <group>
      <mesh ref={inner}>
        <sphereGeometry args={[0.72, 64, 64]} />
        <meshStandardMaterial
          color={CORE}
          emissive={CORE}
          emissiveIntensity={3.6}
          toneMapped={false}
          roughness={0.12}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={wire} scale={1.22}>
        <icosahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color={TEAL}
          emissive={TEAL}
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>
      <pointLight color={CORE} intensity={34} distance={11} />
    </group>
  );
}

function Ring({
  radius,
  tube,
  color,
  speed,
  axis,
}: {
  radius: number;
  tube: number;
  color: string;
  speed: number;
  axis: [number, number, number];
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * speed * axis[0];
    ref.current.rotation.y += dt * speed * axis[1];
    ref.current.rotation.z += dt * speed * axis[2];
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.2, 0.4, 0]}>
      <torusGeometry args={[radius, tube, 16, 140]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.8}
        toneMapped={false}
        roughness={0.3}
        metalness={0.6}
      />
    </mesh>
  );
}

function OrbitingCubes({ count = 10 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.16;
  });
  const cubes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 3.4 + (i % 2 === 0 ? 0.4 : -0.3);
        const tints = [TEAL, VIOLET, NEON, BLUE];
        return {
          pos: [Math.cos(a) * r, Math.sin(i * 1.3) * 0.9, Math.sin(a) * r] as [
            number,
            number,
            number
          ],
          rot: a,
          tint: tints[i % tints.length],
          s: 0.5 + (i % 3) * 0.12,
        };
      }),
    [count]
  );
  return (
    <group ref={group}>
      {cubes.map((c, i) => (
        <Float key={i} speed={1.6} rotationIntensity={0.5} floatIntensity={0.8}>
          <group position={c.pos} rotation={[0, -c.rot, 0]}>
            <mesh>
              <boxGeometry args={[c.s, c.s, c.s * 0.55]} />
              <meshPhysicalMaterial
                color="#0a1220"
                metalness={0.95}
                roughness={0.06}
                clearcoat={1}
                clearcoatRoughness={0.08}
                emissive={c.tint}
                emissiveIntensity={0.4}
                reflectivity={1}
                toneMapped={false}
              />
            </mesh>
            <mesh scale={1.06}>
              <boxGeometry args={[c.s, c.s, c.s * 0.55]} />
              <meshBasicMaterial color={c.tint} wireframe toneMapped={false} />
            </mesh>
          </group>
        </Float>
      ))}
    </group>
  );
}

/** Energy streaming inward to the core, accelerating as it approaches. */
function InwardStream({ count = 600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const spawn = (a: Float32Array, i: number) => {
    const r = 3.5 + Math.random() * 3.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    a[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    a[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    a[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  };

  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) spawn(a, i);
    return a;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useFrame((_, dt) => {
    const p = positions;
    for (let i = 0; i < count; i++) {
      const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
      const d = Math.hypot(x, y, z) || 1;
      const speed = dt * (1.3 + (7 - Math.min(d, 7)) * 0.55);
      const f = Math.max(0, (d - speed) / d);
      p[i * 3] = x * f;
      p[i * 3 + 1] = y * f;
      p[i * 3 + 2] = z * f;
      if (d < 0.6) spawn(p, i);
    }
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color={TEAL}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.4, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.28, 0.04);
  });
  return <group ref={group}>{children}</group>;
}

export default function HoloScene() {
  return (
    <Canvas
      className="!absolute inset-0"
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9], fov: 52 }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 4, 6]} color={VIOLET} intensity={55} distance={26} />
      <pointLight position={[-6, -3, 4]} color={TEAL} intensity={45} distance={26} />
      <pointLight position={[0, 5, -6]} color={BLUE} intensity={35} distance={26} />

      <Environment resolution={128}>
        <Lightformer intensity={2.2} color={TEAL} position={[0, 2, 5]} scale={[8, 8, 1]} />
        <Lightformer intensity={1.6} color={VIOLET} position={[-5, -2, 3]} scale={[6, 6, 1]} />
        <Lightformer intensity={1.1} color="#ffffff" position={[4, 1, -4]} scale={[5, 5, 1]} />
      </Environment>

      <Rig>
        <Core />
        <Ring radius={1.5} tube={0.02} color={TEAL} speed={0.5} axis={[0.2, 0.1, 1]} />
        <Ring radius={2.0} tube={0.015} color={VIOLET} speed={0.35} axis={[1, 0.3, 0.2]} />
        <Ring radius={2.5} tube={0.012} color={NEON} speed={0.42} axis={[0.4, 1, 0.3]} />
        <OrbitingCubes count={10} />
        <InwardStream count={600} />
      </Rig>

      <EffectComposer>
        <Bloom mipmapBlur intensity={1.5} luminanceThreshold={0.12} luminanceSmoothing={0.6} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
