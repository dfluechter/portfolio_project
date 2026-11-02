import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

/**
 * Prüft deterministisch, ob in der aktuellen Browser-/Test-Umgebung ein WebGL-Kontext
 * initialisiert werden kann. Verhindert Abstürze in Headless-/JSDOM-Tests.
 */
function canUseWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(context);
  } catch {
    return false;
  }
}

interface CodingAISceneProps {
  isDark: boolean;
}

/**
 * React Three Fiber 3D-Szene im "Coding & KI (AI)"-Design (bewusst präsenter & auffälliger):
 * - Mehrschichtiges 3D-Deep-Learning-/Transformer-Netzwerk mit leuchtenden Synapsen-Verbindungen
 * - Pulsierender KI-Tensor-Kern (Icosahedron + Octahedron) mit gegenläufigen Neural-Attention-Ringen
 * - Umlaufende 3D-Code-Block-/AST-Token-Würfel (repräsentieren Code-Kompilierung & LLM-Token-Streams)
 * - Aufsteigende vertikale Coding-Matrix-Datenströme (Syntax-Emerald & Cyber-Cyan)
 */
const CodingAINeuralScene: React.FC<CodingAISceneProps> = ({ isDark }) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const neuralGraphRef = useRef<THREE.Group>(null);
  const outerTensorRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const attentionRing1Ref = useRef<THREE.Mesh>(null);
  const attentionRing2Ref = useRef<THREE.Mesh>(null);
  const codeTokensGroupRef = useRef<THREE.Group>(null);
  const codeStreamPointsRef = useRef<THREE.Points>(null);

  // Kräftige Coding- & KI-Farbpalette (Cyber-Cyan, Neural-Violet, Syntax-Emerald, Tensor-Orange)
  const aiCyan = isDark ? '#22D3EE' : '#0284C7';
  const neuralViolet = isDark ? '#A855F7' : '#7C3AED';
  const codeEmerald = isDark ? '#34D399' : '#059669';
  const tensorCoral = isDark ? '#FF6B4A' : '#EA580C';

  const {
    cyanNeurons,
    violetNeurons,
    emeraldNeurons,
    synapticEdges,
    codeStreamPositions,
    codeTokenNodes,
  } = useMemo(() => {
    // 1. 4-schichtiges 3D-Neural-Network (Input -> Hidden 1 -> Hidden 2 -> Output)
    const layerX = [-2.6, -0.85, 0.95, 2.75];
    const layerCounts = [14, 22, 22, 14];
    const layers: THREE.Vector3[][] = [];

    const cyanList: number[] = [];
    const violetList: number[] = [];
    const emeraldList: number[] = [];

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    layerCounts.forEach((count, layerIdx) => {
      const layerNodes: THREE.Vector3[] = [];
      const lx = layerX[layerIdx];
      const radiusScale = layerIdx === 1 || layerIdx === 2 ? 2.15 : 1.55;

      for (let i = 0; i < count; i++) {
        const ratio = i / count;
        const r = Math.sqrt(ratio) * radiusScale;
        const theta = i * goldenAngle + layerIdx * 0.8;

        const vx = lx + Math.sin(i * 1.9) * 0.22;
        const vy = Math.cos(theta) * r * 0.88;
        const vz = Math.sin(theta) * r - 0.4;

        const vec = new THREE.Vector3(vx, vy, vz);
        layerNodes.push(vec);

        if (layerIdx === 0 || layerIdx === 3) {
          cyanList.push(vx, vy, vz);
        } else if (i % 2 === 0) {
          violetList.push(vx, vy, vz);
        } else {
          emeraldList.push(vx, vy, vz);
        }
      }
      layers.push(layerNodes);
    });

    // Synaptische Attention-Gewichte zwischen benachbarten Neural-Schichten + Intra-Layer-Links
    const edges: number[] = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const currentLayer = layers[l];
      const nextLayer = layers[l + 1];

      for (let i = 0; i < currentLayer.length; i++) {
        let connected = 0;
        for (let j = 0; j < nextLayer.length && connected < 3; j++) {
          const dist = currentLayer[i].distanceTo(nextLayer[j]);
          if (dist < 2.65) {
            edges.push(
              currentLayer[i].x,
              currentLayer[i].y,
              currentLayer[i].z,
              nextLayer[j].x,
              nextLayer[j].y,
              nextLayer[j].z
            );
            connected++;
          }
        }
      }
    }

    // 2. Vertikale Coding-Matrix-Streams (aufsteigende Code-Partikel im Raum)
    const streamCount = 96;
    const sPos = new Float32Array(streamCount * 3);
    for (let i = 0; i < streamCount; i++) {
      const col = i % 16;
      const row = Math.floor(i / 16);
      const x = (col / 15 - 0.5) * 9.5;
      const y = (row / 6 - 0.5) * 5.2 + ((col * 0.37) % 1.2);
      const z = -1.6 - (col % 4) * 0.45;

      sPos[i * 3] = x;
      sPos[i * 3 + 1] = y;
      sPos[i * 3 + 2] = z;
    }

    // 3. Umlaufende 3D-Code-Block- & KI-Token-Knoten
    const tokens = [
      { pos: [2.1, 0.3, 0] as [number, number, number], color: aiCyan, isBox: true },
      { pos: [-2.1, -0.3, 0] as [number, number, number], color: neuralViolet, isBox: false },
      { pos: [0.3, 2.1, 0] as [number, number, number], color: codeEmerald, isBox: true },
      { pos: [-0.3, -2.1, 0] as [number, number, number], color: tensorCoral, isBox: false },
      { pos: [1.5, -1.5, 0.4] as [number, number, number], color: aiCyan, isBox: true },
      { pos: [-1.5, 1.5, -0.4] as [number, number, number], color: codeEmerald, isBox: true },
      { pos: [1.4, 1.4, -0.5] as [number, number, number], color: neuralViolet, isBox: false },
      { pos: [-1.4, -1.4, 0.5] as [number, number, number], color: tensorCoral, isBox: true },
    ];

    return {
      cyanNeurons: new Float32Array(cyanList),
      violetNeurons: new Float32Array(violetList),
      emeraldNeurons: new Float32Array(emeraldList),
      synapticEdges: new Float32Array(edges),
      codeStreamPositions: sPos,
      codeTokenNodes: tokens,
    };
  }, [aiCyan, neuralViolet, codeEmerald, tensorCoral]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Reaktive Maus-Parallaxe
    if (rootGroupRef.current) {
      const targetX = state.pointer.y * 0.22;
      const targetY = state.pointer.x * 0.32;
      rootGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.x,
        targetX,
        0.05
      );
      rootGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rootGroupRef.current.rotation.y,
        targetY + Math.sin(t * 0.25) * 0.12,
        0.05
      );
    }

    // Sanftes Schweben des gesamten Neural-Graphs
    if (neuralGraphRef.current) {
      neuralGraphRef.current.position.y = Math.sin(t * 0.7) * 0.12;
      neuralGraphRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
    }

    // Rotation & Pulsieren des KI-Tensor-Kerns
    if (outerTensorRef.current) {
      outerTensorRef.current.rotation.x += delta * 0.18;
      outerTensorRef.current.rotation.y += delta * 0.24;
    }

    if (innerCoreRef.current) {
      innerCoreRef.current.rotation.y -= delta * 0.38;
      innerCoreRef.current.rotation.z += delta * 0.28;
      const pulse = 1 + Math.sin(t * 2.6) * 0.12;
      innerCoreRef.current.scale.setScalar(pulse);
    }

    // Gegenläufige Neural-Attention-Ringe
    if (attentionRing1Ref.current) {
      attentionRing1Ref.current.rotation.z += delta * 0.32;
    }
    if (attentionRing2Ref.current) {
      attentionRing2Ref.current.rotation.x -= delta * 0.26;
      attentionRing2Ref.current.rotation.y += delta * 0.18;
    }

    // Orbit der Code-Blöcke / KI-Tokens
    if (codeTokensGroupRef.current) {
      codeTokensGroupRef.current.rotation.z += delta * 0.3;
      codeTokensGroupRef.current.rotation.y -= delta * 0.22;
    }

    // Aufsteigender Coding-Matrix-Datenstrom
    if (codeStreamPointsRef.current) {
      const attr = codeStreamPointsRef.current.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute | undefined;
      if (attr) {
        const arr = attr.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] += delta * 0.48;
          if (arr[i] > 2.8) {
            arr[i] = -2.8;
          }
        }
        attr.needsUpdate = true;
      }
    }
  });

  return (
    <group ref={rootGroupRef} position={[0.95, 0.05, 0]}>
      <ambientLight intensity={isDark ? 0.9 : 1.1} />
      <pointLight position={[3, 3, 4]} intensity={isDark ? 1.8 : 1.2} color={aiCyan} />
      <pointLight position={[-3, -2, 3]} intensity={isDark ? 1.6 : 1.0} color={neuralViolet} />

      {/* 1. Mehrschichtiges 3D-KI-Neural-Network (Synapsen & Layer-Knoten) */}
      <group ref={neuralGraphRef}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[synapticEdges, 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={aiCyan}
            transparent
            opacity={isDark ? 0.36 : 0.28}
          />
        </lineSegments>

        {/* Input/Output Layer Neurons (Cyber Cyan) */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[cyanNeurons, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.095}
            color={aiCyan}
            transparent
            opacity={isDark ? 0.92 : 0.8}
            sizeAttenuation
          />
        </points>

        {/* Hidden Attention Layer Neurons (Neural Violet) */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[violetNeurons, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.105}
            color={neuralViolet}
            transparent
            opacity={isDark ? 0.92 : 0.82}
            sizeAttenuation
          />
        </points>

        {/* Code Syntax Neurons (Emerald) */}
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[emeraldNeurons, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.09}
            color={codeEmerald}
            transparent
            opacity={isDark ? 0.9 : 0.78}
            sizeAttenuation
          />
        </points>
      </group>

      {/* 2. Zentraler KI-Tensor-Kern & Code-Architektur-Ringe */}
      <group position={[0.45, 0, 0.2]}>
        {/* Äußere KI-Tensor-Sphäre */}
        <mesh ref={outerTensorRef}>
          <icosahedronGeometry args={[1.45, 1]} />
          <meshBasicMaterial
            color={neuralViolet}
            wireframe
            transparent
            opacity={isDark ? 0.44 : 0.34}
          />
        </mesh>

        {/* Pulsierender Innerer KI-Logik-Kern */}
        <mesh ref={innerCoreRef}>
          <octahedronGeometry args={[0.78, 0]} />
          <meshBasicMaterial
            color={codeEmerald}
            wireframe
            transparent
            opacity={isDark ? 0.68 : 0.52}
          />
        </mesh>

        {/* Neural-Attention-Ring 1 */}
        <mesh ref={attentionRing1Ref} rotation={[Math.PI / 2.8, 0.35, 0]}>
          <torusGeometry args={[1.95, 0.016, 16, 120]} />
          <meshBasicMaterial
            color={aiCyan}
            transparent
            opacity={isDark ? 0.58 : 0.44}
          />
        </mesh>

        {/* Neural-Attention-Ring 2 */}
        <mesh ref={attentionRing2Ref} rotation={[-Math.PI / 3.1, -0.4, Math.PI / 4]}>
          <torusGeometry args={[2.35, 0.013, 16, 120]} />
          <meshBasicMaterial
            color={tensorCoral}
            transparent
            opacity={isDark ? 0.5 : 0.38}
          />
        </mesh>

        {/* Umlaufende 3D-Code-Blöcke & KI-Tokens */}
        <group ref={codeTokensGroupRef} rotation={[Math.PI / 4, 0.2, 0]}>
          {codeTokenNodes.map((token, idx) => (
            <mesh key={idx} position={token.pos}>
              {token.isBox ? (
                <boxGeometry args={[0.13, 0.13, 0.13]} />
              ) : (
                <octahedronGeometry args={[0.095, 0]} />
              )}
              <meshBasicMaterial
                color={token.color}
                wireframe={idx % 2 === 0}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* 3. Aufsteigender 3D-Coding-Matrix-Partikelstrom */}
      <points ref={codeStreamPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[codeStreamPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.052}
          color={codeEmerald}
          transparent
          opacity={isDark ? 0.62 : 0.48}
          sizeAttenuation
        />
      </points>
    </group>
  );
};

export interface HeroThreeBackgroundProps {
  /**
   * Optionales Override für Unit-Tests, um WebGL-Modus gezielt zu prüfen.
   */
  forceWebGL?: boolean;
}

export const HeroThreeBackground: React.FC<HeroThreeBackgroundProps> = ({ forceWebGL }) => {
  const { theme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const [webglSupported] = useState<boolean>(() =>
    typeof forceWebGL === 'boolean' ? forceWebGL : canUseWebGL()
  );
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isDark = theme === 'dark';
  const showWebGLCanvas = webglSupported && !shouldReduceMotion;

  return (
    <div
      data-testid="hero-three-background"
      data-webgl-active={showWebGLCanvas ? 'true' : 'false'}
      data-frameloop={isTabVisible ? 'always' : 'demand'}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 opacity-95 dark:opacity-100"
    >
      {/* Big Data Banner Hintergrund mit atmosphärischer Vignette & sanfter Kontrastabstimmung */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="/static/img/background/banner_big_data.jpg"
          alt=""
          role="presentation"
          className="w-full h-full object-cover object-center opacity-30 dark:opacity-25 mix-blend-luminosity filter blur-[0.4px] scale-105 transition-opacity duration-700"
        />
        {/* Harmonische Farb- & Gradient-Overlays für exzellente Typografie-Lesbarkeit */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface/50 via-surface/85 to-surface dark:from-slate-950/60 dark:via-slate-950/85 dark:to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-transparent to-surface/90 dark:from-slate-950/90 dark:via-transparent dark:to-slate-950/90" />
      </div>

      {showWebGLCanvas ? (
        <Canvas
          camera={{ position: [0, 0, 6.2], fov: 45 }}
          dpr={[1, 1.5]}
          frameloop={isTabVisible ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
          className="relative z-10"
        >
          <CodingAINeuralScene isDark={isDark} />
        </Canvas>
      ) : (
        /* Statischer Coding- & KI-Neural-Network-Fallback für Reduced-Motion oder Headless-Umgebungen */
        <svg
          data-testid="hero-three-fallback-svg"
          viewBox="0 0 1200 600"
          fill="none"
          className="relative z-10 w-full h-full opacity-35 dark:opacity-45"
        >
          {/* Synaptische KI-Verbindungen */}
          <g stroke="currentColor" strokeWidth="1.2" className="text-cyan-500/60">
            <line x1="520" y1="180" x2="700" y2="140" />
            <line x1="520" y1="180" x2="700" y2="290" />
            <line x1="520" y1="390" x2="700" y2="290" />
            <line x1="520" y1="390" x2="700" y2="440" />
            <line x1="700" y1="140" x2="880" y2="220" />
            <line x1="700" y1="290" x2="880" y2="220" />
            <line x1="700" y1="290" x2="880" y2="380" />
            <line x1="700" y1="440" x2="880" y2="380" />
            <line x1="880" y1="220" x2="1040" y2="300" />
            <line x1="880" y1="380" x2="1040" y2="300" />
          </g>
          {/* KI-Tensor-Orbit */}
          <ellipse
            cx="780"
            cy="295"
            rx="220"
            ry="90"
            transform="rotate(-22 780 295)"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="6 6"
            className="text-purple-500/60"
          />
          {/* Neural-Layer-Knoten */}
          <g className="text-cyan-400" fill="currentColor">
            <circle cx="520" cy="180" r="5" />
            <circle cx="520" cy="390" r="5" />
            <circle cx="1040" cy="300" r="6" />
          </g>
          <g className="text-purple-400" fill="currentColor">
            <circle cx="700" cy="140" r="6" />
            <circle cx="700" cy="290" r="7" />
            <circle cx="700" cy="440" r="6" />
          </g>
          <g className="text-emerald-400" fill="currentColor">
            <circle cx="880" cy="220" r="6" />
            <circle cx="880" cy="380" r="6" />
          </g>
        </svg>
      )}
    </div>
  );
};
