import { motion } from 'framer-motion';
import { createContext, useCallback, useContext, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-display font-extrabold tracking-tight text-gradient ${className}`}>Toodle</span>;
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const styles = {
    primary: 'bg-gradient-to-r from-violet-400 to-pink-400 text-slate-950 shadow-lg shadow-fuchsia-500/20',
    ghost: 'bg-transparent border border-line text-ink',
    danger: 'bg-danger/15 text-danger border border-danger/30',
    soft: 'bg-elevated text-ink border border-line',
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-line bg-elevated px-4 py-3 text-base text-ink outline-none ring-primary/40 placeholder:text-muted/70 focus:ring-2"
      />
      {hint ? <span className="mt-2 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-16 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h2 className="text-xl font-semibold">{title}</h2>
      {body ? <p className="mt-2 text-muted">{body}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </motion.div>
  );
}

export function Avatar({ emoji, online = false, size = 'md' }: { emoji: string; online?: boolean; size?: 'md' | 'lg' }) {
  return (
    <span className={`relative inline-flex items-center justify-center rounded-full bg-elevated ${size === 'lg' ? 'h-20 w-20 text-4xl' : 'h-12 w-12 text-2xl'}`}>
      {emoji}
      {online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg bg-success" /> : null}
    </span>
  );
}

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const push = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage((current) => current === next ? null : current), 2800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      {message ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="glass rounded-full px-4 py-2 text-sm">{message}</div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto min-h-dvh w-full max-w-[820px] ${className}`}>{children}</div>;
}
