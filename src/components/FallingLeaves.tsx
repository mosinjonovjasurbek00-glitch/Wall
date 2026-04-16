import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Leaf {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export const FallingLeaves: React.FC = () => {
  const [stars, setStars] = useState<Leaf[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      delay: Math.random() * 20,
      duration: 10 + Math.random() * 15,
      size: 1 + Math.random() * 3,
      rotation: Math.random() * 360,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          initial={{ y: -20, x: `${star.x}%`, rotate: star.rotation, opacity: 0 }}
          animate={{
            y: '110vh',
            rotate: star.rotation + 360,
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "linear",
          }}
          style={{
            position: 'absolute',
            width: star.size,
            height: star.size,
          }}
        >
          <div 
            className="w-full h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] animate-pulse"
            style={{
              filter: `blur(${Math.random() * 0.5}px)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};
