import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode disabled - causes issues with Mapbox GL in development
// StrictMode causes components to mount/unmount/remount which breaks Mapbox initialization
createRoot(document.getElementById('root')).render(
  <App />
)
