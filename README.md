# ParkPilot — Smart Multi-Lot Parking Management System

[![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Storage](https://img.shields.io/badge/Storage-LocalStorage%20%7C%20SessionStorage-blue?style=flat)](js/storage.js)
[![Native Geolocation](https://img.shields.io/badge/API-Geolocation%20%2B%20Haversine-success?style=flat)](js/geolocation.js)
[![Zero External JS](https://img.shields.io/badge/Dependencies-Zero%20External%20JS-06b6d4?style=flat)](index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**GitHub Repository**: [https://github.com/raghavbtech/ParkPilot.git](https://github.com/raghavbtech/ParkPilot.git)

---

## Table of Contents
1. [Project Proposal](#project-proposal)
   - [Project Description](#project-description)
   - [Problem Statement](#problem-statement)
   - [Goals & Objectives](#goals--objectives)
   - [Technical Specifications](#technical-specifications)
   - [System Design & UI Philosophy](#system-design--ui-philosophy)
2. [Key Features](#key-features)
3. [CRUD Operations](#crud-operations)
4. [Technologies Used](#technologies-used)
5. [Native Web Storage Architecture](#native-web-storage-architecture)
   - [localStorage State Persistence](#1-localstorage-persistent-state)
   - [sessionStorage Session State](#2-sessionstorage-active-session-state)
6. [Folder Structure](#folder-structure)
7. [Prerequisites & Requirements](#prerequisites)
8. [How to Run the Application](#how-to-run)
9. [Application Previews & Screenshots](#application-previews)
10. [License](#license)

---

## Project Proposal

### Project Description
**ParkPilot** is an intelligent, multi-facility urban parking management and guidance system engineered strictly using native **Web Fundamentals** (HTML5, Vanilla CSS3, and ES6+ JavaScript). The system optimizes urban driver journeys by bridging the critical "last 800 meters" of downtown navigation through real-time parking lot tracking, deterministic proximity recommendations, explainable slot allocations, and seamless advance holds. Built to align strictly with Web Fundamentals academic requirements, ParkPilot operates with zero external JavaScript frameworks, third-party UI libraries, or remote backend servers, demonstrating the power and elegance of native browser capabilities.

### Problem Statement
Urban drivers in major metropolitan centers spend an average of 15 to 20 minutes circling blocks searching for available parking spaces, accounting for up to 30% of downtown traffic congestion, significant fuel waste, and increased carbon emissions. Existing commercial platforms often rely on proprietary mobile apps, heavy client-side frameworks, external mapping services with restrictive API keys, or black-box heuristic algorithms that fail to explain why a particular bay or facility was selected. Drivers need an accessible, transparent, lightweight, and deterministic solution that evaluates proximity, slot physical dimensions, EV charging infrastructure, and reservation windows directly in the browser.

### Goals & Objectives
1. **Zero External JavaScript Dependencies**: Deliver a production-grade, highly responsive user interface relying exclusively on native browser standards (DOM API, Web Storage API, Geolocation API, and Canvas/SVG).
2. **Explicit, Full CRUD Implementation**: Provide complete Create, Read, Update, and Delete operations for both Parking Facilities and advance Reservations with persistent browser Web Storage.
3. **Deterministic & Explainable Allocation**: Implement a verifiable, rule-based recommendation and slot allocation engine using hand-crafted Haversine distance spherical trigonometry ($R = 6371\text{ km}$) and vehicle-to-slot sizing hierarchies.
4. **Interval Collision Prevention**: Ensure temporal integrity for advance driver bookings using mathematical interval overlap detection (`startA < endB && endA > startB`).
5. **Native Web Storage Persistence**: Utilize standard HTML5 Web Storage (`localStorage` and `sessionStorage`) with structured JSON serialization for ES6 Collections (`Map` and `Set`).
6. **Modern, Responsive Visual Aesthetics**: Craft a dark-mode obsidian interface accented with cyber-lime and neon-cyan visual cues, ensuring seamless adaptation across mobile, tablet, and desktop viewports.

### Technical Specifications
- **Client Architecture**: Multi-page Vanilla JavaScript application (`index.html` at root, and secondary pages in `pages/`).
- **Data Persistence**: Native `localStorage` storing JSON-serialized entities and `sessionStorage` for ephemeral navigation state.
- **Geospatial Math**: Native spherical trigonometry implementation of the Haversine formula for distance calculation in kilometers down to 0.01 km precision.
- **Data Structures**: ES6 `Map` for $O(1)$ ticket and lot lookups; ES6 `Set` for instant duplicate active vehicle entry prevention.
- **Object-Oriented Design**: ES6 Classes (`ParkingLot`, `Slot`, `Vehicle`, `Ticket`, `Reservation`) with prototype methods (`Vehicle.prototype.describe`, `Vehicle.prototype.isEV`).

### System Design & UI Philosophy
The system employs a unified **Cyber-Obsidian** design philosophy with glassmorphism elements, CSS custom properties (tokens), flexible CSS grids, and SVG coordinate surfaces:
- **Landing Page (`index.html`)**: High-level network pulse, live Bento KPIs, deterministic recommendation card, and the native **Parking Network View** radar.
- **Operations Dashboard (`pages/dashboard.html`)**: Operations cockpit HUD, vehicle session monitor, 2D top-down bay visualizer, and instant check-in/checkout modals.
- **Parking Management (`pages/parking.html`)**: Full facility CRUD management directory, capacity configuration, and interactive 2D bay layout matrices.
- **Reservations (`pages/reservations.html`)**: Time-window booking scheduler with real-time collision detection, active reservations audit table, and edit/cancel modal dialogs.
- **City GPS Radar (`pages/map.html`)**: Interactive SVG radar telemetry visualizing vehicle location, relative facility coordinate nodes, and distance rings.
- **Analytics & Yield (`pages/analytics.html`)**: Revenue metrics, live utilization indicators, capacity metrics, and vehicle category distribution.
- **Identity Portal (`pages/auth.html`)**: Role-based access control (Admin / Operator vs. Regular User) and active profile switching.

---

## Key Features

- 📍 **Native Haversine Geolocation**: Spherical Earth distance calculation calculated down to 0.01 km precision without external proprietary APIs.
- 🎯 **Explainable Recommendation Engine**: Transparent *"Why this lot?"* breakdowns evaluating distance, occupancy rate, vehicle category compatibility, and EV readiness.
- ⚡ **Best-Fit Slot Allocation**: Algorithmic selection matching exact vehicle size (Bike, Car, SUV) and dedicated EV charging stations before compatible upgrades.
- 🕒 **Interval Conflict-Free Reservations**: Mathematical interval overlap validation preventing overlapping holds on the same bay while allowing contiguous back-to-back bookings.
- ⏱️ **Automatic Reservation Expiry**: Client-side background timer (`setInterval`) that releases reserved bays upon window expiration.
- 📡 **Native Parking Network View**: Custom HTML/CSS/SVG radar screen visualizing user GPS position, relative facility coordinate nodes, occupancy badges, and distance rings.
- 💾 **Native Web Storage Persistence**: Seamlessly integrates `localStorage` for application state and `sessionStorage` for temporary session variables.
- 🌑 **Cyber-Obsidian Dark Mode**: Optimized dark-mode obsidian interface accented with cyber-lime and neon-cyan visual cues for maximum contrast and eye comfort.
- 📱 **Fully Responsive Layout**: Hand-crafted CSS media queries adapting across mobile phones (<640px), tablets (641px - 1024px), and desktop displays (>1024px).

---

## CRUD Operations

ParkPilot provides explicit, full CRUD (Create, Read, Update, Delete) functionality with persistent state:

### 1. Parking Lot CRUD (`pages/parking.html`)
- **Create**: Register new facilities with Name, Address/Landmark, GPS Coordinates (Latitude/Longitude with "📍 Use GPS" autofill), and dedicated bay counts for Bikes, Standard Cars, Large SUVs, 22kW EV Chargers, and Staff/VIP stalls.
- **Read**: Interactive **Facilities Directory** displaying real-time capacities, available bays, occupied bays, EV charger counts, distances, and color-coded status badges (`● OPEN`, `● FILLING`, `● FULL`).
- **Update**: Modal interface (`#editLotModal`) enabling operators to modify facility name, street address, and geographic coordinates with immediate map and dropdown synchronization.
- **Delete**: Remove obsolete facilities with a confirmation safeguard (`deleteLot()`), automatically cleaning associated tickets and reservations.

### 2. Reservation CRUD (`pages/reservations.html`)
- **Create**: Advance timeslot scheduler accepting Vehicle Plate / Staff ID, facility selection, designated bay, reservation date, start time, and end time with automatic interval overlap validation.
- **Read**: Live bookings audit table displaying Reservation ID (`RES-501`), Staff/Vehicle, Facility, Bay, Date/Time window, and Status badges (`RESERVED`, `EXPIRED`, `CANCELLED`).
- **Update**: Edit modal (`#editReservationModal`) permitting changes to driver identity, facility bay, and start/end intervals with re-validated collision checking.
- **Delete / Cancel**: Instant booking cancellation (`cancelReservation()`) that immediately unlocks the held parking bay, marks the reservation status, and updates Web Storage.

### 3. Vehicle Ticket & Check-In CRUD (`pages/dashboard.html`)
- **Create**: Instant check-in generating digital parking passes with barcodes (`T-1001`), recording vehicle plate and entry timestamp.
- **Read**: Active tickets table displaying elapsed time, license plates, bays, and dynamic fee accumulator.
- **Update**: Extend parking session or update bay allocation.
- **Delete / Exit**: Vehicle departure calculation (`exitVehicle()`), calculating total fees, and printing receipts.

---

## Technologies Used

- **HTML5**: Semantic document structure, forms, native `<select>`, `<time>`, `<input type="number">`, dialogs, and SVG rendering.
- **CSS3 (Vanilla)**: CSS custom properties (design tokens), CSS Flexbox, CSS Grid layouts, glassmorphism filters, keyframe pulse animations, and `@media` queries for responsive viewports (No Tailwind, No Bootstrap).
- **Vanilla JavaScript (ES6+)**:
  - ES6 Classes & Inheritance (`class ParkingLot`, `class Slot`, `class Vehicle`, `class Ticket`, `class Reservation`)
  - Prototype Chain Methods (`Vehicle.prototype.describe`, `Vehicle.prototype.isEV`)
  - ES6 Collections: `Map` for $O(1)$ key lookups and `Set` for duplicate plate checks
  - Native Array Methods: `.map()`, `.filter()`, `.reduce()`, `.find()`, `.sort()`, `.some()`
- **Web Storage API**: `window.localStorage` and `window.sessionStorage` with `JSON.stringify()` and `JSON.parse()`.
- **Geolocation API**: `navigator.geolocation.getCurrentPosition()` with graceful city-center fallbacks.
- **SVG (Scalable Vector Graphics)**: Native procedural coordinate grids and radar telemetry visualizations.

---

## Native Web Storage Architecture

ParkPilot implements a clean, native client-side storage architecture in [`js/storage.js`](file:///d:/Sem5/Project/js/storage.js):

### 1. `localStorage` (Persistent State)
Persists the primary relational state across browser restarts under key `PARKPILOT_STATE_V1`:
- `lots`: Active parking facilities with slot capacities, occupation states, and GPS coordinates.
- `activeTickets`: Vehicles currently parked inside facilities.
- `activeVehicleNumbers`: Fast $O(1)$ `Set` of active license plates preventing duplicate check-ins.
- `reservations`: Advance timeslot reservations with assigned bays and time intervals.
- `accounts`: User and administrator authentication credentials and roles.
- `parkingHistory` & `activityLog`: Completed parking sessions and chronological operations log.

### 2. `sessionStorage` (Active Session State)
Manages session-scoped state:
- Remembers active navigation tabs, temporary search filters, and quick-park drafts during an active browser session without cluttering long-term storage.

---

## Folder Structure

The project follows a clean separation of concerns, separating HTML pages, stylesheets, JavaScript logic, utility helpers, assets, and documentation:

```text
ParkPilot/
│
├── index.html                      # Landing Page & Entry Point (Proximity recommendation, GPS radar, overview)
│
├── pages/                          # Dedicated HTML Application Pages
│   ├── dashboard.html              # Operations Cockpit HUD & Vehicle Session Monitor
│   ├── parking.html                # Facility CRUD Management Directory & 2D Bays Matrix
│   ├── reservations.html           # Advance Booking Scheduler, CRUD Audit & Overlap Engine
│   ├── analytics.html              # Utilization Metrics, Yield & Occupancy Summary
│   ├── map.html                    # Native Interactive GPS Network Radar
│   ├── auth.html                   # Role-Based Authentication & Profile Management
│   └── slots.html                  # Top-Down Slot Matrix & Bay Inspector
│
├── css/                            # Modular Cascading Style Sheets
│   ├── style.css                   # Core Design Tokens, Cyber-Obsidian UI System & Global Rules
│   ├── dashboard.css               # Operations Cockpit & Radar Component Styles
│   └── responsive.css              # Breakpoint Rules (Mobile <640px, Tablet <1024px, Desktop)
│
├── js/                             # JavaScript Engines & Controllers (Zero External JS)
│   ├── models.js                   # ES6 Domain Classes (ParkingLot, Slot, Vehicle, Ticket, Reservation) & Prototypes
│   ├── data.js                     # Seed Data, Initial Facility Coordinates & Plate Generators
│   ├── geolocation.js              # Native Geolocation & Spherical Haversine Math (R = 6371 km)
│   ├── booking-logic.js            # Deterministic Best-Fit Bay Engine & Allocation Logic
│   ├── reservation-logic.js        # Mathematical Interval Collision (hasOverlap) & Expiry Timers
│   ├── storage.js                  # Native Web Storage (localStorage & sessionStorage)
│   ├── analytics.js                # Operational Metrics, Dynamic Tariffs & Occupancy Breakdown
│   ├── map.js                      # Procedural SVG Coordinate Map & Radar Nodes
│   ├── app.js                      # Master Application Controller & Cross-Page Routing Logic
│   └── helpers/                    # Helper & Utility Functions
│       └── utils.js                # Formatting (currency, time), Debounce, UID & Sanitization Helpers
│
├── assets/                         # Static Assets & Media
│   └── images/
│       └── garage_hud_bg.jpg       # Cockpit Console HUD Background Graphic
│
├── .gitignore                      # Git Exclusion Configuration (IDE, OS, Logs, Dependencies)
├── LICENSE                         # MIT Open Source License
└── README.md                       # Comprehensive Project Documentation
```

---

## Prerequisites

- **Web Browser**: Any modern web browser supporting standard ECMAScript 2015+ (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari, Opera).
- **Optional Local Server**: Python 3.x (`python -m http.server`) or Node.js (`npx serve`) for testing live Geolocation features.

---

## How to Run

### Method 1: Direct File Opening (No Installation Required)
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/raghavbtech/ParkPilot.git
   ```
2. Navigate to the project directory:
   ```bash
   cd ParkPilot
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

---

## Application Previews

| View | Page Path | Description |
|---|---|---|
| **Landing & Network Pulse** | `index.html` | Live operations summary, deterministic recommendation, and native SVG radar |
| **Operations Cockpit** | `pages/dashboard.html` | High-tech HUD console, vehicle session monitor, 2D floorplan, and ticket billing |
| **Parking Management** | `pages/parking.html` | Multi-lot CRUD directory with Add/Edit/Delete dialogs and 2D bay matrix |
| **Staff Reservations** | `pages/reservations.html` | Interval-overlap collision prevention, bookings table, and edit/cancel modals |
| **City GPS Radar** | `pages/map.html` | Procedural SVG radar visualizing user location and facilities |
| **Yield & Analytics** | `pages/analytics.html` | Real-time occupancy breakdown, live stats cards, and revenue summary |
| **Identity Portal** | `pages/auth.html` | Role-based authentication (Admin vs Regular User) with session management |

---

## License

This project is open-source and licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.
