import { useEffect, useState, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';

const extractBundleId = (html) => {
  const match = html.match(/\/assets\/index-([a-zA-Z0-9_-]+)\.js/);
  return match ? match[1] : null;
};

export default function UpdateManager() {
  const [updatePending, setUpdatePending] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    if (!updatePending || dismissed) return;

    let idleTimer = null;

    const showWhenIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setUpdateAvailable(true), 5_000);
    };

    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setUpdateAvailable(true), 5_000);
    };

    showWhenIdle();

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('scroll', resetIdle);

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
    };
  }, [updatePending, dismissed]);

  const checkForUpdates = async () => {
    try {
      const response = await fetch('/index.html', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      const html = await response.text();
      const bundleId = extractBundleId(html);
      if (!bundleId) return;

      const currentBundleId = extractBundleId(document.documentElement.innerHTML);
      if (currentBundleId && bundleId !== currentBundleId) {
        setUpdatePending(true);
      }
    } catch (err) {
      console.error('Erreur vérification mise à jour:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 30_000);
    const interval = setInterval(checkForUpdates, 5 * 60_000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-teal-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Mise à jour disponible</p>
          <p className="text-xs text-stone-400 mt-0.5">Rechargez pour profiter des dernières améliorations</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => window.location.reload()}
            className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          >
            Mettre à jour
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-stone-700 rounded-lg transition-colors">
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>
    </div>
  );
}