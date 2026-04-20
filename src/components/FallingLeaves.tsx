import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Leaf {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  duration: number;
  delay: number;
  horizontalMovement: number;
}

export const FallingLeaves = () => {
  const leaves = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20,
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      horizontalMovement: Math.random() * 60 - 30,
      color: i % 3 === 0 ? 'bg-orange-500/30' : (i % 3 === 1 ? 'bg-pink-400/30' : 'bg-amber-400/30')
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {leaves.map((leaf) => (
        <motion.div
          key={leaf.id}
          initial={{ 
            opacity: 0, 
            y: '-10vh', 
            x: `${leaf.x}vw`,
            rotate: leaf.rotation 
          }}
          animate={{
            opacity: [0, 0.8, 0.8, 0],
            y: '110vh',
            x: `${leaf.x + (leaf.horizontalMovement / 5)}vw`,
            rotate: leaf.rotation + 720
          }}
          transition={{
            duration: leaf.duration,
            repeat: Infinity,
            delay: leaf.delay,
            ease: "linear"
          }}
          className="absolute will-change-transform"
          style={{ width: leaf.size, height: leaf.size }}
        >
          <div className={cn("w-full h-full rounded-full blur-[1px]", leaf.color)}>
             <div className="w-1/2 h-full bg-white/10 rounded-full rotate-45" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
