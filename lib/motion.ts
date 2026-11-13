import type { Transition, Variants } from "motion/react";

export const EASE_DEFAULT = [0.22, 1, 0.36, 1] as const;

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: EASE_DEFAULT,
    },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: EASE_DEFAULT,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: EASE_DEFAULT,
    },
  },
};

export const cardHover = {
  y: -3,
  transition: { duration: 0.24, ease: EASE_DEFAULT },
};

export const imageZoomHover = {
  scale: 1.03,
  transition: { duration: 0.35, ease: EASE_DEFAULT },
};
