'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/cx';
import styles from './common.module.css';

const TOAST_DURATION_MS = 2800;

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
    setIsVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsVisible(false), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className={cx(styles.toast, isVisible && styles.isVisible)}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
