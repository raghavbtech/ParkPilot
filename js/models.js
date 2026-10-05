/**
 * ParkPilot — Core Entity Models & Prototypes
 * Demonstrates ES6 Classes, Prototype Extension, and encapsulation.
 */

// ==========================================
// 1. Vehicle Model & Prototype Demo
// ==========================================
class Vehicle {
  constructor(number, type) {
    this.number = (number || '').toUpperCase().trim();
    // Valid types: "bike", "car", "suv", "ev-car"
    this.type = type.toLowerCase();
  }
}

// Prototype demonstration: Demonstrates that ES6 classes are built on prototypes
Vehicle.prototype.describe = function() {
  return `${this.type.toUpperCase()} [${this.number}]`;
};

Vehicle.prototype.isEV = function() {
  return this.type === 'ev-car';
};

// ==========================================
// 2. Slot Model
// ==========================================
class Slot {
  constructor(id, type = 'general', size = 'car', floor = 1) {
    this.id = id;
    this.type = type; // "general" | "ev" | "staff"
    this.size = size; // "bike" | "car" | "suv"
    this.floor = floor;
    this.isOccupied = false;
    this.currentTicketId = null;
    this.currentVehicle = null;
    this.reservedFor = null; // staffId if active reservation
    this.reservationWindow = null; // { startTime, endTime, reservationId }
  }

  isAvailable() {
    return !this.isOccupied && !this.reservedFor;
  }
}

// ==========================================
// 3. ParkingLot Model
// ==========================================
class ParkingLot {
  constructor(id, name, lat, lng, address = '', totalFloors = 1) {
    this.id = id;
    this.name = name;
    this.lat = lat;
    this.lng = lng;
    this.address = address;
    this.totalFloors = totalFloors;
    // Map of slotId -> Slot instance for O(1) slot retrieval
    this.slots = new Map();
  }

  addSlot(slot) {
    this.slots.set(slot.id, slot);
  }

  getSlot(slotId) {
    return this.slots.get(slotId);
  }

  getAvailableSlots() {
    const available = [];
    for (const slot of this.slots.values()) {
      if (slot.isAvailable()) {
        available.push(slot);
      }
    }
    return available;
  }

  getTotalSlotsCount() {
    return this.slots.size;
  }

  getOccupiedSlotsCount() {
    let count = 0;
    for (const slot of this.slots.values()) {
      if (slot.isOccupied) count++;
    }
    return count;
  }

  getAvailableSlotsCount() {
    let count = 0;
    for (const slot of this.slots.values()) {
      if (slot.isAvailable()) count++;
    }
    return count;
  }

  occupancyRate() {
    if (this.slots.size === 0) return 0;
    const occupied = this.getOccupiedSlotsCount();
    return Math.round((occupied / this.slots.size) * 100);
  }

  getStatus() {
    const rate = this.occupancyRate();
    if (rate >= 100) return 'full'; // Red
    if (rate >= 70) return 'filling'; // Amber
    return 'open'; // Green
  }
}

// ==========================================
// 4. Ticket Model
// ==========================================
class Ticket {
  constructor(id, vehicle, lotId, slotId, entryTime = new Date().toISOString(), owner = 'guest') {
    this.id = id; // e.g. "T-1001"
    this.vehicle = vehicle; // Vehicle instance or vehicle object { number, type }
    this.lotId = lotId;
    this.slotId = slotId;
    this.entryTime = entryTime;
    this.exitTime = null;
    this.durationMinutes = null;
    this.owner = owner || 'guest'; // username of owner (e.g. "admin", "user", "guest")
  }
}

// ==========================================
// 5. Reservation Model
// ==========================================
class Reservation {
  constructor(id, staffId, lotId, slotId, startTime, endTime, status = 'reserved', owner = null) {
    this.id = id; // e.g. "RES-501"
    this.staffId = staffId; // e.g. "STAFF-884"
    this.lotId = lotId;
    this.slotId = slotId;
    this.startTime = startTime; // ISO string or timestamp
    this.endTime = endTime; // ISO string or timestamp
    this.status = status; // "reserved" | "checked-in" | "expired" | "completed"
    this.owner = owner || staffId; // username or identity of owner
  }
}

// Attach to window / global scope for clean browser execution
if (typeof window !== 'undefined') {
  window.Vehicle = Vehicle;
  window.Slot = Slot;
  window.ParkingLot = ParkingLot;
  window.Ticket = Ticket;
  window.Reservation = Reservation;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Vehicle, Slot, ParkingLot, Ticket, Reservation };
}
