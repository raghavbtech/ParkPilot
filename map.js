/**
 * ParkPilot — Parking Network View & Geospatial Visualization
 * Pure Vanilla HTML/CSS/SVG implementation replacing external Leaflet library.
 * Visualizes user GPS location, parking lot nodes, distances (Haversine),
 * live capacity, and recommended facility with zero external dependencies.
 */

let networkMapState = {
  container: null,
  userCoords: { lat: 12.9346, lng: 77.6149 },
  selectedLotId: 'LOT-01',
  onLotSelect: null,
  lots: new Map(),
  zoomScale: 1.0
};

/**
 * Initializes the native Parking Network View.
 */
function initMap(initialCoords, onLotSelect) {
  if (initialCoords && initialCoords.lat && initialCoords.lng) {
    networkMapState.userCoords = { lat: initialCoords.lat, lng: initialCoords.lng };
  }
  if (typeof onLotSelect === 'function') {
    networkMapState.onLotSelect = onLotSelect;
  }

  const container = document.getElementById('mapContainer') ||
                    document.getElementById('leafletMap') ||
                    document.getElementById('cityMapFull');

  networkMapState.container = container;

  if (container) {
    renderParkingNetworkView();
  }

  return {
    setView: (coords) => {
      if (coords && coords[0] && coords[1]) {
        networkMapState.userCoords = { lat: coords[0], lng: coords[1] };
        renderParkingNetworkView();
      }
    },
    flyTo: (coords) => {
      if (coords && coords[0] && coords[1]) {
        networkMapState.userCoords = { lat: coords[0], lng: coords[1] };
        renderParkingNetworkView();
      }
    }
  };
}

/**
 * Updates or sets the user's location pulsing cyan marker.
 */
function setUserMarker(lat, lng, label = "Your Location") {
  networkMapState.userCoords = { lat, lng };
  renderParkingNetworkView();
}

/**
 * Creates custom HTML div icon representation for a parking lot.
 */
function createLotMarkerIcon(lot, isSelected = false) {
  const status = lot && typeof lot.getStatus === 'function' ? lot.getStatus() : 'open';
  const freeSlots = lot && typeof lot.getAvailableSlotsCount === 'function' ? lot.getAvailableSlotsCount() : 0;
  const occRate = lot && typeof lot.occupancyRate === 'function' ? lot.occupancyRate() : 0;

  return {
    status,
    freeSlots,
    occRate,
    isSelected
  };
}

/**
 * Refreshes all parking lot markers on the network view.
 */
function syncMapMarkers(lotsMap, selectedLotId, onLotSelect) {
  if (lotsMap) networkMapState.lots = lotsMap;
  if (selectedLotId) networkMapState.selectedLotId = selectedLotId;
  if (onLotSelect) networkMapState.onLotSelect = onLotSelect;

  renderParkingNetworkView();
}

/**
 * Smoothly centers / focuses onto a specific parking facility.
 */
function focusLotOnMap(lotId, lotsMap) {
  if (lotsMap) networkMapState.lots = lotsMap;
  networkMapState.selectedLotId = lotId;
  renderParkingNetworkView();

  const card = document.getElementById(`networkLotCard_${lotId}`);
  if (card) {
    if (typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (card.classList && typeof card.classList.add === 'function') {
      card.classList.add('pulse-highlight');
      setTimeout(() => {
        if (card.classList && typeof card.classList.remove === 'function') {
          card.classList.remove('pulse-highlight');
        }
      }, 1500);
    }
  }
}

/**
 * Renders the full native HTML/CSS/SVG Parking Network View into the container.
 */
function renderParkingNetworkView() {
  const container = networkMapState.container ||
                    document.getElementById('mapContainer') ||
                    document.getElementById('leafletMap') ||
                    document.getElementById('cityMapFull');

  if (!container) return;

  const lotsMap = networkMapState.lots && networkMapState.lots.size > 0
    ? networkMapState.lots
    : (typeof appState !== 'undefined' && appState.lots ? appState.lots : new Map());

  const userLat = networkMapState.userCoords.lat;
  const userLng = networkMapState.userCoords.lng;
  const selectedLotId = networkMapState.selectedLotId || (typeof appState !== 'undefined' ? appState.selectedLotId : 'LOT-01');

  // Convert lots to list with distance calculation
  const lotsList = Array.from(lotsMap.values()).map(lot => {
    const dist = typeof haversineDistance === 'function'
      ? haversineDistance(userLat, userLng, lot.lat, lot.lng)
      : 1.0;
    return {
      lot,
      distance: dist,
      isSelected: lot.id === selectedLotId,
      freeSlots: typeof lot.getAvailableSlotsCount === 'function' ? lot.getAvailableSlotsCount() : 0,
      totalSlots: typeof lot.getTotalSlotsCount === 'function' ? lot.getTotalSlotsCount() : 30,
      occRate: typeof lot.occupancyRate === 'function' ? lot.occupancyRate() : 0,
      status: typeof lot.getStatus === 'function' ? lot.getStatus() : 'open'
    };
  });

  // Sort by distance to find recommended (closest with availability)
  lotsList.sort((a, b) => a.distance - b.distance);
  const recommendedLotId = lotsList.find(item => item.freeSlots > 0)?.lot.id || (lotsList[0]?.lot.id);

  // SVG Radar center & dynamic distance-adapted scale
  const radarW = 600;
  const radarH = 340;
  const centerX = radarW / 2;
  const centerY = radarH / 2;

  // Dynamically compute the maximum distance among all lots to fit all facilities nicely
  const distances = lotsList.map(item => item.distance);
  const maxDistanceKm = distances.length > 0 ? Math.max(...distances, 3.0) : 4.0;
  const visibleRadiusKm = Math.max(4.0, maxDistanceKm * 1.15); // 15% padding so nodes aren't clamped
  const maxAvailableRadiusPx = Math.min(centerX - 42, centerY - 42);
  const scalePxPerKm = maxAvailableRadiusPx / visibleRadiusKm;

  // Generate SVG nodes for lots
  const nodesSvg = lotsList.map(item => {
    // Relative coordinates
    const dLat = item.lot.lat - userLat;
    const dLng = item.lot.lng - userLng;
    // 1 deg lat ≈ 111 km, 1 deg lng ≈ 111 * cos(avgLat) ≈ 108 km
    const dxKm = dLng * 108;
    const dyKm = -dLat * 111; // Invert Y for screen coordinates

    let x = centerX + dxKm * scalePxPerKm;
    let y = centerY + dyKm * scalePxPerKm;

    // Constrain inside radar boundaries
    x = Math.max(38, Math.min(radarW - 38, x));
    y = Math.max(38, Math.min(radarH - 38, y));

    const isRec = item.lot.id === recommendedLotId;
    const isSel = item.lot.id === selectedLotId;
    const color = item.status === 'full' ? '#ef8c91' : (item.status === 'filling' ? '#ffb020' : '#a3e635');
    const code = item.lot.name ? item.lot.name.split(' ').map(w => w[0]).join('').slice(0, 3) : 'PK';

    return `
      <g class="network-svg-lot-node ${isSel ? 'selected' : ''}" style="cursor:pointer;"
         onclick="window.selectLot('${item.lot.id}')" data-lot-id="${item.lot.id}">
        <!-- Connecting Line to User -->
        <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}"
              stroke="${isSel ? 'var(--cyan, #6ce3d3)' : 'rgba(108,227,211,0.18)'}"
              stroke-width="${isSel ? '2' : '1'}" stroke-dasharray="${isSel ? 'none' : '3,3'}" />

        <!-- Node Halo -->
        <circle cx="${x}" cy="${y}" r="${isSel ? 22 : 17}" fill="${color}" fill-opacity="${isSel ? '0.35' : '0.15'}"
                stroke="${color}" stroke-width="${isSel ? 2.5 : 1.5}">
          ${isSel ? '<animate attributeName="r" values="19;24;19" dur="2s" repeatCount="indefinite"/>' : ''}
        </circle>

        <!-- Node Core -->
        <circle cx="${x}" cy="${y}" r="${isSel ? 13 : 11}" fill="#0b1714" stroke="${color}" stroke-width="2" />
        <text x="${x}" y="${y + 3.5}" font-family="var(--mono, monospace)" font-size="${isSel ? 9.5 : 8.5}" font-weight="900"
              text-anchor="middle" fill="#dff8eb">${code}</text>

        <!-- Distance & Name Label -->
        <rect x="${x - 42}" y="${y + (y > centerY ? 16 : -28)}" width="84" height="16" rx="4"
              fill="rgba(11,23,20,0.88)" stroke="${isSel ? 'var(--cyan, #6ce3d3)' : 'rgba(255,255,255,0.12)'}" stroke-width="1" />
        <text x="${x}" y="${y + (y > centerY ? 27.5 : -16.5)}" font-family="var(--body, sans-serif)" font-size="8.5" font-weight="700"
              text-anchor="middle" fill="#dff8eb">${item.distance.toFixed(1)} km · ${item.freeSlots} free</text>

        ${isRec ? `
          <!-- Recommended Badge -->
          <circle cx="${x + 11}" cy="${y - 11}" r="6" fill="#facc15" stroke="#0b1714" stroke-width="1.5" />
          <text x="${x + 11}" y="${y - 8.5}" font-size="8" text-anchor="middle" fill="#000">★</text>
        ` : ''}
      </g>
    `;
  }).join('');

  const ring1Km = (visibleRadiusKm * 0.33).toFixed(1);
  const ring2Km = (visibleRadiusKm * 0.66).toFixed(1);
  const ring3Km = (visibleRadiusKm * 0.95).toFixed(1);

  const r1 = Math.round(maxAvailableRadiusPx * 0.33);
  const r2 = Math.round(maxAvailableRadiusPx * 0.66);
  const r3 = Math.round(maxAvailableRadiusPx * 0.95);

  container.innerHTML = `
    <div class="ps-network-view-wrapper" style="display:flex;flex-direction:column;height:100%;background:linear-gradient(180deg, #0d1a16 0%, #08110f 100%);color:#dff8eb;font-family:var(--body, sans-serif);position:relative;overflow:hidden;">
      <!-- Header Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-bottom:1px solid rgba(108,227,211,0.12);background:rgba(11,23,20,0.85);backdrop-filter:blur(8px);z-index:10;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--lime, #a3e635);box-shadow:0 0 8px #a3e635;"></span>
          <span style="font-size:12px;font-weight:800;letter-spacing:0.06em;color:var(--cyan, #6ce3d3);">PARKING NETWORK RADAR</span>
          <span style="font-size:10.5px;color:rgba(223,248,235,0.6);font-family:var(--mono, monospace);">${Math.ceil(visibleRadiusKm)} KM COVERAGE</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-size:11px;color:rgba(223,248,235,0.7);font-family:var(--mono, monospace);">GPS: ${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E</span>
          <button onclick="window.resolveUserLocation()" style="background:rgba(108,227,211,0.15);border:1px solid rgba(108,227,211,0.3);color:var(--cyan, #6ce3d3);font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;">
            📍 Live GPS
          </button>
        </div>
      </div>

      <!-- Main Visual Radar Canvas -->
      <div style="position:relative;flex:1;min-height:300px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <svg viewBox="0 0 ${radarW} ${radarH}" style="width:100%;height:100%;display:block;" preserveAspectRatio="xMidYMid meet">
          <!-- Background Grid & Coordinate Lines -->
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(108,227,211,0.08)" />
              <stop offset="100%" stop-color="rgba(108,227,211,0)" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#radarGlow)" />

          <!-- Concentric Distance Range Rings -->
          <circle cx="${centerX}" cy="${centerY}" r="${r1}" fill="none" stroke="rgba(108,227,211,0.12)" stroke-width="1" />
          <circle cx="${centerX}" cy="${centerY}" r="${r2}" fill="none" stroke="rgba(108,227,211,0.12)" stroke-width="1" />
          <circle cx="${centerX}" cy="${centerY}" r="${r3}" fill="none" stroke="rgba(108,227,211,0.18)" stroke-width="1.2" stroke-dasharray="4,4" />

          <!-- Distance Ring Labels -->
          <text x="${centerX + r1 + 3}" y="${centerY - 4}" font-size="8" font-family="var(--mono, monospace)" fill="rgba(108,227,211,0.5)">${ring1Km} KM</text>
          <text x="${centerX + r2 + 3}" y="${centerY - 4}" font-size="8" font-family="var(--mono, monospace)" fill="rgba(108,227,211,0.5)">${ring2Km} KM</text>
          <text x="${centerX + r3 + 3}" y="${centerY - 4}" font-size="8" font-family="var(--mono, monospace)" fill="rgba(108,227,211,0.5)">${ring3Km} KM</text>

          <!-- Crosshairs -->
          <line x1="20" y1="${centerY}" x2="${radarW - 20}" y2="${centerY}" stroke="rgba(108,227,211,0.08)" stroke-width="1" />
          <line x1="${centerX}" y1="20" x2="${centerX}" y2="${radarH - 20}" stroke="rgba(108,227,211,0.08)" stroke-width="1" />

          <!-- Cardinal Direction Compass -->
          <text x="${centerX}" y="22" font-size="9" font-family="var(--mono, monospace)" font-weight="800" text-anchor="middle" fill="rgba(108,227,211,0.5)">N</text>
          <text x="${centerX}" y="${radarH - 10}" font-size="9" font-family="var(--mono, monospace)" font-weight="800" text-anchor="middle" fill="rgba(108,227,211,0.5)">S</text>
          <text x="${radarW - 14}" y="${centerY + 3}" font-size="9" font-family="var(--mono, monospace)" font-weight="800" text-anchor="middle" fill="rgba(108,227,211,0.5)">E</text>
          <text x="14" y="${centerY + 3}" font-size="9" font-family="var(--mono, monospace)" font-weight="800" text-anchor="middle" fill="rgba(108,227,211,0.5)">W</text>

          <!-- Parking Lot Nodes -->
          ${nodesSvg}

          <!-- Center User GPS Beacon -->
          <g>
            <circle cx="${centerX}" cy="${centerY}" r="18" fill="var(--cyan, #6ce3d3)" fill-opacity="0.18">
              <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.25;0.05;0.25" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="${centerX}" cy="${centerY}" r="7" fill="var(--cyan, #6ce3d3)" stroke="#0b1714" stroke-width="2" />
            <text x="${centerX}" y="${centerY - 12}" font-family="var(--mono, monospace)" font-size="8.5" font-weight="900"
                  text-anchor="middle" fill="var(--cyan, #6ce3d3)">YOU (LIVE GPS)</text>
          </g>
        </svg>

        <!-- Floating Legend & Info Box -->
        <div style="position:absolute;top:10px;left:14px;background:rgba(11,23,20,0.85);backdrop-filter:blur(6px);border:1px solid rgba(108,227,211,0.18);border-radius:8px;padding:8px 12px;font-size:10px;display:flex;flex-direction:column;gap:5px;pointer-events:none;">
          <div style="font-weight:800;color:var(--cyan, #6ce3d3);margin-bottom:2px;">RADAR NAVIGATION</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:#a3e635;"></span> Open (&lt;70% Occ)</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:#ffb020;"></span> Filling (70-99%)</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:#ef8c91;"></span> Full (100%)</div>
          <div style="display:flex;align-items:center;gap:6px;"><span style="color:#facc15;font-weight:900;">★</span> Recommended Lot</div>
        </div>
      </div>

      <!-- Bottom Facilities Quick Carousel / Deck -->
      <div style="border-top:1px solid rgba(108,227,211,0.12);background:rgba(9,19,16,0.92);padding:10px 14px;display:flex;gap:10px;overflow-x:auto;z-index:10;">
        ${lotsList.map(item => {
          const isRec = item.lot.id === recommendedLotId;
          const isSel = item.lot.id === selectedLotId;
          const color = item.status === 'full' ? '#ef8c91' : (item.status === 'filling' ? '#ffb020' : '#a3e635');
          return `
            <div id="networkLotCard_${item.lot.id}"
                 onclick="window.selectLot('${item.lot.id}')"
                 style="flex:0 0 210px;background:${isSel ? 'rgba(108,227,211,0.1)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isSel ? 'var(--cyan, #6ce3d3)' : 'rgba(255,255,255,0.1)'};border-radius:8px;padding:9px 12px;cursor:pointer;transition:all 0.2s ease;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="font-size:12px;color:#dff8eb;">${item.lot.name}</strong>
                ${isRec ? '<span style="font-size:9px;font-weight:800;background:rgba(250,204,21,0.2);color:#facc15;border:1px solid #facc15;padding:1px 5px;border-radius:4px;">BEST FIT</span>' : ''}
              </div>
              <div style="font-size:10.5px;color:rgba(223,248,235,0.65);margin-bottom:6px;display:flex;justify-content:space-between;">
                <span>📍 ${item.distance.toFixed(2)} km</span>
                <span style="color:${color};font-weight:700;">${item.freeSlots} / ${item.totalSlots} Free</span>
              </div>
              <!-- Progress Bar -->
              <div style="width:100%;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
                <div style="width:${item.occRate}%;height:100%;background:${color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.initMap = initMap;
  window.setUserMarker = setUserMarker;
  window.syncMapMarkers = syncMapMarkers;
  window.focusLotOnMap = focusLotOnMap;
  window.createLotMarkerIcon = createLotMarkerIcon;
  window.renderParkingNetworkView = renderParkingNetworkView;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initMap,
    setUserMarker,
    syncMapMarkers,
    focusLotOnMap,
    createLotMarkerIcon,
    renderParkingNetworkView
  };
}
