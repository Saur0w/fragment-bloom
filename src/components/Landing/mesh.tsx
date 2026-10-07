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

  // TSL uniform nodes for interactive water droplet ripple and transitions
  const uniforms = useMemo(
    () => ({
      progress: uniform(0.0),
      time: uniform(0.0),
      resolution: uniform(new THREE.Vector2(size.width, size.height)),
      textureResolution: uniform(new THREE.Vector2(16, 9)),
    }),
    []
  );

  // Build the TSL MeshBasicNodeMaterial
  const material = useMemo(() => {
    const positionNode = createWaterPositionNode(uniforms.progress, uniforms.time);
    const colorNode = createWaterColorNode(
      texture,
      uniforms.progress,
      uniforms.time,
      uniforms.resolution,
      uniforms.textureResolution
    );

    return new THREE.MeshBasicNodeMaterial({
      positionNode,
      colorNode,
      transparent: true,
    });
  }, [texture, uniforms]);

  // Clean up material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Sync video resolution metadata and ensure playback
  useEffect(() => {
    if (texture?.image) {
      const video = texture.image as HTMLVideoElement;
      if (video.videoWidth && video.videoHeight) {
        uniforms.textureResolution.value.set(video.videoWidth, video.videoHeight);
      }
      video.play().catch(() => {});
    }
  }, [texture, uniforms]);

  // Keep screen resolution uniform updated
  useEffect(() => {
    uniforms.resolution.value.set(size.width, size.height);
  }, [size, uniforms]);

  // Card dimensions (~38% of viewport width)
  const cardW = Math.min(viewport.width * 0.38, viewport.height * 0.68 * (16 / 9));
  const cardH = cardW * (9 / 16);
  const cardY = viewport.height * 0.08;

  // Animate scale, position, and water ripple progress with GSAP
  useEffect(() => {
    if (!meshRef.current) return;

    const targetScaleX = isFullScreen ? viewport.width : cardW;
    const targetScaleY = isFullScreen ? viewport.height : cardH;
    const targetY = isFullScreen ? 0 : cardY;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      meshRef.current.scale.set(cardW, cardH, 1);
      meshRef.current.position.set(0, cardY, 0);
      uniforms.progress.value = 0.0;
      return;
    }

    gsap.killTweensOf(meshRef.current.scale);
    gsap.killTweensOf(meshRef.current.position);
    gsap.killTweensOf(uniforms.progress);

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
    gsap.to(uniforms.progress, {
      value: isFullScreen ? 1.0 : 0.0,
      duration: 1.2,
      ease: "power2.inOut",
    });
  }, [isFullScreen, viewport.width, viewport.height, cardW, cardH, cardY, uniforms]);

  // Frame update: advance TSL uniform time
  useFrame((_, delta) => {
    uniforms.time.value += delta;
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
      <primitive object={material} attach="material" />
    </mesh>
  );
}
