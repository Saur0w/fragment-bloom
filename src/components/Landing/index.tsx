"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./style.module.scss";

// Dynamically import Scene (client-side only for WebGL Canvas)
const Scene = dynamic(() => import("./scene"), {
  ssr: false,
});

export default function Landing() {
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Allow ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  return (
    <section className={styles.landing}>
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

      {/* Dynamically imported 3D Scene */}
      <Scene isFullScreen={isFullScreen} onToggle={toggleFullScreen} />

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