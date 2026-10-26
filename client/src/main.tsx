import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { unlockChatSound } from './chat/chatSound';
import './index.css';

if (Capacitor.isNativePlatform()) document.documentElement.classList.add('native');
window.addEventListener('pointerdown', () => unlockChatSound(), { once: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
