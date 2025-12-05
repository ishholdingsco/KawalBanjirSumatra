import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
// IMPORTANT: CSS must be imported in the component when using lazy loading
import 'mapbox-gl/dist/mapbox-gl.css';
import { SEVERITY_CONFIG, CATEGORY_CONFIG } from '../lib/constants';

// Get Mapbox token from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

mapboxgl.accessToken = MAPBOX_TOKEN;

export default function Map({ reports, onMarkerClick, onMapLoaded, onRegionClick }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(6);
  const isLoadingBoundaries = useRef(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

    // Check if container exists
    if (!mapContainer.current) return;

    // Bounding box untuk Sumatra: [west, south, east, north]
    // Ini mencakup Aceh, Sumut, Sumbar dan sedikit margin
    const sumatraBounds = [
      [94.5, -6.0],  // Southwest coordinates (Sumbar selatan)
      [106.5, 6.5]   // Northeast coordinates (Aceh utara)
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [99.0, 2.0], // Center fokus ke Aceh-Sumut-Sumbar
      zoom: 6.5,
      // ❌ Tidak pakai maxBounds karena mengganggu scroll zoom
      // Sebagai gantinya, kita akan handle pembatasan panning secara manual
      maxZoom: 18,
      minZoom: 4.5 // Turunkan sedikit agar bisa zoom out lebih jauh
    });

    // Batasi panning ke area Sumatra (pengganti maxBounds yang lebih flexible)
    map.current.on('moveend', () => {
      const center = map.current.getCenter();
      const bounds = {
        west: 94.5,
        south: -6.0,
        east: 106.5,
        north: 6.5
      };

      // Jika center keluar dari bounds, kembalikan ke dalam bounds
      let newCenter = { lng: center.lng, lat: center.lat };
      let needsAdjustment = false;

      if (center.lng < bounds.west) {
        newCenter.lng = bounds.west;
        needsAdjustment = true;
      } else if (center.lng > bounds.east) {
        newCenter.lng = bounds.east;
        needsAdjustment = true;
      }

      if (center.lat < bounds.south) {
        newCenter.lat = bounds.south;
        needsAdjustment = true;
      } else if (center.lat > bounds.north) {
        newCenter.lat = bounds.north;
        needsAdjustment = true;
      }

      if (needsAdjustment) {
        map.current.panTo(newCenter, { duration: 300 });
      }
    });

    // Enforce minZoom constraint during scroll (fix scroll zoom stopping issue)
    // Gunakan zoomend untuk menghindari konflik dengan animasi zoom
    map.current.on('zoomend', () => {
      const currentZoom = map.current.getZoom();
      const minZoom = 4.5; // Sesuaikan dengan minZoom di config map
      const maxZoom = 18;

      // Jika zoom lebih kecil dari minimum, paksa kembali ke minimum
      if (currentZoom < minZoom - 0.01) { // Tambah tolerance kecil untuk menghindari loop
        map.current.setZoom(minZoom);
      }
      // Jika zoom lebih besar dari maximum, paksa kembali ke maximum
      if (currentZoom > maxZoom + 0.01) {
        map.current.setZoom(maxZoom);
      }
    });

    // Notify parent immediately when map component is mounted
    // This makes the "Buka Info" button appear together with zoom/GPS controls
    if (onMapLoaded) {
      onMapLoaded();
    }

    map.current.on('load', () => {
      // 🎯 CUSTOMIZATION: Hide labels outside Sumatra dan gray out other countries
      const layers = map.current.getStyle().layers;

      layers.forEach(layer => {
        // 🚫 Hide Mapbox labels berdasarkan tipe
        if (layer.type === 'symbol') {
          // Hide ALL place labels (country, state, city, settlement) - kita pakai custom labels
          if (layer.id.includes('label') && !layer.id.includes('road')) {
            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
          }

          // For road labels (road-number, road-shield, etc), hide them completely
          // Geographic filtering doesn't work because these layers don't have longitude/latitude properties
          if (layer.id.includes('road-number') ||
              layer.id.includes('road-shield') ||
              layer.id.includes('ferry') ||
              layer.id.includes('motorway-junction')) {
            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }

        // ✅ Removed: Let Mapbox use default land colors (natural brown/green)
        // We'll add custom gray overlay for non-Indonesia countries instead

        // 3. Hide international borders (to reduce visual clutter)
        if (layer.id.includes('admin') &&
            (layer.id.includes('0') || layer.id.includes('country'))) {
          try {
            map.current.setLayoutProperty(layer.id, 'visibility', 'none');
          } catch (e) {
            // Layer might not exist
          }
        }
      });

      // Find the position to insert our layers (before symbol labels)
      let firstSymbolId;
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }

      // 🌍 Load world countries (exclude Indonesia) - simplified for performance
      fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch world countries');
          }
          return response.json();
        })
        .then(geojsonData => {
          // Filter out Indonesia
          const filteredData = {
            ...geojsonData,
            features: geojsonData.features.filter(feature => {
              const iso = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || '';
              const name = feature.properties.NAME || feature.properties.ADMIN || '';
              return iso !== 'IDN' && name !== 'Indonesia';
            })
          };

          // Add source for world countries (without Indonesia)
          map.current.addSource('world-countries-gray', {
            type: 'geojson',
            data: filteredData
          });

          // Add gray fill layer for world countries
          map.current.addLayer({
            id: 'world-countries-gray-fill',
            type: 'fill',
            source: 'world-countries-gray',
            paint: {
              'fill-color': '#E5E7EB',
              'fill-opacity': 0.9
            }
          }, firstSymbolId);

          // Add outline for world countries
          map.current.addLayer({
            id: 'world-countries-gray-outline',
            type: 'line',
            source: 'world-countries-gray',
            paint: {
              'line-color': '#9CA3AF',
              'line-width': 1,
              'line-opacity': 0.5
            }
          }, firstSymbolId);
        })
        .catch(err => {
          console.error('❌ Failed to load world countries:', err);
        });

      // 🇮🇩 Load ALL Indonesian provinces (simplified, lightweight)
      // This creates gray background for all land areas
      // Then our target provinces (Aceh, Sumut, Sumbar) will render in color on top
      fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province-simple.json')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch provinces');
          }
          return response.json();
        })
        .then(geojsonData => {
          // 🎯 FILTER: Exclude Aceh, Sumut & Sumbar karena sudah ada di backend database
          // GeoJSON publik ini hanya untuk background abu-abu provinsi lain
          const filteredData = {
            ...geojsonData,
            features: geojsonData.features.filter(feature => {
              const provinsi = feature.properties.Propinsi || feature.properties.PROVINSI ||
                               feature.properties.name || feature.properties.Nama || '';

              // Exclude provinsi Aceh, Sumut, Sumbar (dengan berbagai kemungkinan nama)
              const excludedProvinces = [
                'DI. ACEH',  // ← Nama sebenarnya di GeoJSON (DENGAN TITIK!)
                'ACEH', 'Aceh', 'NANGGROE ACEH DARUSSALAM', 'Nanggroe Aceh Darussalam',
                'NAD', 'DAERAH ISTIMEWA ACEH', 'DI ACEH',
                'SUMATERA UTARA', 'Sumatera Utara', 'SUMATRA UTARA', 'Sumatra Utara',
                'SUMATERA BARAT', 'Sumatera Barat', 'SUMATRA BARAT', 'Sumatra Barat'
              ];

              return !excludedProvinces.includes(provinsi);
            })
          };

          // Add source dengan data yang sudah di-filter (tanpa Aceh, Sumut & Sumbar)
          map.current.addSource('all-provinces-gray', {
            type: 'geojson',
            data: filteredData
          });

          // Add gray fill layer for ALL provinces
          // IMPORTANT: Must be inserted BEFORE 'boundaries-fill' so colored provinces appear on top
          const beforeLayer = map.current.getLayer('boundaries-fill') ? 'boundaries-fill' : firstSymbolId;

          // Layer stack order (bottom to top):
          // 1. Mapbox default (land + roads) - natural colors
          // 2. world-countries-gray-fill (gray overlay for all countries except Indonesia)
          //    ↑ Loaded AFTER Indonesia but inserted BEFORE = covers roads globally
          // 3. all-provinces-gray-fill (gray for Indonesian provinces except Aceh/Sumut/Sumbar)
          //    ↑ Covers roads in Indonesia
          // 4. boundaries-fill (colored Aceh/Sumut/Sumbar provinces - top layer)
          map.current.addLayer({
            id: 'all-provinces-gray-fill',
            type: 'fill',
            source: 'all-provinces-gray',
            paint: {
              'fill-color': '#E5E7EB', // Abu-abu terang untuk provinsi Indonesia lain
              'fill-opacity': 0.9      // Solid tapi tidak 100% agar tetap terlihat topografi
            }
          }, beforeLayer); // Insert BEFORE colored provinces layer

          // Add outline untuk provinsi Indonesia lainnya
          map.current.addLayer({
            id: 'all-provinces-gray-outline',
            type: 'line',
            source: 'all-provinces-gray',
            paint: {
              'line-color': '#9CA3AF',
              'line-width': 1,
              'line-opacity': 0.5
            }
          }, beforeLayer);
        })
        .catch(err => {
          console.error('❌ Failed to load gray background:', err);

          // Fallback: Try alternative source
          fetch('https://raw.githubusercontent.com/ans-4175/peta-indonesia-geojson/master/indonesia-prov.geojson')
            .then(response => response.json())
            .then(geojsonData => {
              // 🎯 FILTER di fallback source juga - exclude Aceh, Sumut, Sumbar
              const filteredData = {
                ...geojsonData,
                features: geojsonData.features.filter(feature => {
                  // Fallback source mungkin punya field berbeda, coba beberapa kemungkinan
                  const provinsi = feature.properties.Propinsi || feature.properties.PROVINSI ||
                                   feature.properties.name || feature.properties.Nama || '';

                  // Exclude provinsi Aceh, Sumut, Sumbar (dengan berbagai kemungkinan nama)
                  const excludedProvinces = [
                    'DI. ACEH',  // ← Nama sebenarnya di GeoJSON (DENGAN TITIK!)
                    'ACEH', 'Aceh', 'NANGGROE ACEH DARUSSALAM', 'Nanggroe Aceh Darussalam',
                    'NAD', 'DAERAH ISTIMEWA ACEH', 'DI ACEH',
                    'SUMATERA UTARA', 'Sumatera Utara', 'SUMATRA UTARA', 'Sumatra Utara',
                    'SUMATERA BARAT', 'Sumatera Barat', 'SUMATRA BARAT', 'Sumatra Barat'
                  ];

                  return !excludedProvinces.includes(provinsi);
                })
              };

              map.current.addSource('all-provinces-gray', {
                type: 'geojson',
                data: filteredData
              });

              const beforeLayer = map.current.getLayer('boundaries-fill') ? 'boundaries-fill' : firstSymbolId;

              map.current.addLayer({
                id: 'all-provinces-gray-fill',
                type: 'fill',
                source: 'all-provinces-gray',
                paint: {
                  'fill-color': '#E5E7EB',
                  'fill-opacity': 0.9
                }
              }, beforeLayer);

              map.current.addLayer({
                id: 'all-provinces-gray-outline',
                type: 'line',
                source: 'all-provinces-gray',
                paint: {
                  'line-color': '#9CA3AF',
                  'line-width': 1,
                  'line-opacity': 0.5
                }
              }, beforeLayer);
            })
            .catch(err2 => {
              console.error('❌ All sources failed:', err2);
            });
        })
        .catch(err => {
          console.error('❌ Failed to load gray background:', err);

          // Fallback: Try alternative source
          fetch('https://raw.githubusercontent.com/ans-4175/peta-indonesia-geojson/master/indonesia-prov.geojson')
            .then(response => response.json())
            .then(geojsonData => {
              const filteredData = {
                ...geojsonData,
                features: geojsonData.features.filter(feature => {
                  const provinsi = feature.properties.Propinsi || feature.properties.PROVINSI ||
                                   feature.properties.name || feature.properties.Nama || '';
                  const excludedProvinces = [
                    'DI. ACEH',
                    'ACEH', 'Aceh', 'NANGGROE ACEH DARUSSALAM', 'Nanggroe Aceh Darussalam',
                    'NAD', 'DAERAH ISTIMEWA ACEH', 'DI ACEH',
                    'SUMATERA UTARA', 'Sumatera Utara', 'SUMATRA UTARA', 'Sumatra Utara',
                    'SUMATERA BARAT', 'Sumatera Barat', 'SUMATRA BARAT', 'Sumatra Barat'
                  ];
                  return !excludedProvinces.includes(provinsi);
                })
              };

              map.current.addSource('all-provinces-gray', {
                type: 'geojson',
                data: filteredData
              });

              const beforeLayer = map.current.getLayer('boundaries-fill') ? 'boundaries-fill' : firstSymbolId;

              map.current.addLayer({
                id: 'all-provinces-gray-fill',
                type: 'fill',
                source: 'all-provinces-gray',
                paint: {
                  'fill-color': '#E5E7EB',
                  'fill-opacity': 0.9
                }
              }, beforeLayer);

              map.current.addLayer({
                id: 'all-provinces-gray-outline',
                type: 'line',
                source: 'all-provinces-gray',
                paint: {
                  'line-color': '#9CA3AF',
                  'line-width': 1,
                  'line-opacity': 0.5
                }
              }, beforeLayer);
            })
            .catch(err2 => {
              console.error('❌ All sources failed:', err2);
            });
        });

      // Add empty source for boundaries (will be populated dynamically)
      map.current.addSource('boundaries', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // 🏷️ Add custom labels source (same data as boundaries, but for text)
      map.current.addSource('region-labels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add fill layer for boundaries
      // Color based on province, opacity based on admin level
      map.current.addLayer({
        id: 'boundaries-fill',
        type: 'fill',
        source: 'boundaries',
        paint: {
          'fill-color': [
            'match',
            ['get', 'namaProvinsi'],
            'ACEH', '#3B82F6',                    // 🔵 Biru untuk Aceh
            'SUMATERA UTARA', '#EF4444',         // 🔴 Merah untuk Sumut
            'SUMATRA UTARA', '#EF4444',          // 🔴 Merah untuk Sumut (alternative spelling)
            'SUMATERA BARAT', '#EAB308',         // 🟡 Kuning untuk Sumbar
            'SUMATRA BARAT', '#EAB308',          // 🟡 Kuning untuk Sumbar (alternative spelling)
            '#94A3B8'  // Default abu-abu untuk provinsi lain
          ],
          'fill-opacity': [
            'match',
            ['get', 'adminLevel'],
            'provinsi', 0.4,      // Lebih tebal untuk provinsi
            'kabupaten', 0.3,     // Medium untuk kabupaten
            'kecamatan', 0.2,     // Lebih tipis untuk kecamatan
            0.2
          ],
          // Smooth transition for opacity changes
          'fill-opacity-transition': {
            duration: 500,
            delay: 0
          }
        }
      });

      // Add outline layer for boundaries
      // Border color based on province (darker shade), width based on admin level
      map.current.addLayer({
        id: 'boundaries-outline',
        type: 'line',
        source: 'boundaries',
        paint: {
          'line-color': [
            'match',
            ['get', 'namaProvinsi'],
            'ACEH', '#1D4ED8',                    // 🔵 Biru gelap untuk Aceh
            'SUMATERA UTARA', '#DC2626',         // 🔴 Merah gelap untuk Sumut
            'SUMATRA UTARA', '#DC2626',          // 🔴 Merah gelap untuk Sumut (alternative spelling)
            'SUMATERA BARAT', '#CA8A04',         // 🟡 Kuning gelap untuk Sumbar
            'SUMATRA BARAT', '#CA8A04',          // 🟡 Kuning gelap untuk Sumbar (alternative spelling)
            '#64748B'  // Default abu-abu gelap untuk provinsi lain
          ],
          'line-width': [
            'match',
            ['get', 'adminLevel'],
            'provinsi', 3,       // Lebih tebal untuk provinsi
            'kabupaten', 2,      // Medium untuk kabupaten
            'kecamatan', 1.5,    // Tipis untuk kecamatan
            1
          ],
          'line-opacity': 0.8,
          // Smooth transition for line properties
          'line-opacity-transition': {
            duration: 500,
            delay: 0
          }
        }
      });

      // 🏷️ Add custom text labels layer (LOD based on zoom)
      // Setiap feature hanya menampilkan label sesuai adminLevel-nya
      map.current.addLayer({
        id: 'region-labels',
        type: 'symbol',
        source: 'region-labels',
        layout: {
          'visibility': 'visible',
          'text-field': [
            'case',
            // Provinsi - try camelCase first, then snake_case
            ['any',
              ['==', ['get', 'adminLevel'], 'provinsi'],
              ['==', ['get', 'admin_level'], 'provinsi']
            ],
            ['coalesce', ['get', 'namaProvinsi'], ['get', 'nama_provinsi'], ''],
            // Kabupaten
            ['any',
              ['==', ['get', 'adminLevel'], 'kabupaten'],
              ['==', ['get', 'admin_level'], 'kabupaten']
            ],
            ['coalesce', ['get', 'namaKabupaten'], ['get', 'nama_kabupaten'], ''],
            // Kecamatan
            ['any',
              ['==', ['get', 'adminLevel'], 'kecamatan'],
              ['==', ['get', 'admin_level'], 'kecamatan']
            ],
            ['coalesce', ['get', 'namaKecamatan'], ['get', 'nama_kecamatan'], ''],
            '' // fallback
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 16,  // Temporary: fixed size for debugging
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.05,
          'text-max-width': 8,
          'text-anchor': 'center',
          // Disable overlap - karena sudah deduplicated, tidak perlu overlap
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'symbol-placement': 'point',
          // Zoom-based spacing - lebih ketat di zoom tinggi
          'symbol-spacing': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 250,  // Zoom jauh: spacing kecil (250px)
            7, 400,  // Medium
            10, 800  // Zoom dekat: spacing besar (800px)
          ],
          // Zoom-based padding - lebih kecil karena sudah deduplicated
          'text-padding': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 10,   // Zoom jauh (provinsi): padding sangat kecil
            7, 30,   // Medium (kabupaten)
            10, 50   // Zoom dekat (kecamatan): padding sedang
          ],
          'text-optional': false,
          'symbol-avoid-edges': true
        },
        paint: {
          'text-color': [
            'match',
            ['coalesce', ['get', 'namaProvinsi'], ['get', 'nama_provinsi'], ''],
            'ACEH', '#1E3A8A',           // Biru gelap untuk Aceh
            'SUMATERA UTARA', '#991B1B', // Merah gelap untuk Sumut
            'SUMATRA UTARA', '#991B1B',
            'SUMATERA BARAT', '#92400E', // Coklat gelap untuk Sumbar
            'SUMATRA BARAT', '#92400E',
            '#1F2937' // Default hitam untuk lainnya
          ],
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
          'text-halo-blur': 1,
          'text-opacity': 1  // Temporary: set to 1 for debugging
        }
      });

      // Add hover effect
      map.current.on('mouseenter', 'boundaries-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'boundaries-fill', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // Add click handler for boundaries - show popup AND trigger statistics panel
      map.current.on('click', 'boundaries-fill', (e) => {
        const properties = e.features[0].properties;

        // Show popup with region info
        let html = '<div class="p-2">';

        // Different content based on admin level
        const adminLevel = properties.admin_level || properties.adminLevel;
        const namaProvinsi = properties.nama_provinsi || properties.namaProvinsi;
        const namaKabupaten = properties.nama_kabupaten || properties.namaKabupaten;
        const namaKecamatan = properties.nama_kecamatan || properties.namaKecamatan;

        if (adminLevel === 'provinsi') {
          html += `<h3 class="font-bold text-sm mb-1">${namaProvinsi || 'Provinsi'}</h3>`;
          html += `<p class="text-xs text-gray-600">Tingkat: Provinsi</p>`;
        } else if (adminLevel === 'kabupaten') {
          html += `<h3 class="font-bold text-sm mb-1">${namaKabupaten || 'Kabupaten'}</h3>`;
          html += `<p class="text-xs text-gray-600">Provinsi: ${namaProvinsi}</p>`;
          html += `<p class="text-xs text-gray-600">Tingkat: Kabupaten/Kota</p>`;
        } else if (adminLevel === 'kecamatan') {
          html += `<h3 class="font-bold text-sm mb-1">${namaKecamatan || 'Kecamatan'}</h3>`;
          html += `<p class="text-xs text-gray-600">Kabupaten: ${namaKabupaten}</p>`;
          html += `<p class="text-xs text-gray-600">Provinsi: ${namaProvinsi}</p>`;
          html += `<p class="text-xs text-gray-600">Tingkat: Kecamatan</p>`;
        }

        // Add population data if available
        if (properties.jumlah_penduduk) {
          html += `<p class="text-xs text-gray-700 mt-2">Populasi: ${properties.jumlah_penduduk.toLocaleString()}</p>`;
        }
        if (properties.jumlah_kk) {
          html += `<p class="text-xs text-gray-700">KK: ${properties.jumlah_kk.toLocaleString()}</p>`;
        }

        html += '</div>';

        new mapboxgl.Popup({
          closeButton: false,  // Remove close button
          closeOnClick: true,  // Close when clicking elsewhere
          offset: 25
        })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map.current);

        // ALSO trigger callback to show statistics panel in App
        if (onRegionClick) {
          onRegionClick({
            adminLevel: adminLevel,
            namaProvinsi: namaProvinsi,
            namaKabupaten: namaKabupaten,
            namaKecamatan: namaKecamatan,
            kodeProvinsi: properties.kode_provinsi || properties.kodeProvinsi,
            kodeKabupaten: properties.kode_kabupaten || properties.kodeKabupaten,
            kodeKecamatan: properties.kode_kecamatan || properties.kodeKecamatan
          });
        }
      });

      // Track zoom changes for dynamic LOD with debouncing
      let zoomTimeout;
      map.current.on('zoom', () => {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
          const zoom = Math.round(map.current.getZoom());
          setCurrentZoom(zoom);
        }, 300); // Debounce 300ms untuk menghindari reload terlalu sering
      });

      // Initial load
      setMapLoaded(true);
      setCurrentZoom(Math.round(map.current.getZoom()));
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

  // Helper function: Calculate centroid of a polygon
  const calculateCentroid = (geometry) => {
    let coordinates = [];

    if (geometry.type === 'Polygon') {
      coordinates = geometry.coordinates[0]; // Outer ring
    } else if (geometry.type === 'MultiPolygon') {
      // Get the largest polygon by area
      let largestPolygon = geometry.coordinates[0][0];
      let maxArea = 0;

      geometry.coordinates.forEach(polygon => {
        const ring = polygon[0];
        const area = Math.abs(ring.reduce((sum, coord, i, arr) => {
          const next = arr[(i + 1) % arr.length];
          return sum + (coord[0] * next[1] - next[0] * coord[1]);
        }, 0) / 2);

        if (area > maxArea) {
          maxArea = area;
          largestPolygon = ring;
        }
      });

      coordinates = largestPolygon;
    }

    // Calculate centroid
    const n = coordinates.length;
    let sumX = 0, sumY = 0;

    coordinates.forEach(coord => {
      sumX += coord[0];
      sumY += coord[1];
    });

    return [sumX / n, sumY / n];
  };

  // Helper function: Deduplicate labels by grouping features with same name
  const deduplicateLabels = (geojson) => {
    const labelsByRegion = {};

    geojson.features.forEach(feature => {
      const { adminLevel, namaProvinsi, namaKabupaten, namaKecamatan } = feature.properties;

      // Create unique key based on admin level
      let key;
      if (adminLevel === 'provinsi') {
        key = `provinsi-${namaProvinsi}`;
      } else if (adminLevel === 'kabupaten') {
        key = `kabupaten-${namaProvinsi}-${namaKabupaten}`;
      } else if (adminLevel === 'kecamatan') {
        key = `kecamatan-${namaProvinsi}-${namaKabupaten}-${namaKecamatan}`;
      }

      if (!key) return;

      // If this region doesn't have a label yet, or this polygon is larger
      if (!labelsByRegion[key]) {
        const centroid = calculateCentroid(feature.geometry);

        labelsByRegion[key] = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: centroid
          },
          properties: feature.properties
        };
      }
    });

    return {
      type: 'FeatureCollection',
      features: Object.values(labelsByRegion)
    };
  };

  // Load boundaries dynamically based on zoom level with smooth transition
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    // Prevent concurrent loading
    if (isLoadingBoundaries.current) return;

    const loadBoundaries = async () => {
      isLoadingBoundaries.current = true;

      try {
        // Smooth fade out before loading new data
        map.current.setPaintProperty('boundaries-fill', 'fill-opacity', [
          'match',
          ['get', 'adminLevel'],
          'provinsi', 0,
          'kabupaten', 0,
          'kecamatan', 0,
          0
        ]);
        map.current.setPaintProperty('boundaries-outline', 'line-opacity', 0);

        // Wait for fade out animation
        await new Promise(resolve => setTimeout(resolve, 300));

        const response = await fetch(`http://localhost:5000/api/boundaries?zoom=${currentZoom}`);
        const result = await response.json();

        if (result.success && result.data) {
          const source = map.current.getSource('boundaries');
          const labelSource = map.current.getSource('region-labels');

          if (source) {
            source.setData(result.data);

            // 🏷️ Deduplicate labels - satu label per region
            if (labelSource) {
              const deduplicatedLabels = deduplicateLabels(result.data);
              console.log('📍 Deduplicated labels:', deduplicatedLabels.features.length, 'labels from', result.data.features.length, 'features');
              console.log('📍 Label features:', deduplicatedLabels.features);
              labelSource.setData(deduplicatedLabels);
            }

            // Fade in with new data
            await new Promise(resolve => setTimeout(resolve, 100));
            map.current.setPaintProperty('boundaries-fill', 'fill-opacity', [
              'match',
              ['get', 'adminLevel'],
              'provinsi', 0.4,
              'kabupaten', 0.3,
              'kecamatan', 0.2,
              0.2
            ]);
            map.current.setPaintProperty('boundaries-outline', 'line-opacity', 0.8);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load boundaries:', error);
        // Restore opacity on error
        map.current.setPaintProperty('boundaries-fill', 'fill-opacity', [
          'match',
          ['get', 'adminLevel'],
          'provinsi', 0.4,
          'kabupaten', 0.3,
          'kecamatan', 0.2,
          0.2
        ]);
        map.current.setPaintProperty('boundaries-outline', 'line-opacity', 0.8);
      } finally {
        isLoadingBoundaries.current = false;
      }
    };

    loadBoundaries();
  }, [currentZoom, mapLoaded]);

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

    // Fit map to markers if there are any, but stay within Sumatra bounds
    if (reports.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      reports.forEach(report => {
        bounds.extend(report.location.coordinates);
      });
      // Fit with constraints: padding, max zoom, dan pastikan tidak keluar dari Sumatra
      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 10, // Jangan zoom terlalu dekat
        duration: 1000 // Smooth animation
      });
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
