/**
 * ParkPilot / Parksync — Lightweight Live Simulation Engine
 * Runs continuous background ticks using the EXACT same core business logic
 * as manual user interactions.
 */

let simulationIntervalId = null;
let isSimulationActive = false;
let currentSimulationIntervalMs = 3000;
let currentTickCallback = null;
let currentSimulationState = null;

const VEHICLE_TYPES = ['bike', 'car', 'car', 'suv', 'ev-car'];
const CITY_PREFIXES = ['DL01', 'HR26', 'UP16', 'MH02', 'KA05', 'TN07'];
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

function generateRandomPlate() {
  const prefix = CITY_PREFIXES[Math.floor(Math.random() * CITY_PREFIXES.length)];
  const letter1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const letter2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${letter1}${letter2}${digits}`;
}

function getRandomVehicle() {
  let plate = generateRandomPlate();
  // Ensure not active in Set
  let attempts = 0;
  while (window.appState && window.appState.activeVehicleNumbers && window.appState.activeVehicleNumbers.has(plate) && attempts < 10) {
    plate = generateRandomPlate();
    attempts++;
  }
  const type = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
  return new Vehicle(plate, type);
}

/**
 * Runs a single simulation tick.
 * Picks an action (Arrival, Departure, Expiry) and executes the EXACT SAME functions.
 */
function runSimulationTick(state, onTick) {
  if (!state) return;

  // First, always check for any expired reservations
  if (typeof checkAndExpireReservations === 'function') {
    checkAndExpireReservations(state);
  }

  // Determine action weight based on current occupancy
  const activeCount = state.activeTickets.size;
  const roll = Math.random();

  let action = 'arrival';
  if (activeCount === 0) {
    action = 'arrival';
  } else if (activeCount >= 35) {
    // High occupancy: higher chance of departure
    action = roll < 0.7 ? 'departure' : 'arrival';
  } else if (activeCount <= 4) {
    // Very low occupancy: prefer arrivals
    action = roll < 0.85 ? 'arrival' : 'departure';
  } else {
    // Normal traffic mix
    action = roll < 0.55 ? 'arrival' : 'departure';
  }

  let eventResult = null;

  if (action === 'arrival') {
    const vehicle = getRandomVehicle();
    const recommendation = getRecommendedLot(state.userCoords, vehicle, state.lots);

    if (recommendation && recommendation.winningLot) {
      const lot = recommendation.winningLot;
      const fitResult = findBestFitSlot(lot, vehicle);

      if (fitResult && fitResult.slot) {
        try {
          const ticket = generateTicket(vehicle, lot, fitResult.slot, state);
          eventResult = {
            type: 'ARRIVAL',
            success: true,
            ticket,
            lot,
            slot: fitResult.slot,
            fitType: fitResult.fitType
          };
        } catch (err) {
          console.warn("Simulated arrival rejected:", err.message);
        }
      }
    }
  } else if (action === 'departure' && activeCount > 0) {
    const ticketIds = Array.from(state.activeTickets.keys());
    const randomTicketId = ticketIds[Math.floor(Math.random() * ticketIds.length)];

    try {
      const exitResult = exitVehicle(randomTicketId, state);
      eventResult = {
        type: 'DEPARTURE',
        success: true,
        ...exitResult
      };
    } catch (err) {
      console.warn("Simulated departure error:", err.message);
    }
  }

  // Trigger UI callback
  if (typeof onTick === 'function') {
    onTick(eventResult, state);
  }

  return eventResult;
}

/**
 * Starts the simulation loop.
 */
function startSimulation(state, onTick, intervalMs = 3000) {
  if (isSimulationActive) return;

  isSimulationActive = true;
  currentSimulationState = state;
  currentTickCallback = onTick;
  currentSimulationIntervalMs = intervalMs;

  // Fire an immediate tick so the user sees instant feedback
  runSimulationTick(state, onTick);

  simulationIntervalId = setInterval(() => {
    runSimulationTick(state, onTick);
  }, currentSimulationIntervalMs);
}

/**
 * Adjusts simulation speed on the fly (1x, 2x, 5x, 10x).
 */
function setSimulationSpeed(multiplier = 1) {
  const baseMs = 3000;
  currentSimulationIntervalMs = Math.max(250, Math.round(baseMs / multiplier));

  if (isSimulationActive && currentSimulationState && currentTickCallback) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = setInterval(() => {
      runSimulationTick(currentSimulationState, currentTickCallback);
    }, currentSimulationIntervalMs);
  }
}

/**
 * Triggers a burst traffic spike (e.g. 3-5 vehicles arriving quickly).
 */
function simulateTrafficSpike(count = 4, state = null, onTick = null) {
  const targetState = state || currentSimulationState || window.appState;
  const targetCallback = onTick || currentTickCallback;
  if (!targetState) return;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const vehicle = getRandomVehicle();
      const recommendation = getRecommendedLot(targetState.userCoords, vehicle, targetState.lots);
      if (recommendation && recommendation.winningLot) {
        const fitResult = findBestFitSlot(recommendation.winningLot, vehicle);
        if (fitResult && fitResult.slot) {
          try {
            const ticket = generateTicket(vehicle, recommendation.winningLot, fitResult.slot, targetState);
            if (typeof targetCallback === 'function') {
              targetCallback({
                type: 'ARRIVAL',
                success: true,
                ticket,
                lot: recommendation.winningLot,
                slot: fitResult.slot,
                fitType: fitResult.fitType,
                isSpike: true
              }, targetState);
            }
          } catch (e) {
            // ignore duplicate
          }
        }
      }
    }, i * 200);
  }
}

/**
 * Stops the simulation loop.
 */
function stopSimulation() {
  if (simulationIntervalId) {
    clearInterval(simulationIntervalId);
    simulationIntervalId = null;
  }
  isSimulationActive = false;
}

function isSimulationRunning() {
  return isSimulationActive;
}

if (typeof window !== 'undefined') {
  window.startSimulation = startSimulation;
  window.stopSimulation = stopSimulation;
  window.runSimulationTick = runSimulationTick;
  window.isSimulationRunning = isSimulationRunning;
  window.getRandomVehicle = getRandomVehicle;
  window.generateRandomPlate = generateRandomPlate;
  window.setSimulationSpeed = setSimulationSpeed;
  window.simulateTrafficSpike = simulateTrafficSpike;
}
