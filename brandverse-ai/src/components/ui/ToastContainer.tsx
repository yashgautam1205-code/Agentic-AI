import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'border-emerald/30 bg-emerald/5 text-emerald',
  error: 'border-rose/30 bg-rose/5 text-rose',
  info: 'border-accent/30 bg-accent/5 text-accent',
  warning: 'border-amber/30 bg-amber/5 text-amber',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-elevated',
                'bg-elevated backdrop-blur-xl max-w-sm w-full',
                styles[toast.type]
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
