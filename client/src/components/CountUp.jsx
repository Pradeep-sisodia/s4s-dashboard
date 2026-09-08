import { useEffect, useRef, useState } from "react";

export function formatINR(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

export default function CountUp({
  value = 0,
  duration = 1400,
  prefix = "",
  suffix = "",
  digits = 0,
  indian = true
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    startRef.current = null;
    let frame;

    const tick = (now) => {
      if (startRef.current == null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const formatted = indian ? formatINR(display, digits) : display.toFixed(digits);
  return (
    <span>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
