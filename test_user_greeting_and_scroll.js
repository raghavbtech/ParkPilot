const assert = require('assert');

// Mock browser globals
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

const _mockElements = {};
let _lastScrollTarget = null;
let _lastScrollOpts = null;

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
        scrollIntoView(opts) {
          _lastScrollTarget = id;
          _lastScrollOpts = opts;
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

// Load dependencies
require('./models.js');
require('./data.js');
require('./geolocation.js');
require('./booking-logic.js');
require('./reservation-logic.js');
require('./analytics.js');
require('./storage.js');
require('./simulation.js');
require('./app.js');

console.log('\n==========================================');
console.log('Testing User Requirements:');
console.log('==========================================');

// 1. Test window.scrollToSection
console.log('1. Verifying Smart Allocation button scroll action...');
assert.strictEqual(typeof window.scrollToSection, 'function', 'window.scrollToSection must be a function');
window.scrollToSection('recommendationEngine');
assert.strictEqual(_lastScrollTarget, 'recommendationEngine', 'Scrolled to recommendationEngine element');
assert.deepStrictEqual(_lastScrollOpts, { behavior: 'smooth', block: 'start' }, 'Smooth scroll behavior applied');
console.log('   ✓ PASS: Smart Allocation button invokes scrollToSection and smoothly scrolls into view');

// 2. Test dynamic user greeting syncing
console.log('\n2. Verifying Dashboard Greeting dynamically syncs with logged-in user...');
const nameEl = document.getElementById('dashGreetingName');
const salutationEl = document.getElementById('dashGreetingSalutation');
const dateEl = document.getElementById('dashGreetingDate');

// Test with Raghav
window.quickLogin('raghav');
window.updateDashboardGreeting();
assert.strictEqual(nameEl.textContent, 'Raghav', 'Greeting shows Raghav when Raghav is logged in');
assert.ok(salutationEl.textContent.startsWith('Good '), 'Greeting salutation is dynamic based on time of day');
assert.ok(dateEl.textContent.includes('operations pulse'), 'Date element is updated');
console.log(`   ✓ PASS: When Raghav is logged in, greeting displays: "${salutationEl.textContent}, ${nameEl.textContent}."`);
console.log(`   ✓ PASS: Dynamic date text: "${dateEl.textContent}"`);

// Test switching to Super Admin
window.quickLogin('admin');
window.updateDashboardGreeting();
assert.strictEqual(nameEl.textContent, 'Super Admin', 'Greeting shows Super Admin when admin is logged in');
console.log(`   ✓ PASS: When switched to Super Admin, greeting dynamically syncs to: "${salutationEl.textContent}, ${nameEl.textContent}."`);

// Test switching to Regular User
window.quickLogin('user');
window.updateDashboardGreeting();
assert.strictEqual(nameEl.textContent, 'Regular User', 'Greeting shows Regular User when user is logged in');
console.log(`   ✓ PASS: When switched to Regular User, greeting dynamically syncs to: "${salutationEl.textContent}, ${nameEl.textContent}."`);

// Switch back to Raghav
window.quickLogin('raghav');
window.updateDashboardGreeting();
assert.strictEqual(nameEl.textContent, 'Raghav', 'Greeting returns to Raghav');
console.log(`   ✓ PASS: Switched back to Raghav successfully: "${salutationEl.textContent}, Raghav."`);

console.log('\n==========================================');
console.log('ALL USER REQUIREMENT VERIFICATION TESTS PASSED (100%)!');
console.log('==========================================\n');
