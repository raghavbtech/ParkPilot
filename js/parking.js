/**
 * ParkPilot — Parking Management Controller & CRUD Operations (Modular)
 */

function initParkingManagement() {
  if (typeof renderParkingLotsList === 'function') {
    renderParkingLotsList();
  }
}

if (typeof window !== 'undefined') {
  window.initParkingManagement = initParkingManagement;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initParkingManagement };
}
