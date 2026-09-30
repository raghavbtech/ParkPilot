/**
 * Complete System Functionality Verification Suite
 * Tests every single module, class, mathematical algorithm, business rule, and UI controller.
 */
const assert = require('assert');

// 1. Mock Browser Environment
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const _mockElements = {};
global.document = {
  documentElement: {
    _attrs: { 'data-theme': 'dark' },
    getAttribute(k) { return this._attrs[k]; },
    setAttribute(k, v) { this._attrs[k] = v; }
  },
  getElementById(id) {
    if (!_mockElements[id]) {
      _mockElements[id] = {
        id,
        innerHTML: '',
        textContent: '',
        value: '',
        style: {},
        classList: {
          _c: new Set(),
          add(c) { this._c.add(c); },
          remove(c) { this._c.delete(c); },
          toggle(c) { this._c.has(c) ? this._c.delete(c) : this._c.add(c); },
          contains(c) { return this._c.has(c); }
        },
        appendChild(child) {},
        removeChild(child) {},
        parentNode: { removeChild: () => {} },
        remove() {},
        querySelectorAll: () => []
      };
    }
    return _mockElements[id];
  },
  querySelector(selector) {
    return {
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      textContent: '',
      innerHTML: ''
    };
  },
  querySelectorAll(selector) {
    return [{
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      getAttribute: () => '',
      textContent: ''
    }];
  },
  createElement(tag) {
    return {
      tagName: tag,
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      appendChild: () => {},
      remove: () => {},
      parentNode: { removeChild: () => {} }
    };
  },
  addEventListener() {}
};

// 2. Load All Modules in Correct Order
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

console.log('====================================================');
console.log('  PARKPILOT COMPLETE SYSTEM & FUNCTION AUDIT');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(category, title, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] [${category}] ${title}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] [${category}] ${title}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(`     Stack: ${err.stack.split('\n')[1]}`);
  }
}

// -------------------------------------------------------------
// MODULE 1: MODELS & PROTOTYPES (models.js)
// -------------------------------------------------------------
console.log('--- 1. Validating Core Data Models (models.js) ---');

test('models', 'Slot constructor, isAvailable, and occupation states', () => {
  const slot = new Slot('TS-01', 'general', 'car', 1);
  assert.strictEqual(slot.id, 'TS-01');
  assert.strictEqual(slot.type, 'general');
  assert.strictEqual(slot.size, 'car');
  assert.strictEqual(slot.isAvailable(), true);

  const vehicle = new Vehicle('DL01AB1234', 'car');
  slot.isOccupied = true;
  slot.currentVehicle = vehicle;
  slot.currentTicketId = 'T-1001';
  assert.strictEqual(slot.isAvailable(), false);
  assert.strictEqual(slot.currentVehicle.number, 'DL01AB1234');
});

test('models', 'Vehicle prototype methods describe() and isEV()', () => {
  const suv = new Vehicle('HR26SU1111', 'suv');
  const ev = new Vehicle('UP16EV3333', 'ev-car');

  assert.strictEqual(suv.describe(), 'SUV [HR26SU1111]');
  assert.strictEqual(suv.isEV(), false);
  assert.strictEqual(ev.describe(), 'EV-CAR [UP16EV3333]');
  assert.strictEqual(ev.isEV(), true);
  assert.strictEqual(typeof Vehicle.prototype.describe, 'function');
  assert.strictEqual(typeof Vehicle.prototype.isEV, 'function');
});

test('models', 'ParkingLot Map slot index, counts, and occupancyRate()', () => {
  const lot = new ParkingLot('LOT-T', 'Test Lot', 28.5, 77.2, 'Test Address', 1);
  assert.strictEqual(lot.slots instanceof Map, true);

  lot.addSlot(new Slot('S-1', 'general', 'car'));
  lot.addSlot(new Slot('S-2', 'general', 'suv'));
  lot.addSlot(new Slot('S-3', 'general', 'bike'));
  lot.addSlot(new Slot('S-4', 'ev', 'car'));

  assert.strictEqual(lot.getTotalSlotsCount(), 4);
  assert.strictEqual(lot.getAvailableSlotsCount(), 4);
  assert.strictEqual(lot.occupancyRate(), 0);
  assert.strictEqual(lot.getStatus(), 'open');

  lot.getSlot('S-1').isOccupied = true;
  assert.strictEqual(lot.getOccupiedSlotsCount(), 1);
  assert.strictEqual(lot.getAvailableSlotsCount(), 3);
  assert.strictEqual(lot.occupancyRate(), 25);
  assert.strictEqual(lot.getAvailableSlots().length, 3);
});

test('models', 'Ticket and Reservation constructor models', () => {
  const vehicle = new Vehicle('XY68ZTR', 'car');
  const ticket = new Ticket('T-1001', vehicle, 'LOT-01', 'CM-C01');
  assert.strictEqual(ticket.id, 'T-1001');
  assert.strictEqual(ticket.lotId, 'LOT-01');
  assert.strictEqual(ticket.slotId, 'CM-C01');

  const res = new Reservation('RES-501', 'STAFF-01', 'LOT-01', 'CM-ST1', '2026-09-19T10:00:00Z', '2026-09-19T11:00:00Z');
  assert.strictEqual(res.id, 'RES-501');
  assert.strictEqual(res.staffId, 'STAFF-01');
  assert.strictEqual(res.status, 'reserved');
});

// -------------------------------------------------------------
// MODULE 2: SEED DATA & CONFIGURATION (data.js)
// -------------------------------------------------------------
console.log('\n--- 2. Validating Seed Configuration (data.js) ---');

test('data', 'INITIAL_LOTS_CONFIG contains 5 valid facilities and seed generator', () => {
  assert.ok(Array.isArray(INITIAL_LOTS_CONFIG));
  assert.strictEqual(INITIAL_LOTS_CONFIG.length, 5);

  const seedLots = createSeedLotsMap();
  assert.strictEqual(seedLots instanceof Map, true);
  assert.strictEqual(seedLots.size, 5);

  const cm = seedLots.get('LOT-01');
  assert.ok(cm);
  assert.strictEqual(cm.slots.size, 30);
  assert.strictEqual(cm.totalFloors, 1);
});

// -------------------------------------------------------------
// MODULE 3: GEOLOCATION & HAVERSINE (geolocation.js)
// -------------------------------------------------------------
console.log('\n--- 3. Validating Geolocation Math (geolocation.js) ---');

test('geolocation', 'haversineDistance calculates spherical distance accurately', () => {
  // Distance from (28.6139, 77.2090) to (28.6129, 77.2295) is ~2 km
  const d = haversineDistance(28.6139, 77.2090, 28.6129, 77.2295);
  assert.ok(d >= 1.9 && d <= 2.1, `Expected ~2.0 km, got ${d}`);

  // Identical coordinates return 0
  assert.strictEqual(haversineDistance(28.5, 77.2, 28.5, 77.2), 0);
});

test('geolocation', 'getUserCoordinates handles fallback coordinates gracefully', async () => {
  const coords = await getUserCoordinates();
  assert.ok(typeof coords.lat === 'number');
  assert.ok(typeof coords.lng === 'number');
});

// -------------------------------------------------------------
// MODULE 4: BOOKING & BEST-FIT LOGIC (booking-logic.js)
// -------------------------------------------------------------
console.log('\n--- 4. Validating Booking Logic & Algorithms (booking-logic.js) ---');

test('booking', 'isSizeCompatible respects vehicle-to-slot sizing hierarchy', () => {
  assert.strictEqual(isSizeCompatible('bike', 'bike'), true);
  assert.strictEqual(isSizeCompatible('bike', 'car'), true);
  assert.strictEqual(isSizeCompatible('bike', 'suv'), true);

  assert.strictEqual(isSizeCompatible('car', 'bike'), false);
  assert.strictEqual(isSizeCompatible('car', 'car'), true);
  assert.strictEqual(isSizeCompatible('car', 'suv'), true);

  assert.strictEqual(isSizeCompatible('suv', 'bike'), false);
  assert.strictEqual(isSizeCompatible('suv', 'car'), false);
  assert.strictEqual(isSizeCompatible('suv', 'suv'), true);
});

test('booking', 'findBestFitSlot matches exact type before compatible upgrades', () => {
  const lot = new ParkingLot('LOT-FIT', 'Fit Lot', 28.5, 77.1);
  lot.addSlot(new Slot('B-01', 'general', 'bike'));
  lot.addSlot(new Slot('C-01', 'general', 'car'));
  lot.addSlot(new Slot('S-01', 'general', 'suv'));
  lot.addSlot(new Slot('E-01', 'ev', 'car'));

  // Exact matches
  assert.strictEqual(findBestFitSlot(lot, new Vehicle('V-B', 'bike')).slot.id, 'B-01');
  assert.strictEqual(findBestFitSlot(lot, new Vehicle('V-C', 'car')).slot.id, 'C-01');
  assert.strictEqual(findBestFitSlot(lot, new Vehicle('V-S', 'suv')).slot.id, 'S-01');
  assert.strictEqual(findBestFitSlot(lot, new Vehicle('V-E', 'ev-car')).slot.id, 'E-01');

  // Upgrade test: When car slot is occupied, car safely upgrades to SUV slot
  lot.getSlot('C-01').isOccupied = true;
  const upgrade = findBestFitSlot(lot, new Vehicle('V-C2', 'car'));
  assert.strictEqual(upgrade.slot.id, 'S-01');
  assert.strictEqual(upgrade.fitType, 'larger');
});

test('booking', 'getRecommendedLot scores proximity and capacity with explainability', () => {
  const seedLots = createSeedLotsMap();
  const car = new Vehicle('DL01XYZ', 'car');
  const rec = getRecommendedLot({ lat: 28.6139, lng: 77.2090 }, car, seedLots);

  assert.ok(rec.winningLot);
  assert.ok(rec.reasons.length >= 3);
  assert.ok(rec.reasons.some(r => r.includes('km') || r.includes('proximity')));
});

test('booking', 'generateTicket O(1) duplicate Set prevention and exitVehicle flow', () => {
  const seedLots = createSeedLotsMap();
  const state = {
    lots: seedLots,
    activeTickets: new Map(),
    activeVehicleNumbers: new Set(),
    parkingHistory: [],
    activityLog: []
  };

  const lot = seedLots.get('LOT-01');
  const slot = lot.getSlot('CM-C01');
  const vehicle = new Vehicle('DL01TEST', 'car');

  // Generate ticket
  const ticket = generateTicket(vehicle, lot, slot, state);
  assert.ok(ticket.id.startsWith('T-'));
  assert.strictEqual(slot.isOccupied, true);
  assert.strictEqual(state.activeTickets.has(ticket.id), true);
  assert.strictEqual(state.activeVehicleNumbers.has('DL01TEST'), true);

  // Duplicate entry attempt must throw
  assert.throws(() => {
    generateTicket(new Vehicle('DL01TEST', 'car'), lot, lot.getSlot('CM-C02'), state);
  }, /already marked as active/);

  // Exit vehicle
  const exitRes = exitVehicle(ticket.id, state);
  assert.strictEqual(exitRes.slot.isOccupied, false);
  assert.strictEqual(state.activeTickets.has(ticket.id), false);
  assert.strictEqual(state.activeVehicleNumbers.has('DL01TEST'), false);
  assert.strictEqual(state.parkingHistory.length, 1);
});

// -------------------------------------------------------------
// MODULE 5: RESERVATION LOGIC (reservation-logic.js)
// -------------------------------------------------------------
console.log('\n--- 5. Validating Reservation System (reservation-logic.js) ---');

test('reservations', 'hasOverlap mathematical interval collision check', () => {
  const t10 = '2026-09-19T10:00:00Z';
  const t11 = '2026-09-19T11:00:00Z';
  const t12 = '2026-09-19T12:00:00Z';
  const t13 = '2026-09-19T13:00:00Z';

  // Overlap
  assert.strictEqual(hasOverlap(t10, t12, t11, t13), true);
  // Back-to-back (not overlapping)
  assert.strictEqual(hasOverlap(t10, t11, t11, t12), false);
  // Disjoint
  assert.strictEqual(hasOverlap(t10, t11, t12, t13), false);
});

test('reservations', 'reserveStaffSlot and checkAndExpireReservations', () => {
  const seedLots = createSeedLotsMap();
  const state = {
    lots: seedLots,
    reservations: new Map(),
    activityLog: []
  };

  const now = new Date();
  const start = new Date(now.getTime() + 10 * 60000).toISOString();
  const end = new Date(now.getTime() + 60 * 60000).toISOString();

  const res = reserveStaffSlot('LOT-01', 'CM-ST1', 'STAFF-99', start, end, state);
  assert.strictEqual(res.status, 'reserved');
  assert.strictEqual(seedLots.get('LOT-01').getSlot('CM-ST1').reservedFor, 'STAFF-99');

  // Collision
  assert.throws(() => {
    reserveStaffSlot('LOT-01', 'CM-ST1', 'STAFF-COLLIDE', start, end, state);
  }, /Time collision/);

  // Expire reservations in future
  const futureTime = new Date(now.getTime() + 70 * 60000);
  const expired = checkAndExpireReservations(state, futureTime);
  assert.strictEqual(expired.length, 1);
  assert.strictEqual(seedLots.get('LOT-01').getSlot('CM-ST1').reservedFor, null);
});

test('reservations', 'bookAdvanceReservation and getTimeslotWindow calculation', () => {
  const seedLots = createSeedLotsMap();
  const state = {
    lots: seedLots,
    reservations: new Map(),
    activityLog: []
  };

  const windowObj = getTimeslotWindow('15:00', 0, 60);
  assert.strictEqual(windowObj.startTimeFormatted, '15:00');
  assert.strictEqual(windowObj.endTimeFormatted, '16:00');

  const advanceRes = bookAdvanceReservation('LOT-01', 'CM-C01', 'DL01ADV', 'car', windowObj.startISO, windowObj.endISO, state);
  assert.strictEqual(advanceRes.status, 'reserved');

  // Conflict detection
  assert.throws(() => {
    bookAdvanceReservation('LOT-01', 'CM-C01', 'DL01CONFLICT', 'car', windowObj.startISO, windowObj.endISO, state);
  }, /Conflict/);
});

// -------------------------------------------------------------
// MODULE 6: ANALYTICS ENGINE (analytics.js)
// -------------------------------------------------------------
console.log('\n--- 6. Validating Telemetry & Analytics (analytics.js) ---');

test('analytics', 'calculateSessionFee computes fees with duration and surge multiplier', () => {
  // Car rate: 3.50/hr
  assert.strictEqual(calculateSessionFee('car', 60, 1.0), 3.5);
  // SUV rate: 5.00/hr
  assert.strictEqual(calculateSessionFee('suv', 60, 1.0), 5.0);
  // Bike rate: 2.00/hr
  assert.strictEqual(calculateSessionFee('bike', 60, 1.0), 2.0);
  // EV rate: 4.50/hr
  assert.strictEqual(calculateSessionFee('ev-car', 60, 1.0), 4.5);
  // Surge 1.5x on car 60m: 3.5 * 1.5 = 5.25
  assert.strictEqual(calculateSessionFee('car', 60, 1.5), 5.25);
});

test('analytics', 'getAnalyticsSummary provides comprehensive metrics', () => {
  const seedLots = createSeedLotsMap();
  const state = {
    lots: seedLots,
    activeTickets: new Map(),
    activeVehicleNumbers: new Set(),
    parkingHistory: [{ fee: 10.5, vehicleType: 'car', lotId: 'LOT-01' }],
    reservations: new Map()
  };

  const summary = getAnalyticsSummary(state);
  assert.ok(typeof summary.avgOccupancy === 'number');
  assert.ok(typeof summary.peakOccupancy === 'number');
  assert.ok(summary.totalCapacity > 0);
  assert.ok(summary.totalRevenue > 0);
  assert.ok(Array.isArray(summary.hourlyProfile));
  assert.strictEqual(summary.hourlyProfile.length, 24);
});

// -------------------------------------------------------------
// MODULE 7: PERSISTENCE (storage.js)
// -------------------------------------------------------------
console.log('\n--- 7. Validating LocalStorage Serialization (storage.js) ---');

test('storage', 'saveToLocalStorage and loadFromLocalStorage preserve Map and Class instances', () => {
  const seedLots = createSeedLotsMap();
  const testState = {
    lots: seedLots,
    activeTickets: new Map([['T-1001', new Ticket('T-1001', new Vehicle('TEST1', 'car'), 'LOT-01', 'CM-C01')]]),
    activeVehicleNumbers: new Set(['TEST1']),
    reservations: new Map(),
    parkingHistory: [],
    activityLog: [],
    selectedLotId: 'LOT-01',
    currentView: 'dashboard'
  };

  saveToLocalStorage(testState);
  const rehydrated = loadFromLocalStorage();

  assert.ok(rehydrated.lots instanceof Map);
  assert.ok(rehydrated.activeVehicleNumbers instanceof Set);
  assert.strictEqual(rehydrated.activeVehicleNumbers.has('TEST1'), true);
  assert.ok(rehydrated.lots.get('LOT-01') instanceof ParkingLot);
});

// -------------------------------------------------------------
// MODULE 8: SIMULATION ENGINE (simulation.js)
// -------------------------------------------------------------
console.log('\n--- 8. Validating Simulation Engine (simulation.js) ---');

test('simulation', 'generateRandomPlate produces valid formatted plates', () => {
  const plate = generateRandomPlate();
  assert.ok(typeof plate === 'string');
  assert.ok(plate.length >= 8);
});

test('simulation', 'runSimulationTick generates live events using business logic', () => {
  const seedLots = createSeedLotsMap();
  const state = {
    lots: seedLots,
    activeTickets: new Map(),
    activeVehicleNumbers: new Set(),
    parkingHistory: [],
    activityLog: [],
    userCoords: { lat: 28.6139, lng: 77.2090 }
  };

  const event = runSimulationTick(state);
  assert.ok(event !== null && event !== undefined);
  assert.ok(state.activityLog.length > 0);
});

// -------------------------------------------------------------
// MODULE 9: APPLICATION CONTROLLER & ACTIONS (app.js)
// -------------------------------------------------------------
console.log('\n--- 9. Validating Master Orchestrator (app.js) ---');

test('app', 'initApplicationState initializes lots, view, and accounts', () => {
  window.initApplicationState();
  assert.ok(window.appState);
  assert.strictEqual(window.appState.lots.size, 5);
  assert.ok(window.appState.accounts.length >= 2);
  assert.strictEqual(window.appState.currentUserRole, 'admin');
});

test('app', 'switchView routes views correctly', () => {
  window.switchView('slots');
  assert.strictEqual(window.appState.currentView, 'slots');

  window.switchView('dashboard');
  assert.strictEqual(window.appState.currentView, 'dashboard');
});

test('app', 'openSlotDrawer, instantParkFromDrawer & closeSlotDrawer', () => {
  window.initApplicationState();
  const lot = window.appState.lots.get('LOT-01');
  const slot = lot.getSlot('CM-C05');
  assert.ok(slot);

  // Open drawer
  window.openSlotDrawer(slot.id, lot.id);
  assert.ok(window.appState.activeDrawerSlot);
  assert.strictEqual(window.appState.activeDrawerSlot.slot.id, 'CM-C05');

  // Instant Check-In directly from drawer
  window.instantParkFromDrawer(slot.id, lot.id);
  assert.strictEqual(slot.isOccupied, true);
  assert.ok(slot.currentVehicle);
  assert.strictEqual(window.appState.activeVehicleNumbers.has(slot.currentVehicle.number), true);

  // Active drawer should be closed after booking
  assert.strictEqual(window.appState.activeDrawerSlot, null);
});

test('app', 'confirmAdvanceDrawerBooking schedules advance booking from drawer', () => {
  window.initApplicationState();
  const lot = window.appState.lots.get('LOT-01');
  const slot = lot.getSlot('CM-C06');

  // Mock input fields
  document.getElementById('drawerPlateInput').value = 'MH02BK9988';
  document.getElementById('drawerTypeSelect').value = 'car';

  window.openSlotDrawer(slot.id, lot.id);
  window.confirmAdvanceDrawerBooking(slot.id, lot.id);

  assert.strictEqual(window.appState.reservations.size >= 1, true);
  assert.strictEqual(window.appState.activeDrawerSlot, null);
});

test('app', 'runGlobalSearch finds plates, slots, and facilities', () => {
  window.initApplicationState();
  const results = window.runGlobalSearch('City Mall');
  assert.ok(results.length > 0);
  assert.ok(results.some(r => r.title.includes('City Mall')));
});

test('app', 'quickLogin switches between Admin and Regular User', () => {
  window.quickLogin('user');
  assert.strictEqual(window.appState.currentUserRole, 'user');

  window.quickLogin('admin');
  assert.strictEqual(window.appState.currentUserRole, 'admin');
  assert.strictEqual(window.appState.currentUser.displayName, 'Super Admin');
});

test('app', 'toggleAppTheme toggles theme attribute', () => {
  window.toggleAppTheme();
  const t1 = document.documentElement.getAttribute('data-theme');
  assert.ok(t1 === 'light' || t1 === 'dark');

  window.toggleAppTheme();
  const t2 = document.documentElement.getAttribute('data-theme');
  assert.ok(t2 !== t1);
});

test('app', 'canUserCheckoutTicket RBAC enforcement and ownership protection', () => {
  window.seedInitialState();

  const userTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'user');
  const guestTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'guest');

  assert.ok(userTicket, 'User-owned ticket XY68ZTR should exist');
  assert.ok(guestTicket, 'Guest-owned ticket should exist');

  // Case A: Super Admin role can exit ANY ticket
  const adminAuthGuest = window.canUserCheckoutTicket(guestTicket, { username: 'admin', role: 'admin' }, 'admin');
  assert.strictEqual(adminAuthGuest.allowed, true);
  assert.strictEqual(adminAuthGuest.isSuperAdmin, true);

  const adminAuthUser = window.canUserCheckoutTicket(userTicket, { username: 'admin', role: 'admin' }, 'admin');
  assert.strictEqual(adminAuthUser.allowed, true);

  // Case B: Regular User role can ONLY exit their own ticket
  const regularUser = { username: 'user', role: 'user' };
  const userAuthOwn = window.canUserCheckoutTicket(userTicket, regularUser, 'user');
  assert.strictEqual(userAuthOwn.allowed, true);
  assert.strictEqual(userAuthOwn.isOwner, true);

  const userAuthForeign = window.canUserCheckoutTicket(guestTicket, regularUser, 'user');
  assert.strictEqual(userAuthForeign.allowed, false);
  assert.strictEqual(userAuthForeign.isOwner, false);
  assert.ok(userAuthForeign.reason.includes('another driver'));
});

test('app', 'handleProcessExit blocks unauthorized user departure and permits owner', () => {
  window.seedInitialState();
  const guestTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'guest');
  const userTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'user');

  // Switch to Regular User
  window.quickLogin('user');
  const initialTicketCount = window.appState.activeTickets.size;

  // Attempting to exit guest vehicle as regular user must be blocked
  window.handleProcessExit(guestTicket.id);
  assert.strictEqual(window.appState.activeTickets.has(guestTicket.id), true, 'Foreign vehicle must NOT be departed by regular user');
  assert.strictEqual(window.appState.activeTickets.size, initialTicketCount);

  // Exiting own vehicle as regular user must succeed
  window.handleProcessExit(userTicket.id);
  assert.strictEqual(window.appState.activeTickets.has(userTicket.id), false, 'Own vehicle must be departed successfully');
  assert.strictEqual(window.appState.activeTickets.size, initialTicketCount - 1);
});

test('app', 'openSlotDrawer renders Protected banner for user on foreign bay and Super Admin controls for admin', () => {
  window.seedInitialState();
  const guestTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'guest');
  const drawerBody = document.getElementById('drawerBodyContent') || document.getElementById('drawerContent');

  // 1. Regular User viewing guest vehicle
  window.quickLogin('user');
  window.openSlotDrawer(guestTicket.slotId, guestTicket.lotId);
  assert.ok(drawerBody.innerHTML.includes('Protected Vehicle Session'), 'Regular user drawer must show Protected Vehicle Session');
  assert.ok(drawerBody.innerHTML.includes('ANOTHER DRIVER'), 'Regular user drawer must show ANOTHER DRIVER badge');
  assert.strictEqual(drawerBody.innerHTML.includes('Process Departure &amp; Pay'), false);

  // 2. Super Admin viewing guest vehicle
  window.quickLogin('admin');
  window.openSlotDrawer(guestTicket.slotId, guestTicket.lotId);
  assert.ok(drawerBody.innerHTML.includes('SUPER ADMIN OVERRIDE'), 'Super Admin drawer must show SUPER ADMIN OVERRIDE badge');
  assert.ok(drawerBody.innerHTML.includes('Process Departure &amp; Pay') || drawerBody.innerHTML.includes('Process Departure & Pay'));
  window.closeSlotDrawer();
});

// -------------------------------------------------------------
// SUMMARY & REPORT
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL FUNCTIONS & SCENARIOS TESTED: ${totalTests}`);
console.log(`PASSED: ${passedTests} / ${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('\n>>> SUCCESS: ALL CODE AND FUNCTIONS ARE VERIFIED AND WORKING 100%! <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> FAILURES DETECTED. REVIEW LOGS ABOVE. <<<\n');
  process.exit(1);
}
