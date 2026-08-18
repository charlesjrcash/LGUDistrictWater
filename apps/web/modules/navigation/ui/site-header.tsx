"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./site-header.module.css";

function HeaderLogo() {
  return <span className={styles.brand}><svg aria-hidden="true" viewBox="0 0 44 54"><path d="M22 2C17 12 7 23 7 34a15 15 0 0 0 30 0C37 23 27 12 22 2Z" fill="currentColor"/><path d="M13 31c2 8 11 11 18 5-1 7-6 11-11 11-7 0-11-6-10-13 .5-2 1-3 3-3Z" fill="white" opacity=".9"/><path d="M20 13c-1 5-5 9-7 13" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg><span><strong>Bagamanoc</strong><small>WATER BILLING SYSTEM</small></span></span>;
}

export function SiteHeader({ landing = false }: { landing?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const update = () => setScrolled(window.scrollY > 48); update(); window.addEventListener("scroll", update, { passive: true }); return () => window.removeEventListener("scroll", update); }, []);
  const section = (hash: string) => landing ? hash : `/${hash}`;
  return <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}><div className={styles.inner}><Link href={landing ? "#home" : "/"} aria-label="Bagamanoc Water home"><HeaderLogo /></Link><nav aria-label="Main navigation"><Link href={section("#home")}>Home</Link><Link href={section("#features")}>Features</Link><Link href={section("#contact")}>Contact</Link></nav><Link href="/login" className={styles.login}>Log in <span>→</span></Link></div></header>;
}
