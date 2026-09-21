import React from 'react';

interface CortexLogoProps {
  className?: string;
  size?: number;
}

export const CortexLogo: React.FC<CortexLogoProps> = ({ 
  className = 'w-8 h-8', 
  size 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Cortex Logo"
    >
      <defs>
        {/* Glowing Gradient for Squircle Border */}
        <linearGradient id="cortexBorderGrad" x1="10%" y1="90%" x2="90%" y2="10%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>

        {/* Gradient for Waveform Signal */}
        <linearGradient id="cortexLineGrad" x1="20%" y1="50%" x2="80%" y2="50%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="60%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#E879F9" />
        </linearGradient>

        {/* Subtle Node Radial Glow */}
        <radialGradient id="cortexDotGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#C084FC" />
        </radialGradient>
      </defs>

      {/* Dark Squircle Background */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="26"
        fill="#0B0F15"
      />

      {/* Gradient Border Stroke */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="26"
        stroke="url(#cortexBorderGrad)"
        strokeWidth="4.5"
      />

      {/* Neural Graph / Oscilloscope Pulse Line */}
      <path
        d="M 23 53 L 33 53 L 45 31 L 56 68 L 68 45"
        stroke="url(#cortexLineGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* End Knowledge Node Circle */}
      <circle
        cx="73"
        cy="45"
        r="5"
        fill="url(#cortexDotGrad)"
      />
    </svg>
  );
};

export default CortexLogo;
