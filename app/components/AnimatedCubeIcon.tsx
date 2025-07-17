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
    <g>
      <polygon
        points="16,4 28,10 28,22 16,28 4,22 4,10"
        fill="#2fc14c"
        stroke="#1a7f37"
        strokeWidth="1.5"
      >
        <animate
          attributeName="points"
          values="16,4 28,10 28,22 16,28 4,22 4,10;16,6 26,12 26,20 16,26 6,20 6,12;16,4 28,10 28,22 16,28 4,22 4,10"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        points="16,4 28,10 16,16 4,10"
        fill="#43e97b"
        opacity="0.7"
      >
        <animate
          attributeName="points"
          values="16,4 28,10 16,16 4,10;16,6 26,12 16,18 6,12;16,4 28,10 16,16 4,10"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        points="16,16 28,10 28,22 16,28"
        fill="#1a7f37"
        opacity="0.5"
      >
        <animate
          attributeName="points"
          values="16,16 28,10 28,22 16,28;16,18 26,12 26,20 16,26;16,16 28,10 28,22 16,28"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
      <polygon
        points="16,16 4,10 4,22 16,28"
        fill="#43e97b"
        opacity="0.5"
      >
        <animate
          attributeName="points"
          values="16,16 4,10 4,22 16,28;16,18 6,12 6,20 16,26;16,16 4,10 4,22 16,28"
          dur="2s"
          repeatCount="indefinite"
        />
      </polygon>
    </g>
  </svg>
);

export default AnimatedCubeIcon;
