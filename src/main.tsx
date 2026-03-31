import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';  // ← ESTA LÍNEA ES CRÍTICA

// Apply transparent background immediately for overlay window — before first React paint
if (window.location.pathname === '/overlay') {
  document.documentElement.classList.add('overlay-window');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);