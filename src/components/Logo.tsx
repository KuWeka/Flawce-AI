import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark' | 'solid';
}

export default function Logo({ className, size = 32, showText = false, variant = 'light' }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center justify-center", showText && "gap-3", className)}>
      <div 
        style={{ width: size, height: size }}
        className={cn(
          "rounded-[28%] flex items-center justify-center transition-all duration-300 shrink-0",
          variant === 'light' && "bg-[#EEEDFE] border border-[#AFA9EC]/30 shadow-sm",
          variant === 'dark' && "bg-[#1C1840] border border-[#534AB7]/30 shadow-inner",
          variant === 'solid' && "bg-primary shadow-lg shadow-primary/20"
        )}
      >
        <svg 
          width={size * 0.6} 
          height={size * 0.6} 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M10 36 Q20 12 24 24 Q28 36 38 12" 
            stroke={variant === 'light' ? "#534AB7" : (variant === 'dark' ? "#AFA9EC" : "#fff")} 
            strokeWidth="4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle 
            cx="38" 
            cy="12" 
            r="5" 
            fill={variant === 'light' ? "#7F77DD" : (variant === 'dark' ? "#CECBF6" : "#AFA9EC")} 
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col -space-y-1">
          <span className={cn(
            "text-2xl font-black tracking-tighter transition-colors",
            variant === 'dark' ? "text-white" : "text-foreground"
          )}>
            Flowce
          </span>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            Track less. Flow more.
          </span>
        </div>
      )}
    </div>
  );
}
