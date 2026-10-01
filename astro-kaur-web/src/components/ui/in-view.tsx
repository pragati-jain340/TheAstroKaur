'use client';
import { ReactNode, useRef } from 'react';
import {
  motion,
  useInView,
  Variant,
  Transition,
  UseInViewOptions,
} from 'motion/react';

export type InViewProps = {
  children: ReactNode;
  variants?: {
    hidden: Variant;
    visible: Variant;
  };
  transition?: Transition;
  viewOptions?: UseInViewOptions;
  once?: boolean;
  className?: string;
};

const defaultVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function InView({
  children,
  variants = defaultVariants,
  transition = { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] },
  viewOptions = { margin: "0px 0px -40px 0px" },
  once = false,
  className = '',
}: InViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once,
    ...viewOptions,
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
