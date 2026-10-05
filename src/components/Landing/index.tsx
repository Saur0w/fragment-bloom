"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import gsap from "gsap";
import styles from "./style.module.scss";
import { vertexShader, fragmentShader } from "@/lib/Shader";

export default function Landing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isFullScreenRef = useRef(false);
  isFullScreenRef.current = isFullScreen;

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    material: THREE.ShaderMaterial;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    getDimensions: () => {
      vWidth: number;
      vHeight: number;
      cardW: number;
      cardH: number;
      cardY: number;
    };
  } | null>(null);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
    // Ensure video plays on interaction
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreenRef.current) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Animate 3D mesh when isFullScreen changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const { mesh, material, getDimensions } = scene;
    const { vWidth, vHeight, cardW, cardH, cardY } = getDimensions();

    const targetScaleX = isFullScreen ? vWidth : cardW;
    const targetScaleY = isFullScreen ? vHeight : cardH;
    const targetY = isFullScreen ? 0 : cardY;

    // Smoothly animate scale, position, and shader progress uniform
    gsap.killTweensOf(mesh.scale);
    gsap.killTweensOf(mesh.position);
    gsap.killTweensOf(material.uniforms.uProgress);

    gsap.to(mesh.scale, {
      x: targetScaleX,
      y: targetScaleY,
      duration: 1.1,
      ease: "power3.inOut",
    });

    gsap.to(mesh.position, {
      y: targetY,
      duration: 1.1,
      ease: "power3.inOut",
    });

    gsap.to(material.uniforms.uProgress, {
      value: isFullScreen ? 1.0 : 0.0,
      duration: 1.1,
      ease: "power3.inOut",
    });
  }, [isFullScreen]);

  // Initialize Three.js Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 5;

    // Calculation helper for viewport units vs world units
    const getDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const vHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const vWidth = vHeight * (w / h);

      // Card size: ~48% screen width, 16:9 ratio
      const cardW = Math.min(vWidth * 0.48, vHeight * 0.88 * (16 / 9));
      const cardH = cardW * (9 / 16);
      // Center card slightly above viewport center, overlapping DRIFT letters
      const cardY = vHeight * 0.08;

      return { vWidth, vHeight, cardW, cardH, cardY };
    };

    const { cardW, cardH, cardY } = getDimensions();

    // HTML5 Video Element for VideoTexture
    const video = document.createElement("video");
    video.src = "/texture/main.mp4";
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    const uniforms = {
      uTexture: { value: videoTexture },
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uTextureResolution: { value: new THREE.Vector2(16, 9) },
    };

    video.addEventListener("loadedmetadata", () => {
      if (video.videoWidth && video.videoHeight) {
        uniforms.uTextureResolution.value.set(video.videoWidth, video.videoHeight);
      }
      video.play().catch(() => {});
    });

    video.play().catch(() => {});

    // 64x64 segments plane for vertex displacement ripples
    const geometry = new THREE.PlaneGeometry(1, 1, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(cardW, cardH, 1);
    mesh.position.set(0, cardY, 0);
    scene.add(mesh);

    // Raycaster for hover & click detection on 3D mesh
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      renderer,
      camera,
      mesh,
      material,
      raycaster,
      mouse,
      getDimensions,
    };

    // Render loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      uniforms.uResolution.value.set(w, h);

      const dims = getDimensions();
      if (isFullScreenRef.current) {
        mesh.scale.set(dims.vWidth, dims.vHeight, 1);
        mesh.position.set(0, 0, 0);
      } else {
        mesh.scale.set(dims.cardW, dims.cardH, 1);
        mesh.position.set(0, dims.cardY, 0);
      }
    };

    window.addEventListener("resize", handleResize);

    // Pointer move for cursor pointer indication
    const handlePointerMove = (e: MouseEvent) => {
      if (isFullScreenRef.current) {
        canvas.style.cursor = "pointer";
        return;
      }

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (intersects.length > 0) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    };

    // Pointer click handler
    const handlePointerDown = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mesh);

      if (isFullScreenRef.current) {
        toggleFullScreen();
      } else if (intersects.length > 0) {
        toggleFullScreen();
      }
    };

    window.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("click", handlePointerDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("click", handlePointerDown);
      video.pause();
      video.src = "";
      videoTexture.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [toggleFullScreen]);

  return (
    <section className={styles.landing} ref={containerRef}>
      {/* Top Text Content Rows */}
      <div className={styles.topRow}>
        <div className={styles.leftText}>
          <p>Built in the back of the shop.</p>
          <p>Driven after midnight.</p>
        </div>
        <div className={styles.rightText}>
          <p>Chassis tuned stiff for</p>
          <p>late apexes.</p>
          <p>Tire smoke over cold</p>
          <p>midnight tarmac.</p>
        </div>
      </div>

      {/* 3D WebGL Canvas with VideoTexture Mesh */}
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${isFullScreen ? styles.canvasFullScreen : ""}`}
      />

      {/* Fullscreen Close Button */}
      {isFullScreen && (
        <button
          className={styles.closeBtn}
          onClick={toggleFullScreen}
          aria-label="Exit Fullscreen"
        >
          CLOSE [ESC]
        </button>
      )}

      {/* Giant Typography Background */}
      <div className={styles.bigTitle} aria-hidden="true">
        <span>D</span>
        <span>R</span>
        <span>I</span>
        <span>F</span>
        <span>T</span>
      </div>

      {/* Scroll Label */}
      <div className={styles.scrollLabel}>(SCROLL)</div>
    </section>
  );
}