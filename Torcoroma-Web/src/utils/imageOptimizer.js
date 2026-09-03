const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:4000';

/**
 * Optimiza y redimensiona URLs de imágenes (especialmente Cloudinary) para acelerar
 * drásticamente los tiempos de carga y ahorrar datos al usuario.
 *
 * @param {string} path - Ruta o URL de la imagen
 * @param {number} width - Ancho máximo deseado en píxeles (default 600)
 * @returns {string} - URL optimizada con compresión y formato moderno (WebP/AVIF)
 */
export const getOptimizedImgUrl = (path, width = 600) => {
  if (!path) return '';

  // Si es una imagen de Cloudinary, aplicamos transformaciones on-the-fly
  if (typeof path === 'string' && path.includes('res.cloudinary.com') && path.includes('/upload/')) {
    // Si ya tiene parámetros de optimización no los duplicamos
    if (!path.includes('/upload/f_auto') && !path.includes('/upload/w_')) {
      return path.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }

  // Si es una ruta absoluta externa
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Si es una ruta relativa local del backend (/uploads/...)
  return `${API_URL}${path}`;
};
