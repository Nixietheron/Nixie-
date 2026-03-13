import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Sparkles, Lock, Eye } from "lucide-react";
import { NixieButton } from "../components/nixie-button";
import { useState, useEffect } from "react";

export function SplashScreen() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show content after character animation
    const timer = setTimeout(() => setShowContent(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7E8EB] via-[#EFD4CC] to-[#E1A1B0] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              width: Math.random() * 150 + 50,
              height: Math.random() * 150 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 30 - 15, 0],
              x: [0, Math.random() * 30 - 15, 0],
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Sparkles */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          >
            <Sparkles
              className="text-white/40"
              style={{
                width: 8 + Math.random() * 16,
                height: 8 + Math.random() * 16,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Nixie Character - Slides in from right */}
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 80,
            duration: 1.2,
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[70%] max-w-md"
        >
          <div className="relative">
            {/* Glow Effect */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-gradient-to-br from-[#D27A92]/50 to-[#E1A1B0]/50 blur-[80px] rounded-full -z-10"
            />
            
            {/* Character Image */}
            <motion.img
              src="https://images.unsplash.com/photo-1722047877581-bb6d20cb33d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmltZSUyMGdpcmwlMjBwaW5rJTIwaGFpciUyMGN1dGUlMjBrYXdhaWklMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzMyNjQ0MDR8MA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Nixie"
              className="w-full h-auto drop-shadow-2xl"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Sparkle Accents around character */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`char-sparkle-${i}`}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Left Content */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 max-w-xs space-y-6">
          {/* Logo & Title */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -50 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.h1 
              className="text-7xl text-white drop-shadow-2xl mb-2 tracking-tight"
              animate={{
                textShadow: [
                  "0 0 20px rgba(210, 122, 146, 0.5)",
                  "0 0 40px rgba(210, 122, 146, 0.8)",
                  "0 0 20px rgba(210, 122, 146, 0.5)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              Nixie
            </motion.h1>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-12 bg-white/50 rounded-full" />
              <Sparkles className="w-4 h-4 text-white/70" />
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -50 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-3"
          >
            <p className="text-white/90 text-lg leading-relaxed">
              Exclusive anime artwork
              <br />
              crafted by Nixie
            </p>
            
            {/* Features */}
            <div className="space-y-2">
              <motion.div 
                className="flex items-center gap-3 text-white/80 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -20 }}
                transition={{ delay: 0.7 }}
              >
                <Eye className="w-4 h-4 text-[#EFD4CC]" />
                <span>View SFW previews for free</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-3 text-white/80 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showContent ? 1 : 0, x: showContent ? 0 : -20 }}
                transition={{ delay: 0.8 }}
              >
                <Lock className="w-4 h-4 text-[#EFD4CC]" />
                <span>Unlock NSFW with USDC</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Enter Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
            transition={{ delay: 1.0, duration: 0.6 }}
          >
            <NixieButton
              variant="primary"
              size="lg"
              onClick={() => navigate("/feed")}
              className="shadow-2xl shadow-[#D27A92]/50"
            >
              <span className="text-lg">Enter</span>
              <Sparkles className="w-5 h-5" />
            </NixieButton>
          </motion.div>

          {/* Powered by Base */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ delay: 1.2 }}
            className="text-white/60 text-xs"
          >
            Powered by Base · Payment via x402
          </motion.div>
        </div>
      </div>
    </div>
  );
}
