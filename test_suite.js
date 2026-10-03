/**
 * ParkPilot Automated Logic & Integration Test Suite
 * Tests all 7 milestones and edge cases in Node.js environment
 */

const fs = require('fs');
const path = require('path');

// Mock browser global window & localStorage
global.window = global;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};
global.navigator = {
  geolocation: {
    getCurrentPosition(success) {
      success({ coords: { latitude: 28.6139, longitude: 77.2090 } });
    }
  }
};

// Load modules in order
require('./models.js');
require('./data.js');
require('./geolocation.js');
require('./booking-logic.js');
require('./reservation-logic.js');
require('./analytics.js');
require('./storage.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

console.log('==========================================');
console.log('Running ParkPilot Automated Test Suite');
console.log('==========================================\n');

// 1. Core Data Models & Prototypes
console.log('1. Testing Core Data Models & Prototypes...');
const v1 = new Vehicle('DL01AB1234', 'suv');
assert(v1.describe() === 'SUV [DL01AB1234]', 'Vehicle.prototype.describe works');
assert(typeof Vehicle.prototype.describe === 'function', 'describe is on Vehicle.prototype');

const lot1 = new ParkingLot('TEST-01', 'Test Facility', 28.61, 77.22);
const slot1 = new Slot('TS-01', 'general', 'car');
lot1.addSlot(slot1);
assert(lot1.slots.size === 1, 'ParkingLot uses Map for slots');
assert(lot1.getAvailableSlotsCount() === 1, 'getAvailableSlotsCount works');
assert(slot1.isAvailable() === true, 'slot.isAvailable is true when unoccupied');

// 2. Geolocation & Haversine formula
console.log('\n2. Testing Haversine Geolocation Formula...');
const dist = haversineDistance(28.6139, 77.2090, 28.6129, 77.2295);
assert(dist > 1.5 && dist < 2.5, `Haversine distance calculated accurately (${dist} km)`);
assert(haversineDistance(0, 0, 0, 0) === 0, 'Haversine distance for identical coordinates is 0');

// 3. Recommendation & Best-Fit Allocation
console.log('\n3. Testing Recommendation & Best-Fit Allocation...');
const seedLots = createSeedLotsMap();
const suvVehicle = new Vehicle('HR26SU1111', 'suv');
const userCoords = { lat: 28.6139, lng: 77.2090 };

const rec = getRecommendedLot(userCoords, suvVehicle, seedLots);
assert(rec.winningLot !== null, 'Recommended lot found for SUV');
assert(rec.reasons.length >= 3, 'Why this lot? contains explainable reasons');
assert(rec.reasons.some(r => r.includes('SUV')), 'Reason references SUV compatibility');

// Best-Fit test: SUV should only get SUV slot, not bike or car
const cmLot = seedLots.get('LOT-01');
const suvFit = findBestFitSlot(cmLot, suvVehicle);
assert(suvFit.slot.size === 'suv', `SUV allocated exact SUV bay (${suvFit.slot.id})`);
assert(suvFit.fitType === 'exact', 'SUV fitType marked as exact');

// Bike best-fit test
const bikeVehicle = new Vehicle('DL02BK2222', 'bike');
const bikeFit = findBestFitSlot(cmLot, bikeVehicle);
assert(bikeFit.slot.size === 'bike', `Bike allocated exact bike bay (${bikeFit.slot.id})`);

// EV best-fit test
const evVehicle = new Vehicle('UP16EV3333', 'ev-car');
const evFit = findBestFitSlot(cmLot, evVehicle);
assert(evFit.slot.type === 'ev', `EV car allocated dedicated EV charging bay (${evFit.slot.id})`);

// 4. Ticket Entry & Duplicate Prevention (O(1) Map & Set)
console.log('\n4. Testing Ticket Operations & Duplicate Set Check...');
const testState = {
  lots: seedLots,
  activeTickets: new Map(),
  activeVehicleNumbers: new Set(),
  reservations: new Map(),
  activityLog: [],
  parkingHistory: [],
  userCoords
};

const ticket1 = generateTicket(suvVehicle, cmLot, suvFit.slot, testState);
assert(ticket1.id.startsWith('T-'), `Ticket generated: ${ticket1.id}`);
assert(testState.activeTickets.has(ticket1.id), 'Ticket stored in activeTickets Map in O(1)');
assert(testState.activeVehicleNumbers.has(suvVehicle.number), 'Vehicle plate stored in activeVehicleNumbers Set in O(1)');
assert(suvFit.slot.isOccupied === true, 'Slot marked as occupied');

// Duplicate vehicle entry attempt
let duplicateRejected = false;
try {
  generateTicket(new Vehicle(suvVehicle.number, 'suv'), cmLot, cmLot.getSlot('CM-S02'), testState);
} catch (err) {
  duplicateRejected = true;
}
assert(duplicateRejected, 'Duplicate vehicle entry successfully rejected by Set.has() check');

// 5. Vehicle Exit Flow
console.log('\n5. Testing Vehicle Exit Flow...');
const exitResult = exitVehicle(ticket1.id, testState);
assert(exitResult.slot.isOccupied === false, 'Slot freed on vehicle exit');
assert(!testState.activeTickets.has(ticket1.id), 'Ticket removed from activeTickets Map');
assert(!testState.activeVehicleNumbers.has(suvVehicle.number), 'Vehicle removed from activeVehicleNumbers Set');
assert(testState.parkingHistory.length === 1, 'Session logged in parkingHistory');
assert(testState.activityLog.length >= 2, 'Activity log records entry and exit');

// 6. Staff Reservation & Interval Overlap
console.log('\n6. Testing Staff Reservation & Interval Overlap Check...');
const staffLot = seedLots.get('LOT-01');
const staffSlotId = 'CM-ST1';

const now = new Date();
const start1 = new Date(now.getTime() + 10 * 60000).toISOString();
const end1 = new Date(now.getTime() + 60 * 60000).toISOString();

// Reservation 1: [10m to 60m]
const res1 = reserveStaffSlot('LOT-01', staffSlotId, 'STAFF-01', start1, end1, testState);
assert(res1.status === 'reserved', 'Staff reservation 1 created');

// Overlapping attempt: [30m to 90m] -> should fail
let overlapRejected = false;
try {
  const start2 = new Date(now.getTime() + 30 * 60000).toISOString();
  const end2 = new Date(now.getTime() + 90 * 60000).toISOString();
  reserveStaffSlot('LOT-01', staffSlotId, 'STAFF-02', start2, end2, testState);
} catch (err) {
  overlapRejected = true;
}
assert(overlapRejected, 'Overlapping staff reservation correctly rejected by hasOverlap()');

// Back-to-back attempt: [60m to 120m] -> should succeed without conflict
let backToBackAccepted = false;
try {
  const start3 = end1; // Exactly when res1 ends
  const end3 = new Date(now.getTime() + 120 * 60000).toISOString();
  reserveStaffSlot('LOT-01', staffSlotId, 'STAFF-03', start3, end3, testState);
  backToBackAccepted = true;
} catch (err) {
  console.error(err);
}
assert(backToBackAccepted, 'Back-to-back reservation accepted without collision');

// 7. Auto Expiry Check
console.log('\n7. Testing Reservation Auto-Expiry...');
const expiredDate = new Date(now.getTime() + 130 * 60000); // 130m in future
const expiredList = checkAndExpireReservations(testState, expiredDate);
assert(expiredList.length >= 2, 'Expired reservations auto-released when time surpasses window');

// 8. Analytics
console.log('\n8. Testing Real-time Analytics...');
const analytics = getAnalyticsSummary(testState);
assert(analytics.totalServed >= 1, `Total vehicles served recorded (${analytics.totalServed})`);
assert(typeof analytics.avgOccupancy === 'number', `Average occupancy computed (${analytics.avgOccupancy}%)`);
assert(typeof analytics.peakOccupancy === 'number', `Peak occupancy computed (${analytics.peakOccupancy}%)`);


// 10. LocalStorage Serialization & Restoral
console.log('\n10. Testing LocalStorage Persistence...');
saveToLocalStorage(testState);
const restored = loadFromLocalStorage();
assert(restored !== null, 'State restored from localStorage');
assert(restored.lots.size === testState.lots.size, 'Restored lots Map instance size matches');
assert(restored.lots.get('LOT-01') instanceof ParkingLot, 'Restored objects re-instantiated as ES6 classes');

console.log('\n==========================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
console.log('==========================================\n');
