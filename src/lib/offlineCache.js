import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'offline_discovery_';
const INDEX_KEY = 'offline_discoveries_index';
const IMAGE_CACHE = 'scan-anything-images';

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function cacheDiscovery(discovery) {
  if (!discovery || !discovery.id) return;
  try {
    localStorage.setItem(CACHE_PREFIX + discovery.id, JSON.stringify(discovery));
    const index = getCachedIds();
    if (!index.includes(discovery.id)) {
      index.push(discovery.id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    }
    if (discovery.image_url) {
      cacheImage(discovery.image_url).catch(() => {});
    }
  } catch {}
}

export function getCachedDiscovery(id) {
  try {
    const data = localStorage.getItem(CACHE_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function getCachedIds() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getCachedDiscoveries() {
  return getCachedIds()
    .map(id => getCachedDiscovery(id))
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

export async function cacheImage(url) {
  if (!url || typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(IMAGE_CACHE);
    let response = await cache.match(url);
    if (!response) {
      response = await fetch(url, { mode: 'cors' });
      if (response.ok) await cache.put(url, response.clone());
    }
  } catch {}
}

export function removeCachedDiscovery(id) {
  try {
    localStorage.removeItem(CACHE_PREFIX + id);
    const index = getCachedIds().filter(i => i !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}