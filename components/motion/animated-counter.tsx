"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { EASE_DEFAULT } from "@/lib/motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  locale?: string;
}

export function AnimatedCounter({
  value,
  duration = 0.45,
  prefix = "",
  suffix = "",
  className,
  locale = "pt-BR",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) return;

    const controls = animate(0, value, {
      duration: Math.min(duration, 0.55),
      ease: EASE_DEFAULT,
      onUpdate(latest) {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [isInView, value, duration, shouldReduceMotion]);

  const shownValue = shouldReduceMotion ? value : displayValue;

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shownValue.toLocaleString(locale)}
      {suffix}
    </span>
  );
}
