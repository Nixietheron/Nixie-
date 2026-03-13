import { motion } from "motion/react";
import { ReactNode } from "react";

interface NixieButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function NixieButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
}: NixieButtonProps) {
  const baseStyles = "rounded-full transition-all duration-300 flex items-center justify-center gap-2";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-[#D27A92] to-[#E1A1B0] text-white shadow-lg shadow-[#D27A92]/30",
    secondary: "bg-[#EFD4CC] text-[#5A3D45] shadow-md",
    ghost: "bg-white/50 text-[#5A3D45] backdrop-blur-sm",
  };
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </motion.button>
  );
}
