/**
 * ParkPilot — Geolocation & Distance Calculation
 * Implements hand-crafted Haversine formula and Geolocation API integration.
 */

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates Great-Circle distance between two points on Earth using Haversine formula.
 * @param {number} lat1 Latitude of point 1 in degrees
 * @param {number} lon1 Longitude of point 1 in degrees
 * @param {number} lat2 Latitude of point 2 in degrees
 * @param {number} lon2 Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Attempts to retrieve user's real browser coordinates.
 * Falls back safely to default city center on denial, error, or timeout.
 * @returns {Promise<{lat: number, lng: number, isFallback: boolean, source: string}>}
 */
function getUserCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation API not supported by browser. Using default city center.");
      resolve({
        lat: DEFAULT_CENTER_COORDS.lat,
        lng: DEFAULT_CENTER_COORDS.lng,
        isFallback: true,
        source: "Default City Center (No API support)"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isFallback: false,
          source: "Live GPS / Browser Geolocation"
        });
      },
      (error) => {
        console.warn(`Geolocation error (${error.code}: ${error.message}). Falling back to city center.`);
        resolve({
          lat: DEFAULT_CENTER_COORDS.lat,
          lng: DEFAULT_CENTER_COORDS.lng,
          isFallback: true,
          source: "Default City Center (Permission Denied/Fallback)"
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 1500,
        maximumAge: 300000
      }
    );
  });
}

if (typeof window !== 'undefined') {
  window.haversineDistance = haversineDistance;
  window.getUserCoordinates = getUserCoordinates;
  window.toRad = toRad;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { haversineDistance, getUserCoordinates, toRad };
}
