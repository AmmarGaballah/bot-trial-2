import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function GlassCard({ 
  children, 
  className, 
  hover = false,
  animate = true,
  ...props 
}) {
  const Component = animate ? motion.div : 'div';
  
  const baseClass = hover ? 'glass-card-hover' : 'glass-card';
  
  const motionProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  } : {};

  return (
    <Component 
      className={cn(baseClass, className)} 
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
