"use client";

import React, { useState, useEffect } from "react";
import { Play } from "lucide-react";

type CountdownCardProps = {
  targetDateStr: string;
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export default function CountdownCard({ targetDateStr }: CountdownCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  // Flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const difference = +new Date(targetDateStr) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      };
    };

    setMounted(true);
    setTimeRemaining(calculateTimeRemaining());

    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDateStr]);

  if (!mounted) {
    return (
      <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", minHeight: "80px" }}>
        {/* Placeholder skeleton before client mounts to avoid hydration mismatch */}
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "8px", minWidth: "60px" }} />
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "8px", minWidth: "60px" }} />
        <div style={{ background: "rgba(255,255,255,0.1)", padding: "1rem", borderRadius: "8px", minWidth: "60px" }} />
      </div>
    );
  }

  if (timeRemaining.expired) {
    return (
      <div
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)",
          padding: "1.2rem 2.4rem",
          borderRadius: "12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.8rem",
          fontSize: "1.6rem",
          fontWeight: "bold",
          letterSpacing: "0.05em",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <Play size={20} strokeWidth={2.2} aria-hidden="true" />
        ¡La Brigada ha Comenzado!
      </div>
    );
  }

  const formatNumber = (num: number) => String(num).padStart(2, "0");

  const countdownItemStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "8px",
    padding: "0.8rem 1.6rem",
    minWidth: "70px",
  };

  const numberStyle: React.CSSProperties = {
    fontSize: "2.4rem",
    fontWeight: "bold",
    color: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "1rem",
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: "0.2rem",
    fontWeight: "bold",
  };

  return (
    <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center" }}>
      <div style={countdownItemStyle}>
        <span style={numberStyle}>{formatNumber(timeRemaining.days)}</span>
        <span style={labelStyle}>Días</span>
      </div>
      <div style={countdownItemStyle}>
        <span style={numberStyle}>{formatNumber(timeRemaining.hours)}</span>
        <span style={labelStyle}>Horas</span>
      </div>
      <div style={countdownItemStyle}>
        <span style={numberStyle}>{formatNumber(timeRemaining.minutes)}</span>
        <span style={labelStyle}>Min</span>
      </div>
      <div style={countdownItemStyle}>
        <span style={numberStyle}>{formatNumber(timeRemaining.seconds)}</span>
        <span style={labelStyle}>Seg</span>
      </div>
    </div>
  );
}
