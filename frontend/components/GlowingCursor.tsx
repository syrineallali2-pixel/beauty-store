"use client";

import { useEffect, useState } from "react";

export default function GlowingCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-400 opacity-40 blur-md transition-all duration-75 ease-out"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow: "0 0 20px 10px rgba(244, 114, 182, 0.6)",
      }}
    />
  );
}