import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    // Generate constant count of leaves
    const initialLeaves = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20,
      size: Math.random() * 10 + 10,
      rotation: Math.random() * 360,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      horizontalMovement: Math.random() * 100 - 50,
    }));
    setLeaves(initialLeaves);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
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
            opacity: [0, 1, 1, 0],
            y: '110vh',
            x: `${leaf.x + (leaf.horizontalMovement / 10)}vw`,
            rotate: leaf.rotation + 360
          }}
          transition={{
            duration: leaf.duration,
            repeat: Infinity,
            delay: leaf.delay,
            ease: "linear"
          }}
          className="absolute"
          style={{ width: leaf.size, height: leaf.size }}
        >
          {/* Sakura Petal Shape */}
          <div className="w-full h-full bg-pink-300/40 rounded-full shadow-[0_0_10px_rgba(244,114,182,0.3)]">
            <div className="w-1/2 h-1/2 bg-pink-400/20 rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
        </motion.div>
      ))}
      
      {/* Immersive radial gradient overlays for mood */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/10 via-transparent to-pink-900/10" />
    </div>
  );
};
