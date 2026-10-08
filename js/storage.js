/**
 * ParkPilot — Web Storage State Persistence Engine
 * Demonstrates native HTML5 Web Storage API:
 * 1. localStorage for persistent state (Lots, Slots, Tickets, Reservations)
 * 2. sessionStorage for temporary active session state
 */

const STORAGE_KEY = 'PARKPILOT_STATE_V1';

/* ==========================================================================
   1. LOCAL STORAGE: APPLICATION STATE PERSISTENCE
   ========================================================================== */

/**
 * Saves entire application state (Lots, Tickets, Reservations, History) to localStorage.
 * Handles serialization of ES6 Map and Set data structures.
 */
function saveToLocalStorage(state) {
  try {
    if (typeof localStorage === 'undefined' || !state) return;

    const serializedLots = state.lots ? Array.from(state.lots.values()).map(lot => ({
      id: lot.id, name: lot.name, lat: lot.lat, lng: lot.lng, address: lot.address, totalFloors: lot.totalFloors || 1,
      slots: Array.from(lot.slots.values()).map(s => ({
        id: s.id, type: s.type, size: s.size, floor: s.floor || 1, isOccupied: s.isOccupied,
        currentTicketId: s.currentTicketId, currentVehicle: s.currentVehicle,
        reservedFor: s.reservedFor, reservationWindow: s.reservationWindow
      }))
    })) : [];

    const payload = {
      lots: serializedLots,
      activeTickets: state.activeTickets ? Array.from(state.activeTickets.entries()) : [],
      activeVehicleNumbers: state.activeVehicleNumbers ? Array.from(state.activeVehicleNumbers) : [],
      reservations: state.reservations ? Array.from(state.reservations.entries()) : [],
      activityLog: state.activityLog || [],
      parkingHistory: state.parkingHistory || [],
      userCoords: state.userCoords,
      currentView: state.currentView,
      currentTheme: state.currentTheme || 'dark',
      accounts: state.accounts || [],
      currentUser: state.currentUser || null,
      currentUserRole: state.currentUserRole || 'admin',
      savedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('localStorage write warning:', err);
  }
}

/**
 * Loads application state from localStorage, reinstantiating ES6 class instances.
 * @returns {object|null} Restored state or null if not found.
 */
function loadFromLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);

    // 1. Rebuild Lots Map with ParkingLot and Slot class instances
    const lots = new Map();
    (data.lots || []).forEach(l => {
      const lot = new ParkingLot(l.id, l.name, l.lat, l.lng, l.address, l.totalFloors || 1);
      (l.slots || []).forEach(s => {
        const slot = new Slot(s.id, s.type, s.size, s.floor || 1);
        slot.isOccupied = s.isOccupied;
        slot.currentTicketId = s.currentTicketId;
        slot.currentVehicle = s.currentVehicle ? new Vehicle(s.currentVehicle.number, s.currentVehicle.type) : null;
        slot.reservedFor = s.reservedFor;
        slot.reservationWindow = s.reservationWindow;
        lot.addSlot(slot);
      });
      lots.set(lot.id, lot);
    });

    // 2. Rebuild Active Tickets Map with Ticket class instances
    const activeTickets = new Map();
    (data.activeTickets || []).forEach(([tId, tObj]) => {
      const vehicle = new Vehicle(tObj.vehicle.number, tObj.vehicle.type);
      const ticket = new Ticket(tObj.id, vehicle, tObj.lotId, tObj.slotId, tObj.entryTime, tObj.owner || 'guest');
      ticket.exitTime = tObj.exitTime;
      ticket.durationMinutes = tObj.durationMinutes;
      activeTickets.set(tId, ticket);
    });

    // 3. Rebuild Active Vehicles Set for O(1) duplicate checks
    const activeVehicleNumbers = new Set(data.activeVehicleNumbers || []);

    // 4. Rebuild Reservations Map with Reservation class instances
    const reservations = new Map();
    (data.reservations || []).forEach(([rId, rObj]) => {
      const res = new Reservation(rObj.id, rObj.staffId, rObj.lotId, rObj.slotId, rObj.startTime, rObj.endTime, rObj.status, rObj.owner);
      reservations.set(rId, res);
    });

    return {
      lots, activeTickets, activeVehicleNumbers, reservations,
      activityLog: data.activityLog || [],
      parkingHistory: data.parkingHistory || [],
      userCoords: data.userCoords || { lat: 28.6139, lng: 77.2090 },
      currentView: data.currentView || 'landing',
      currentTheme: data.currentTheme || 'dark',
      accounts: data.accounts || [],
      currentUser: data.currentUser || null,
      currentUserRole: data.currentUserRole || 'admin'
    };
  } catch (err) {
    console.warn('localStorage parse warning:', err);
    return null;
  }
}

/** Clears stored application state from localStorage */
function clearLocalStorageState() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
}

/* ==========================================================================
   2. SESSION STORAGE: TEMPORARY VIEW & TAB STATE
   ========================================================================== */

function saveToSessionStorage(key, value) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  } catch (err) {
    console.warn('sessionStorage write warning:', err);
  }
}

function loadFromSessionStorage(key) {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return raw; }
  } catch (err) {
    return null;
  }
}

function clearSessionStorage() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  } catch (_) {}
}

/* ==========================================================================
   3. COOKIE STORAGE MANAGER (document.cookie)
   Used for session tokens, theme preferences, and visit tracking.
   ========================================================================== */

function setCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value || '') + expires + '; path=/; SameSite=Lax';
}

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = (document.cookie || '').split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

/* ==========================================================================
   4. INDEXEDDB API STORAGE ENGINE
   Provides asynchronous persistent storage for audit logs, historical receipts,
   and offline facilities caching.
   ========================================================================== */

const DB_NAME = 'ParkPilotDB';
const DB_VERSION = 1;
let _idbInstance = null;

function initIndexedDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    if (_idbInstance) {
      resolve(_idbInstance);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('ticketHistory')) {
        const store = db.createObjectStore('ticketHistory', { keyPath: 'id' });
        store.createIndex('lotId', 'lotId', { unique: false });
        store.createIndex('exitTime', 'exitTime', { unique: false });
      }
      if (!db.objectStoreNames.contains('activityAudit')) {
        const store = db.createObjectStore('activityAudit', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('facilitiesBackup')) {
        db.createObjectStore('facilitiesBackup', { keyPath: 'id' });
      }
    };

    request.onsuccess = function (event) {
      _idbInstance = event.target.result;
      resolve(_idbInstance);
    };

    request.onerror = function (event) {
      console.warn('IndexedDB failed to open:', event.target.error);
      resolve(null);
    };
  });
}

function saveTicketToIndexedDB(ticket) {
  return new Promise((resolve) => {
    initIndexedDB().then(db => {
      if (!db) { resolve(false); return; }
      try {
        const tx = db.transaction('ticketHistory', 'readwrite');
        const store = tx.objectStore('ticketHistory');
        const serializableTicket = {
          id: ticket.id,
          vehiclePlate: ticket.vehicle ? ticket.vehicle.number : 'UNKNOWN',
          vehicleType: ticket.vehicle ? ticket.vehicle.type : 'Car',
          lotId: ticket.lotId,
          slotId: ticket.slotId,
          entryTime: ticket.entryTime,
          exitTime: ticket.exitTime || new Date().toISOString(),
          durationMinutes: ticket.durationMinutes || 0,
          totalFee: ticket.totalFee || 0,
          savedAt: new Date().toISOString()
        };
        store.put(serializableTicket);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (err) {
        console.warn('Error saving to IndexedDB ticketHistory:', err);
        resolve(false);
      }
    });
  });
}

function getAllTicketsFromIndexedDB() {
  return new Promise((resolve) => {
    initIndexedDB().then(db => {
      if (!db) { resolve([]); return; }
      try {
        const tx = db.transaction('ticketHistory', 'readonly');
        const store = tx.objectStore('ticketHistory');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('Error reading from IndexedDB ticketHistory:', err);
        resolve([]);
      }
    });
  });
}

function logActivityToIndexedDB(entry) {
  return new Promise((resolve) => {
    initIndexedDB().then(db => {
      if (!db) { resolve(false); return; }
      try {
        const tx = db.transaction('activityAudit', 'readwrite');
        const store = tx.objectStore('activityAudit');
        store.add({
          message: typeof entry === 'string' ? entry : entry.message,
          type: entry.type || 'info',
          timestamp: entry.timestamp || new Date().toISOString()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (err) {
        console.warn('Error writing to IndexedDB activityAudit:', err);
        resolve(false);
      }
    });
  });
}

function getActivityLogsFromIndexedDB() {
  return new Promise((resolve) => {
    initIndexedDB().then(db => {
      if (!db) { resolve([]); return; }
      try {
        const tx = db.transaction('activityAudit', 'readonly');
        const store = tx.objectStore('activityAudit');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (err) {
        console.warn('Error reading from IndexedDB activityAudit:', err);
        resolve([]);
      }
    });
  });
}

/* ==========================================================================
   GLOBAL SCOPE & MODULE EXPORTS
   ========================================================================== */

if (typeof window !== 'undefined') {
  Object.assign(window, {
    saveToLocalStorage, loadFromLocalStorage, clearLocalStorageState,
    saveToSessionStorage, loadFromSessionStorage, clearSessionStorage,
    setCookie, getCookie, deleteCookie,
    initIndexedDB, saveTicketToIndexedDB, getAllTicketsFromIndexedDB,
    logActivityToIndexedDB, getActivityLogsFromIndexedDB
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEY, DB_NAME, saveToLocalStorage, loadFromLocalStorage, clearLocalStorageState,
    saveToSessionStorage, loadFromSessionStorage, clearSessionStorage,
    setCookie, getCookie, deleteCookie,
    initIndexedDB, saveTicketToIndexedDB, getAllTicketsFromIndexedDB,
    logActivityToIndexedDB, getActivityLogsFromIndexedDB
  };
}
