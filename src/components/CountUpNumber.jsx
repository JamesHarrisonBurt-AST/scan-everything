import { useState, useEffect } from 'react';

export default function CountUpNumber({ value, prefix = '$', duration = 1000, decimals = 2 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!value) return;
    const start = 0;
    const end = value;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}{display.toFixed(decimals)}
    </span>
  );
}