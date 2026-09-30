import React from 'react';
import { cn } from '../lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-8 h-8", className)}>
      <path d="M16 2.5L3.5 7.5V14.5C3.5 20.5 8.5 26.5 16 29.5C23.5 26.5 28.5 20.5 28.5 14.5V7.5L16 2.5Z" className="fill-primary-500/10 dark:fill-primary-400/20" />
      <path d="M16 2.5L3.5 7.5V14.5C3.5 20.5 8.5 26.5 16 29.5C23.5 26.5 28.5 20.5 28.5 14.5V7.5L16 2.5Z" className="stroke-primary-600 dark:stroke-primary-400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 11V21M11 16H21" className="stroke-primary-600 dark:stroke-primary-400" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
