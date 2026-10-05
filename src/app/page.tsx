"use client";

import styles from "./page.module.css";
import Header from "@/components/Header";
import Landing from "@/components/Landing";

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <Landing />
    </div>
  );
}
