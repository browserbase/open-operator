"use client";

import { motion } from "framer-motion";

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function AnimatedCheckmark({ size = 16, className = "", strokeWidth = 2 }: AnimatedCheckmarkProps) {
  const circleVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          type: "spring",
          duration: 0.8,
          bounce: 0
        },
        opacity: {
          duration: 0.01
        }
      }
    }
  };

  const checkmarkVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          type: "spring",
          duration: 0.6,
          bounce: 0,
          delay: 0.2
        },
        opacity: {
          duration: 0.01,
          delay: 0.2
        }
      }
    }
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      initial="hidden"
      animate="visible"
    >
      {/* Animated Circle */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        variants={circleVariants}
      />
      
      {/* Animated Checkmark */}
      <motion.path
        d="M8 12.5l2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={checkmarkVariants}
      />
    </motion.svg>
  );
}
