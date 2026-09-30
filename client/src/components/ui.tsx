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
    primary: 'btn-primary bg-gradient-to-r from-violet-400 to-pink-400 text-slate-950 shadow-lg shadow-fuchsia-500/20',
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

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ${checked ? 'bg-primary' : 'bg-ink/20'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-150 ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

export function OptionPicker({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value)?.label ?? 'Choose';
  return (
    <div className="mt-3">
      {label ? <span className="mb-2 block text-xs font-medium text-muted">{label}</span> : null}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((shown) => !shown)}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-elevated px-4 py-3 text-left text-base text-ink"
      >
        <span className="min-w-0 flex-1 truncate">{current}</span>
        <span className={`shrink-0 text-xs text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden>▾</span>
      </button>
      {open ? (
        <ul role="listbox" className="mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-bg p-1.5 shadow-card">
          {options.map((option) => {
            const chosen = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={chosen}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink ${chosen ? 'bg-primary/15 font-semibold' : 'active:bg-white/10'}`}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {chosen ? <span className="shrink-0 text-primary" aria-hidden>✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
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

export function ConfirmBar({
  title,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45" onClick={onCancel}>
      <div className="w-full max-w-[820px] rounded-t-3xl border border-line bg-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4" onClick={(event) => event.stopPropagation()}>
        <p className="text-lg font-semibold">{title}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm}>{confirm}</Button>
        </div>
      </div>
    </div>
  );
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto min-h-dvh w-full max-w-[820px] ${className}`}>{children}</div>;
}
