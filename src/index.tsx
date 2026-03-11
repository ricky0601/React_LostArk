import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { CHUNK_ERROR_KEY, CHUNK_ERROR_EVENT } from './context/PwaChunkContext';
function isChunkLoadErrorMsg(message: string): boolean {
  const s = (message || '').toLowerCase();
  return (
    s.includes('loading chunk') ||
    s.includes('chunkloaderror') ||
    s.includes('failed to fetch dynamically imported module')
  );
}
function setChunkErrorFlag(): void {
  try {
    sessionStorage.setItem(CHUNK_ERROR_KEY, '1');
    window.dispatchEvent(new CustomEvent(CHUNK_ERROR_EVENT));
  } catch {
    /* ignore */
  }
}
window.addEventListener('error', (e: ErrorEvent) => {
  if (e.message && isChunkLoadErrorMsg(e.message)) setChunkErrorFlag();
});
window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  const msg =
    (e?.reason?.message ?? e?.reason?.error?.message ?? String(e?.reason ?? '')).toLowerCase();
  if (isChunkLoadErrorMsg(msg)) setChunkErrorFlag();
});

if (process.env.NODE_ENV !== 'development') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
