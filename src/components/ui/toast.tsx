// components/ui/toast.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'default' | 'destructive' | 'success' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: React.ReactNode;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastComponent({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const isInfinite = toast.duration === Infinity;

  useEffect(() => {
    if (isInfinite) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(
        0, 
        100 - (elapsed / (toast.duration || 5000)) * 100
      );
      setProgress(remaining);
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration, isInfinite]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'destructive':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = {
      container: '',
      icon: '',
      progress: '',
    };

    switch (toast.type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-900',
          icon: 'text-green-600',
          progress: 'bg-green-600',
        };
      case 'destructive':
        return {
          container: 'bg-red-50 border-red-200 text-red-900',
          icon: 'text-red-600',
          progress: 'bg-red-600',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 border-amber-200 text-amber-900',
          icon: 'text-amber-600',
          progress: 'bg-amber-600',
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-900',
          icon: 'text-blue-600',
          progress: 'bg-blue-600',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border shadow-lg transition-all duration-300 animate-in slide-in-from-right-10',
        styles.container
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Progress Bar */}
      {!isInfinite && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          <div
            className={cn('h-full transition-all duration-50', styles.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Toast Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('flex-shrink-0', styles.icon)}>
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            {toast.title && (
              <h3 className="font-semibold mb-1 truncate">{toast.title}</h3>
            )}
            {toast.description && (
              <p className="text-sm opacity-90 break-words">{toast.description}</p>
            )}
            {toast.action && (
              <div className="mt-3">{toast.action}</div>
            )}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className={cn(
              'flex-shrink-0 p-1 hover:opacity-70 transition-opacity rounded',
              styles.icon
            )}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}