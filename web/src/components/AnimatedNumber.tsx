import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number | string;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals,
  duration = 600,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericTarget) && isFinite(numericTarget);

  const [displayValue, setDisplayValue] = useState<number>(isNumeric ? numericTarget : 0);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevTargetRef = useRef<number>(isNumeric ? numericTarget : 0);
  const animationFrameRef = useRef<number | null>(null);

  // Determine decimal places if not explicitly provided
  const resolvedDecimals = decimals !== undefined
    ? decimals
    : typeof value === 'number' && !Number.isInteger(value)
    ? 1
    : typeof value === 'string' && value.includes('.')
    ? value.split('.')[1].length
    : 0;

  useEffect(() => {
    if (!isNumeric) return;

    const prevTarget = prevTargetRef.current;
    if (prevTarget !== numericTarget) {
      if (numericTarget > prevTarget) {
        setFlash('up');
      } else if (numericTarget < prevTarget) {
        setFlash('down');
      }

      const flashTimer = setTimeout(() => setFlash(null), 1200);

      const startTime = performance.now();
      const startVal = prevTarget;
      const change = numericTarget - startVal;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = startVal + change * easeOut;

        setDisplayValue(currentVal);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(numericTarget);
          prevTargetRef.current = numericTarget;
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        clearTimeout(flashTimer);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      setDisplayValue(numericTarget);
    }
  }, [numericTarget, isNumeric, duration]);

  if (!isNumeric) {
    return <span className={className}>{prefix}{value}{suffix}</span>;
  }

  const formatted = resolvedDecimals > 0
    ? displayValue.toFixed(resolvedDecimals)
    : Math.round(displayValue).toString();

  return (
    <span
      className={`inline-block transition-colors duration-500 ${
        flash === 'up'
          ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
          : flash === 'down'
          ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]'
          : ''
      } ${className}`}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
};
