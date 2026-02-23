import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div className={`${hover ? 'glass-card-hover' : 'glass-card'} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;
