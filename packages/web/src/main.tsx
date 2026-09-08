import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return <div style={{ padding: 40, textAlign: 'center' }}>
    <h1>My Editor</h1>
    <p>富文本模板编辑器 — 前端已启动</p>
  </div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
