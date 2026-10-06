"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import Mesh from "./mesh";
import styles from "./style.module.scss";

interface SceneProps {
  isFullScreen: boolean;
  onToggle: () => void;
}

export default function Scene({ isFullScreen, onToggle }: SceneProps) {
  return (
    <div
      className={`${styles.canvasWrapper} ${isFullScreen ? styles.canvasFullScreen : ""}`}
    >
      <Canvas
        camera={{ fov: 45, position: [0, 0, 5], near: 0.1, far: 100 }}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(props);
          await renderer.init();
          return renderer;
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Mesh isFullScreen={isFullScreen} onToggle={onToggle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
