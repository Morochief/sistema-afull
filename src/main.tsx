import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Auto-recuperación automática ante nuevos despliegues de Vite
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Nuevo despliegue detectado tras fallo de carga de chunk, recargando...', event);
  window.location.reload();
});

// Register service worker for PWA installation support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado con éxito:', reg.scope);
      })
      .catch((err) => {
        console.error('[PWA] Error al registrar el Service Worker:', err);
      });
  });
}
