"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVideoTexture } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { vertexShader, fragmentShader } from "@/lib/Shader";

interface MeshProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export default function Mesh({ isFullScreen, onToggle }: MeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const isFirstRender = useRef(true);
  const { viewport, size } = useThree();

  // Load video texture via Drei
  const texture = useVideoTexture("/texture/main.mp4", {
    muted: true,
    loop: true,
    start: true,
    playsInline: true,
    crossOrigin: "anonymous",
  });

  // Shader uniforms for water droplet ripple and expansion
  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uTextureResolution: { value: new THREE.Vector2(16, 9) },
    }),
    [texture, size.width, size.height]
  );

  // Sync video resolution metadata and ensure playback
  useEffect(() => {
    if (texture?.image) {
      const video = texture.image as HTMLVideoElement;
      if (video.videoWidth && video.videoHeight) {
        uniforms.uTextureResolution.value.set(video.videoWidth, video.videoHeight);
      }
      video.play().catch(() => {});
    }
  }, [texture, uniforms]);

  // Keep resolution uniform updated
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  // Card dimensions (~38% of viewport width)
  const cardW = Math.min(viewport.width * 0.38, viewport.height * 0.68 * (16 / 9));
  const cardH = cardW * (9 / 16);
  const cardY = viewport.height * 0.08;

  // Animate scale, position, and water ripple uProgress
  useEffect(() => {
    if (!meshRef.current || !materialRef.current) return;

    const targetScaleX = isFullScreen ? viewport.width : cardW;
    const targetScaleY = isFullScreen ? viewport.height : cardH;
    const targetY = isFullScreen ? 0 : cardY;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      meshRef.current.scale.set(cardW, cardH, 1);
      meshRef.current.position.set(0, cardY, 0);
      materialRef.current.uniforms.uProgress.value = 0.0;
      return;
    }

    gsap.killTweensOf(meshRef.current.scale);
    gsap.killTweensOf(meshRef.current.position);
    gsap.killTweensOf(materialRef.current.uniforms.uProgress);

    // Expand mesh smoothly
    gsap.to(meshRef.current.scale, {
      x: targetScaleX,
      y: targetScaleY,
      duration: 1.2,
      ease: "power3.inOut",
    });

    gsap.to(meshRef.current.position, {
      x: 0,
      y: targetY,
      z: 0,
      duration: 1.2,
      ease: "power3.inOut",
    });

    // Animate water ripple wave effect across vertex & fragment
    gsap.to(materialRef.current.uniforms.uProgress, {
      value: isFullScreen ? 1.0 : 0.0,
      duration: 1.2,
      ease: "power2.inOut",
    });
  }, [isFullScreen, viewport.width, viewport.height, cardW, cardH, cardY]);

  // Frame update
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;
    }
    if (texture) {
      texture.needsUpdate = true;
    }
  });

  // Single clean click handler (no long-press required)
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();

    if (texture?.image) {
      const video = texture.image as HTMLVideoElement;
      if (video.paused) {
        video.play().catch(() => {});
      }
    }

    onToggle();
  };

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {/* 128x128 segments for smooth 3D physical water droplet wave ripples */}
      <planeGeometry args={[1, 1, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
}
