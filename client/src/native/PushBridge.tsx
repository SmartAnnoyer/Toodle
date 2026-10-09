import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SocketEvents } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { claimNotice, clearConversationNotifications, disablePush, enablePush, routeFor, type PushData } from './push';

type Banner = { id: string; title: string; body: string; path: string | null };

function chatId(pathname: string) {
  const match = pathname.match(/^\/chat\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function PushBridge() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [banner, setBanner] = useState<Banner | null>(null);
  const pending = useRef<string | null>(null);
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  function openPath(path: string) {
    if (!session) {
      pending.current = path;
      return;
    }
    navigate(path);
  }

  function show(note: Banner) {
    if (!claimNotice(note.id)) return;
    const openChat = chatId(locationRef.current);
    const incomingChat = note.path?.startsWith('/chat/') ? note.path.slice('/chat/'.length) : null;
    if (openChat && incomingChat === openChat) {
      void clearConversationNotifications(openChat);
      return;
    }
    if (document.visibilityState !== 'visible') return;
    setBanner(note);
  }

  useEffect(() => {
    if (session && pending.current) {
      const path = pending.current;
      pending.current = null;
      navigate(path);
    }
  }, [session, navigate]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), 4200);
    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    const open = chatId(location.pathname);
    if (open) void clearConversationNotifications(open);
  }, [location.pathname]);

  useEffect(() => {
    if (!socket) return;
    const onNotice = (payload: { id?: string; type?: string; title?: string; body?: string; payload?: PushData }) => {
      const data = payload.payload ?? {};
      const path = routeFor({ type: payload.type, ...data });
      show({
        id: data.messageId || data.notificationId || payload.id || '',
        title: payload.title || 'Toodle',
        body: payload.body || '',
        path,
      });
    };
    socket.on(SocketEvents.NotificationNew, onNotice);
    return () => {
      socket.off(SocketEvents.NotificationNew, onNotice);
    };
  }, [socket]);

  useEffect(() => {
    if (!userId) {
      void disablePush();
      return;
    }
    let stop = () => {};
    let alive = true;
    void enablePush({
      onOpen: openPath,
      onArrive: (note) => show(note),
    }).then((cleanup) => {
      if (!alive) cleanup();
      else stop = cleanup;
    });
    return () => {
      alive = false;
      stop();
    };
  }, [userId]);

  if (!banner) return null;
  return (
    <button type="button" className="push-banner" onClick={() => { if (banner.path) openPath(banner.path); setBanner(null); }}>
      <strong>{banner.title}</strong>
      <span>{banner.body}</span>
    </button>
  );
}
