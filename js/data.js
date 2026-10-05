/**
 * ParkPilot — Initial Seed Data & Configurations
 * Defines metro parking facilities with coordinates, slot distributions, and initial states.
 */

const DEFAULT_CENTER_COORDS = {
  lat: 28.6139,
  lng: 77.2090,
  name: "City Center (Connaught Place)"
};

const INITIAL_LOTS_CONFIG = [
  {
    id: "LOT-01",
    name: "City Mall Parking",
    lat: 28.6129,
    lng: 77.2295,
    address: "Block A, Commercial Plaza, Central Ave",
    slots: [
      { id: "CM-B01", type: "general", size: "bike" },
      { id: "CM-B02", type: "general", size: "bike" },
      { id: "CM-B03", type: "general", size: "bike" },
      { id: "CM-C01", type: "general", size: "car" },
      { id: "CM-C02", type: "general", size: "car" },
      { id: "CM-C03", type: "general", size: "car" },
      { id: "CM-C04", type: "general", size: "car" },
      { id: "CM-C05", type: "general", size: "car" },
      { id: "CM-C06", type: "general", size: "car" },
      { id: "CM-C07", type: "general", size: "car" },
      { id: "CM-C08", type: "general", size: "car" },
      { id: "CM-C09", type: "general", size: "car" },
      { id: "CM-C10", type: "general", size: "car" },
      { id: "CM-C11", type: "general", size: "car" },
      { id: "CM-C12", type: "general", size: "car" },
      { id: "CM-S01", type: "general", size: "suv" },
      { id: "CM-S02", type: "general", size: "suv" },
      { id: "CM-S03", type: "general", size: "suv" },
      { id: "CM-S04", type: "general", size: "suv" },
      { id: "CM-S05", type: "general", size: "suv" },
      { id: "CM-S06", type: "general", size: "suv" },
      { id: "CM-E01", type: "ev", size: "car" },
      { id: "CM-E02", type: "ev", size: "car" },
      { id: "CM-E03", type: "ev", size: "suv" },
      { id: "CM-E04", type: "ev", size: "car" },
      { id: "CM-E05", type: "ev", size: "car" },
      { id: "CM-E06", type: "ev", size: "suv" },
      { id: "CM-ST1", type: "staff", size: "car" },
      { id: "CM-ST2", type: "staff", size: "suv" },
      { id: "CM-ST3", type: "staff", size: "car" }
    ]
  },
  {
    id: "LOT-02",
    name: "Station Road Plaza",
    lat: 28.6219,
    lng: 77.2185,
    address: "Platform Exit 4, Rail Transit Hub",
    slots: [
      { id: "SR-B01", type: "general", size: "bike" },
      { id: "SR-B02", type: "general", size: "bike" },
      { id: "SR-C01", type: "general", size: "car" },
      { id: "SR-C02", type: "general", size: "car" },
      { id: "SR-C03", type: "general", size: "car" },
      { id: "SR-C04", type: "general", size: "car" },
      { id: "SR-S01", type: "general", size: "suv" },
      { id: "SR-S02", type: "general", size: "suv" },
      { id: "SR-E01", type: "ev", size: "car" },
      { id: "SR-E02", type: "ev", size: "suv" },
      { id: "SR-ST1", type: "staff", size: "car" },
      { id: "SR-ST2", type: "staff", size: "car" }
    ]
  },
  {
    id: "LOT-03",
    name: "Tech Park Hub",
    lat: 28.6304,
    lng: 77.2177,
    address: "Tower 3 Gate, Cyber District",
    slots: [
      { id: "TP-B01", type: "general", size: "bike" },
      { id: "TP-C01", type: "general", size: "car" },
      { id: "TP-C02", type: "general", size: "car" },
      { id: "TP-C03", type: "general", size: "car" },
      { id: "TP-S01", type: "general", size: "suv" },
      { id: "TP-S02", type: "general", size: "suv" },
      { id: "TP-E01", type: "ev", size: "car" },
      { id: "TP-E02", type: "ev", size: "car" },
      { id: "TP-E03", type: "ev", size: "suv" },
      { id: "TP-ST1", type: "staff", size: "car" },
      { id: "TP-ST2", type: "staff", size: "suv" }
    ]
  },
  {
    id: "LOT-04",
    name: "Riverside Central",
    lat: 28.6042,
    lng: 77.2410,
    address: "Pier 9 Promenade, South Bank",
    slots: [
      { id: "RC-B01", type: "general", size: "bike" },
      { id: "RC-B02", type: "general", size: "bike" },
      { id: "RC-B03", type: "general", size: "bike" },
      { id: "RC-C01", type: "general", size: "car" },
      { id: "RC-C02", type: "general", size: "car" },
      { id: "RC-C03", type: "general", size: "car" },
      { id: "RC-C04", type: "general", size: "car" },
      { id: "RC-S01", type: "general", size: "suv" },
      { id: "RC-S02", type: "general", size: "suv" },
      { id: "RC-E01", type: "ev", size: "car" },
      { id: "RC-E02", type: "ev", size: "suv" },
      { id: "RC-ST1", type: "staff", size: "car" }
    ]
  },
  {
    id: "LOT-05",
    name: "Downtown Civic Center",
    lat: 28.6180,
    lng: 77.2350,
    address: "Old Secretariat Wing, Gate 1",
    slots: [
      { id: "DC-B01", type: "general", size: "bike" },
      { id: "DC-C01", type: "general", size: "car" },
      { id: "DC-C02", type: "general", size: "car" },
      { id: "DC-C03", type: "general", size: "car" },
      { id: "DC-S01", type: "general", size: "suv" },
      { id: "DC-E01", type: "ev", size: "car" },
      { id: "DC-ST1", type: "staff", size: "car" }
    ]
  }
];

// Helper to create the initial seed Map of ParkingLot instances
function createSeedLotsMap() {
  const lotsMap = new Map();

  INITIAL_LOTS_CONFIG.forEach((cfg) => {
    const lot = new ParkingLot(cfg.id, cfg.name, cfg.lat, cfg.lng, cfg.address, 1);
    
    cfg.slots.forEach((s) => {
      const slot = new Slot(s.id, s.type, s.size, 1);
      lot.addSlot(slot);
    });
    lotsMap.set(lot.id, lot);
  });

  return lotsMap;
}

const CITY_PREFIXES = ['DL01', 'HR26', 'UP16', 'MH02', 'KA05', 'TN07'];
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

function generateRandomPlate() {
  const prefix = CITY_PREFIXES[Math.floor(Math.random() * CITY_PREFIXES.length)];
  const letter1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const letter2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${letter1}${letter2}${digits}`;
}

if (typeof window !== 'undefined') {
  window.DEFAULT_CENTER_COORDS = DEFAULT_CENTER_COORDS;
  window.INITIAL_LOTS_CONFIG = INITIAL_LOTS_CONFIG;
  window.createSeedLotsMap = createSeedLotsMap;
  window.generateRandomPlate = generateRandomPlate;
}

if (typeof global !== 'undefined') {
  global.generateRandomPlate = generateRandomPlate;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_CENTER_COORDS,
    INITIAL_LOTS_CONFIG,
    createSeedLotsMap,
    generateRandomPlate
  };
}
