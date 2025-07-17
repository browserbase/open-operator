"use client";

import React from "react";

const AnimatedGrid = () => {
  return (
    <svg
      className="animated-grid"
      viewBox="0 0 392 258"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(119, 90, 81, 0)" />
          <stop offset="20%" stopColor="rgba(119, 90, 81, 0.2)" />
          <stop offset="40%" stopColor="rgba(119, 90, 81, 0.5)" />
          <stop offset="60%" stopColor="rgba(119, 90, 81, 0.8)" />
          <stop offset="80%" stopColor="rgba(119, 90, 81, 1)" />
          <stop offset="100%" stopColor="rgba(119, 90, 81, 1)" />
        </linearGradient>
        <linearGradient id="verticalPulseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(119, 90, 81, 0)" />
          <stop offset="20%" stopColor="rgba(119, 90, 81, 0.2)" />
          <stop offset="40%" stopColor="rgba(119, 90, 81, 0.5)" />
          <stop offset="60%" stopColor="rgba(119, 90, 81, 0.8)" />
          <stop offset="80%" stopColor="rgba(119, 90, 81, 1)" />
          <stop offset="100%" stopColor="rgba(119, 90, 81, 1)" />
        </linearGradient>
      </defs>
      
      <g className="grid-lines">
        {/* Horizontal lines */}
        {[...Array(16)].map((_, i) => (
          <line
            key={`h-${i}`}
            className="grid-line"
            x2="392"
            y1={`${15.5 + i * 16}`}
            y2={`${15.5 + i * 16}`}
          />
        ))}

        {/* Vertical lines */}
        {[...Array(33)].map((_, i) => (
          <line
            key={`v-${i}`}
            className="grid-line"
            x1={`${12 + i * 16}`}
            x2={`${12 + i * 16}`}
            y1="0"
            y2="256"
          />
        ))}

        {/* Circuit-like directional pulses */}
        <g className="pulse-group">
          {/* Circuit path 1: Right then down L-shape */}
          <path
            className="circuit-pulse circuit-1"
            d="M 12 47.5 L 140 47.5 L 140 143.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 2: Down then right L-shape */}
          <path
            className="circuit-pulse circuit-2"
            d="M 220 15.5 L 220 111.5 L 380 111.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 3: Right then down L-shape */}
          <path
            className="circuit-pulse circuit-3"
            d="M 60 175.5 L 188 175.5 L 188 239.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 4: Left to right horizontal */}
          <path
            className="circuit-pulse circuit-4"
            d="M 380 79.5 L 28 79.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 5: Bottom to top vertical */}
          <path
            className="circuit-pulse circuit-5"
            d="M 92 239.5 L 92 31.5"
            fill="none"
            stroke="url(#verticalPulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 6: Up then left then down U-shape */}
          <path
            className="circuit-pulse circuit-6"
            d="M 316 207.5 L 316 127.5 L 252 127.5 L 252 191.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 7: Left then up L-shape */}
          <path
            className="circuit-pulse circuit-7"
            d="M 364 191.5 L 284 191.5 L 284 63.5"
            fill="none"
            stroke="url(#pulseGradient)"
            filter="url(#glow)"
          />

          {/* Circuit path 8: Top to bottom vertical */}
          <path
            className="circuit-pulse circuit-8"
            d="M 156 15.5 L 156 207.5"
            fill="none"
            stroke="url(#verticalPulseGradient)"
            filter="url(#glow)"
          />
        </g>
      </g>
    </svg>
  );
};

export default AnimatedGrid;
