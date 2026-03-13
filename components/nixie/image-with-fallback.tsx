"use client";

import { useState, useEffect, ImgHTMLAttributes } from "react";
import { Lock } from "lucide-react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMjUiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMi41Ij48cmVjdCB4PSIxNiIgeT0iMTYiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NiIgcng9IjYiLz48Y2lyY2xlIGN4PSI1MyIgY3k9IjM1IiByPSI3Ii8+PC9zdmc+";

export interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** If main src fails, try this before showing error state */
  fallbackSrc?: string | null;
  /** When true, error state shows lock icon + "Unlock to view" (for locked NSFW) */
  errorVariant?: "locked";
}

export function ImageWithFallback({
  src,
  alt,
  style,
  className,
  fallbackSrc,
  errorVariant,
  ...rest
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setDidError(false);
    setTriedFallback(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && !triedFallback) {
      setTriedFallback(true);
      setDidError(false);
    } else {
      setDidError(true);
    }
  };

  const showErrorState = didError && (!fallbackSrc || triedFallback);
  if (showErrorState) {
    return (
      <div
        className={`inline-block text-center align-middle ${className ?? ""}`}
        style={{
          background: "rgba(255,255,255,0.04)",
          ...style,
        }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[120px] gap-2">
          {errorVariant === "locked" ? (
            <>
              <Lock className="w-10 h-10 text-white/30" />
              <span className="text-white/25 text-xs">Unlock to view</span>
            </>
          ) : (
            <img
              src={ERROR_IMG_SRC}
              alt={alt ?? "Error loading image"}
              className="w-10 h-10 opacity-50"
              {...rest}
              data-original-url={src}
            />
          )}
        </div>
      </div>
    );
  }

  const effectiveSrc = (triedFallback ? fallbackSrc : src) ?? null;
  if (!effectiveSrc) {
    return (
      <div
        className={`inline-block ${className ?? ""}`}
        style={{ background: "rgba(255,255,255,0.04)", minHeight: 120, ...style }}
      />
    );
  }

  return (
    <img
      key={triedFallback ? "fallback" : "primary"}
      src={effectiveSrc}
      alt={alt ?? ""}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
