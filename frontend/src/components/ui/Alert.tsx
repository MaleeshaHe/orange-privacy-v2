import { ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface AlertProps {
  children: ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export function Alert({ children, variant = 'info', onClose }: AlertProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const Icon = icons[variant];

  return (
    <div
      className={clsx('rounded-lg p-4 flex items-start', {
        'bg-green-50 text-green-800': variant === 'success',
        'bg-red-50 text-red-800': variant === 'error',
        'bg-yellow-50 text-yellow-800': variant === 'warning',
        'bg-blue-50 text-blue-800': variant === 'info',
      })}
    >
      <Icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
