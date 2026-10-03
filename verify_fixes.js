const assert = require('assert');

// Setup mock window & browser environment
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};
const _mockEls = {};
global.document = {
  documentElement: {
    _attrs: { 'data-theme': 'dark' },
    getAttribute(k) { return this._attrs[k]; },
    setAttribute(k, v) { this._attrs[k] = v; }
  },
  getElementById(id) {
    if (!_mockEls[id]) {
      _mockEls[id] = {
        id,
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {},
          contains: () => false
        },
        addEventListener: () => {}
      };
    }
    return _mockEls[id];
  },
  querySelectorAll() {
    return [{ style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, getAttribute: () => '' }];
  },
  querySelector() {
    return { style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } };
  },
  addEventListener() {}
};

require('./models.js');
require('./data.js');
require('./geolocation.js');
require('./booking-logic.js');
require('./reservation-logic.js');
require('./analytics.js');
require('./storage.js');
require('./map.js');
require('./app.js');

console.log('Testing User Bug Fixes:');

// Seed initial state
window.seedInitialState();

// Test 1: Navigation & Refresh Persistence
console.log('1. Verifying View Persistence on Refresh...');
window.switchView('dashboard');
assert.strictEqual(window.appState.currentView, 'dashboard', 'State currentView should be dashboard');
// Simulate saving state to localStorage
window.saveToLocalStorage(window.appState);

// Now simulate refreshing by re-initializing state
window.initApplicationState();
assert.strictEqual(window.appState.currentView, 'dashboard', 'After reload/refresh, currentView MUST remain dashboard');
console.log('   ✓ PASS: Refresh in console stays on dashboard (does not reset to landing)');

// Test 2: Single Level Facility & City Mall Slots
console.log('\n2. Verifying Single Level Facility & City Mall Slots...');
const cm = window.appState.lots.get('LOT-01');
assert.ok(cm, 'City Mall lot exists');
assert.strictEqual(cm.slots.size, 30, 'City Mall has 30 slots available on the single level');
assert.strictEqual(cm.totalFloors, 1, 'City Mall operates on 1 single level');

const f1Count = Array.from(cm.slots.values()).filter(s => s.floor === 1).length;
assert.strictEqual(f1Count, 30, 'All 30 slots are assigned to the single level (floor 1)');

// Verify single level is preserved in localStorage
window.saveToLocalStorage(window.appState);
const restored = window.loadFromLocalStorage();
const restoredCM = restored.lots.get('LOT-01');
assert.strictEqual(restoredCM.totalFloors, 1, 'Single level preserved in localStorage on reload');
assert.strictEqual(restoredCM.slots.size, 30, 'All 30 slots preserved on reload');
console.log('   ✓ PASS: Facility unified to 1 single level with all 30 slots rendered together');

// Test 3: Red text below car icon
console.log('\n3. Verifying Red Text Below Car Icon...');
const container = document.getElementById('bayColCenter');
window.selectLot('LOT-01');
window.selectFloor('all');
window.renderTopDownParkingLot();

assert.ok(container.innerHTML.includes('ps-car-topview'), 'Car SVG top view is rendered');
assert.ok(container.innerHTML.includes('ps-bay-occupied-tag'), 'ps-bay-occupied-tag is rendered');
assert.ok(container.innerHTML.includes('🔴 OCCUPIED'), 'Prominent red "🔴 OCCUPIED" text is rendered');
assert.ok(container.innerHTML.includes('ps-bay-plate-text'), 'ps-bay-plate-text is rendered');
console.log('   ✓ PASS: Red text ("🔴 OCCUPIED" and license plate) is prominently rendered below the car icon');

console.log('\n==========================================');
console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
console.log('==========================================');
