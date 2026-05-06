import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache global en mémoire pour éviter des requêtes répétées
let _cache = null;
let _listeners = [];

function notify(data) {
  _listeners.forEach(fn => fn(data));
}

export function invalidateActivityConfigCache() {
  _cache = null;
}

export async function loadActivityConfig() {
  if (_cache) return _cache;
  const configs = await base44.entities.ActivityConfig.list("sort_order", 50);
  _cache = configs;
  return configs;
}

export function useActivityConfig() {
  const [configs, setConfigs] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) {
      setConfigs(_cache);
      setLoading(false);
      return;
    }
    loadActivityConfig().then(data => {
      setConfigs(data);
      setLoading(false);
    });

    // S'abonner aux changements temps réel
    const unsub = base44.entities.ActivityConfig.subscribe(() => {
      _cache = null;
      loadActivityConfig().then(data => {
        setConfigs(data);
      });
    });

    const listener = (data) => setConfigs(data);
    _listeners.push(listener);

    return () => {
      unsub();
      _listeners = _listeners.filter(fn => fn !== listener);
    };
  }, []);

  // Helpers
  const getLabel = (typeKey) => configs.find(c => c.type_key === typeKey)?.label || typeKey;
  const getImage = (typeKey) => configs.find(c => c.type_key === typeKey)?.image_url || null;
  const getEmoji = (typeKey) => configs.find(c => c.type_key === typeKey)?.emoji || "✨";
  const activeConfigs = configs.filter(c => c.is_active !== false);

  return { configs, activeConfigs, loading, getLabel, getImage, getEmoji };
}