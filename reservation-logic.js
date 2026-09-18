/**
 * ParkPilot — Staff Reservations & Overlap Management
 * Implements interval-overlap detection, conflict-free back-to-back booking,
 * and automatic reservation expiry checking.
 */

let resSequence = 501;

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap.
 * Mathematical definition: startA < endB && endA > startB
 * Note: If endA === startB (e.g. 10:00-12:00 and 12:00-14:00), they DO NOT overlap.
 */
function hasOverlap(startA, endA, startB, endB) {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && eA > sB;
}

/**
 * Creates a staff reservation for a dedicated staff slot.
 * Ensures no temporal overlap with existing bookings on the same slot.
 */
function reserveStaffSlot(lotId, slotId, staffId, startTime, endTime, state) {
  const formattedStaffId = (staffId || '').trim().toUpperCase();
  if (!formattedStaffId) throw new Error("Staff ID is required.");

  const sTime = new Date(startTime);
  const eTime = new Date(endTime);

  if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
    throw new Error("Invalid start or end time provided.");
  }

  if (sTime >= eTime) {
    throw new Error("Reservation start time must be before end time.");
  }

  const lot = state.lots.get(lotId);
  if (!lot) throw new Error(`Parking facility "${lotId}" not found.`);

  const slot = lot.getSlot(slotId);
  if (!slot) throw new Error(`Slot "${slotId}" not found in ${lot.name}.`);

  if (slot.type !== 'staff') {
    throw new Error(`Slot ${slot.id} is a ${slot.type.toUpperCase()} slot, not designated for staff reservations.`);
  }

  // Check for temporal overlap with all active/reserved reservations on this specific slot
  for (const res of state.reservations.values()) {
    if (res.lotId === lotId && res.slotId === slotId && res.status === 'reserved') {
      if (hasOverlap(sTime, eTime, res.startTime, res.endTime)) {
        const conflictFrom = new Date(res.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const conflictTo = new Date(res.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        throw new Error(`Time collision! Slot ${slotId} is already reserved by ${res.staffId} from ${conflictFrom} to ${conflictTo}.`);
      }
    }
  }

  // Create Reservation
  const resId = `RES-${resSequence++}`;
  const reservation = new Reservation(
    resId,
    formattedStaffId,
    lotId,
    slotId,
    sTime.toISOString(),
    eTime.toISOString(),
    'reserved'
  );

  // Mark slot
  slot.reservedFor = formattedStaffId;
  slot.reservationWindow = {
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    reservationId: resId
  };

  // Store in State Map
  state.reservations.set(resId, reservation);

  // Log in activity
  state.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    type: 'RESERVATION',
    title: 'Staff Slot Reserved',
    badge: 'amber',
    message: `${formattedStaffId} reserved ${lot.name} [Slot ${slotId}] (${sTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${eTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})`,
    timestamp: new Date().toISOString(),
    reservationId: resId
  });

  if (state.activityLog.length > 50) state.activityLog.pop();

  return reservation;
}

/**
 * Checks all active reservations against the current time.
 * If a reservation has surpassed its endTime, it is transitioned to "expired"
 * and the corresponding slot is unlocked.
 */
function checkAndExpireReservations(state, currentTime = new Date()) {
  if (!state || !state.reservations) return [];
  const nowMs = currentTime.getTime();
  const expiredList = [];

  for (const res of state.reservations.values()) {
    if (res.status === 'reserved') {
      const endMs = new Date(res.endTime).getTime();
      if (nowMs >= endMs) {
        res.status = 'expired';
        expiredList.push(res);

        const lot = state.lots.get(res.lotId);
        if (lot) {
          const slot = lot.getSlot(res.slotId);
          if (slot && slot.reservedFor === res.staffId) {
            slot.reservedFor = null;
            slot.reservationWindow = null;
          }
        }

        // Add to activity log
        state.activityLog.unshift({
          id: `ACT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          type: 'EXPIRY',
          title: 'Reservation Expired',
          badge: 'rose',
          message: `Staff reservation ${res.id} (${res.staffId}) expired and slot was released.`,
          timestamp: new Date().toISOString(),
          reservationId: res.id
        });
      }
    }
  }

  if (state.activityLog.length > 50) {
    state.activityLog.length = 50;
  }

  return expiredList;
}

/**
 * Calculates start and end Date objects for a selected timeslot (e.g. '13:00')
 * and day offset (0 = today, 1 = tomorrow, etc.). Default window: 60 minutes.
 * Returns clean start, end, and pre-formatted range strings (e.g. "13:00 – 14:00").
 */
function getTimeslotWindow(timeslotStr = '13:00', dayOffset = 0, durationMinutes = 60) {
  const str = typeof timeslotStr === 'number' ? `${String(timeslotStr).padStart(2, '0')}:00` : String(timeslotStr || '13:00');
  const parts = str.split(':').map(Number);
  const hours = isNaN(parts[0]) ? 13 : parts[0];
  const minutes = isNaN(parts[1]) ? 0 : parts[1];

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (dayOffset || 0), hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const startH = String(hours).padStart(2, '0');
  const startM = String(minutes).padStart(2, '0');
  const endH = String(end.getHours()).padStart(2, '0');
  const endM = String(end.getMinutes()).padStart(2, '0');

  const startTimeFormatted = `${startH}:${startM}`;
  const endTimeFormatted = `${endH}:${endM}`;
  const rangeFormatted = `${startTimeFormatted} – ${endTimeFormatted}`;

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    startTimeFormatted,
    endTimeFormatted,
    rangeFormatted
  };
}

/**
 * Checks if a slot has a conflicting reservation during the given [startTime, endTime] window.
 * Returns the conflicting reservation object or null if completely free.
 */
function getConflictingReservation(lotId, slotId, startTime, endTime, state) {
  if (!state || !state.reservations) return null;
  for (const res of state.reservations.values()) {
    if (res.lotId === lotId && res.slotId === slotId && res.status === 'reserved') {
      if (hasOverlap(startTime, endTime, res.startTime, res.endTime)) {
        return res;
      }
    }
  }
  return null;
}

/**
 * Convenience helper returning boolean if slot is reserved during the given window.
 */
function isSlotReservedInWindow(lotId, slotId, startTime, endTime, state) {
  return getConflictingReservation(lotId, slotId, startTime, endTime, state) !== null;
}

/**
 * Creates and stores an advance timeslot reservation for a vehicle.
 */
function bookAdvanceReservation(lotId, slotId, vehiclePlate, vehicleType, startTime, endTime, state, owner = null) {
  const formattedPlate = (vehiclePlate || '').trim().toUpperCase();
  if (!formattedPlate) throw new Error("License plate is required.");

  const sTime = new Date(startTime);
  const eTime = new Date(endTime);

  if (isNaN(sTime.getTime()) || isNaN(eTime.getTime())) {
    throw new Error("Invalid start or end time provided.");
  }
  if (sTime >= eTime) {
    throw new Error("Reservation start time must be before end time.");
  }

  const lot = state.lots.get(lotId);
  if (!lot) throw new Error(`Parking facility "${lotId}" not found.`);

  const slot = lot.getSlot(slotId);
  if (!slot) throw new Error(`Slot "${slotId}" not found in ${lot.name}.`);

  const conflict = getConflictingReservation(lotId, slotId, sTime, eTime, state);
  if (conflict) {
    const fromStr = new Date(conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const toStr = new Date(conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    throw new Error(`Conflict! Slot ${slotId} is already reserved by ${conflict.staffId} from ${fromStr} to ${toStr}.`);
  }

  if (slot.type === 'ev' && vehicleType !== 'ev-car') {
    throw new Error(`Slot ${slot.id} is an EV-dedicated charging bay. Only EV vehicles may book it.`);
  }

  let maxNum = 500;
  for (const key of state.reservations.keys()) {
    const n = parseInt(key.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const resId = `RES-${maxNum + 1}`;

  const resOwner = owner || (state && state.currentUser ? (state.currentUser.username || state.currentUser.role) : 'guest');
  const reservation = new Reservation(
    resId,
    formattedPlate,
    lotId,
    slotId,
    sTime.toISOString(),
    eTime.toISOString(),
    'reserved',
    resOwner
  );

  state.reservations.set(resId, reservation);

  const now = Date.now();
  if (sTime.getTime() <= now && eTime.getTime() > now) {
    slot.reservedFor = formattedPlate;
    slot.reservationWindow = {
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      reservationId: resId
    };
  }

  state.activityLog.unshift({
    id: `ACT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    type: 'RESERVATION',
    title: 'Advance Slot Pre-Booked',
    badge: 'amber',
    message: `${formattedPlate} (${vehicleType || 'vehicle'}) reserved ${lot.name} [Slot ${slotId}] for ${sTime.toLocaleDateString([], {month:'short', day:'numeric'})} ${sTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${eTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`,
    timestamp: new Date().toISOString(),
    reservationId: resId
  });

  if (state.activityLog.length > 50) state.activityLog.pop();

  return reservation;
}

if (typeof window !== 'undefined') {
  window.hasOverlap = hasOverlap;
  window.reserveStaffSlot = reserveStaffSlot;
  window.checkAndExpireReservations = checkAndExpireReservations;
  window.getTimeslotWindow = getTimeslotWindow;
  window.getConflictingReservation = getConflictingReservation;
  window.isSlotReservedInWindow = isSlotReservedInWindow;
  window.bookAdvanceReservation = bookAdvanceReservation;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hasOverlap,
    reserveStaffSlot,
    checkAndExpireReservations,
    getTimeslotWindow,
    getConflictingReservation,
    isSlotReservedInWindow,
    bookAdvanceReservation
  };
}
