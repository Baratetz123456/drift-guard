import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid' | 'bordered';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const variantMap = {
    glass: 'bg-zinc-900/60 border border-zinc-800 backdrop-blur-md rounded-xl',
    solid: 'bg-zinc-900 border border-zinc-800 rounded-xl',
    bordered: 'bg-zinc-950/80 border border-zinc-800 rounded-xl',
  };

  const hoverClasses = hoverEffect
    ? 'transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80'
    : '';

  return (
    <div className={`${variantMap[variant]} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
