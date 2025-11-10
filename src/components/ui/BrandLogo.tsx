import React, { useState } from "react";

interface BrandLogoProps {
  className?: string;
  size?: number; // base size for image/svg or font size for wordmark
  shape?: "rounded" | "circle"; // rounded corners or fully circular (for logo variant)
  variant?: "logo" | "wordmark"; // wordmark exibe apenas as letras, sem bordas
  tone?: "default" | "contrast"; // controla a paleta para melhor contraste em fundos escuros
}

export default function BrandLogo({ className = "", size = 80, shape = "rounded", variant = "logo", tone = "default" }: BrandLogoProps) {
  const [error, setError] = useState(false);
  const imgSize = `${size}px`;

  if (variant === "wordmark") {
    // Apenas letras, sem borda, com gradiente e tamanho configurável
    const gradientClasses =
      tone === "contrast"
        ? "bg-gradient-to-r from-white via-sky-200 to-emerald-200 drop-shadow-sm"
        : "bg-gradient-to-r from-blue-900 via-blue-600 to-emerald-500";
    return (
      <span
        className={`select-none font-extrabold tracking-tight ${gradientClasses} bg-clip-text text-transparent ${className}`}
        style={{ fontSize: `${size}px`, lineHeight: 1.12, display: "inline-block", transform: "translateY(-3px)" }}
      >
        Tily
      </span>
    );
  }

  return (
    <div
      className={`overflow-hidden ${shape === "circle" ? "rounded-full" : "rounded-2xl"} border border-primary/20 bg-primary/5 flex items-center justify-center ${className}`}
      style={{ width: imgSize, height: imgSize }}
    >
      {!error ? (
        <img
          src="/tily-logo.png"
          alt="Tily"
          className="object-contain w-full h-full"
          onError={() => setError(true)}
        />
      ) : (
        // Fallback SVG com gradiente e texto Tily
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="tilyGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          <rect x="10" y="10" width="180" height="180" rx="28" fill="#ffffff" opacity="0.6" />
          <g filter="url(#softShadow)">
            <text
              x="50%"
              y="55%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Inter, ui-sans-serif, system-ui"
              fontSize="88"
              fontWeight="700"
              fill="url(#tilyGrad)"
            >
              Tily
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
