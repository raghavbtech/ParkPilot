/**
 * ParkPilot — Parking Network View & Geospatial Visualization
 * Native Vanilla SVG map displaying user GPS coordinates, parking lot nodes,
 * Haversine distances, and best-fit recommended facility with zero external libraries.
 */

let networkMapState = {
  container: null,
  userCoords: { lat: 28.6139, lng: 77.2090 },
  selectedLotId: 'LOT-01',
  onLotSelect: null,
  lots: new Map()
};

/**
 * Initializes the native Parking Network View.
 */
function initMap(initialCoords, onLotSelect) {
  if (initialCoords?.lat && initialCoords?.lng) {
    networkMapState.userCoords = { lat: initialCoords.lat, lng: initialCoords.lng };
  }
  if (typeof onLotSelect === 'function') networkMapState.onLotSelect = onLotSelect;

  networkMapState.container = document.getElementById('mapContainer') ||
                             document.getElementById('leafletMap') ||
                             document.getElementById('cityMapFull');

  if (networkMapState.container) renderParkingNetworkView();

  return {
    setView: (coords) => {
      if (coords?.[0] && coords?.[1]) {
        networkMapState.userCoords = { lat: coords[0], lng: coords[1] };
        renderParkingNetworkView();
      }
    },
    flyTo: (coords) => {
      if (coords?.[0] && coords?.[1]) {
        networkMapState.userCoords = { lat: coords[0], lng: coords[1] };
        renderParkingNetworkView();
      }
    }
  };
}

/** Updates user's location marker */
function setUserMarker(lat, lng) {
  networkMapState.userCoords = { lat, lng };
  renderParkingNetworkView();
}

/** Returns status metadata for parking lot node */
function createLotMarkerIcon(lot, isSelected = false) {
  return {
    status: lot?.getStatus?.() || 'open',
    freeSlots: lot?.getAvailableSlotsCount?.() || 0,
    occRate: lot?.occupancyRate?.() || 0,
    isSelected
  };
}

/** Synchronizes network map markers with application state */
function syncMapMarkers(lotsMap, selectedLotId, onLotSelect) {
  if (lotsMap) networkMapState.lots = lotsMap;
  if (selectedLotId) networkMapState.selectedLotId = selectedLotId;
  if (onLotSelect) networkMapState.onLotSelect = onLotSelect;
  renderParkingNetworkView();
}

/** Focuses on a selected parking facility */
function focusLotOnMap(lotId, lotsMap) {
  if (lotsMap) networkMapState.lots = lotsMap;
  networkMapState.selectedLotId = lotId;
  renderParkingNetworkView();

  const card = document.getElementById(`networkLotCard_${lotId}`);
  if (card?.scrollIntoView) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Renders the native SVG Parking Radar and lot cards into the container.
 */
function renderParkingNetworkView() {
  const container = networkMapState.container ||
                    document.getElementById('mapContainer') ||
                    document.getElementById('leafletMap') ||
                    document.getElementById('cityMapFull');
  if (!container) return;

  const lotsMap = networkMapState.lots?.size > 0
    ? networkMapState.lots
    : (typeof appState !== 'undefined' ? appState.lots : new Map());

  const userLat = networkMapState.userCoords.lat;
  const userLng = networkMapState.userCoords.lng;
  const selectedLotId = networkMapState.selectedLotId || 'LOT-01';

  // Calculate distance for each facility
  const lotsList = Array.from(lotsMap.values()).map(lot => {
    const dist = typeof haversineDistance === 'function' ? haversineDistance(userLat, userLng, lot.lat, lot.lng) : 1.0;
    return {
      lot,
      distance: dist,
      isSelected: lot.id === selectedLotId,
      freeSlots: lot.getAvailableSlotsCount?.() || 0,
      totalSlots: lot.getTotalSlotsCount?.() || 30,
      occRate: lot.occupancyRate?.() || 0,
      status: lot.getStatus?.() || 'open'
    };
  }).sort((a, b) => a.distance - b.distance);

  const recommendedLotId = lotsList.find(item => item.freeSlots > 0)?.lot.id || lotsList[0]?.lot.id;

  // Optimize: Avoid expensive SVG/DOM re-render if map state has not changed
  const lotsFingerprint = `${userLat.toFixed(4)},${userLng.toFixed(4)},${selectedLotId},` +
    lotsList.map(item => `${item.lot.id}:${item.freeSlots}:${item.status}`).join(';');
  if (container._lastMapFingerprint === lotsFingerprint) return;
  container._lastMapFingerprint = lotsFingerprint;

  const radarW = 600, radarH = 340;
  const cx = radarW / 2, cy = radarH / 2;
  const maxDist = Math.max(...lotsList.map(l => l.distance), 4.0);
  const scale = (cx - 45) / (maxDist * 1.15);

  const nodesSvg = lotsList.map(item => {
    const x = Math.max(35, Math.min(radarW - 35, cx + (item.lot.lng - userLng) * 108 * scale));
    const y = Math.max(35, Math.min(radarH - 35, cy - (item.lot.lat - userLat) * 111 * scale));
    const isSel = item.lot.id === selectedLotId;
    const isRec = item.lot.id === recommendedLotId;
    const color = item.status === 'full' ? '#ef8c91' : item.status === 'filling' ? '#ffb020' : '#a3e635';
    const code = item.lot.name ? item.lot.name.split(' ').map(w => w[0]).join('').slice(0, 3) : 'PK';

    return `
      <g style="cursor:pointer;" onclick="window.selectLot('${item.lot.id}')">
        <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${isSel ? '#6ce3d3' : 'rgba(108,227,211,0.2)'}" stroke-width="${isSel ? '2' : '1'}" stroke-dasharray="${isSel ? 'none' : '3,3'}" />
        <circle cx="${x}" cy="${y}" r="${isSel ? 20 : 15}" fill="${color}" fill-opacity="${isSel ? '0.35' : '0.15'}" stroke="${color}" stroke-width="${isSel ? 2.5 : 1.5}" />
        <circle cx="${x}" cy="${y}" r="${isSel ? 12 : 10}" fill="#0b1714" stroke="${color}" stroke-width="2" />
        <text x="${x}" y="${y + 3.5}" font-family="var(--mono, monospace)" font-size="${isSel ? 9 : 8}" font-weight="900" text-anchor="middle" fill="#dff8eb">${code}</text>
        <rect x="${x - 40}" y="${y + (y > cy ? 15 : -25)}" width="80" height="15" rx="3" fill="rgba(11,23,20,0.85)" stroke="${isSel ? '#6ce3d3' : 'rgba(255,255,255,0.1)'}" />
        <text x="${x}" y="${y + (y > cy ? 26 : -14)}" font-family="var(--body, sans-serif)" font-size="8" font-weight="700" text-anchor="middle" fill="#dff8eb">${item.distance.toFixed(1)} km · ${item.freeSlots} free</text>
        ${isRec ? `<circle cx="${x + 10}" cy="${y - 10}" r="5" fill="#facc15" /><text x="${x + 10}" y="${y - 8}" font-size="7" text-anchor="middle" fill="#000">★</text>` : ''}
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#0d1a16;color:#dff8eb;font-family:var(--body, sans-serif);position:relative;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(108,227,211,0.15);background:rgba(11,23,20,0.85);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#a3e635;"></span>
          <span style="font-size:12px;font-weight:800;color:#6ce3d3;">PARKING NETWORK RADAR</span>
        </div>
        <div style="font-size:11px;color:rgba(223,248,235,0.7);font-family:var(--mono, monospace);">
          GPS: ${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E
          <button onclick="window.resolveUserLocation()" style="margin-left:8px;background:rgba(108,227,211,0.15);border:1px solid rgba(108,227,211,0.3);color:#6ce3d3;font-size:10px;padding:3px 8px;border-radius:4px;cursor:pointer;">📍 Refresh GPS</button>
        </div>
      </div>

      <div style="position:relative;flex:1;min-height:300px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
        <svg viewBox="0 0 ${radarW} ${radarH}" style="width:100%;height:100%;display:block;">
          <circle cx="${cx}" cy="${cy}" r="${Math.round((cx - 45) * 0.33)}" fill="none" stroke="rgba(108,227,211,0.12)" />
          <circle cx="${cx}" cy="${cy}" r="${Math.round((cx - 45) * 0.66)}" fill="none" stroke="rgba(108,227,211,0.12)" />
          <circle cx="${cx}" cy="${cy}" r="${Math.round(cx - 45)}" fill="none" stroke="rgba(108,227,211,0.15)" stroke-dasharray="4,4" />
          <line x1="20" y1="${cy}" x2="${radarW - 20}" y2="${cy}" stroke="rgba(108,227,211,0.08)" />
          <line x1="${cx}" y1="20" x2="${cx}" y2="${radarH - 20}" stroke="rgba(108,227,211,0.08)" />
          ${nodesSvg}
          <circle cx="${cx}" cy="${cy}" r="14" fill="#6ce3d3" fill-opacity="0.2"><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" /></circle>
          <circle cx="${cx}" cy="${cy}" r="6" fill="#6ce3d3" stroke="#0b1714" stroke-width="2" />
          <text x="${cx}" y="${cy - 10}" font-family="var(--mono, monospace)" font-size="8" font-weight="900" text-anchor="middle" fill="#6ce3d3">YOU</text>
        </svg>

        <div style="position:absolute;top:10px;left:14px;background:rgba(11,23,20,0.85);border:1px solid rgba(108,227,211,0.18);border-radius:6px;padding:6px 10px;font-size:10px;pointer-events:none;">
          <div style="font-weight:800;color:#6ce3d3;">NETWORK LEGEND</div>
          <div><span style="color:#a3e635">●</span> Open &nbsp; <span style="color:#ffb020">●</span> Filling &nbsp; <span style="color:#ef8c91">●</span> Full &nbsp; <span style="color:#facc15">★</span> Best Fit</div>
        </div>
      </div>

      <div style="border-top:1px solid rgba(108,227,211,0.12);background:rgba(9,19,16,0.92);padding:10px 14px;display:flex;gap:10px;overflow-x:auto;">
        ${lotsList.map(item => `
          <div id="networkLotCard_${item.lot.id}" onclick="window.selectLot('${item.lot.id}')"
               style="flex:0 0 200px;background:${item.isSelected ? 'rgba(108,227,211,0.12)' : 'rgba(255,255,255,0.03)'};border:1px solid ${item.isSelected ? '#6ce3d3' : 'rgba(255,255,255,0.1)'};border-radius:6px;padding:8px 10px;cursor:pointer;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;">
              <span>${item.lot.name}</span>
              ${item.lot.id === recommendedLotId ? '<span style="color:#facc15;font-size:9px;">★ BEST</span>' : ''}
            </div>
            <div style="font-size:10px;color:rgba(223,248,235,0.65);margin-top:4px;display:flex;justify-content:space-between;">
              <span>📍 ${item.distance.toFixed(1)} km</span>
              <span>${item.freeSlots} / ${item.totalSlots} Free</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  Object.assign(window, {
    initMap,
    setUserMarker,
    syncMapMarkers,
    focusLotOnMap,
    createLotMarkerIcon,
    renderParkingNetworkView
  });
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
