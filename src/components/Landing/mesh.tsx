"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useVideoTexture } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { uniform } from "three/tsl";
import gsap from "gsap";
import { createWaterPositionNode, createWaterColorNode } from "@/lib/Shader";

interface MeshProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export default function Mesh({ isFullScreen, onToggle }: MeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicNodeMaterial>(null);
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

  // Build the TSL MeshBasicNodeMaterial and attach uniform nodes to userData
  const material = useMemo(() => {
    const uProgress = uniform(0.0);
    const uTime = uniform(0.0);
    const uResolution = uniform(new THREE.Vector2(size.width, size.height));
    const uTextureResolution = uniform(new THREE.Vector2(16, 9));

    const positionNode = createWaterPositionNode(uProgress, uTime);
    const colorNode = createWaterColorNode(
      texture,
      uProgress,
      uTime,
      uResolution,
      uTextureResolution
    );

    const mat = new THREE.MeshBasicNodeMaterial({
      positionNode,
      colorNode,
      transparent: true,
    });

    mat.userData = {
      uProgress,
      uTime,
      uResolution,
      uTextureResolution,
    };

    return mat;
  }, [texture, size.width, size.height]);

  // Clean up material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Sync video resolution metadata and ensure playback
  useEffect(() => {
    if (texture?.image && materialRef.current) {
      const video = texture.image as HTMLVideoElement;
      if (video.videoWidth && video.videoHeight) {
        materialRef.current.userData.uTextureResolution.value.set(
          video.videoWidth,
          video.videoHeight
        );
      }
      video.play().catch(() => {});
    }
  }, [texture]);

  // Keep screen resolution uniform updated
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.userData.uResolution.value.set(size.width, size.height);
    }
  }, [size.width, size.height]);

  // Card dimensions (~38% of viewport width)
  const cardW = Math.min(viewport.width * 0.38, viewport.height * 0.68 * (16 / 9));
  const cardH = cardW * (9 / 16);
  const cardY = viewport.height * 0.08;

  // Animate scale, position, and water ripple progress with GSAP
  useEffect(() => {
    if (!meshRef.current || !materialRef.current) return;

    const targetScaleX = isFullScreen ? viewport.width : cardW;
    const targetScaleY = isFullScreen ? viewport.height : cardH;
    const targetY = isFullScreen ? 0 : cardY;
    const { uProgress } = materialRef.current.userData;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      meshRef.current.scale.set(cardW, cardH, 1);
      meshRef.current.position.set(0, cardY, 0);
      uProgress.value = 0.0;
      return;
    }

    gsap.killTweensOf(meshRef.current.scale);
    gsap.killTweensOf(meshRef.current.position);
    gsap.killTweensOf(uProgress);

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

    // Animate water ripple wave progress in TSL
    gsap.to(uProgress, {
      value: isFullScreen ? 1.0 : 0.0,
      duration: 1.2,
      ease: "power2.inOut",
    });
  }, [isFullScreen, viewport.width, viewport.height, cardW, cardH, cardY]);

  // Frame update: advance TSL uniform time
  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.userData.uTime.value += delta;
    }
  });

  // Single clean click handler
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
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}
