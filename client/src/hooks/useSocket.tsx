import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { apiUrl } from '../lib/http';
import { useAuth } from './useAuth';

type Status = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface SocketValue {
  socket: Socket | null;
  status: Status;
  banner: string | null;
}

const SocketContext = createContext<SocketValue>({ socket: null, status: 'idle', banner: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [banner, setBanner] = useState<string | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setSocket(null);
      setStatus('idle');
      setBanner(null);
      seen.current = false;
      return;
    }
    const next = io(apiUrl(), { auth: { token }, autoConnect: true, reconnection: true });
    setSocket(next);
    setStatus('connecting');
    const onConnect = () => {
      setStatus('connected');
      if (seen.current) {
        setBanner('Connected ✓');
        window.setTimeout(() => setBanner((current) => current === 'Connected ✓' ? null : current), 1600);
      }
      seen.current = true;
    };
    const onDisconnect = () => {
      setStatus('disconnected');
      if (seen.current) setBanner('Reconnecting...');
    };
    next.on('connect', onConnect);
    next.on('disconnect', onDisconnect);
    return () => {
      next.off('connect', onConnect);
      next.off('disconnect', onDisconnect);
      next.disconnect();
    };
  }, [session?.access_token]);

  return <SocketContext.Provider value={{ socket, status, banner }}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

export function emitAck<T>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Toodle tripped. Try again.')), 8000);
    socket.emit(event, payload, (response: T) => {
      window.clearTimeout(timer);
      resolve(response);
    });
  });
}
