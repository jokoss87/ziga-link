import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { base44 } from '@/api/base44Client';

// Nettoyage localStorage — clés zigalink_ann_visit_ > 7 jours
try {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("zigalink_ann_visit_")) {
      const ts = parseInt(localStorage.getItem(key));
      if (!isNaN(ts) && now - ts > SEVEN_DAYS) {
        localStorage.removeItem(key);
      }
    }
  });
} catch {}
// ── Versioning cache photo — invalide les clés des anciennes versions ────────
const PHOTO_CACHE_VERSION = "v2";
const PHOTO_PREFIX = `photo_${PHOTO_CACHE_VERSION}_`;
try {
  const toDelete = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith("photo_") && !key.startsWith(PHOTO_PREFIX)) {
      toDelete.push(key);
    }
  }
  toDelete.forEach(k => sessionStorage.removeItem(k));
} catch {}
// ─────────────────────────────────────────────────────────────────────────────

// ── Fix hauteur mobile universel ─────────────────────────────────────────────
function setAppHeight() {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`
  );
}
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setAppHeight, 100);
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Capture des erreurs JavaScript non gérées ─────────────────────────────
// Throttle anti-doublon : ignore le même message dans les 5 secondes
const _lastErrorLog = {};
function shouldLogError(message) {
  if (Object.keys(_lastErrorLog).length > 50) return false;
  const now = Date.now();
  if (_lastErrorLog[message] && now - _lastErrorLog[message] < 5000) return false;
  _lastErrorLog[message] = now;
  return true;
}
// Purge périodique des entrées > 5s pour éviter fuite mémoire en sessions longues
setInterval(() => {
  const now = Date.now();
  for (const key in _lastErrorLog) {
    if (now - _lastErrorLog[key] > 5000) delete _lastErrorLog[key];
  }
}, 60000);

window.addEventListener("unhandledrejection", (event) => {
  const message = event.reason?.message || "Unhandled promise rejection";
  if (!shouldLogError(message)) return;
  base44.entities.AppLog.create({
    level: "error",
    category: "react_crash",
    message,
    details: String(event.reason),
    stack: event.reason?.stack || null,
    page: window.location.pathname,
    resolved: false,
  }).catch(() => {});
});

window.addEventListener("error", (event) => {
  const message = event.message || "JavaScript error";
  if (!shouldLogError(message)) return;
  base44.entities.AppLog.create({
    level: "critical",
    category: "react_crash",
    message,
    details: `${event.filename}:${event.lineno}:${event.colno}`,
    stack: event.error?.stack || null,
    page: window.location.pathname,
    resolved: false,
  }).catch(() => {});
});
// ─────────────────────────────────────────────────────────────────────────────

// Enregistrement du Service Worker (skipWaiting + clients.claim pour mises à jour instantanées)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Nouvelle version disponible');
          }
        });
      });
    }).catch(err => console.warn('[SW] Enregistrement échoué:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)