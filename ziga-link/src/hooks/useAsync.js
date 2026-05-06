import { useState, useCallback, useRef } from "react";

/**
 * useAsync — Hook centralisé pour gérer les opérations asynchrones.
 *
 * @returns {{ status, data, error, run, reset }}
 *   status : "idle" | "loading" | "error"
 *   data   : résultat de la dernière exécution réussie
 *   error  : message d'erreur si status === "error"
 *   run(fn): exécute la fonction async, gère automatiquement le cycle d'état
 *   reset(): remet à l'état initial
 */
export function useAsync(initialData = null) {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);

  // Ref pour éviter les setState après démontage du composant
  const mountedRef = useRef(true);
  if (!mountedRef.current) mountedRef.current = true;

  const run = useCallback(async (asyncFn) => {
    if (!mountedRef.current) return;
    setStatus("loading");
    setError(null);
    const result = await asyncFn();
    if (!mountedRef.current) return;
    if (result !== undefined) setData(result);
    setStatus("idle");
    return result;
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(initialData);
    setError(null);
  }, [initialData]);

  return { status, data, error, run, reset, setData };
}

/**
 * useAsyncAction — Pour les actions ponctuelles (save, delete, send…)
 * sans stocker de data (juste le cycle loading/idle/error).
 */
export function useAsyncAction() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const run = useCallback(async (asyncFn) => {
    setStatus("loading");
    setError(null);
    await asyncFn();
    setStatus("idle");
  }, []);

  return { status, error, run, isLoading: status === "loading" };
}