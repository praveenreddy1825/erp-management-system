import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {AuthProvider} from './context/AuthContext.jsx';
import './index.css'
import App from './App.jsx'
import axios from 'axios';

// Dynamic API URL redirection for production deployments (e.g., Render/Vercel)
axios.interceptors.request.use((config) => {
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase && config.url && config.url.startsWith('http://127.0.0.1:9999')) {
    config.url = config.url.replace('http://127.0.0.1:9999', apiBase);
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
