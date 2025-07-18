"use client";

import Lottie from "lottie-react";
import loadingAnimation from "../../public/loading-animation.json";
import { useRef, useEffect } from "react";

interface LottieLoadingProps {
  size?: number;
  className?: string;
  color?: string; // optional color override for animation
}

export default function LottieLoading({ size = 32, className = "", color = "var(--primary)" }: LottieLoadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !color) return;
    const applyColor = () => {
      const svgs = el.querySelectorAll<SVGElement>("svg");
      svgs.forEach(svg => {
        svg.querySelectorAll<SVGElement>("path, circle, rect, ellipse, polygon, polyline").forEach(child => {
          child.setAttribute("fill", color);
          child.setAttribute("stroke", color);
        });
      });
    };
    // Observe DOM for Lottie SVG insertion
    const observer = new MutationObserver(applyColor);
    observer.observe(el, { childList: true, subtree: true });
    // Initial coloring attempt
    applyColor();
    return () => observer.disconnect();
  }, [color]);

  return (
    <div ref={containerRef} className={`inline-block ${className}`}>
      <Lottie 
        animationData={loadingAnimation}
        loop={true}
        autoplay={true}
        style={{ 
          width: size, 
          height: size,
        }}
      />
    </div>
  );
}
