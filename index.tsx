import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const init = () => {
  const container = document.getElementById('root');
  if (!container) return;
  
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Simple SW registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
  }
};

// Ensure DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
