# ParkPilot — Smart Multi-Lot Parking Management System

[![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Storage API](https://img.shields.io/badge/Storage-localStorage-blue?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
[![Native Geolocation](https://img.shields.io/badge/API-Geolocation%20%2B%20Haversine-success?style=flat)](geolocation.js)
[![Zero External JS](https://img.shields.io/badge/Dependencies-Zero%20External%20JS-06b6d4?style=flat)](index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Project Proposal

### Project Description
**ParkPilot** is an intelligent, multi-facility urban parking management and guidance system engineered using pure **Web Fundamentals** (HTML5, Vanilla CSS3, and native JavaScript). The system optimizes urban driver journeys by bridging the critical "last 800 meters" of urban navigation through real-time parking lot tracking, deterministic proximity recommendations, explainable slot allocations, and seamless advance holds. Built to align strictly with Web Fundamentals academic requirements, ParkPilot operates with zero external JavaScript frameworks, third-party UI libraries, or remote backend servers, demonstrating the power and elegance of native browser capabilities.

### Problem Statement
Urban drivers in major metropolitan centers spend an average of 15 to 20 minutes circling blocks searching for available parking spaces, accounting for up to 30% of downtown traffic congestion, significant fuel waste, and increased carbon emissions. Existing commercial platforms often rely on proprietary mobile apps, heavy client-side frameworks, external mapping services with restrictive API keys, or black-box heuristic algorithms that fail to explain why a particular bay or facility was selected. Drivers need an accessible, transparent, lightweight, and deterministic solution that evaluates proximity, slot physical dimensions, EV charging infrastructure, and reservation windows directly in the browser.

### Goals
1. **Zero External JS Dependencies**: Deliver a production-grade, highly responsive user interface relying exclusively on native browser standards (DOM API, Web Storage API, Geolocation API, and Canvas/SVG).
2. **Explicit, Full CRUD Implementation**: Provide complete Create, Read, Update, and Delete operations for both Parking Facilities and advance Reservations with persistent browser storage.
3. **Deterministic & Explainable Allocation**: Implement a verifiable, rule-based recommendation and slot allocation engine using hand-crafted Haversine distance math ($R = 6371\text{ km}$) and vehicle-to-slot sizing hierarchies.
4. **Interval Collision Prevention**: Ensure temporal integrity for advance driver bookings using mathematical interval overlap detection (`startA < endB && endA > startB`).
5. **Modern, Responsive Visual Aesthetics**: Craft a dark-mode obsidian interface accented with cyber-lime and neon-cyan visual cues, ensuring seamless adaptation across mobile, tablet, and desktop viewports.

### Specifications
- **Client Architecture**: Multi-page Vanilla JavaScript application (`index.html`, `parking.html`, `reservations.html`).
- **Data Persistence**: Native `localStorage` storing JSON-serialized entities (`lots`, `reservations`, `activeTickets`, `activityLog`).
- **Geospatial Math**: Native spherical trigonometry implementation of the Haversine formula for distance calculation in kilometers.
- **Data Structures**: ES6 `Map` for $O(1)$ ticket and lot lookups; ES6 `Set` for instant duplicate active vehicle entry prevention.
- **Object-Oriented Design**: ES6 Classes (`ParkingLot`, `Slot`, `Vehicle`, `Ticket`, `Reservation`) with prototype methods (`Vehicle.prototype.describe`, `Vehicle.prototype.isEV`).

### Design
The system employs a unified **Cyber-Obsidian** design philosophy with glassmorphism elements, CSS custom properties (variables), flexible CSS grids, and SVG coordinate surfaces:
- **Dashboard (`index.html`)**: High-level network pulse, live Bento KPIs, deterministic recommendation card, and the native **Parking Network View** radar.
- **Parking Management (`parking.html`)**: Full facility CRUD management directory, capacity configuration, and interactive 2D bay layout matrices.
- **Reservations (`reservations.html`)**: Time-window booking scheduler with real-time collision detection, active reservations audit table, and edit/cancel modal dialogs.

---

## Features

- 📍 **Native Haversine Geolocation**: Spherical Earth distance calculation calculated down to 0.01 km precision without external proprietary APIs.
- 🎯 **Explainable Recommendation Engine**: Transparent *"Why this lot?"* breakdowns evaluating distance, occupancy rate, vehicle category compatibility, and EV readiness.
- ⚡ **Best-Fit Slot Allocation**: Algorithmic selection matching exact vehicle size (Bike, Car, SUV) and dedicated EV charging stations before compatible upgrades.
- 🕒 **Interval Conflict-Free Reservations**: Mathematical interval overlap validation preventing overlapping holds on the same bay while allowing contiguous back-to-back bookings.
- ⏱️ **Automatic Reservation Expiry**: Client-side background timer (`setInterval`) that releases reserved bays upon window expiration.
- 📡 **Native Parking Network View**: Custom HTML/CSS/SVG radar screen visualizing user GPS position, relative facility coordinate nodes, occupancy badges, and distance rings.
- 🎫 **Digital Parking Pass Generator**: Instant check-in pass generation with formatted timestamps, fee structures, bay identifiers, and printable receipt modals.
- 🌓 **Dual-Theme Support**: Instant switching between Cyber Dark mode and Luxury Light mode, stored persistently in `localStorage`.

---

## CRUD Operations

ParkPilot provides explicit, full CRUD (Create, Read, Update, Delete) functionality with persistent state:

### 1. Parking Lot CRUD (`parking.html`)
- **Create**: Register new facilities with Name, Address/Landmark, GPS Coordinates (Latitude/Longitude with "📍 Use GPS" autofill), and dedicated bay counts for Bikes, Standard Cars, Large SUVs, 22kW EV Chargers, and Staff/VIP stalls.
- **Read**: Interactive **Facilities Directory** displaying real-time capacities, available bays, occupied bays, EV charger counts, distances, and color-coded status badges (`● OPEN`, `● FILLING`, `● FULL`).
- **Update**: Modal interface (`#editLotModal`) enabling operators to modify facility name, street address, and geographic coordinates with immediate map and dropdown synchronization.
- **Delete**: Remove obsolete facilities with a confirmation safeguard (`deleteLot()`), automatically cleaning associated tickets and reservations.

### 2. Reservation CRUD (`reservations.html`)
- **Create**: Advance timeslot scheduler accepting Vehicle Plate / Staff ID, facility selection, designated bay, reservation date, start time, and end time.
- **Read**: Live bookings audit table displaying Reservation ID (`RES-501`), Staff/Vehicle, Facility, Bay, Date/Time window, and Status badges (`RESERVED`, `EXPIRED`, `CANCELLED`).
- **Update**: Edit modal (`#editReservationModal`) permitting changes to driver identity, facility bay, and start/end intervals with re-validated collision checking.
- **Delete / Cancel**: Instant booking cancellation (`cancelReservation()`) that immediately unlocks the held parking bay, marks the reservation status, and updates storage.

---

## Technologies Used

- **HTML5**: Semantic document structure, forms, native `<select>`, `<time>`, and `<input type="number">` controls.
- **CSS3 (Vanilla)**: Custom properties (tokens), CSS Flexbox, CSS Grid layouts, glassmorphism filters, keyframe pulse animations, and `@media` queries for responsive viewports.
- **Vanilla JavaScript (ES6+)**:
  - ES6 Classes & Inheritance (`class ParkingLot`, `class Slot`, `class Vehicle`, etc.)
  - Prototype Chain Demonstrations (`Vehicle.prototype.describe`)
  - ES6 Built-in Collections: `Map` for $O(1)$ key lookups and `Set` for duplicate plate checks
  - Array Methods: `.map()`, `.filter()`, `.reduce()`, `.find()`, `.sort()`, `.some()`
- **Web Storage API**: `window.localStorage` with `JSON.stringify()` and `JSON.parse()`.
- **Geolocation API**: `navigator.geolocation.getCurrentPosition()` with graceful city-center fallbacks.
- **SVG (Scalable Vector Graphics)**: Native procedural coordinate grids and radar telemetry visualizations.

---

## Data Storage

All operational data is maintained in the client's browser using the **Web Storage API (`localStorage`)** under the key `PARKPILOT_STATE_V1`:

| Data Entity | Structure in Memory | Persisted Storage Format | Purpose |
|---|---|---|---|
| `lots` | `Map<lotId, ParkingLot>` | `Array<object>` with nested slots | Multi-lot facilities, address, coordinates, and slot matrices |
| `activeTickets` | `Map<ticketId, Ticket>` | `Array<[ticketId, object]>` | Currently parked vehicles, entry timestamps, and billing state |
| `activeVehicleNumbers` | `Set<string>` | `Array<string>` | Instant $O(1)$ duplicate active vehicle prevention |
| `reservations` | `Map<reservationId, Reservation>` | `Array<[reservationId, object]>` | Time-window holds, employee IDs, and validity windows |
| `activityLog` | `Array<object>` | `Array<object>` | Real-time audit trail of entry, exit, booking, and expiry events |

---

## Project Structure

```text
ParkPilot/
│
├── index.html              # Dashboard: Overview, Recommendation Engine & Network View
├── parking.html            # Parking Management: Lot CRUD Directory & Bays Matrix
├── reservations.html       # Reservations: Booking Scheduler, CRUD Table & Overlap Engine
│
├── css/
│   ├── style.css           # Core styling tokens & ParkPilot design system
│   ├── dashboard.css       # Facility card components & Network View radar styles
│   └── responsive.css      # Mobile, tablet, and desktop media query breakpoints
│
├── js/
│   ├── models.js           # ES6 Classes (ParkingLot, Slot, Vehicle, Ticket, Reservation) & Prototypes
│   ├── data.js             # Initial metro facilities seed configuration & coordinates
│   ├── geolocation.js      # Native Geolocation API & hand-coded Haversine formula
│   ├── booking-logic.js    # Best-Fit slot allocation & explainable recommendation engine
│   ├── reservation-logic.js# Interval collision (hasOverlap) & reservation expiry engine
│   ├── storage.js          # localStorage serialization / deserialization manager
│   ├── parking.js          # Parking management controller & CRUD helpers
│   ├── reservations.js     # Reservation management controller & event listeners
│   ├── utils.js            # General utility helpers (formatting, debounce, IDs)
│   ├── simulation.js       # Main-thread simulation loop using real business logic
│   ├── map.js              # Native HTML/CSS/SVG Parking Network View (Zero Leaflet)
│   └── app.js              # Master application controller, routing, and UI rendering
│
├── assets/                 # Vector illustrations, badges, and project assets
├── README.md               # Project proposal, specifications, and documentation
├── LICENSE                 # Open-Source MIT License
└── .gitignore              # Repository exclusions (IDE, OS, node_modules, .env)
```

---

## Prerequisites

- **Web Browser**: Any modern browser supporting ECMAScript 2015+ (Chrome, Firefox, Edge, Safari, Opera).
- **Optional Static Server**: Python 3.x, Node.js (`npx serve`), or VS Code Live Server extension.
- **Node.js (Optional for Verification Tests)**: Node.js v16+ to run automated assertion test suites.

---

## How to Run

### Method 1: Direct File Opening (No Installation Required)
1. Clone or download the repository to your local machine:
   ```bash
   git clone https://github.com/raghavbtech/Vehicle-Parking-Simulator.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Vehicle-Parking-Simulator
   ```
3. Double-click **`index.html`** or right-click and choose **Open with Browser**.

### Method 2: Local Static Server (Recommended)
Running through a local static HTTP server ensures full compatibility with browser Geolocation permissions:

**Using Python:**
```bash
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

**Using Node.js:**
```bash
npx serve .
```

### Running Automated Test Suites
Execute the comprehensive Node.js assertion test suites:
```bash
node test_all_functions.js
node verify_fixes.js
node test_ui_interactions.js
```

---

## Screenshots

| View | Description |
|---|---|
| **Dashboard (`index.html`)** | Live operations summary, deterministic recommendation, and native SVG radar |
| **Parking Management (`parking.html`)** | Multi-lot CRUD directory with Add/Edit/Delete dialogs and 2D bay matrix |
| **Reservations (`reservations.html`)** | Interval-overlap collision prevention, bookings table, and edit/cancel modals |
| **Cockpit Console (`dashboard.html`)** | Operations cockpit HUD, vehicle telemetry, and single-level floorplan |

---

## Future Improvements

1. **IndexedDB Integration**: Transition large historical telemetry logs from `localStorage` to the native browser `IndexedDB` API for greater storage capacity.
2. **Multi-Floor Vertical Stacking**: Expand the 2D layout engine to render interactive multi-level parking towers with animated floor transitions.
3. **Progressive Web App (PWA) Offline Manifest**: Add a service worker and `manifest.json` for home-screen installation and offline ticket inspection.
4. **Dynamic Tariff Engine**: Implement time-of-day variable pricing rules with configurable off-peak and weekend rates.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.
