"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  depth = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  depth?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={depth && !reduceMotion ? { rotateX: -3, rotateY: 5, scale: 1.025 } : undefined}
      viewport={{ once: true, margin: "-70px" }}
      style={depth ? { transformPerspective: 1100, transformStyle: "preserve-3d" } : undefined}
      transition={{ duration: reduceMotion ? 0 : 0.58, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
