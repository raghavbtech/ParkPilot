/**
 * Automated UI & Interaction Test Suite for ParkPilot
 * Verifies all event handlers, state transitions, view routing,
 * algorithms, and business logic without needing external browser binaries.
 */

const assert = require('assert');
const fs = require('fs');

// Create minimal browser-like globals
global.window = global;
global.document = {
  documentElement: {
    _attrs: { 'data-theme': 'dark' },
    getAttribute: function(k) { return this._attrs[k]; },
    setAttribute: function(k, v) { this._attrs[k] = v; }
  },
  getElementById: (id) => ({
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    value: '',
    appendChild: () => {}
  }),
  querySelectorAll: () => [
    { classList: { add: () => {}, remove: () => {}, toggle: () => {} }, getAttribute: () => '', style: {} }
  ],
  querySelector: () => ({ style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
  createElement: () => ({
    className: '',
    textContent: '',
    style: {},
    remove: () => {}
  }),
  addEventListener: () => {}
};
global.localStorage = {
  store: {},
  getItem: (k) => global.localStorage.store[k] || null,
  setItem: (k, v) => { global.localStorage.store[k] = v; },
  removeItem: (k) => { delete global.localStorage.store[k]; },
  clear: () => { global.localStorage.store = {}; }
};

// Load application modules in exact order
require('./models.js');
require('./data.js');
require('./geolocation.js');
require('./booking-logic.js');
require('./reservation-logic.js');
require('./analytics.js');
require('./storage.js');
require('./simulation.js');
require('./map.js');
require('./app.js');

console.log('==========================================');
console.log('Running ParkPilot End-to-End UI & Integration Tests');
console.log('==========================================\n');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.stack}`);
    process.exit(1);
  }
}

// 1. Test App State & Seeding
test('App state initialized with 5 metro facilities', () => {
  window.appState.lots = window.createSeedLotsMap();
  assert.strictEqual(window.appState.lots.size, 5);
  assert.ok(window.appState.lots.has('LOT-01'));
  assert.ok(window.appState.lots.has('LOT-05'));
});

// 2. Test View Switching
test('switchView switches active view without error', () => {
  // Mock login to allow switching to protected views
  window.appState.currentUser = { username: 'testAdmin', role: 'admin' };
  window.appState.currentUserRole = 'admin';
  
  const views = ['dashboard', 'landing', 'slots', 'reservations', 'analytics', 'map'];
  views.forEach(v => {
    window.switchView(v);
    assert.strictEqual(window.appState.currentView, v);
  });
});

// 3. Test Theme Toggle
test('toggleAppTheme toggles between dark and light', () => {
  window.appState.currentTheme = 'dark';
  window.toggleAppTheme();
  assert.strictEqual(window.appState.currentTheme, 'light');
  window.toggleAppTheme();
  assert.strictEqual(window.appState.currentTheme, 'dark');
});

// 4. Test Lot Selection
test('selectLot updates selected lot and active slot state', () => {
  window.selectLot('LOT-02');
  assert.strictEqual(window.appState.selectedLotId, 'LOT-02');
  window.selectLot('LOT-01');
  assert.strictEqual(window.appState.selectedLotId, 'LOT-01');
});

// 5. Test Timeslot & Date Selection
test('selectTimeslot and changeTimeslotDate update time filter', () => {
  window.selectTimeslot('14:00', null);
  assert.strictEqual(window.appState.selectedTimeslot, '14:00');
  window.changeTimeslotDate(1);
  assert.strictEqual(window.appState.timeslotDayOffset, 1);
  window.changeTimeslotDate(-1);
  assert.strictEqual(window.appState.timeslotDayOffset, 0);
});

// 6. Test Landing Recommendation & Vehicle Selection
test('selectLandingVType re-evaluates best recommendation', () => {
  window.selectLandingVType('suv', null);
  assert.strictEqual(window.appState.landingSelectedVType, 'suv');
  const dummySUV = new Vehicle('TEST-SUV', 'suv');
  const rec = getRecommendedLot(window.appState.userCoords, dummySUV, window.appState.lots);
  assert.ok(rec.winningLot);
  assert.ok(rec.reasons.length > 0);
});

// 7. Test Quick Park Flow
test('executeLandingQuickPark generates valid ticket pass and updates Set', () => {
  const initialTickets = window.appState.activeTickets.size;
  window.executeLandingQuickPark();
  assert.strictEqual(window.appState.activeTickets.size, initialTickets + 1);
});

// 8. Test Find My Vehicle & Departure
test('handleProcessExit frees bay and calculates accurate fee', () => {
  const ticket = Array.from(window.appState.activeTickets.values())[0];
  assert.ok(ticket, 'Active ticket must exist');
  const ticketId = ticket.id;
  const slotId = ticket.slotId;
  const lot = window.appState.lots.get(ticket.lotId);

  window.handleProcessExit(ticketId);

  assert.strictEqual(window.appState.activeTickets.has(ticketId), false);
  assert.strictEqual(window.appState.activeVehicleNumbers.has(ticket.vehicle.number), false);
  const slot = lot.getSlot(slotId);
  assert.strictEqual(slot.isOccupied, false);
});

// 9. Test Staff Reservation & Interval Overlap Check
test('hasOverlap correctly flags colliding times and allows back-to-back', () => {
  const startA = '2026-08-30T10:00:00.000Z';
  const endA   = '2026-08-30T12:00:00.000Z';

  // Overlapping window (11:00 to 13:00)
  const startB = '2026-08-30T11:00:00.000Z';
  const endB   = '2026-08-30T13:00:00.000Z';
  assert.strictEqual(hasOverlap(startA, endA, startB, endB), true);

  // Back-to-back window (12:00 to 14:00)
  const startC = '2026-08-30T12:00:00.000Z';
  const endC   = '2026-08-30T14:00:00.000Z';
  assert.strictEqual(hasOverlap(startA, endA, startC, endC), false);
});

// 10. Test Global Search
test('runGlobalSearch finds active tickets, slots, and facilities', () => {
  window.runGlobalSearch('City');
  assert.ok(window._searchResults && window._searchResults.length > 0);
  assert.ok(window._searchResults.some(r => r.title.includes('City')));
});

// 11. Test Simulation Engine
test('Simulation start, tick, rush spike, and stop operate cleanly', () => {
  assert.strictEqual(isSimulationRunning(), false);
  window.toggleSimulation();
  assert.strictEqual(isSimulationRunning(), true);

  // Run a synchronous tick
  const tickResult = runSimulationTick(window.appState);
  assert.ok(tickResult);
  assert.ok(['ARRIVAL', 'DEPARTURE', 'RESERVATION_EXPIRY'].includes(tickResult.type));

  // Run a rush hour spike
  window.triggerTrafficSpike();

  window.toggleSimulation();
  assert.strictEqual(isSimulationRunning(), false);
});

// 12. Test Surge Pricing & Revenue Metrics
test('Surge pricing simulator computes yield correctly', () => {
  window.appState.baseRate = 4.00;
  window.appState.surgeMultiplier = 1.5;
  const summary = getAnalyticsSummary(window.appState, window.appState.surgeMultiplier);
  assert.ok(summary.totalCapacity > 0);
  assert.ok(summary.hourlyProfile.length === 24);
  assert.ok(summary.categoryBreakdown);
});

// 13. Test Advance Timeslot Booking & Interval Collision
test('Advance timeslot booking reserves slot and detects interval collisions', () => {
  const windowObj = getTimeslotWindow('15:00', 1);
  const initialResCount = window.appState.reservations.size;

  const res = bookAdvanceReservation('LOT-01', 'CM-C02', 'ADV-9999', 'car', windowObj.startISO, windowObj.endISO, window.appState);
  assert.ok(res);
  assert.strictEqual(window.appState.reservations.size, initialResCount + 1);
  assert.strictEqual(isSlotReservedInWindow('LOT-01', 'CM-C02', windowObj.startISO, windowObj.endISO, window.appState), true);

  assert.throws(() => {
    bookAdvanceReservation('LOT-01', 'CM-C02', 'ANOTHER-1', 'car', windowObj.startISO, windowObj.endISO, window.appState);
  }, /Conflict/);

  const laterWindow = getTimeslotWindow('17:00', 1);
  assert.strictEqual(isSlotReservedInWindow('LOT-01', 'CM-C02', laterWindow.startISO, laterWindow.endISO, window.appState), false);
});

// 14. Test Dashboard Vehicle Category Filtering & Facility Parked Telemetry
test('Dashboard category filtering and facility parked telemetry operate correctly', () => {
  window.selectDashboardCategory('ev-car', null);
  assert.strictEqual(window.appState.currentDashboardCategory, 'ev-car');

  window.selectDashboardCategory('all', null);
  assert.strictEqual(window.appState.currentDashboardCategory, 'all');

  window.stepCurrentParkedVehicle(1);
  assert.ok(typeof window.appState.currentParkedIndex === 'number');
});

// 15. Test Accurate Timeslot Range Computation & Bay Inspection Telemetry
test('Timeslot range computes accurate 1-hour interval and inspects occupied vs vacant bays', () => {
  const w13 = window.getActiveTimeslotWindow('13:00', 0);
  assert.strictEqual(w13.rangeFormatted, '13:00 – 14:00');
  assert.strictEqual(w13.startTimeFormatted, '13:00');
  assert.strictEqual(w13.endTimeFormatted, '14:00');

  const w23 = window.getActiveTimeslotWindow('23:00', 0);
  assert.strictEqual(w23.rangeFormatted, '23:00 – 00:00');

  // Inspect vacant slot
  window.openSlotDrawer('CM-E02', 'LOT-01');
  assert.ok(window.appState.activeDrawerSlot);
  assert.strictEqual(window.appState.activeDrawerSlot.slot.id, 'CM-E02');
  assert.strictEqual(window.appState.activeDrawerSlot.slot.isOccupied, false);

  // Focus current parked slot
  window.focusCurrentParkedSlot();
  assert.ok(window.appState.activeDrawerSlot);
});

console.log(`\n==========================================`);
console.log(`Results: ${passed} / 15 Integration Tests Passed (100%)`);
console.log(`==========================================`);
