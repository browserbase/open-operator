import React from "react";

const AnimatedCubeIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "inline-block", verticalAlign: "middle" }}
  >
    <defs>
      <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0">
          <animate attributeName="stop-opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stopColor="var(--primary-hover)" stopOpacity="1">
          <animate attributeName="stop-opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0">
          <animate attributeName="stop-opacity" values="0;1;0" dur="2s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
    </defs>
    
    <g>
      {/* Base cube structure */}
      <polygon
        points="16,4 28,10 28,22 16,28 4,22 4,10"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        opacity="0.3"
      >
        <animate
          attributeName="points"
          values="16,4 28,10 28,22 16,28 4,22 4,10;16,6 26,12 26,20 16,26 6,20 6,12;16,4 28,10 28,22 16,28 4,22 4,10"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      
      {/* Top face */}
      <polygon
        points="16,4 28,10 16,16 4,10"
        fill="var(--primary)"
        opacity="0.1"
      >
        <animate
          attributeName="points"
          values="16,4 28,10 16,16 4,10;16,6 26,12 16,18 6,12;16,4 28,10 16,16 4,10"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      
      {/* Right face */}
      <polygon
        points="16,16 28,10 28,22 16,28"
        fill="var(--primary)"
        opacity="0.1"
      >
        <animate
          attributeName="points"
          values="16,16 28,10 28,22 16,28;16,18 26,12 26,20 16,26;16,16 28,10 28,22 16,28"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      
      {/* Left face */}
      <polygon
        points="16,16 4,10 4,22 16,28"
        fill="var(--primary-hover)"
        opacity="0.1"
      >
        <animate
          attributeName="points"
          values="16,16 4,10 4,22 16,28;16,18 6,12 6,20 16,26;16,16 4,10 4,22 16,28"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      
      {/* Circuit traces */}
      <g opacity="0.8">
        {/* Circuit path 1 - top edge */}
        <path
          d="M 4 10 L 16 4 L 28 10"
          fill="none"
          stroke="url(#circuitGradient)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8;0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
        
        {/* Circuit path 2 - left edge */}
        <path
          d="M 4 10 L 4 22 L 16 28"
          fill="none"
          stroke="url(#circuitGradient)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8;0"
            dur="1.8s"
            repeatCount="indefinite"
            begin="0.3s"
          />
        </path>
        
        {/* Circuit path 3 - right edge */}
        <path
          d="M 28 10 L 28 22 L 16 28"
          fill="none"
          stroke="url(#circuitGradient)"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8;0"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </path>
        
        {/* Circuit path 4 - center connection */}
        <path
          d="M 16 4 L 16 16 L 16 28"
          fill="none"
          stroke="url(#circuitGradient)"
          strokeWidth="0.8"
          strokeDasharray="1 3"
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.9s"
          />
        </path>
      </g>
      
      {/* Glowing nodes */}
      <g>
        <circle cx="16" cy="4" r="1.5" fill="var(--primary)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="4" cy="10" r="1.5" fill="var(--primary-hover)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.3s" />
        </circle>
        <circle cx="28" cy="10" r="1.5" fill="var(--primary)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.6s" />
        </circle>
        <circle cx="16" cy="28" r="1.5" fill="var(--primary-hover)" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.9s" />
        </circle>
      </g>
    </g>
  </svg>
);

export default AnimatedCubeIcon;
