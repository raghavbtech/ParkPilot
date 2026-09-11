/**
 * ParkPilot — State Persistence & LocalStorage Manager
 * Serializes and deserializes ES6 Map, Set, and Class instances to/from JSON.
 */

const STORAGE_KEY = 'PARKPILOT_STATE_V1';

/**
 * Saves current application state to localStorage.
 */
function saveToLocalStorage(state) {
  try {
    const serializedLots = [];
    for (const lot of state.lots.values()) {
      const serializedSlots = [];
      for (const slot of lot.slots.values()) {
        serializedSlots.push({
          id: slot.id,
          type: slot.type,
          size: slot.size,
          floor: slot.floor || 1,
          isOccupied: slot.isOccupied,
          currentTicketId: slot.currentTicketId,
          currentVehicle: slot.currentVehicle,
          reservedFor: slot.reservedFor,
          reservationWindow: slot.reservationWindow
        });
      }
      serializedLots.push({
        id: lot.id,
        name: lot.name,
        lat: lot.lat,
        lng: lot.lng,
        address: lot.address,
        totalFloors: lot.totalFloors,
        slots: serializedSlots
      });
    }

    const payload = {
      lots: serializedLots,
      activeTickets: Array.from(state.activeTickets.entries()),
      activeVehicleNumbers: Array.from(state.activeVehicleNumbers),
      reservations: Array.from(state.reservations.entries()),
      activityLog: state.activityLog,
      parkingHistory: state.parkingHistory,
      userCoords: state.userCoords,
      currentView: state.currentView,
      currentTheme: state.currentTheme || 'dark',
      accounts: state.accounts,
      currentUser: state.currentUser,
      currentUserRole: state.currentUserRole || (state.currentUser ? state.currentUser.role : 'admin'),
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

/**
 * Restores application state from localStorage, reinstantiating ES6 class instances.
 * @returns {object|null} Restored state or null if no valid cache exists.
 */
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // 1. Rebuild Lots Map & Slot instances
    const lots = new Map();
    data.lots.forEach(l => {
      const lot = new ParkingLot(l.id, l.name, l.lat, l.lng, l.address, 1);
      l.slots.forEach(s => {
        const slot = new Slot(s.id, s.type, s.size, 1);
        slot.isOccupied = s.isOccupied;
        slot.currentTicketId = s.currentTicketId;
        slot.currentVehicle = s.currentVehicle ? new Vehicle(s.currentVehicle.number, s.currentVehicle.type) : null;
        slot.reservedFor = s.reservedFor;
        slot.reservationWindow = s.reservationWindow;
        lot.addSlot(slot);
      });
      lots.set(lot.id, lot);
    });

    // 2. Rebuild Active Tickets Map
    const activeTickets = new Map();
    data.activeTickets.forEach(([tId, tObj]) => {
      const vehicle = new Vehicle(tObj.vehicle.number, tObj.vehicle.type);
      let entryTime = tObj.entryTime;
      const ageHours = (Date.now() - new Date(entryTime).getTime()) / 3600000;
      if (ageHours > 12 || isNaN(ageHours)) {
        const offsetMins = 25 + (activeTickets.size % 6) * 20; // 25m, 45m, 65m, 85m...
        entryTime = new Date(Date.now() - offsetMins * 60000).toISOString();
      }
      const ticket = new Ticket(tObj.id, vehicle, tObj.lotId, tObj.slotId, entryTime, tObj.owner || 'guest');
      ticket.exitTime = tObj.exitTime;
      ticket.durationMinutes = tObj.durationMinutes;
      ticket.owner = tObj.owner || 'guest';
      activeTickets.set(tId, ticket);
    });

    // 3. Rebuild Active Vehicles Set
    const activeVehicleNumbers = new Set(data.activeVehicleNumbers);

    // 4. Rebuild Reservations Map
    const reservations = new Map();
    data.reservations.forEach(([rId, rObj]) => {
      const res = new Reservation(
        rObj.id,
        rObj.staffId,
        rObj.lotId,
        rObj.slotId,
        rObj.startTime,
        rObj.endTime,
        rObj.status,
        rObj.owner || rObj.staffId
      );
      reservations.set(rId, res);
    });

    return {
      lots,
      activeTickets,
      activeVehicleNumbers,
      reservations,
      activityLog: data.activityLog || [],
      parkingHistory: data.parkingHistory || [],
      userCoords: data.userCoords || DEFAULT_CENTER_COORDS,
      currentView: data.currentView || 'landing',
      currentTheme: data.currentTheme || 'dark',
      accounts: data.accounts || [],
      currentUser: data.currentUser || null,
      currentUserRole: data.currentUserRole || (data.currentUser ? data.currentUser.role : 'admin')
    };
  } catch (err) {
    console.warn("Could not parse localStorage state, resetting to initial seed:", err);
    return null;
  }
}

/**
 * Resets local storage and clears persistent state.
 */
function clearLocalStorageState() {
  localStorage.removeItem(STORAGE_KEY);
}

if (typeof window !== 'undefined') {
  window.saveToLocalStorage = saveToLocalStorage;
  window.loadFromLocalStorage = loadFromLocalStorage;
  window.clearLocalStorageState = clearLocalStorageState;
}
