import React from 'react';

export const GraphBackground: React.FC = () => {
  return (
    <div 
      className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden" 
      aria-hidden="true"
    >
      {/* Subtle, non-distracting dot-matrix grid */}
      <div 
        className="w-full h-full"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Top subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F14]/20 via-transparent to-[#0B0F14]" />
    </div>
  );
};
