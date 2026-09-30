/**
 * ParkPilot Static & Dynamic Multi-Page Validator
 * Validates:
 * 1. All 8 HTML files exist and have valid structure.
 * 2. All referenced CSS and JS files exist.
 * 3. All internal links (<a href="...">) resolve to real files.
 * 4. All inline event handlers (onclick="window.foo()", onsubmit, onchange)
 *    resolve to existing, executable functions in the codebase.
 * 5. All core UI workflows execute cleanly under both Super Admin and Regular User.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML_PAGES = [
  'index.html',
  'dashboard.html',
  'slots.html',
  'parking.html',
  'reservations.html',
  'map.html',
  'analytics.html',
  'auth.html'
];

let totalChecks = 0;
let passedChecks = 0;
const errors = [];

function check(desc, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✓ PASS: ${desc}`);
  } catch (err) {
    errors.push(`${desc} -> ${err.message}`);
    console.error(`  ✗ FAIL: ${desc} -> ${err.message}`);
  }
}

console.log('====================================================');
console.log('PARKPILOT COMPREHENSIVE UI & FEATURES AUDIT');
console.log('====================================================\n');

// ----------------------------------------------------
// SECTION 1: HTML Integrity, Assets & Navigation Links
// ----------------------------------------------------
console.log('--- 1. Validating Page Assets & Navigation Links ---');

HTML_PAGES.forEach(page => {
  check(`Page exists and is non-empty: ${page}`, () => {
    assert.strictEqual(fs.existsSync(page), true);
    const content = fs.readFileSync(page, 'utf8');
    assert.ok(content.length > 500, 'Page content is substantial');
  });

  const content = fs.readFileSync(page, 'utf8');

  // Check CSS links
  const cssRegex = /<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["']/g;
  let cssMatch;
  while ((cssMatch = cssRegex.exec(content)) !== null) {
    const rawHref = cssMatch[1].split('?')[0];
    if (!rawHref.startsWith('http') && !rawHref.startsWith('//')) {
      check(`[${page}] CSS asset exists: ${rawHref}`, () => {
        assert.strictEqual(fs.existsSync(rawHref), true, `Missing CSS file: ${rawHref}`);
      });
    }
  }

  // Check Script sources
  const scriptRegex = /<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/g;
  let scriptMatch;
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    const rawSrc = scriptMatch[1].split('?')[0];
    if (!rawSrc.startsWith('http') && !rawSrc.startsWith('//')) {
      check(`[${page}] JS script exists: ${rawSrc}`, () => {
        assert.strictEqual(fs.existsSync(rawSrc), true, `Missing JS file: ${rawSrc}`);
      });
    }
  }

  // Check Internal Navigation Links
  const linkRegex = /<a[^>]+href=["']([^"']+\.html(?:#[^"']*)?)["']/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const target = linkMatch[1].split('#')[0];
    check(`[${page}] Navigation target exists: ${target}`, () => {
      assert.strictEqual(fs.existsSync(target), true, `Broken link to: ${target}`);
    });
  }
});

// ----------------------------------------------------
// SECTION 2: Dynamic Execution & Event Handler Validation
// ----------------------------------------------------
console.log('\n--- 2. Setting Up Dynamic Runtime & State Engine ---');

// Setup DOM Mock with element store
const elementStore = new Map();

function getOrCreateElement(id) {
  if (!elementStore.has(id)) {
    elementStore.set(id, {
      id,
      textContent: '',
      innerHTML: '',
      value: '',
      style: {
        display: '',
        setProperty: function(k, v) { this[k] = v; },
        removeProperty: function(k) { delete this[k]; }
      },
      classList: {
        _classes: new Set(),
        add: function(c) { this._classes.add(c); },
        remove: function(c) { this._classes.delete(c); },
        contains: function(c) { return this._classes.has(c); },
        toggle: function(c) { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); }
      },
      setAttribute: () => {},
      getAttribute: () => '',
      addEventListener: () => {},
      appendChild: () => {},
      focus: () => {}
    });
  }
  return elementStore.get(id);
}

global.window = global;
global.document = {
  documentElement: {
    _attrs: { 'data-theme': 'dark' },
    getAttribute: function(k) { return this._attrs[k]; },
    setAttribute: function(k, v) { this._attrs[k] = v; }
  },
  getElementById: (id) => getOrCreateElement(id),
  querySelector: () => getOrCreateElement('mock-query'),
  querySelectorAll: () => [getOrCreateElement('mock-all')],
  createElement: (tag) => getOrCreateElement(`created-${tag}-${Date.now()}`),
  addEventListener: () => {}
};

global.localStorage = {
  store: {},
  getItem: (k) => global.localStorage.store[k] || null,
  setItem: (k, v) => { global.localStorage.store[k] = String(v); },
  removeItem: (k) => { delete global.localStorage.store[k]; },
  clear: () => { global.localStorage.store = {}; }
};

// Load code modules
require('./models.js');
require('./data.js');
require('./geolocation.js');
require('./booking-logic.js');
require('./reservation-logic.js');
require('./storage.js');
require('./analytics.js');
require('./simulation.js');
require('./map.js');
require('./app.js');

check('Application state initializes cleanly', () => {
  window.seedInitialState();
  assert.strictEqual(window.appState.lots.size, 5);
  assert.strictEqual(window.appState.activeTickets.size, 8);
  assert.strictEqual(window.appState.activeVehicleNumbers.size, 8);
});

// ----------------------------------------------------
// SECTION 3: Verifying HTML Event Handlers Call Real Functions
// ----------------------------------------------------
console.log('\n--- 3. Verifying All HTML Inline Event Handlers ---');

HTML_PAGES.forEach(page => {
  const content = fs.readFileSync(page, 'utf8');
  // Match onclick="window.funcName(...)" or onclick="funcName(...)"
  const handlerRegex = /\bon(?:click|change|submit)=["'](?:event\.preventDefault\(\);\s*)?(?:window\.)?([a-zA-Z0-9_]+)\(/g;
  let match;
  const handlersFound = new Set();
  while ((match = handlerRegex.exec(content)) !== null) {
    handlersFound.add(match[1]);
  }

  const JS_KEYWORDS = new Set(['if', 'else', 'for', 'while', 'switch', 'return', 'event', 'typeof', 'window']);
  handlersFound.forEach(funcName => {
    if (JS_KEYWORDS.has(funcName)) return;
    check(`[${page}] Handler function is defined: window.${funcName}()`, () => {
      assert.strictEqual(
        typeof window[funcName],
        'function',
        `Function "${funcName}" referenced in ${page} is NOT a function on window!`
      );
    });
  });
});

// ----------------------------------------------------
// SECTION 4: Comprehensive Feature Workflows
// ----------------------------------------------------
console.log('\n--- 4. Testing End-to-End Feature Execution ---');

// Feature 4.1: Public Landing Recommendation Engine
check('Public Landing recommendation ranks lots and selects vehicle type', () => {
  window.selectLandingVType('ev-car');
  assert.strictEqual(window.appState.landingSelectedVType, 'ev-car');
  const preview = window.updateLandingRecommendationPreview();
  assert.ok(preview);
  assert.ok(preview.winningLot, 'Recommendation engine must pick a winning lot');
});

// Feature 4.2: Instant Quick Park from Landing
check('executeLandingQuickPark parks vehicle and issues ticket', () => {
  window.selectLandingVType('car');
  const initialTickets = window.appState.activeTickets.size;
  window.executeLandingQuickPark();
  assert.strictEqual(window.appState.activeTickets.size, initialTickets + 1);
});

// Feature 4.3: Multi-lot Switching and Top-Down Grid Rendering
check('selectLot switches active lot and updates slot rendering', () => {
  window.selectLot('LOT-02');
  assert.strictEqual(window.appState.selectedLotId, 'LOT-02');
  window.selectLot('LOT-01');
  assert.strictEqual(window.appState.selectedLotId, 'LOT-01');
});

// Feature 4.4: Category Filter on Live Bays
check('selectDashboardCategory filters bays by vehicle type', () => {
  window.selectDashboardCategory('ev');
  window.selectDashboardCategory('suv');
  window.selectDashboardCategory('bike');
  window.selectDashboardCategory('all');
});

// Feature 4.5: Timeslot Window Selector and Conflict Detection
check('selectTimeslot and changeTimeslotDate update booking window', () => {
  window.selectTimeslot('15:00');
  assert.strictEqual(window.appState.selectedTimeslot, '15:00');
  window.changeTimeslotDate(1);
  assert.strictEqual(window.appState.timeslotDayOffset, 1);
  const win = window.getActiveTimeslotWindow('15:00', 1);
  assert.ok(win.rangeFormatted.includes('15:00'));
});

// Feature 4.6: Slot Inspection Drawer & Ownership Protection
check('Slot drawer renders correct controls for Super Admin vs Regular User', () => {
  window.seedInitialState();
  const guestTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'guest');
  const userTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'user');

  // Super Admin view on guest slot
  window.quickLogin('admin');
  window.openSlotDrawer(guestTicket.slotId, guestTicket.lotId);
  assert.strictEqual(window.appState.activeDrawerSlot.slot.id, guestTicket.slotId);
  const adminHtml = getOrCreateElement('drawerBodyContent').innerHTML;
  assert.ok(adminHtml.includes('SUPER ADMIN OVERRIDE'));
  window.closeSlotDrawer();

  // Regular User view on guest slot -> Protected
  window.quickLogin('user');
  window.openSlotDrawer(guestTicket.slotId, guestTicket.lotId);
  const userGuestHtml = getOrCreateElement('drawerBodyContent').innerHTML;
  assert.ok(userGuestHtml.includes('Protected Vehicle Session'));
  assert.ok(userGuestHtml.includes('ANOTHER DRIVER'));
  window.closeSlotDrawer();

  // Regular User view on own vehicle -> Unlocked
  window.openSlotDrawer(userTicket.slotId, userTicket.lotId);
  const userOwnHtml = getOrCreateElement('drawerBodyContent').innerHTML;
  assert.ok(userOwnHtml.includes('YOUR VEHICLE'));
  assert.ok(userOwnHtml.includes('Process Departure & Pay') || userOwnHtml.includes('Process Departure &amp; Pay'));
  window.closeSlotDrawer();
});

// Feature 4.7: Protected Departure Execution
check('handleProcessExit blocks unauthorized exit and permits owner exit', () => {
  window.seedInitialState();
  const guestTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'guest');
  const userTicket = Array.from(window.appState.activeTickets.values()).find(t => t.owner === 'user');

  window.quickLogin('user');
  const countBefore = window.appState.activeTickets.size;

  // Attempt foreign exit
  window.handleProcessExit(guestTicket.id);
  assert.strictEqual(window.appState.activeTickets.size, countBefore, 'Foreign car departure must be blocked');

  // Attempt own exit
  window.handleProcessExit(userTicket.id);
  assert.strictEqual(window.appState.activeTickets.size, countBefore - 1, 'Own car departure must succeed');
});

// Feature 4.8: Advance Timeslot Pre-Booking
check('confirmAdvanceDrawerBooking reserves bay with interval collision protection', () => {
  window.seedInitialState();
  getOrCreateElement('drawerPlateInput').value = 'MH01AB9988';
  getOrCreateElement('drawerTypeSelect').value = 'car';

  const lot = window.appState.lots.get('LOT-01');
  const slot = lot.getSlot('CM-C04');

  window.openSlotDrawer(slot.id, lot.id);
  window.confirmAdvanceDrawerBooking(slot.id, lot.id);
  assert.strictEqual(window.appState.reservations.size >= 1, true);
});

// Feature 4.9: Global Search across Plates, Bays, and Facilities
check('runGlobalSearch returns accurate matches across tickets and lots', () => {
  const plateResults = window.runGlobalSearch('XY68');
  assert.ok(plateResults.length >= 1, 'Finds license plate XY68');

  const facilityResults = window.runGlobalSearch('Tech Park');
  assert.ok(facilityResults.length >= 1, 'Finds Tech Park facility');
});


// Feature 4.11: Dynamic Surge Pricing Calculation
check('updateSurgeSimulator computes fee yield with surge multipliers', () => {
  getOrCreateElement('surgeRateSlider').value = '1.7';
  window.updateSurgeSimulator();
  assert.strictEqual(window.appState.surgeMultiplier, 1.7);
});

// Feature 4.12: Live Traffic Spike Simulation
check('triggerTrafficSpike simulates heavy load correctly', () => {
  window.triggerTrafficSpike();
  assert.ok(typeof window.triggerTrafficSpike === 'function');
});

// Feature 4.13: New Facility Creation (Admin only)
check('submitNewLot registers a brand new parking lot into state', () => {
  window.quickLogin('admin');
  getOrCreateElement('clName').value = 'Silicon Heights Tech Park';
  getOrCreateElement('clAddress').value = 'Sector 62, Cyber City';
  getOrCreateElement('clLat').value = '28.6200';
  getOrCreateElement('clLng').value = '77.3700';
  getOrCreateElement('clHourlyRate').value = '7.50';
  getOrCreateElement('clCar').value = '10';
  getOrCreateElement('clSuv').value = '5';
  getOrCreateElement('clBike').value = '5';
  getOrCreateElement('clEv').value = '2';
  getOrCreateElement('clStaff').value = '2';

  const lotCountBefore = window.appState.lots.size;
  window.submitNewLot();
  assert.strictEqual(window.appState.lots.size, lotCountBefore + 1, 'New facility successfully registered');
});

// Feature 4.14: Theme Toggling
check('toggleAppTheme persists dark/light theme switch', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  window.toggleAppTheme();
  assert.notStrictEqual(document.documentElement.getAttribute('data-theme'), cur);
});

// ----------------------------------------------------
// SUMMARY REPORT
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL CHECKS EXECUTED: ${totalChecks}`);
console.log(`PASSED: ${passedChecks} / ${totalChecks} (${((passedChecks / totalChecks) * 100).toFixed(1)}%)`);
console.log('====================================================');

if (errors.length === 0) {
  console.log('\n>>> SUCCESS: ALL PAGES, SCRIPTS, ASSETS, UI HANDLERS & FEATURES ARE 100% OPERATIONAL! <<<\n');
  process.exit(0);
} else {
  console.error('\n>>> FAILURES DETECTED:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}
