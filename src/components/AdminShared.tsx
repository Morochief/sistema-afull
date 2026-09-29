/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

// ============================================================================
// REUSABLE COMPONENTS - Compound Components Pattern
// ============================================================================

interface AdminSectionProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  variant?: 'default' | 'highlighted';
}

export function AdminSection({ title, icon, description, children, variant = 'default' }: AdminSectionProps) {
  const isHighlighted = variant === 'highlighted';

  return (
    <div className={`glass-panel rounded-md p-5 space-y-4 ${
      isHighlighted ? 'border-orange-500/30 bg-orange-500/5' : ''
    }`}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        {description && (
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

interface DataCardProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; color: 'emerald' | 'cyan' | 'pink' | 'blue' | 'rose' | 'slate' | 'amber' };
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function DataCard({ title, subtitle, badge, icon, children }: DataCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    cyan: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    pink: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    blue: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 rounded-md bg-[#111318] border border-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-orange-400">{icon}</span>}
            <h5 className="font-semibold text-white text-sm">{title}</h5>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 font-mono">{subtitle}</p>
          )}
          {children}
        </div>
        {badge && (
          <span className={`text-[9px] leading-tight font-mono tracking-wider px-2 py-1 rounded-sm border ${colorClasses[badge.color]} max-w-[130px] sm:max-w-[180px] text-right truncate overflow-hidden`}>
            {badge.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}

interface FormSectionHeaderProps {
  step: number;
  title: string;
  icon: React.ReactNode;
  required?: boolean;
}

export function FormSectionHeader({ step, title, icon, required }: FormSectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-white/5">
      <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-semibold text-xs border border-orange-500/20">
        {step}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-orange-400">{icon}</span>
        <h4 className="text-sm font-bold text-white uppercase tracking-wide">
          {title}
        </h4>
        {required && (
          <span className="text-[10px] bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
            REQUERIDO *
          </span>
        )}
      </div>
    </div>
  );
}
