const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de validez para el caché en cliente
const STORAGE_KEY_PRODS = 'torcoroma_prods_cache';
const STORAGE_KEY_CONFIG = 'torcoroma_config_cache';

// Caché en memoria durante la sesión
let memoryProds = null;
let memoryProdsTime = 0;
let memoryConfig = null;
let memoryConfigTime = 0;
let inflightProdsPromise = null;
let inflightConfigPromise = null;

// Suscriptores para notificar si hay un cambio en background (SWR)
const listeners = new Set();

export const subscribeToEcommerceUpdates = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const notifyListeners = (type, data) => {
  listeners.forEach(cb => {
    try {
      cb(type, data);
    } catch (e) {
      console.error(e);
    }
  });
};

/**
 * Carga los datos de sessionStorage si existen
 */
const getSessionCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.data;
    }
    sessionStorage.removeItem(key);
  } catch {
    // Si falla sessionStorage no bloquea la app
  }
  return null;
};

const setSessionCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch {
    // Ignorar si sessionStorage está lleno
  }
};

/**
 * Obtiene los productos web con estrategia de caché inmediata (0ms) + SWR
 */
export const getProductosWeb = async ({ forceRefresh = false, onWarmupNotice = null } = {}) => {
  const now = Date.now();

  // 1. Revisar memoria o sessionStorage si no es forceRefresh
  if (!forceRefresh) {
    if (memoryProds && (now - memoryProdsTime < CACHE_TTL_MS)) {
      // Revalidación silenciosa en background si tiene más de 60s
      if (now - memoryProdsTime > 60 * 1000) {
        revalidateProductosInBackground();
      }
      return memoryProds;
    }

    const sessionData = getSessionCache(STORAGE_KEY_PRODS);
    if (sessionData) {
      memoryProds = sessionData;
      memoryProdsTime = now;
      revalidateProductosInBackground();
      return sessionData;
    }
  }

  // 2. Si ya hay una petición en vuelo, devolver la misma promesa para no duplicar llamadas
  if (inflightProdsPromise) {
    return inflightProdsPromise;
  }

  // 3. Temporizador de advertencia de "Servidor despertando" (Render cold start)
  let warmupTimer = null;
  if (typeof onWarmupNotice === 'function') {
    warmupTimer = setTimeout(() => {
      onWarmupNotice(true);
    }, 2500);
  }

  inflightProdsPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/ecommerce/productos`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      memoryProds = data;
      memoryProdsTime = Date.now();
      setSessionCache(STORAGE_KEY_PRODS, data);
      notifyListeners('productos', data);
      return data;
    } finally {
      if (warmupTimer) clearTimeout(warmupTimer);
      if (typeof onWarmupNotice === 'function') onWarmupNotice(false);
      inflightProdsPromise = null;
    }
  })();

  return inflightProdsPromise;
};

const revalidateProductosInBackground = async () => {
  if (inflightProdsPromise) return;
  try {
    const res = await fetch(`${API_URL}/api/ecommerce/productos`);
    if (res.ok) {
      const data = await res.json();
      memoryProds = data;
      memoryProdsTime = Date.now();
      setSessionCache(STORAGE_KEY_PRODS, data);
      notifyListeners('productos', data);
    }
  } catch (err) {
    console.debug('Fallo revalidación en background:', err);
  }
};

/**
 * Obtiene la configuración de la tienda (banners, hero) con caché
 */
export const getWebConfig = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();

  if (!forceRefresh) {
    if (memoryConfig && (now - memoryConfigTime < CACHE_TTL_MS)) {
      return memoryConfig;
    }
    const sessionData = getSessionCache(STORAGE_KEY_CONFIG);
    if (sessionData) {
      memoryConfig = sessionData;
      memoryConfigTime = now;
      return sessionData;
    }
  }

  if (inflightConfigPromise) return inflightConfigPromise;

  inflightConfigPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/ecommerce/config`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      memoryConfig = data;
      memoryConfigTime = Date.now();
      setSessionCache(STORAGE_KEY_CONFIG, data);
      return data;
    } finally {
      inflightConfigPromise = null;
    }
  })();

  return inflightConfigPromise;
};

export default {
  getProductosWeb,
  getWebConfig,
  subscribeToEcommerceUpdates
};
