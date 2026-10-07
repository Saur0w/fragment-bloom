"use client";

import styles from "./style.module.scss";
import Link from "next/link";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">Drift</Link>
      </div>
      <nav>
        <ul>
          <li><Link href="/">Preset</Link></li>
          <li><Link href="/">Journal</Link></li>
          <li><Link href="/">Cars</Link></li>
          <li><Link href="/">About</Link></li>
        </ul>
      </nav>
      <div className={styles.getInTouch}>
        <Link href="/">Get in Touch</Link>
      </div>
    </header>
  );
}