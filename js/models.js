/**
 * ParkPilot — Core Entity Models (Modular ES6 Classes & Prototypes)
 */
if (typeof require !== 'undefined') {
  module.exports = require('../models.js');
} else if (typeof window !== 'undefined' && !window.ParkingLot) {
  // If loaded directly from js/models.js in browser
  document.write('<script src="models.js"><\/script>');
}
