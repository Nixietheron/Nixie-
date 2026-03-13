import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface SparkleEffectProps {
  count?: number;
  className?: string;
}

export function SparkleEffect({ count = 10, className = "" }: SparkleEffectProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: 0,
            scale: 0,
          }}
          animate={{
            y: [null, (Math.random() - 0.5) * 100 + "%"],
            opacity: [0, 0.6, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        >
          <Sparkles
            className="text-[#D27A92]/30"
            style={{
              width: 8 + Math.random() * 16,
              height: 8 + Math.random() * 16,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
