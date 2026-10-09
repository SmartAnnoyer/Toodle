import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';

type Layer = { id: number; priority: number; close: () => void };

const layers: Layer[] = [];
let nextId = 1;
let routeBack: (() => boolean) | null = null;

export function setRouteBack(handler: (() => boolean) | null) {
  routeBack = handler;
}

export function addBackLayer(priority: number, close: () => void) {
  const id = nextId++;
  layers.push({ id, priority, close });
  return () => {
    const index = layers.findIndex((layer) => layer.id === id);
    if (index >= 0) layers.splice(index, 1);
  };
}

export function useBackLayer(open: boolean, close: () => void, priority: number) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    return addBackLayer(priority, () => closeRef.current());
  }, [open, priority]);
}

export function handleBack() {
  const top = layers.reduce<Layer | null>((best, layer) => {
    if (!best || layer.priority > best.priority || (layer.priority === best.priority && layer.id > best.id)) return layer;
    return best;
  }, null);
  if (top) {
    top.close();
    return;
  }
  if (routeBack?.()) return;
  if (Capacitor.getPlatform() === 'android') void App.minimizeApp();
}

export function listenForHardwareBack() {
  if (Capacitor.getPlatform() !== 'android') return () => {};
  let remove = () => {};
  let alive = true;
  void App.addListener('backButton', () => handleBack()).then((listener) => {
    if (!alive) {
      void listener.remove();
      return;
    }
    remove = () => {
      void listener.remove();
    };
  });
  return () => {
    alive = false;
    remove();
  };
}
