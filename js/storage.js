/**
 * ParkPilot — Multi-Tier State Persistence & Storage Engine
 * Implements:
 * 1. Web Storage API (localStorage & sessionStorage)
 * 2. Native Browser Cookies (document.cookie)
 * 3. IndexedDB API (asynchronous object database)
 */

const STORAGE_KEY = 'PARKPILOT_STATE_V1';
const SESSION_CACHE_KEY = 'PARKPILOT_SESSION_V1';
const DB_NAME = 'ParkPilotDB';
const DB_VERSION = 1;

/* ==========================================================================
   1. COOKIE STORAGE MANAGER (document.cookie)
   Used for session tokens, theme preferences, and visit tracking.
   ========================================================================== */

/**
 * Sets a client cookie with name, value, and expiration in days.
 */
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

/**
 * Retrieves a cookie value by name.
 * @returns {string|null}
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Deletes a cookie by expiring it immediately.
 */
function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

/* ==========================================================================
   2. WEB STORAGE API: SESSION STORAGE
   Used for active tab navigation, temporary filter criteria, and view state.
   ========================================================================== */

/**
 * Saves a key-value pair to sessionStorage.
 */
function saveToSessionStorage(key, value) {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  } catch (err) {
    console.warn('sessionStorage write warning:', err);
  }
}

/**
 * Loads a value from sessionStorage, automatically parsing JSON if possible.
 */
function loadFromSessionStorage(key) {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return raw;
    }
  } catch (err) {
    console.warn('sessionStorage read warning:', err);
    return null;
  }
}

/**
 * Clears sessionStorage.
 */
function clearSessionStorage() {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  } catch (err) {
    console.warn('sessionStorage clear warning:', err);
  }
}

/* ==========================================================================
   3. WEB STORAGE API: LOCAL STORAGE
   Serializes and deserializes ES6 Map, Set, and Class instances to/from JSON.
   ========================================================================== */

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

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    // Also sync active theme and user cookie
    if (state.currentTheme) setCookie('parkpilot_theme', state.currentTheme, 30);
    if (state.currentUser) setCookie('parkpilot_user', state.currentUser.username, 7);
    setCookie('parkpilot_last_active', new Date().toISOString(), 7);

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
    if (typeof localStorage === 'undefined') return null;
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
        const offsetMins = 25 + (activeTickets.size % 6) * 20;
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
      userCoords: data.userCoords || (typeof DEFAULT_CENTER_COORDS !== 'undefined' ? DEFAULT_CENTER_COORDS : { latitude: 28.6139, longitude: 77.2090 }),
      currentView: data.currentView || 'landing',
      currentTheme: data.currentTheme || getCookie('parkpilot_theme') || 'dark',
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
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  deleteCookie('parkpilot_user');
}

/* ==========================================================================
   4. INDEXEDDB API STORAGE ENGINE
   Provides asynchronous persistent storage for audit logs, historical receipts,
   and offline facilities caching.
   ========================================================================== */

let _idbInstance = null;

/**
 * Initializes and opens the ParkPilot IndexedDB database.
 * Creates object stores: 'ticketHistory', 'activityAudit', and 'facilitiesBackup'.
 * @returns {Promise<IDBDatabase>}
 */
function initIndexedDB() {
  return new Promise((resolve, reject) => {
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
      // Object store for historical tickets and receipts
      if (!db.objectStoreNames.contains('ticketHistory')) {
        const store = db.createObjectStore('ticketHistory', { keyPath: 'id' });
        store.createIndex('lotId', 'lotId', { unique: false });
        store.createIndex('exitTime', 'exitTime', { unique: false });
      }
      // Object store for system activity logs
      if (!db.objectStoreNames.contains('activityAudit')) {
        const store = db.createObjectStore('activityAudit', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      // Object store for offline facilities cache
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

/**
 * Stores a closed ticket / departure receipt in IndexedDB.
 */
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

/**
 * Retrieves all tickets from IndexedDB history.
 */
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

/**
 * Appends an activity log to IndexedDB audit store.
 */
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

/**
 * Retrieves all activity audit logs from IndexedDB.
 */
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
   GLOBAL EXPORTS & MODULE EXPORTS
   ========================================================================== */

if (typeof window !== 'undefined') {
  window.saveToLocalStorage = saveToLocalStorage;
  window.loadFromLocalStorage = loadFromLocalStorage;
  window.clearLocalStorageState = clearLocalStorageState;

  window.saveToSessionStorage = saveToSessionStorage;
  window.loadFromSessionStorage = loadFromSessionStorage;
  window.clearSessionStorage = clearSessionStorage;

  window.setCookie = setCookie;
  window.getCookie = getCookie;
  window.deleteCookie = deleteCookie;

  window.initIndexedDB = initIndexedDB;
  window.saveTicketToIndexedDB = saveTicketToIndexedDB;
  window.getAllTicketsFromIndexedDB = getAllTicketsFromIndexedDB;
  window.logActivityToIndexedDB = logActivityToIndexedDB;
  window.getActivityLogsFromIndexedDB = getActivityLogsFromIndexedDB;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorageState,
    saveToSessionStorage,
    loadFromSessionStorage,
    clearSessionStorage,
    setCookie,
    getCookie,
    deleteCookie,
    initIndexedDB,
    saveTicketToIndexedDB,
    getAllTicketsFromIndexedDB,
    logActivityToIndexedDB,
    getActivityLogsFromIndexedDB
  };
}
