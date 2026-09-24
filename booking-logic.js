/**
 * ParkPilot — Booking Logic & Algorithmic Decision Engine
 * Implements:
 * 1. Filtering & Ranking Recommendation logic
 * 2. Best-Fit Slot Allocation algorithm
 * 3. Explainable Decision Generators ("Why this lot?", "Why this slot?")
 * 4. O(1) Ticket Entry & Exit flows with Map and Set
 */

// Sizing hierarchy: bike < car < suv
const SIZE_RANKS = {
  bike: 1,
  car: 2,
  suv: 3
};

/**
 * Checks if a slot size is physically compatible with a vehicle type.
 * A vehicle can fit in its exact size or any larger size.
 */
function isSizeCompatible(vehicleType, slotSize) {
  const vType = vehicleType === 'ev-car' ? 'car' : vehicleType;
  const vRank = SIZE_RANKS[vType] || 2;
  const sRank = SIZE_RANKS[slotSize] || 2;
  return sRank >= vRank;
}

/**
 * Filters a lot's slots for all available and compatible slots for a given vehicle.
 */
function getCompatibleSlots(lot, vehicle) {
  const compatible = [];
  const isEvVehicle = vehicle.type === 'ev-car';

  for (const slot of lot.slots.values()) {
    // 1. Must not be occupied and must not be reserved
    if (!slot.isAvailable()) continue;

    // 2. Staff slots are strictly for staff reservations
    if (slot.type === 'staff') continue;

    // 3. EV slots are reserved exclusively for EV vehicles
    if (slot.type === 'ev' && !isEvVehicle) continue;

    // 4. Physical size compatibility
    if (isSizeCompatible(vehicle.type, slot.size)) {
      compatible.push(slot);
    }
  }

  return compatible;
}

/**
 * Best-Fit Slot Allocation Algorithm
 * Evaluates candidate slots and chooses the best fit:
 * 1. Dedicated EV slot (if vehicle is EV)
 * 2. Exact size match in general slots
 * 3. Compatible larger size slot
 * Returns selected slot + explainable reason
 */
function findBestFitSlot(lot, vehicle) {
  const candidates = getCompatibleSlots(lot, vehicle);
  if (candidates.length === 0) return null;

  const isEv = vehicle.type === 'ev-car';
  const targetSize = isEv ? 'car' : vehicle.type;

  // 1. If EV, look for EV-dedicated slot first
  if (isEv) {
    const exactEvSlot = candidates.find(s => s.type === 'ev' && s.size === targetSize);
    if (exactEvSlot) {
      return {
        slot: exactEvSlot,
        fitType: 'ev-dedicated',
        reasons: [
          `Dedicated EV charging station`,
          `Exact ${targetSize.toUpperCase()} fit`,
          `Currently free and unreserved`
        ]
      };
    }
    const anyEvSlot = candidates.find(s => s.type === 'ev');
    if (anyEvSlot) {
      return {
        slot: anyEvSlot,
        fitType: 'ev-compatible',
        reasons: [
          `Dedicated EV charging station`,
          `Compatible larger slot (${anyEvSlot.size.toUpperCase()})`,
          `Currently free and unreserved`
        ]
      };
    }
  }

  // 2. Exact size match
  const exactSlot = candidates.find(s => s.size === targetSize && s.type === 'general');
  if (exactSlot) {
    return {
      slot: exactSlot,
      fitType: 'exact',
      reasons: [
        `Exact vehicle-slot size match (${targetSize.toUpperCase()})`,
        `Preserves larger SUV bays for bigger vehicles`,
        `Currently free and unreserved`
      ]
    };
  }

  // 3. Fallback: Compatible larger slot
  const largerSlot = candidates.sort((a, b) => (SIZE_RANKS[a.size] || 0) - (SIZE_RANKS[b.size] || 0))[0];
  return {
    slot: largerSlot,
    fitType: 'larger',
    reasons: [
      `No exact ${targetSize.toUpperCase()} slot free`,
      `Allocated compatible larger slot (${largerSlot.size.toUpperCase()})`,
      `Currently free and unreserved`
    ]
  };
}

/**
 * Filter lots: Only lots with at least one compatible available slot.
 */
function getEligibleLots(vehicle, lotsMap) {
  const eligible = [];
  for (const lot of lotsMap.values()) {
    const compatible = getCompatibleSlots(lot, vehicle);
    if (compatible.length > 0) {
      eligible.push({
        lot,
        compatibleSlots: compatible,
        availableTotal: lot.getAvailableSlotsCount()
      });
    }
  }
  return eligible;
}

/**
 * Rank eligible lots:
 * Primary: Shortest Haversine distance
 * Tie-breaker: Higher number of free compatible slots
 */
function rankLots(eligibleList, userCoords) {
  return eligibleList
    .map(item => {
      const distance = haversineDistance(
        userCoords.lat,
        userCoords.lng,
        item.lot.lat,
        item.lot.lng
      );
      return {
        ...item,
        distance
      };
    })
    .sort((a, b) => {
      if (Math.abs(a.distance - b.distance) < 0.05) {
        // Tie-breaker: Prefer lot with more free slots
        return b.compatibleSlots.length - a.compatibleSlots.length;
      }
      return a.distance - b.distance;
    });
}

/**
 * Deterministic recommendation engine
 * Returns the best lot with "Why this lot?" explainability breakdown.
 */
function getRecommendedLot(userCoords, vehicle, lotsMap) {
  const eligible = getEligibleLots(vehicle, lotsMap);
  if (eligible.length === 0) {
    return {
      winningLot: null,
      reasons: ["No parking lots currently have compatible available slots for this vehicle type."],
      rankedList: []
    };
  }

  const ranked = rankLots(eligible, userCoords);
  const top = ranked[0];

  const reasons = [
    `Compatible slot available for ${vehicle.type.toUpperCase()}`,
    `${top.availableTotal} total free slot${top.availableTotal !== 1 ? 's' : ''} (${top.lot.occupancyRate()}% occupancy)`,
    `Nearest valid facility (${top.distance} km via Haversine distance)`
  ];

  if (vehicle.type === 'ev-car') {
    reasons.push(`EV charging infrastructure verified`);
  }

  return {
    winningLot: top.lot,
    distance: top.distance,
    compatibleSlotsCount: top.compatibleSlots.length,
    reasons,
    rankedList: ranked
  };
}

/**
 * Ticket Generation & Vehicle Entry Flow
 * Updates Map and Set in O(1) average time.
 */
let ticketSequence = 1001;

function generateTicket(vehicle, lot, slot, state, owner = null) {
  // 1. O(1) duplicate vehicle check via Set
  if (state.activeVehicleNumbers.has(vehicle.number)) {
    throw new Error(`Vehicle ${vehicle.number} is already marked as active in a parking lot.`);
  }

  // 2. Validate slot availability
  if (!slot.isAvailable()) {
    throw new Error(`Slot ${slot.id} in ${lot.name} is no longer available.`);
  }

  // 3. Create Ticket with Owner tracking
  if (state && state.activeTickets) {
    for (const key of state.activeTickets.keys()) {
      const n = parseInt(key.replace(/\D/g, ''), 10);
      if (!isNaN(n) && n >= ticketSequence) ticketSequence = n + 1;
    }
  }
  const ticketId = `T-${ticketSequence++}`;
  const entryTime = new Date().toISOString();
  const ticketOwner = owner || (state && state.currentUser ? (state.currentUser.username || state.currentUser.role) : 'guest');
  const ticket = new Ticket(ticketId, vehicle, lot.id, slot.id, entryTime, ticketOwner);

  // 4. Update Slot state
  slot.isOccupied = true;
  slot.currentTicketId = ticketId;
  slot.currentVehicle = vehicle;

  // 5. Update O(1) Collections
  state.activeTickets.set(ticketId, ticket);
  state.activeVehicleNumbers.add(vehicle.number);

  // 6. Record in Activity Log
  state.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    type: 'ENTRY',
    title: 'Vehicle Entered',
    badge: 'cyan',
    message: `${vehicle.describe()} parked in ${lot.name} [Slot ${slot.id}]`,
    timestamp: new Date().toISOString(),
    ticketId
  });

  // Keep log capped at 50 records for memory efficiency
  if (state.activityLog.length > 50) state.activityLog.pop();

  return ticket;
}

/**
 * Locate Ticket by ID in O(1) average time
 */
function findTicket(ticketId, state) {
  const formattedId = (ticketId || '').trim().toUpperCase();
  return state.activeTickets.get(formattedId) || null;
}

/**
 * Vehicle Exit Flow
 * O(1) lookup and release.
 */
function exitVehicle(ticketId, state) {
  const formattedId = (ticketId || '').trim().toUpperCase();
  
  // 1. O(1) lookup via Map
  const ticket = state.activeTickets.get(formattedId);
  if (!ticket) {
    throw new Error(`Ticket ID "${formattedId}" not found or already exited.`);
  }

  const lot = state.lots.get(ticket.lotId);
  if (!lot) throw new Error(`Associated lot "${ticket.lotId}" not found.`);

  const slot = lot.getSlot(ticket.slotId);
  if (!slot) throw new Error(`Associated slot "${ticket.slotId}" not found.`);

  // 2. Calculate duration
  const exitTime = new Date().toISOString();
  ticket.exitTime = exitTime;
  const durationMs = new Date(exitTime) - new Date(ticket.entryTime);
  const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
  ticket.durationMinutes = durationMinutes;

  // 3. Free Slot state
  slot.isOccupied = false;
  slot.currentTicketId = null;
  slot.currentVehicle = null;

  // 4. Update O(1) collections
  state.activeTickets.delete(ticket.id);
  state.activeVehicleNumbers.delete(ticket.vehicle.number);

  // 5. Append to Parking History
  state.parkingHistory.unshift({
    ticketId: ticket.id,
    vehicleNumber: ticket.vehicle.number,
    vehicleType: ticket.vehicle.type,
    lotId: lot.id,
    lotName: lot.name,
    slotId: slot.id,
    entryTime: ticket.entryTime,
    exitTime: ticket.exitTime,
    durationMinutes
  });

  // 6. Record in Activity Log
  state.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    type: 'EXIT',
    title: 'Vehicle Exited',
    badge: 'emerald',
    message: `${ticket.vehicle.number} departed from ${lot.name} [Slot ${slot.id}] (${durationMinutes}m)`,
    timestamp: new Date().toISOString(),
    ticketId: ticket.id
  });

  if (state.activityLog.length > 50) state.activityLog.pop();

  return { ticket, lot, slot, durationMinutes };
}

if (typeof window !== 'undefined') {
  window.isSizeCompatible = isSizeCompatible;
  window.getCompatibleSlots = getCompatibleSlots;
  window.findBestFitSlot = findBestFitSlot;
  window.getEligibleLots = getEligibleLots;
  window.rankLots = rankLots;
  window.getRecommendedLot = getRecommendedLot;
  window.generateTicket = generateTicket;
  window.findTicket = findTicket;
  window.exitVehicle = exitVehicle;
}
