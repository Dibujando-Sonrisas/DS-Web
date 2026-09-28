"use client";

import { useState, useEffect } from "react";
import { Play } from "lucide-react";
import styles from "@/styles/components/countdown.module.css";

type CountdownCardProps = {
  targetDateStr: string;
};

const UNITS = [
  { key: "days", label: "Días" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
] as const;

export default function CountdownCard({ targetDateStr }: CountdownCardProps) {
  // null hasta montar en el cliente, para no desajustar la hidratación
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  if (now === null) {
    // Mismas cajas vacías antes de montar en el cliente, para no saltar
    return (
      <div className={`${styles.units} ${styles.placeholder}`} aria-hidden="true">
        {UNITS.map((u) => (
          <div key={u.key} className={styles.unit} />
        ))}
      </div>
    );
  }

  const difference = +new Date(targetDateStr) - now;

  if (difference <= 0) {
    return (
      <p className={styles.started}>
        <Play aria-hidden="true" />
        ¡La Brigada ha Comenzado!
      </p>
    );
  }

  const remaining = {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };

  return (
    <div className={styles.units} role="timer">
      {UNITS.map((u) => (
        <div key={u.key} className={styles.unit}>
          <span className={styles.value}>
            {String(remaining[u.key]).padStart(2, "0")}
          </span>
          <span className={styles.label}>{u.label}</span>
        </div>
      ))}
    </div>
  );
}
