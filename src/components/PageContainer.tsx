import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
} as const;

export function PageContainer({ children, className, size = 'md' }: PageContainerProps) {
  return (
    <div className={cn(sizeClasses[size], 'mx-auto px-4 sm:px-6 py-6 space-y-6', className)}>
      {children}
    </div>
  );
}
