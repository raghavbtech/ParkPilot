/* Recommendation engine implemented in subsequent commit */

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
