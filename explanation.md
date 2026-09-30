# ParkPilot — Project Features & Demonstration Guide (Viva / Demo Notes)

This guide provides a concise summary of every major feature implemented in **ParkPilot**, the underlying functions in the code, and quick steps to demonstrate each feature to your teacher.

---

## 1. Smart Best-Fit Parking Allocation Engine
- **What it does:** Automatically assigns the most optimal parking bay based on vehicle dimensions (Bike, Car, SUV, EV) without wasting larger spaces. EVs are routed strictly to charging bays, and bikes are given compact slots.
- **Key Functions:**
  - `findBestLotForVehicle(vehicle, userCoords, lots)` — in `booking-logic.js`
  - `findBestSlotInLot(lot, vehicle)` — in `booking-logic.js`
- **How to Demonstrate:**
  1. Go to **Landing Page (`index.html`)**.
  2. Select **SUV** or **EV** from the vehicle selector.
  3. Notice how the recommendation instantly calculates the exact bay (e.g. `CM-S01` for SUV, `CM-E01` for EV) and shows explainable reasoning ("Why this lot?").

---

## 2. Haversine GPS Distance Calculation
- **What it does:** Uses the spherical law of Haversine to compute the great-circle distance between the driver’s live GPS coordinates and all city parking facilities, finding the closest facility in real-time.
- **Key Functions:**
  - `calculateHaversineDistance(lat1, lon1, lat2, lon2)` — in `geolocation.js`
  - `findNearestLot(userLat, userLng, lots)` — in `geolocation.js`
- **How to Demonstrate:**
  1. On **`index.html`**, click **"📍 Resolve Live GPS"**.
  2. The system resolves your coordinates and automatically sorts and recommends the nearest facility with distance in kilometers.

---

## 3. Operations Cockpit & 3D Top-Down Bay Visualizer
- **What it does:** A real-time facility visualizer showing occupied vs. vacant bays with distinct color-coding (Lime Green = Available, Crimson Red = Parked, Amber = Reserved). Includes environmental sensors (AQI, temperature, power draw).
- **Key Functions:**
  - `renderTopDownParkingLot()` — in `app.js`
  - `updateEnvironmentalWidget()` — in `app.js`
  - `updateCurrentParkedWidget()` — in `app.js`
- **How to Demonstrate:**
  1. Open **`dashboard.html`**.
  2. Click different lot tabs (`LOT-01`, `LOT-02`) to see the bays and environmental metrics update dynamically.
  3. Click on any slot to open the **Slot Inspection Drawer** with live telemetry and fee accumulator.

---

## 4. Vehicle Check-In & Departure Billing
- **What it does:** Generates digital tickets with unique IDs (`T-1001`), logs license plates in an $O(1)$ Set (preventing duplicate entries), calculates elapsed parking fees, and issues printable receipts upon exit.
- **Key Functions:**
  - `handleModalParkSubmit()` — in `app.js`
  - `handleProcessExit(ticketId)` — in `app.js`
  - `calculateSessionFee(type, duration, surge)` — in `booking-logic.js`
- **How to Demonstrate:**
  1. On **`dashboard.html`**, click the **`+`** (Instant Park) button in the topbar.
  2. Click the 🎲 (dice) icon to generate a plate and click **"Allocate Best-Fit Bay"**.
  3. A digital barcode parking pass pops up. Click **"Exit & Pay"** to free the bay and see the receipt calculation.

---

## 5. Staff & VIP Booking with Time-Interval Collision Detection
- **What it does:** Allows authorized employees/VIPs to book time slots in advance. The algorithm rejects colliding time intervals while seamlessly permitting back-to-back bookings without overlap conflicts.
- **Key Functions:**
  - `hasOverlap(startA, endA, startB, endB)` — in `reservation-logic.js`
  - `checkStaffSlotAvailability(...)` — in `reservation-logic.js`
  - `cleanupExpiredReservations(...)` — in `reservation-logic.js`
- **How to Demonstrate:**
  1. Open **`reservations.html`**.
  2. Try creating a reservation for `STAFF-CHIEF` from `10:00` to `12:00`.
  3. Try booking the exact same bay from `11:00` to `13:00` — observe the warning alert indicating an interval conflict.

---

## 6. City GPS Radar (Interactive Leaflet Map)
- **What it does:** A city-wide map showing all parking facilities with live occupancy pins (color-coded by availability percentage). Clicking any marker zooms in and displays facility details.
- **Key Functions:**
  - `initMap(containerId)` — in `map.js`
  - `syncMapMarkers(lots, selectedLotId, callback)` — in `map.js`
- **How to Demonstrate:**
  1. Open **`map.html`**.
  2. Point out the interactive pins across the city.
  3. Click any facility marker or click **"Locate Me"** to trigger live radar centering.

---

## 7. Dynamic Surge Pricing & Yield Analytics
- **What it does:** Computes total revenue, served vehicle count, and average occupancy. Includes a dynamic surge pricing simulator that automatically adjusts hourly rates as lot occupancy increases.
- **Key Functions:**
  - `computeMetrics(state)` — in `analytics.js`
  - `calculateSurgeRate(baseRate, occupancyRate)` — in `analytics.js`
- **How to Demonstrate:**
  1. Open **`analytics.html`**.
  2. Show the KPI summary cards and occupancy chart.
  3. Drag the **Base Rate** and **Occupancy Rate** sliders in the Surge Simulator to demonstrate live revenue yield adjustment.

---

## 8. IoT Gate Barrier Simulator & Rush Hour Traffic Spike
- **What it does:** Simulates hardware barrier gates with ultrasonic sensors. You can trigger automated traffic spikes or manually override entry and exit barriers.
- **Key Functions:**
  - `simulationTick(state)` — in `simulation.js`
  - `triggerTrafficSpike()` — in `simulation.js`
  - `toggleGateBarrier(gateName)` — in `app.js`
- **How to Demonstrate:**
  1. Open **`iot.html`**.
  2. Click **"⚡ Simulate Rush Hour Spike"** to inject sudden traffic and watch the live event feed update.
  3. Click **"Manual Toggle"** on Entry/Exit barriers to switch states between `OPEN` and `CLOSED`.

---

## 9. Role-Based Access Control & Vehicle Ownership Protection
- **What it does:** 
  1. **Privilege Isolation**: Restricts administrative capabilities (registering facilities, barrier overrides) strictly to Super Admins.
  2. **Vehicle Ownership & Protected Checkout**: A Regular User can observe all parking bays across the lot (full visibility of telemetry, occupancy rates, and slot maps), but **can only check out / exit their own vehicle** (`XY68ZTR`). If they view or attempt to exit a foreign vehicle, the checkout and barcode actions are locked behind a **Protected Vehicle Session** shield
  3. **Super Admin Override**: Super Admins retain operator clearance to exit and manage any vehicle in any bay.
- **Key Functions:**
  - `canUserCheckoutTicket(ticket, currentUser, currentUserRole)` — in `app.js`
  - `handleProcessExit(ticketId)` — in `app.js` (permission guarded)
  - `openSlotDrawer(slotId, lotId)` — in `app.js` (displays `🛡️ SUPER ADMIN OVERRIDE`, `👤 YOUR VEHICLE`, or `🔒 ANOTHER DRIVER` with protected checkout shield)
  - `applyRoleUI()` & `quickLogin(role)` — in `app.js`
- **How to Demonstrate:**
  1. In **Regular User** mode, click on bay `CM-C03` (owned by another driver). Show how the drawer displays **`🔒 ANOTHER DRIVER`** and the **`🔒 Protected Vehicle Session`** banner — the departure & payment buttons are hidden.
  2. Click on bay `CM-C01` (vehicle `XY68ZTR` registered to this user). Show how it displays **`👤 YOUR VEHICLE`** and allows full **"Process Departure & Pay"**.
  3. Switch to **Super Admin** mode from the top-right profile pill. Open bay `CM-C03` again — show the **`🛡️ SUPER ADMIN OVERRIDE`** badge and administrative checkout permissions unlocked!

---

## 10. Multi-Page Architecture & LocalStorage Persistence
- **What it does:** The project is split into 8 clean, dedicated HTML pages (`index.html`, `dashboard.html`, `slots.html`, `reservations.html`, `map.html`, `analytics.html`, `iot.html`, `auth.html`). All state is automatically serialized to `localStorage` under `PARKPILOT_STATE_V1` so data is preserved across page navigations and browser refreshes.
- **Key Functions:**
  - `saveToLocalStorage(state)` — in `storage.js`
  - `loadFromLocalStorage()` — in `storage.js`
  - `switchView(viewName)` — in `app.js`
- **How to Demonstrate:**
  1. Park a vehicle on `dashboard.html`.
  2. Navigate to `slots.html` or `analytics.html` or refresh the browser.
  3. Show that the vehicle, occupied bay, and revenue remain updated across all pages.

---

## Quick Viva Summary Checklist (What to Tell Sir in 2 Minutes)
1. *"Sir, ParkPilot is an intelligent multi-lot parking system built with vanilla JavaScript, HTML5, and CSS3."*
2. *"It uses the **Haversine formula** to calculate live GPS distances and assign the closest lot."*
3. *"It features a **deterministic Best-Fit engine** ensuring SUVs and EVs get exact matching bays."*
4. *"We implemented **Staff Reservations with interval collision detection** to prevent double-booking."*
5. *"We built an **IoT simulation engine** for gate barriers and **dynamic surge pricing**."*
6. *"The system enforces **Role-Based Access Control** (Admin vs. User) and maintains state across **8 modular pages** using `localStorage`."*
