import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from '../lib/constants';

// Get Mapbox token from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Debug: Check if token is loaded
console.log('Mapbox Token:', MAPBOX_TOKEN ? 'Token found ✓' : 'Token NOT found ✗');
console.log('All env vars:', import.meta.env);

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function Map({ reports, onMarkerClick }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Check if container exists and has dimensions
    if (!mapContainer.current) {
      console.error('Map container not found!');
      return;
    }

    console.log('Initializing Mapbox map...');
    console.log('Container dimensions:', {
      width: mapContainer.current.offsetWidth,
      height: mapContainer.current.offsetHeight
    });

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [101.5, 0.5], // Center of Sumatra
      zoom: 6
    });

    map.current.on('load', () => {
      console.log('Map loaded successfully!');
      setMapLoaded(true);
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when reports change
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add new markers
    reports.forEach(report => {
      const el = document.createElement('div');
      el.className = 'marker';

      // Get config from constants
      const severityConfig = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG['ringan'];
      const categoryConfig = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG['lainnya'];

      el.style.backgroundColor = severityConfig.markerColor;
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      el.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

      // Hover effects
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat(report.location.coordinates)
        .setPopup(
          new mapboxgl.Popup({ offset: 25, className: 'custom-popup' })
            .setHTML(`
              <div class="p-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xl">${severityConfig.icon}</span>
                  <h3 class="font-bold text-sm">${report.locationName}</h3>
                </div>
                <div class="flex items-center gap-1 mb-1">
                  <span>${categoryConfig.icon}</span>
                  <p class="text-xs text-gray-600 capitalize">${categoryConfig.label}</p>
                </div>
                <p class="text-xs text-gray-600 mt-1">Tingkat: ${severityConfig.label}</p>
                <p class="text-xs text-gray-700 mt-2 line-clamp-2">${report.description}</p>
              </div>
            `)
        )
        .addTo(map.current);

      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(report);
        }
      });

      markers.current.push(marker);
    });

    // Fit map to markers if there are any
    if (reports.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      reports.forEach(report => {
        bounds.extend(report.location.coordinates);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [reports, mapLoaded, onMarkerClick]);

  return (
    <div className="w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}
