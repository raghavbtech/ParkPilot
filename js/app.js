/**
 * ParkPilot — Master Application Controller & Orchestrator
 * Clean, modular Vanilla JavaScript for 5th semester project evaluation.
 * 
 * TABLE OF CONTENTS:
 * 1. Global Application State & Storage Sync
 * 2. System Initialization & Lifecycle
 * 3. Role-Based Access Control (RBAC) & Authentication
 * 4. Multi-Page & Single-Page View Routing
 * 5. Dashboard Metrics & Live 2D Parking Blueprint
 * 6. Public Landing Page & GPS Recommender Preview
 * 7. Bay Inspection Drawer & Direct Check-in / Booking
 * 8. Reservations Management & Overlap Checking
 * 9. Live Analytics & Utilization Metrics
 * 10. Parking Facility (Lot) CRUD Operations
 * 11. Modal Dialogs, Global Search & Utility Helpers
 */

/* ==========================================================================
   1. GLOBAL APPLICATION STATE & STORAGE SYNC
   ========================================================================== */

function getDefaultTimeslot() {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`;
}

function resolvePageUrl(targetFile) {
  if (typeof window === 'undefined' || !window.location) return targetFile;
  if (targetFile.startsWith('../') || targetFile.startsWith('pages/')) return targetFile;
  const inPages = (window.location.pathname || '').replace(/\\/g, '/').includes('/pages/');
  if (targetFile === 'index.html') return inPages ? '../index.html' : 'index.html';
  return inPages ? targetFile : `pages/${targetFile}`;
}

window.appState = {
  lots: new Map(),
  activeTickets: new Map(),
  activeVehicleNumbers: new Set(),
  reservations: new Map(),
  activityLog: [],
  parkingHistory: [],
  userCoords: typeof DEFAULT_CENTER_COORDS !== 'undefined' ? DEFAULT_CENTER_COORDS : { lat: 28.6139, lng: 77.2090 },
  selectedLotId: 'LOT-01',
  currentView: 'landing',
  currentZoneFilter: 'all',
  surgeMultiplier: 1.0,
  baseRate: 3.50,
  activeDrawerSlot: null,
  landingSelectedVType: 'car',
  currentTheme: 'dark',
  selectedTimeslot: getDefaultTimeslot(),
  timeslotDayOffset: 0,
  selectedFloor: 1,
  currentDashboardCategory: 'all',
  currentParkedIndex: 0,
  currentUserRole: 'admin',
  accounts: [
    { username: 'raghav', password: 'password', role: 'admin', displayName: 'Raghav' },
    { username: 'admin', password: 'password', role: 'admin', displayName: 'Super Admin' },
    { username: 'user', password: 'password', role: 'user', displayName: 'Regular User' }
  ],
  currentUser: { username: 'raghav', password: 'password', role: 'admin', displayName: 'Raghav' }
};
const appState = window.appState;

/* ==========================================================================
   2. SYSTEM INITIALIZATION & LIFECYCLE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initApplicationState();
  setupEventListeners();
  populateDropdowns();
  renderCurrentView();
  if (appState.currentView === 'map' && typeof initMap === 'function') {
    initMap(appState.userCoords, selectLot);
  }
  resolveUserLocation();
});

function initApplicationState() {
  const cached = typeof loadFromLocalStorage === 'function' ? loadFromLocalStorage() : null;
  if (cached?.lots?.size > 0) {
    Object.assign(appState, cached);
    window.appState = appState;
    if (!appState.selectedLotId || !appState.lots.has(appState.selectedLotId)) {
      appState.selectedLotId = Array.from(appState.lots.keys())[0];
    }
  } else {
    seedInitialState();
  }

  if (!appState.accounts || appState.accounts.length === 0) {
    appState.accounts = [
      { username: 'raghav', password: 'password', role: 'admin', displayName: 'Raghav' },
      { username: 'admin', password: 'password', role: 'admin', displayName: 'Super Admin' },
      { username: 'user', password: 'password', role: 'user', displayName: 'Regular User' }
    ];
  } else if (!appState.accounts.some(a => a.username.toLowerCase() === 'raghav')) {
    appState.accounts.unshift({ username: 'raghav', password: 'password', role: 'admin', displayName: 'Raghav' });
  }

  if (!appState.currentUser) {
    const isNode = typeof process !== 'undefined' && process.release?.name === 'node';
    if (isNode) {
      const defaultAcc = appState.accounts.find(a => a.username === 'raghav') || appState.accounts.find(a => a.role === 'admin') || appState.accounts[0];
      appState.currentUser = defaultAcc;
      appState.currentUserRole = defaultAcc.role || 'admin';
    } else {
      appState.currentUser = null;
      appState.currentUserRole = 'guest';
    }
  } else {
    appState.currentUserRole = appState.currentUser.role || 'admin';
  }

  if (!appState.landingSelectedVType) appState.landingSelectedVType = 'car';

  const validViews = ['dashboard', 'landing', 'slots', 'parking', 'reservations', 'analytics', 'map', 'auth'];
  let pageName = (typeof document !== 'undefined' && document.body?.dataset?.page) || null;
  if (!pageName && typeof window !== 'undefined' && window.location?.pathname) {
    const p = window.location.pathname.split('/').pop().replace('.html', '').trim();
    if (p === 'parking') pageName = 'slots';
    else if (p && validViews.includes(p)) pageName = p;
    else if (p === 'index' || p === '') pageName = 'landing';
  }

  appState.currentView = (pageName && validViews.includes(pageName)) ? pageName : (appState.currentView || 'landing');
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.setAttribute('data-theme', 'dark');

  applyRoleUI();
}

function seedInitialState() {
  appState.lots = typeof createSeedLotsMap === 'function' ? createSeedLotsMap() : new Map();
  appState.activeTickets = new Map();
  appState.activeVehicleNumbers = new Set();
  appState.reservations = new Map();
  appState.activityLog = [];
  appState.parkingHistory = [];
  appState.selectedLotId = 'LOT-01';
  appState.userCoords = { lat: 28.6139, lng: 77.2090 };

  const defaultAdmin = { username: 'admin', password: 'password', role: 'admin', displayName: 'Super Admin' };
  appState.accounts = [defaultAdmin, { username: 'user', password: 'password', role: 'user', displayName: 'Regular User' }];
  appState.currentUser = defaultAdmin;
  appState.currentUserRole = 'admin';

  [
    ['XY68ZTR', 'car', 'LOT-01', 'CM-C01', 'user'],
    ['DL01CA1021', 'car', 'LOT-01', 'CM-C03', 'guest'],
    ['HR26BK9044', 'bike', 'LOT-01', 'CM-B01', 'guest'],
    ['UP16EV3310', 'ev-car', 'LOT-01', 'CM-E01', 'guest'],
    ['DL04SU7782', 'suv', 'LOT-02', 'SR-S01', 'guest'],
    ['MH02CA4512', 'car', 'LOT-02', 'SR-C01', 'guest'],
    ['KA05EV8821', 'ev-car', 'LOT-03', 'TP-E01', 'guest'],
    ['DL03CA9901', 'car', 'LOT-04', 'RC-C01', 'guest']
  ].forEach(([plate, type, lotId, slotId, owner], i) => {
    const lot = appState.lots.get(lotId), slot = lot?.getSlot(slotId);
    if (!lot || !slot) return;
    const vehicle = new Vehicle(plate, type), ticketId = `T-${1001 + i}`;
    const entryTime = new Date(Date.now() - (i + 2) * 28 * 60000).toISOString();
    const ticket = new Ticket(ticketId, vehicle, lot.id, slot.id, entryTime, owner);
    Object.assign(slot, { isOccupied: true, currentTicketId: ticketId, currentVehicle: vehicle });
    appState.activeTickets.set(ticketId, ticket);
    appState.activeVehicleNumbers.add(vehicle.number);
    appState.activityLog.push({ id: `ACT-${i}`, type: 'ENTRY', title: 'Vehicle Parked', badge: 'green', message: `${vehicle.describe()} checked in at ${lot.name} [${slot.id}]`, timestamp: entryTime, ticketId });
  });

  const staffLot = appState.lots.get('LOT-01'), staffSlot = staffLot?.getSlot('CM-ST1');
  if (staffLot && staffSlot) {
    const now = new Date(), startTime = new Date(now.getTime() - 30 * 60000).toISOString(), endTime = new Date(now.getTime() + 120 * 60000).toISOString();
    const res = new Reservation('RES-500', 'STAFF-CHIEF', 'LOT-01', 'CM-ST1', startTime, endTime, 'reserved');
    staffSlot.reservedFor = 'STAFF-CHIEF';
    staffSlot.reservationWindow = { startTime, endTime, reservationId: 'RES-500' };
    appState.reservations.set('RES-500', res);
  }
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
}

async function resolveUserLocation() {
  if (typeof getUserCoordinates !== 'function') return;
  try {
    appState.userCoords = await getUserCoordinates();
    if (appState.currentView === 'landing') {
      updateLandingRecommendationPreview();
      initHeroMap();
    } else if (appState.currentView === 'map' && typeof syncMapMarkers === 'function') {
      syncMapMarkers(appState.lots, appState.selectedLotId, selectLot);
    }
  } catch (err) {
    console.warn('Geolocation fallback active:', err.message);
  }
}

/* ==========================================================================
   3. ROLE-BASED ACCESS CONTROL (RBAC) & AUTHENTICATION
   ========================================================================== */

function handleAuthClick() {
  if (typeof window !== 'undefined' && window.location) {
    const current = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
    if (current !== 'auth.html') { window.location.href = resolvePageUrl('auth.html'); return; }
  }
  switchView('auth', false);
}

function handleConsoleAccess() {
  if (appState.currentUser && appState.currentUser.role) {
    if (typeof window !== 'undefined' && window.location) {
      const current = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
      if (current !== 'dashboard.html') window.location.href = resolvePageUrl('dashboard.html');
      else switchView('dashboard', false);
    }
  } else {
    showToast('🔒 Operator Authorization Required: Please sign in to access the console.', 'info');
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location) window.location.href = resolvePageUrl('auth.html') + '?redirect=dashboard.html';
    }, 350);
  }
}

function handleLogout() {
  appState.currentUser = null;
  appState.currentUserRole = 'guest';
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  applyRoleUI();
  showToast('Logged out successfully. Public guest mode active.', 'info');
  renderAuthView();
  if (typeof window !== 'undefined' && window.location?.pathname) {
    const current = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
    if (current !== 'index.html' && current !== 'auth.html' && current !== '') {
      setTimeout(() => { window.location.href = resolvePageUrl('index.html'); }, 250);
    }
  }
}

function quickLogin(role = 'raghav') {
  let account = (appState.accounts || []).find(a => a.username === role) || (appState.accounts || []).find(a => a.role === role);
  if (!account) {
    if (role === 'admin') account = { username: 'admin', password: 'password', role: 'admin', displayName: 'Super Admin' };
    else if (role === 'user') account = { username: 'user', password: 'password', role: 'user', displayName: 'Regular User' };
    else account = { username: 'raghav', password: 'password', role: 'admin', displayName: 'Raghav' };
  }

  appState.currentUser = account;
  appState.currentUserRole = account.role;
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  applyRoleUI();
  updateDashboardGreeting();
  showToast(`Active profile: ${account.displayName} (${account.role === 'admin' ? 'Admin' : 'Regular User'})`, 'success');

  if (typeof window !== 'undefined' && window.location) {
    const current = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
    if (current !== 'dashboard.html') window.location.href = resolvePageUrl('dashboard.html');
    else switchView('dashboard', false);
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const user = (document.getElementById('authUsername')?.value || '').trim();
  const pass = (document.getElementById('authPassword')?.value || '').trim();

  let account = appState.accounts.find(a => a.username.toLowerCase() === user.toLowerCase() && a.password === pass);
  if (!account && (user.toLowerCase() === 'raghav' || user.toLowerCase() === 'admin' || user.toLowerCase() === 'user') && pass === 'password') {
    const r = user.toLowerCase() === 'user' ? 'user' : 'admin';
    account = { username: user.toLowerCase(), password: pass, role: r, displayName: user.charAt(0).toUpperCase() + user.slice(1) };
    appState.accounts.push(account);
  }

  if (account) {
    appState.currentUser = account;
    appState.currentUserRole = account.role;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    applyRoleUI();
    updateDashboardGreeting();
    showToast(`Welcome back, ${account.displayName}!`, 'success');
    setTimeout(() => { if (typeof window !== 'undefined') window.location.href = resolvePageUrl('dashboard.html'); }, 300);
  } else {
    showToast('Invalid credentials. Default: raghav / password or admin / password', 'error');
  }
}

function handleSignupSubmit(e) {
  e.preventDefault();
  const user = (document.getElementById('signupUsername')?.value || '').trim();
  const pass = (document.getElementById('signupPassword')?.value || '').trim();
  const role = document.getElementById('signupRole')?.value || 'admin';
  const name = (document.getElementById('signupName')?.value || '').trim();

  if (appState.accounts.some(a => a.username.toLowerCase() === user.toLowerCase())) {
    showToast('Username already taken.', 'error');
    return;
  }

  const newAcc = { username: user, password: pass, role, displayName: name || user };
  appState.accounts.push(newAcc);
  appState.currentUser = newAcc;
  appState.currentUserRole = role;
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  applyRoleUI();
  showToast(`Account created for ${newAcc.displayName}!`, 'success');
  setTimeout(() => { if (typeof window !== 'undefined') window.location.href = resolvePageUrl('dashboard.html'); }, 300);
}

function toggleAuthMode() {
  const loginForm = document.getElementById('loginFormContainer');
  const signupForm = document.getElementById('signupFormContainer');
  if (loginForm && signupForm) {
    const isLogin = loginForm.style.display !== 'none';
    loginForm.style.display = isLogin ? 'none' : 'block';
    signupForm.style.display = isLogin ? 'block' : 'none';
  }
}

function renderAuthView() {
  const container = document.getElementById('authActiveSessionStatus');
  const nameEl = document.getElementById('authActiveUserName');
  const roleEl = document.getElementById('authActiveUserRole');
  const switchBtn = document.getElementById('authSwitchRoleBtn');

  if (!container) return;
  if (appState.currentUser) {
    container.style.display = 'block';
    if (nameEl) nameEl.textContent = appState.currentUser.displayName;
    if (roleEl) roleEl.textContent = appState.currentUser.role === 'admin' ? 'Super Admin (Full Access)' : 'Regular User (Public Access)';
    if (switchBtn) {
      const isAdmin = appState.currentUser.role === 'admin';
      switchBtn.textContent = isAdmin ? '👤 Switch to Regular User Mode' : '⚡ Switch to Super Admin Mode';
      switchBtn.onclick = () => quickLogin(isAdmin ? 'user' : 'admin');
    }
  } else {
    container.style.display = 'none';
  }
}

function canUserCheckoutTicket(ticket, currentUser, currentUserRole) {
  if (!ticket) return { allowed: false, reason: 'No active ticket session found.' };

  const role = currentUserRole || (currentUser ? currentUser.role : 'user');
  if (role === 'admin') {
    return { allowed: true, isSuperAdmin: true, isOwner: false };
  }

  const username = currentUser ? (currentUser.username || currentUser.role) : 'user';
  const owner = ticket.owner || 'guest';
  if (owner === username || owner === role) {
    return { allowed: true, isSuperAdmin: false, isOwner: true };
  }

  return {
    allowed: false, isSuperAdmin: false, isOwner: false,
    reason: `This vehicle is registered to another driver (${owner}). Only the registered owner or Super Admin can process departure.`
  };
}

function applyRoleUI() {
  const isUser = appState.currentUserRole === 'user';
  const inConsole = appState.currentView !== 'landing' && appState.currentView !== 'auth';

  const landingAuth = document.getElementById('landingAuthSnippet');
  if (landingAuth) {
    if (appState.currentUser?.role && appState.currentUser.role !== 'guest') {
      const roleBadge = appState.currentUser.role === 'admin' ? 'ADMIN' : 'DRIVER';
      landingAuth.innerHTML = `
        <div class="ps-landing-user-badge" style="display:inline-flex;align-items:center;gap:8px;background:var(--bg-elevated);padding:5px 12px;border-radius:999px;border:1px solid var(--border-subtle);font-size:12px;font-weight:600;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-primary);"></span>
          <span>👤 ${appState.currentUser.displayName || 'Authorized User'}</span>
          <span style="font-size:10px;font-weight:800;background:rgba(33,230,193,0.15);color:var(--accent-primary);padding:2px 6px;border-radius:4px;">${roleBadge}</span>
        </div>
        <button class="btn btn-primary" onclick="window.handleConsoleAccess()" style="padding:7px 14px;font-size:12px;font-weight:700;">Operator console ↗</button>
        <button class="btn-plain" onclick="window.handleLogout()" style="font-size:12px;color:var(--text-muted);font-weight:700;cursor:pointer;">Sign out ⎋</button>
        <button class="btn btn-outline" onclick="window.openQuickParkModal()">Quick park ＋</button>
      `;
    } else {
      landingAuth.innerHTML = `
        <a href="${resolvePageUrl('auth.html')}" class="btn-plain" style="font-size:13px;font-weight:700;color:var(--text);">Sign in</a>
        <button class="btn btn-primary" onclick="window.handleConsoleAccess()" style="padding:7px 14px;font-size:12px;font-weight:700;">Operator console ↗</button>
        <button class="btn btn-outline" onclick="window.openQuickParkModal()">Quick park ＋</button>
      `;
    }
  }

  const userAvatar = document.getElementById('userAvatar'), userName = document.getElementById('userName'), userRole = document.getElementById('userRole'), topbarUser = document.querySelector('.ps-topbar-user');
  if (userAvatar && userName && userRole) {
    const active = appState.currentUser?.role && appState.currentUser.role !== 'guest';
    userAvatar.textContent = active ? (appState.currentUser.displayName || 'SA').substring(0, 2).toUpperCase() : 'GU';
    userName.textContent = active ? appState.currentUser.displayName : 'Guest Operator';
    userRole.textContent = active ? (isUser ? 'User Access' : 'Manage Network') : 'Sign in for full access';
    if (topbarUser && active) topbarUser.title = `${appState.currentUser.displayName} (${isUser ? 'User' : 'Admin'})`;
  }

  const sidebar = document.querySelector('.ps-icon-sidebar'), navPills = document.querySelector('.ps-topbar-nav-pills'), btnAddNewLot = document.getElementById('btnAddNewLot');
  if (sidebar) sidebar.style.display = inConsole ? 'flex' : 'none';
  if (navPills) navPills.style.display = inConsole ? 'flex' : 'none';
  if (topbarUser) topbarUser.style.display = 'flex';
  if (btnAddNewLot) btnAddNewLot.style.display = isUser ? 'none' : 'inline-flex';

  const isAdmin = appState.currentUserRole === 'admin';
  document.querySelectorAll('[data-admin-only="true"], .admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  updateDashboardGreeting();
}

/* ==========================================================================
   4. MULTI-PAGE & SINGLE-PAGE VIEW ROUTING
   ========================================================================== */

function switchView(viewName, pushToHistory = false) {
  if (!appState.currentUser && viewName !== 'auth' && viewName !== 'landing') {
    if (typeof process !== 'undefined' && process.release?.name === 'node') {
      const adminAcc = (appState.accounts && appState.accounts.find(a => a.role === 'admin')) || { username: 'admin', role: 'admin', displayName: 'Super Admin' };
      appState.currentUser = adminAcc;
      appState.currentUserRole = 'admin';
    }
  }

  appState.currentView = viewName;
  if (typeof window !== 'undefined' && window.location?.hash) {
    try { window.history?.replaceState?.(null, '', window.location.pathname + window.location.search); } catch (_) {}
  }

  document.querySelectorAll('.ps-icon-btn').forEach(el => el.classList.toggle('active', el.dataset?.view === viewName));
  const topPillMap = { dashboard: 'topNavDashboard', landing: 'topNavLanding', reservations: 'topNavReservation', slots: 'topNavManagement', parking: 'topNavManagement', analytics: 'topNavAnalytics', map: 'topNavMap' };
  document.querySelectorAll('.ps-top-pill').forEach(el => el.classList.remove('active'));
  if (topPillMap[viewName]) document.getElementById(topPillMap[viewName])?.classList.add('active');

  const vTarget = document.getElementById(`view-${viewName}`);
  if (!vTarget && typeof window !== 'undefined' && window.location?.pathname) {
    let targetFile = viewName === 'landing' ? 'index.html' : (viewName === 'slots' || viewName === 'parking') ? 'parking.html' : `${viewName}.html`;
    const curFile = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
    if (curFile !== targetFile) { window.location.href = resolvePageUrl(targetFile); return; }
  }

  document.querySelectorAll('.ps-view').forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
  if (vTarget) {
    vTarget.classList.add('active');
    vTarget.style.display = viewName === 'landing' ? 'block' : 'flex';
    vTarget.style.flexDirection = 'column';
    vTarget.style.width = '100%';
  }

  const isPublic = viewName === 'landing' || viewName === 'auth';
  const sidebar = document.querySelector('.ps-icon-sidebar'), topbar = document.querySelector('.ps-floating-topbar'), mainLayout = document.querySelector('.ps-main-layout');
  if (sidebar) sidebar.style.display = isPublic ? 'none' : 'flex';
  if (topbar) topbar.style.display = isPublic ? 'none' : 'flex';
  if (mainLayout) { mainLayout.style.padding = isPublic ? '0' : ''; mainLayout.style.justifyContent = isPublic ? 'center' : ''; mainLayout.style.marginLeft = isPublic ? '0' : ''; }

  renderCurrentView();

  if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   5. DASHBOARD METRICS & LIVE 2D PARKING BLUEPRINT
   ========================================================================== */

function updateDashboardGreeting() {
  if (typeof document === 'undefined') return;
  const hour = new Date().getHours();
  setText('dashGreetingSalutation', hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
  setText('dashGreetingName', appState.currentUser ? (appState.currentUser.displayName || appState.currentUser.username || 'Raghav') : 'Raghav');
  const dateFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  setText('dashGreetingDate', `Here’s the live operations pulse for ${dateFormatted}.`);
}

function getNetworkBayTotals() {
  let cap = 0, free = 0, occ = 0;
  for (const lot of appState.lots.values()) {
    cap += lot.getTotalSlotsCount();
    free += lot.getAvailableSlotsCount();
    occ += lot.getOccupiedSlotsCount();
  }
  return { cap, free, occ };
}

function calculateCurrentRevenue() {
  let rev = 1840.00;
  (appState.parkingHistory || []).forEach(h => { rev += (h.fee || 3.50); });
  if (appState.activeTickets) {
    const now = Date.now();
    for (const t of appState.activeTickets.values()) {
      const mins = Math.max(15, Math.floor((now - new Date(t.entryTime || now).getTime()) / 60000));
      rev += (mins / 60) * 3.50;
    }
  }
  return rev;
}

function updateDashboardKPIs() {
  if (typeof document === 'undefined') return;
  const { cap, free, occ } = getNetworkBayTotals();
  setText('kpiTotalCap', String(cap));
  setText('kpiAvailableBays', String(free));
  setText('kpiOccupiedBays', String(occ));
  setText('kpiTotalRevenue', `$${Math.round(calculateCurrentRevenue()).toLocaleString('en-US')}`);
}

function renderCurrentView() {
  const viewName = appState.currentView;

  // Ensure active view is displayed and other views on the page are hidden
  const vTarget = document.getElementById(`view-${viewName}`);
  document.querySelectorAll('.ps-view').forEach(v => {
    if (v === vTarget) {
      v.classList.add('active');
      v.style.display = viewName === 'landing' ? 'block' : 'flex';
      v.style.flexDirection = 'column';
      v.style.width = '100%';
    } else {
      v.classList.remove('active');
      v.style.display = 'none';
    }
  });

  // Activate matching topbar pill and sidebar icon
  document.querySelectorAll('.ps-icon-btn').forEach(el => el.classList.toggle('active', el.dataset?.view === viewName));
  const topPillMap = { dashboard: 'topNavDashboard', landing: 'topNavLanding', reservations: 'topNavReservation', slots: 'topNavManagement', parking: 'topNavManagement', analytics: 'topNavAnalytics', map: 'topNavMap' };
  document.querySelectorAll('.ps-top-pill').forEach(el => el.classList.remove('active'));
  if (topPillMap[viewName]) document.getElementById(topPillMap[viewName])?.classList.add('active');

  if (viewName === 'landing') {
    renderLandingPage();
    updateLandingRecommendationPreview();
    initHeroMap();
    startHeroClock();
  } else if (viewName === 'auth') {
    renderAuthView();
  } else {
    applyRoleUI();
    if (viewName === 'dashboard') {
      updateDashboardGreeting();
      updateDashboardKPIs();
      renderTopDownParkingLot();
      updateCurrentParkedWidget();
    } else if (viewName === 'slots' || viewName === 'parking') {
      renderTimeslotPills();
      renderTopDownParkingLot();
      renderFullSlotMatrix();
      if (typeof renderParkingLotsList === 'function') renderParkingLotsList();
      updateDashboardKPIs();
    } else if (viewName === 'reservations') {
      renderReservationsTable();
      updateDashboardKPIs();
    } else if (viewName === 'analytics') {
      renderAnalyticsStats();
      if (typeof renderAnalyticsCharts === 'function') renderAnalyticsCharts();
    } else if (viewName === 'map') {
      if (typeof syncMapMarkers === 'function') syncMapMarkers(appState.lots, appState.selectedLotId, selectLot);
    }
  }
}

function renderAll() {
  updateDashboardKPIs();
  renderCurrentView();
}

function updateCurrentParkedWidget() {
  const lotTickets = Array.from(appState.activeTickets.values()).filter(t => t.lotId === appState.selectedLotId);
  const exitBtn = document.getElementById('currentParkedExitBtn');
  const inspectBtn = document.getElementById('currentParkedInspectBtn');

  if (!lotTickets || lotTickets.length === 0) {
    setText('currentParkedIndexLabel', '0 / 0');
    setText('currentParkedPlateDisplay', 'NO VEHICLE PARKED');
    setText('currentParkedSlot', 'All bays free');
    setText('currentParkedDuration', '0m');
    setText('currentParkedFee', '$0.00');
    if (exitBtn) { exitBtn.textContent = '+ Park'; exitBtn.onclick = () => window.openQuickParkModal(); }
    if (inspectBtn) inspectBtn.style.display = 'none';
    return;
  }

  if (typeof appState.currentParkedIndex !== 'number' || appState.currentParkedIndex >= lotTickets.length || appState.currentParkedIndex < 0) {
    appState.currentParkedIndex = 0;
  }

  const t = lotTickets[appState.currentParkedIndex];
  if (exitBtn && t) {
    const auth = canUserCheckoutTicket(t, appState.currentUser, appState.currentUserRole);
    exitBtn.textContent = auth.allowed ? 'Exit & Pay' : '🔒 Protected';
    exitBtn.title = auth.allowed ? 'Process vehicle departure and payment' : 'Vehicle owned by another driver';
    exitBtn.onclick = auth.allowed ? () => window.exitCurrentParkedVehicle() : () => showToast('Access Restricted: Only registered owner or Super Admin can process departure.', 'warning');
  }

  setText('currentParkedIndexLabel', `${appState.currentParkedIndex + 1} / ${lotTickets.length}`);
  setText('currentParkedPlateDisplay', t.vehicle?.number || 'XY68ZTR');
  setText('currentParkedSlot', `Slot ${t.slotId}`);
  setText('cameraPlateReadout', t.vehicle?.number || 'XY68ZTR');
  setText('hudLevelLabel', `Bay ${t.slotId}`);

  if (inspectBtn) {
    inspectBtn.style.display = 'inline-flex';
    inspectBtn.title = `Inspect Bay ${t.slotId}`;
    inspectBtn.innerHTML = '🔍';
    inspectBtn.onclick = () => window.focusCurrentParkedSlot();
  }

  const mins = Math.max(1, Math.floor((Date.now() - new Date(t.entryTime).getTime()) / 60000));
  setText('currentParkedDuration', mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);
  setText('currentParkedFee', `$${(typeof calculateSessionFee === 'function' ? calculateSessionFee(t.vehicle?.type, mins, appState.surgeMultiplier) : 3.50).toFixed(2)}`);
}

function stepCurrentParkedVehicle(delta) {
  const lotTickets = Array.from(appState.activeTickets.values()).filter(t => t.lotId === appState.selectedLotId);
  if (lotTickets.length <= 1) return;
  appState.currentParkedIndex = (appState.currentParkedIndex + delta + lotTickets.length) % lotTickets.length;
  updateCurrentParkedWidget();
}

function focusCurrentParkedSlot() {
  const lotTickets = Array.from(appState.activeTickets.values()).filter(t => t.lotId === appState.selectedLotId);
  if (!lotTickets || lotTickets.length === 0) { showToast('No active vehicles parked in this facility.', 'info'); return; }
  const t = lotTickets[appState.currentParkedIndex || 0];
  if (t) { openSlotDrawer(t.slotId, t.lotId); showToast(`Inspecting Bay ${t.slotId} (${t.vehicle?.number || 'Active Vehicle'})`, 'info'); }
}

function selectLot(lotId) {
  if (!appState.lots.has(lotId)) return;
  appState.selectedLotId = lotId;
  appState.selectedFloor = 1;

  const selector = document.getElementById('facilitySelector');
  if (selector && selector.value !== lotId) selector.value = lotId;

  renderAll();
  if (typeof focusLotOnMap === 'function') focusLotOnMap(lotId, appState.lots);
}

function renderLotTabs() {
  const container = document.getElementById('lotTabsRow');
  if (container) { container.innerHTML = ''; container.style.display = 'none'; }
}

function selectFloor(floorNum = 1) {
  appState.selectedFloor = 1;
  renderAll();
}

function getOverheadCarSVG() {
  return `
    <div class="ps-car-topview">
      <svg class="ps-car-svg" viewBox="0 0 44 76" fill="none">
        <rect x="3" y="4" width="38" height="68" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
        <path d="M7 22 Q22 18 37 22 L35 34 Q22 32 9 34 Z" fill="#1e293b"/>
        <rect x="12" y="37" width="20" height="12" rx="3" fill="#0f172a"/>
        <path d="M9 54 Q22 52 35 54 L37 62 Q22 64 7 62 Z" fill="#1e293b"/>
        <rect x="5" y="5" width="6" height="3" rx="1" fill="#fef08a"/>
        <rect x="33" y="5" width="6" height="3" rx="1" fill="#fef08a"/>
        <rect x="5" y="68" width="7" height="3" rx="1" fill="#ef4444"/>
        <rect x="32" y="68" width="7" height="3" rx="1" fill="#ef4444"/>
      </svg>
    </div>
  `;
}

function getActiveTimeslotWindow(timeslotStr = '13:00', dayOffset = 0, durationMinutes = 60) {
  if (typeof window !== 'undefined' && typeof window.getTimeslotWindow === 'function') {
    const res = window.getTimeslotWindow(timeslotStr, dayOffset, durationMinutes);
    if (res && res.rangeFormatted) return res;
  }
  const str = typeof timeslotStr === 'number' ? `${String(timeslotStr).padStart(2, '0')}:00` : String(timeslotStr || '13:00');
  const parts = str.split(':').map(Number);
  const hours = isNaN(parts[0]) ? 13 : parts[0];
  const minutes = isNaN(parts[1]) ? 0 : parts[1];

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (dayOffset || 0), hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const startH = String(hours).padStart(2, '0'), startM = String(minutes).padStart(2, '0');
  const endH = String(end.getHours()).padStart(2, '0'), endM = String(end.getMinutes()).padStart(2, '0');
  const startTimeFormatted = `${startH}:${startM}`, endTimeFormatted = `${endH}:${endM}`;

  return {
    start, end, startISO: start.toISOString(), endISO: end.toISOString(),
    startTimeFormatted, endTimeFormatted, rangeFormatted: `${startTimeFormatted} – ${endTimeFormatted}`
  };
}

function renderTopDownParkingLot() {
  const lot = appState.lots.get(appState.selectedLotId);
  const container = document.getElementById('bayColCenter');
  if (!lot || !container) return;

  const windowObj = getActiveTimeslotWindow(appState.selectedTimeslot, appState.timeslotDayOffset);
  const now = Date.now();
  const isCurrentWindow = appState.timeslotDayOffset === 0 && now >= windowObj.start.getTime() && now <= windowObj.end.getTime();
  const cat = appState.currentDashboardCategory || 'all';

  container.innerHTML = Array.from(lot.slots.values()).map(slot => {
    let isOccupiedNow = false;
    if (slot.isOccupied && slot.currentVehicle && appState.timeslotDayOffset === 0) {
      const ticket = appState.activeTickets.get(slot.currentTicketId);
      const entryTimeMs = ticket ? new Date(ticket.entryTime).getTime() : 0;
      if (isCurrentWindow || (windowObj.end.getTime() >= entryTimeMs && windowObj.start.getTime() <= now) || windowObj.start.getTime() >= entryTimeMs) {
        isOccupiedNow = true;
      }
    }

    const windowConflict = typeof getConflictingReservation === 'function' ? getConflictingReservation(lot.id, slot.id, windowObj.start, windowObj.end, appState) : null;
    const isStaff = slot.type === 'staff';
    const isSelected = appState.activeDrawerSlot?.slot?.id === slot.id;

    let isCompat = true;
    if (cat !== 'all') {
      if (cat === 'ev-car') isCompat = slot.type === 'ev';
      else if (cat === 'car') isCompat = (slot.size === 'car' || slot.size === 'suv') && slot.type !== 'staff' && slot.type !== 'ev';
      else if (cat === 'suv') isCompat = slot.size === 'suv' && slot.type !== 'staff' && slot.type !== 'ev';
      else if (cat === 'bike') isCompat = slot.size === 'bike' && slot.type !== 'staff' && slot.type !== 'ev';
    }
    const catClass = cat === 'all' ? '' : (isCompat ? 'highlight-compat' : 'dimmed-compat');

    if (isOccupiedNow) {
      const plate = slot.currentVehicle?.number || 'OCCUPIED';
      return `<div class="ps-slot-bay occupied ${isSelected ? 'selected' : ''} ${catClass}" onclick="window.openSlotDrawer('${slot.id}','${lot.id}')" title="🔴 OCCUPIED: ${plate}">
        ${getOverheadCarSVG()}
        <div class="ps-bay-occupied-tag">🔴 OCCUPIED</div>
        <div class="ps-bay-plate-text">${plate}</div>
        <span class="ps-slot-label-vert">${slot.id}</span>
      </div>`;
    } else if (windowConflict) {
      const staffShort = windowConflict.staffId.length > 8 ? windowConflict.staffId.slice(0, 8) + '…' : windowConflict.staffId;
      return `<div class="ps-slot-bay hazard-locked ${isSelected ? 'selected' : ''} ${catClass}" onclick="window.openSlotDrawer('${slot.id}','${lot.id}')" title="🔒 RESERVED: ${windowConflict.staffId}">
        <div class="ps-hazard-badge" style="background:rgba(245,158,11,0.18);border-color:rgba(245,158,11,0.4);color:var(--accent-amber);">
          <span style="font-size:9px;font-weight:800;">🔒 BOOKED</span>
          <span style="font-size:8.5px;font-weight:700;">${staffShort}</span>
        </div>
        <span class="ps-slot-label-vert" style="background:#000;color:#f59e0b;padding:1px 4px;border-radius:3px;margin-top:4px;">${slot.id}</span>
      </div>`;
    } else if (isStaff) {
      return `<div class="ps-slot-bay hazard-locked ${isSelected ? 'selected' : ''} ${catClass}" onclick="window.openSlotDrawer('${slot.id}','${lot.id}')" title="Staff Dedicated Bay">
        <div class="ps-hazard-badge"><span>STAFF ONLY</span><span>🔒 Booking</span></div>
        <span class="ps-slot-label-vert" style="background:#000;color:#fff;padding:1px 4px;border-radius:3px;margin-top:4px;">${slot.id}</span>
      </div>`;
    } else {
      const typeIcon = slot.size === 'bike' ? '🏍️ BIKE' : slot.type === 'ev' ? '⚡ EV' : '🅿️ CAR';
      return `<div class="ps-slot-bay available-bay ${isSelected ? 'selected' : ''} ${catClass}" onclick="window.openSlotDrawer('${slot.id}','${lot.id}')" title="🟢 AVAILABLE">
        <div class="ps-bay-available-pill"><span class="ps-bay-dot green-dot"></span><span class="ps-bay-pill-text">OPEN</span></div>
        <span style="font-size:9.5px;font-weight:700;color:var(--text-muted);margin-top:2px;">${typeIcon}</span>
        <span class="ps-slot-label-vert">${slot.id}</span>
      </div>`;
    }
  }).join('');
}

const STANDARD_TIMESLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00', '22:00', '23:00'];

function renderTimeslotPills() {
  const container = document.getElementById('timeslotPillsGrid');
  if (!container) return;

  const currentHourStr = getDefaultTimeslot();
  let times = Array.from(new Set([...STANDARD_TIMESLOTS, currentHourStr, appState.selectedTimeslot])).sort();

  container.innerHTML = times.map(time => {
    const isSelected = appState.selectedTimeslot === time;
    const isCurrent = appState.timeslotDayOffset === 0 && time === currentHourStr;
    return `<button type="button" class="ps-time-pill ${isSelected ? 'selected' : ''} ${isCurrent ? 'available' : ''}" onclick="window.selectTimeslot('${time}', this)">${isCurrent ? `${time} · LIVE` : time}</button>`;
  }).join('');
}

function selectTimeslot(time, btn) {
  appState.selectedTimeslot = time;
  renderTimeslotPills();
  renderTopDownParkingLot();
  showToast(`Showing bay availability for ${time}`, 'info');
}

function changeTimeslotDate(delta) {
  appState.timeslotDayOffset = Math.max(0, appState.timeslotDayOffset + delta);
  const d = new Date();
  d.setDate(d.getDate() + appState.timeslotDayOffset);
  const lbl = appState.timeslotDayOffset === 0 ? 'Today' : appState.timeslotDayOffset === 1 ? 'Tomorrow' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  setText('timeslotDateLabel', lbl);
  renderTimeslotPills();
  renderTopDownParkingLot();
  showToast(`Date changed to ${lbl}`, 'info');
}

function selectDashboardCategory(cat, btn) {
  appState.currentDashboardCategory = cat;
  document.querySelectorAll('.ps-options-card .ps-veh-icon-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const lot = appState.lots.get(appState.selectedLotId);
  if (lot) {
    const slots = Array.from(lot.slots.values());
    let count = 0;
    if (cat === 'all') count = slots.filter(s => s.isAvailable() && s.type !== 'staff').length;
    else if (cat === 'ev-car') count = slots.filter(s => s.type === 'ev' && s.isAvailable()).length;
    else if (cat === 'suv') count = slots.filter(s => s.size === 'suv' && s.isAvailable() && s.type !== 'staff' && s.type !== 'ev').length;
    else if (cat === 'bike') count = slots.filter(s => s.size === 'bike' && s.isAvailable() && s.type !== 'staff' && s.type !== 'ev').length;
    else count = slots.filter(s => (s.size === 'car' || s.size === 'suv') && s.isAvailable() && s.type !== 'staff' && s.type !== 'ev').length;
    setText('categoryCountBadge', `${count} Bays Free`);
  }
  renderTopDownParkingLot();
}

function exitCurrentParkedVehicle() {
  const lotTickets = Array.from(appState.activeTickets.values()).filter(t => t.lotId === appState.selectedLotId);
  if (lotTickets.length === 0) {
    const anyTicket = Array.from(appState.activeTickets.values())[0];
    if (anyTicket) handleProcessExit(anyTicket.id);
    else showToast('No active parked vehicle to exit.', 'info');
    return;
  }
  handleProcessExit(lotTickets[appState.currentParkedIndex || 0].id);
}

/* ==========================================================================
   6. PUBLIC LANDING PAGE & GPS RECOMMENDER PREVIEW
   ========================================================================== */

function renderLandingPage() {
  const container = document.getElementById('landingFacilitiesGrid');
  if (!container) return;
  let totalFree = 0;
  container.innerHTML = Array.from(appState.lots.values()).map((lot, idx) => {
    const total = lot.getTotalSlotsCount(), free = lot.getAvailableSlotsCount();
    totalFree += free;
    const occPct = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    const dist = typeof haversineDistance === 'function' ? haversineDistance(appState.userCoords.lat, appState.userCoords.lng, lot.lat, lot.lng) : 1.0;
    const code = lot.name ? lot.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) : lot.id.replace('LOT-0', 'L');
    const status = occPct >= 95 ? 'FULL' : occPct >= 65 ? 'FILLING' : 'OPEN';
    const evCount = Array.from(lot.slots.values()).filter(s => s.type === 'ev' || s.isEV).length;
    return `
      <div class="facility ${idx === 0 ? 'selected' : ''}" onclick="window.selectLotAndOpenConsole('${lot.id}')" title="Select ${lot.name}">
        <div class="facility-top"><span class="facility-code">${code}</span><span class="status ${status.toLowerCase()}">● ${status}</span></div>
        <div class="facility-title"><span>${lot.name}</span><span style="font-size:14px;color:var(--muted2)">↗</span></div>
        <div class="facility-distance">⌖ ${dist.toFixed(1)} km from your location</div>
        <div class="facility-stats"><div><b>${free}</b><span>free bays</span></div><div><b>${total}</b><span>capacity</span></div><div><b>${evCount}</b><span>EV chargers</span></div></div>
        <div class="occupancy"><span>UTILIZATION ${occPct}%</span><span>${total - free} occupied</span></div>
        <div class="bar"><span style="width: ${occPct}%;"></span></div>
      </div>`;
  }).join('');
  setText('landingTotalFreeBays', String(totalFree));
}

function selectLotAndOpenConsole(lotId) {
  selectLot(lotId);
  switchView('dashboard');
}

function selectLandingVType(vtype, el) {
  appState.landingSelectedVType = vtype;
  document.querySelectorAll('.vehicle-pills button, .ps-veh-icon-btn').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  updateLandingRecommendationPreview();
}

function updateLandingRecommendationPreview() {
  const vType = appState.landingSelectedVType || 'car';
  const vehicle = new Vehicle('DEMO-01', vType);
  const rec = typeof getRecommendedLot === 'function' ? getRecommendedLot(appState.userCoords, vehicle, appState.lots) : null;
  if (!rec?.winningLot) {
    setText('landingRecLotName', 'No Compatible Facility');
    setText('landingRecDistance', 'N/A');
    setText('landingFitScore', '0');
    const reasonsEl = document.getElementById('landingRecReasonsList');
    if (reasonsEl) reasonsEl.innerHTML = `<li>No free compatible ${vType.toUpperCase()} bays.</li>`;
    return;
  }
  const fit = typeof findBestFitSlot === 'function' ? findBestFitSlot(rec.winningLot, vehicle) : null;
  const bestBay = fit?.slot?.id || 'C-01';
  const free = rec.winningLot.getAvailableSlotsCount(), total = rec.winningLot.getTotalSlotsCount() || 1;
  const score = Math.max(70, Math.min(99, Math.round(98 - (rec.distance * 4) - (((total - free) / total) * 15))));
  setText('landingFitScore', String(score));
  setText('landingRecLotName', rec.winningLot.name);
  setText('landingRecDistance', `${rec.distance.toFixed(1)} km away · ${Math.max(1, Math.round(rec.distance * 2.2))} min drive`);
  setText('radarTargetLabel', rec.winningLot.name.toUpperCase());
  setText('heroBestBaySmall', `${rec.winningLot.name} · ${bestBay}`);
  const reasonsEl = document.getElementById('landingRecReasonsList');
  if (reasonsEl) {
    const compCount = rec.compatibleSlotsCount || (fit?.slot ? 1 : 0);
    const customReasons = [
      `Optimal ${vType.toUpperCase()} slot reserved: Bay ${bestBay}`,
      `${compCount} compatible ${vType.toUpperCase()} bay${compCount !== 1 ? 's' : ''} available (${rec.winningLot.occupancyRate()}% lot occupancy)`,
      `Nearest valid facility (${rec.distance.toFixed(1)} km away)`
    ];
    if (vType === 'ev-car') customReasons.push('Dedicated EV charging station verified');
    reasonsEl.innerHTML = customReasons.map(r => `<li>✓ ${r}</li>`).join('');
  }
  return rec;
}

function initHeroMap() {
  const el = document.getElementById('heroMap');
  if (!el) return;
  const userLat = appState.userCoords?.lat || 12.9346, userLng = appState.userCoords?.lng || 77.6149;
  const w = 400, h = 260, cx = w / 2, cy = h / 2, scale = 26;

  const lotNodes = Array.from(appState.lots.values()).map(lot => {
    const dist = typeof haversineDistance === 'function' ? haversineDistance(userLat, userLng, lot.lat, lot.lng) : 1.0;
    const x = Math.max(30, Math.min(w - 30, cx + (lot.lng - userLng) * 108 * scale));
    const y = Math.max(25, Math.min(h - 25, cy - (lot.lat - userLat) * 111 * scale));
    const status = typeof lot.getStatus === 'function' ? lot.getStatus() : 'open';
    const color = status === 'full' ? '#ef8c91' : status === 'filling' ? '#ffb020' : '#a3e635';
    const code = lot.name ? lot.name.split(' ').map(s => s[0]).join('').slice(0, 3) : 'PK';

    return `<g style="cursor:pointer;" onclick="if(window.switchView){window.switchView('dashboard');}else{window.location.href=resolvePageUrl('dashboard.html');}">
      <circle cx="${x}" cy="${y}" r="13" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y}" r="7.5" fill="#08110f" stroke="${color}" stroke-width="1.5"/>
      <text x="${x}" y="${y + 3}" font-family="var(--mono, monospace)" font-size="7" font-weight="900" text-anchor="middle" fill="#dff8eb">${code}</text>
      <text x="${x}" y="${y > cy ? y + 14 : y - 10}" font-family="var(--body, sans-serif)" font-size="7.5" font-weight="700" text-anchor="middle" fill="rgba(223,248,235,0.85)">${dist.toFixed(1)} km</text>
    </g>`;
  }).join('');

  el.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0d1a16;position:relative;overflow:hidden;border-radius:10px;">
    <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:100%;">
      <circle cx="${cx}" cy="${cy}" r="35" fill="none" stroke="rgba(108,227,211,0.12)" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="rgba(108,227,211,0.12)" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="105" fill="none" stroke="rgba(108,227,211,0.15)" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="10" y1="${cy}" x2="${w - 10}" y2="${cy}" stroke="rgba(108,227,211,0.08)"/>
      <line x1="${cx}" y1="10" x2="${cx}" y2="${h - 10}" stroke="rgba(108,227,211,0.08)"/>
      ${lotNodes}
      <circle cx="${cx}" cy="${cy}" r="14" fill="var(--cyan, #6ce3d3)" fill-opacity="0.2"><animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/></circle>
      <circle cx="${cx}" cy="${cy}" r="5" fill="var(--cyan, #6ce3d3)" stroke="#08110f" stroke-width="1.5"/>
      <text x="${cx}" y="${cy - 10}" font-family="var(--mono, monospace)" font-size="7.5" font-weight="900" text-anchor="middle" fill="var(--cyan, #6ce3d3)">YOU</text>
    </svg>
  </div>`;
}

let heroClockTimer = null;
function startHeroClock() {
  const clockEl = document.getElementById('heroClockText');
  if (!clockEl) {
    if (heroClockTimer) { clearInterval(heroClockTimer); heroClockTimer = null; }
    return;
  }
  const update = () => {
    const el = document.getElementById('heroClockText');
    if (!el) {
      if (heroClockTimer) { clearInterval(heroClockTimer); heroClockTimer = null; }
      return;
    }
    el.textContent = new Date().toTimeString().split(' ')[0];
  };
  update();
  if (heroClockTimer) clearInterval(heroClockTimer);
  heroClockTimer = setInterval(update, 1000);
}

function stopHeroClock() {
  if (heroClockTimer) {
    clearInterval(heroClockTimer);
    heroClockTimer = null;
  }
}

function executeLandingQuickPark() {
  const vType = appState.landingSelectedVType || 'car';
  const plate = typeof generateRandomPlate === 'function' ? generateRandomPlate() : 'MH02DW9921';
  const vehicle = new Vehicle(plate, vType);

  let targetLot = typeof getRecommendedLot === 'function'
    ? getRecommendedLot(appState.userCoords, vehicle, appState.lots)?.winningLot
    : appState.lots.get(appState.selectedLotId || 'LOT-01');

  if (!targetLot) targetLot = appState.lots.get('LOT-01') || Array.from(appState.lots.values())[0];
  if (!targetLot) {
    showToast('No parking facility available.', 'error');
    return;
  }

  const fit = typeof findBestFitSlot === 'function' ? findBestFitSlot(targetLot, vehicle) : null;
  if (!fit?.slot) {
    showToast(`No free compatible bay found in ${targetLot.name}.`, 'warning');
    return;
  }

  try {
    const ticket = generateTicket(vehicle, targetLot, fit.slot, appState, 'guest');
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    renderLandingPage();
    updateLandingRecommendationPreview();
    showTicketModal(ticket, targetLot, fit.slot);
    showToast(`✓ Pass issued! Allocated Bay ${fit.slot.id} at ${targetLot.name}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ==========================================================================
   7. BAY INSPECTION DRAWER & DIRECT CHECK-IN / BOOKING
   ========================================================================== */

function openSlotDrawer(slotId, lotId) {
  const lot = appState.lots.get(lotId);
  const slot = lot?.getSlot(slotId);
  if (!lot || !slot) return;

  appState.activeDrawerSlot = { slot, lot };
  renderTopDownParkingLot();
  renderFullSlotMatrix();

  const drawer = document.getElementById('slotInspectionDrawer') || document.getElementById('slotDrawer');
  let backdrop = document.getElementById('slotDrawerBackdrop');
  const bodyEl = document.getElementById('drawerBodyContent') || document.getElementById('drawerContent');

  setText('drawerSlotId', `Bay ${slot.id} · ${lot.name}`);
  setText('drawerLotName', lot.name);

  if (!backdrop && drawer) {
    backdrop = document.createElement('div');
    backdrop.className = 'ps-modal-overlay';
    backdrop.id = 'slotDrawerBackdrop';
    backdrop.onclick = () => window.closeSlotDrawer();
    document.body.appendChild(backdrop);
  }

  const windowObj = getActiveTimeslotWindow(appState.selectedTimeslot, appState.timeslotDayOffset);
  const dateLbl = appState.timeslotDayOffset === 0 ? 'Today' : appState.timeslotDayOffset === 1 ? 'Tomorrow' : windowObj.start.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const windowStr = `${dateLbl}, ${windowObj.rangeFormatted}`;
  const conflict = typeof getConflictingReservation === 'function' ? getConflictingReservation(lot.id, slot.id, windowObj.start, windowObj.end, appState) : null;

  let statusText = 'AVAILABLE (VACANT)';
  if (slot.isOccupied) statusText = 'OCCUPIED (LIVE VEHICLE)';
  else if (conflict) statusText = `BOOKED (${windowObj.rangeFormatted})`;
  else if (slot.reservedFor) statusText = 'STAFF RESERVED';
  setText('drawerSlotStatus', statusText);

  if (bodyEl) {
    const row = (lbl, val, extra = '') => `<div style="display:flex;justify-content:space-between;font-size:13px;"><span>${lbl}</span><strong ${extra}>${val}</strong></div>`;

    if (slot.isOccupied && slot.currentVehicle) {
      const ticket = appState.activeTickets.get(slot.currentTicketId);
      const ticketOwner = ticket?.owner || 'guest';
      const auth = canUserCheckoutTicket(ticket, appState.currentUser, appState.currentUserRole);

      let durationText = 'N/A', feeText = '$0.00', checkinTime = 'N/A';
      if (ticket?.entryTime) {
        const entryDate = new Date(ticket.entryTime);
        checkinTime = entryDate.toDateString() === new Date().toDateString()
          ? `Today at ${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : `${entryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const mins = Math.max(1, Math.floor((Date.now() - entryDate.getTime()) / 60000));
        durationText = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
        feeText = `$${(typeof calculateSessionFee === 'function' ? calculateSessionFee(slot.currentVehicle.type, mins, appState.surgeMultiplier) : 3.50).toFixed(2)}`;
      }

      const ownerBadge = auth.isSuperAdmin
        ? '<span style="font-size:10.5px;font-weight:800;color:var(--cyan);background:rgba(108,227,211,0.12);border:1px solid rgba(108,227,211,0.3);padding:2px 8px;border-radius:999px;">🛡️ SUPER ADMIN OVERRIDE</span>'
        : auth.isOwner
        ? '<span style="font-size:10.5px;font-weight:800;color:var(--lime);background:rgba(182,239,120,0.12);border:1px solid rgba(182,239,120,0.3);padding:2px 8px;border-radius:999px;">👤 YOUR VEHICLE</span>'
        : `<span style="font-size:10.5px;font-weight:800;color:var(--amber);background:rgba(234,198,111,0.12);border:1px solid rgba(234,198,111,0.3);padding:2px 8px;border-radius:999px;">🔒 ANOTHER DRIVER (${ticketOwner})</span>`;

      const actionButtons = auth.allowed
        ? `<div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
          <button class="ps-btn-primary" onclick="window.processExitFromDrawer()" style="padding:12px;font-size:13.5px;font-weight:800;justify-content:center;">🏁 Process Departure & Pay (${feeText})</button>
          <button class="ps-btn-secondary" onclick="window.viewActiveTicket('${slot.currentTicketId}')" style="padding:10px;font-size:12px;font-weight:700;justify-content:center;">🖨️ View Active Ticket & Barcode</button>
        </div>`
        : `<div style="margin-top:14px;padding:14px;border-radius:10px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:var(--accent-amber);"><span>🔒</span> Protected Vehicle Session</div>
          <div style="font-size:12px;color:var(--text-muted);line-height:1.4;">This vehicle is registered to driver <strong>${ticketOwner}</strong>. Departure checkout and pass printing are restricted to the registered vehicle owner or Super Admin.</div>
        </div>`;

      bodyEl.innerHTML = `<div style="background:rgba(255,255,255,0.025);border:1px solid var(--line);padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;color:var(--accent-primary);text-transform:uppercase;">Live Session Details</span>${ownerBadge}</div>
        ${row('Vehicle', slot.currentVehicle.describe())}
        ${row('License Plate', slot.currentVehicle.number, 'style="font-family:var(--font-mono);color:var(--accent-primary);font-size:14.5px;"')}
        ${row('Registered Driver', ticketOwner, 'style="color:var(--accent-primary);font-weight:700;"')}
        ${row('Live Check-In', checkinTime, 'style="color:var(--cyan);font-weight:700;"')}
        ${row('Session Duration', durationText)}
        <div style="display:flex;justify-content:space-between;font-size:13px;border-top:1px solid var(--border-subtle);padding-top:8px;"><span>Accrued Running Fee</span><strong style="color:var(--accent-primary);font-size:16px">${feeText}</strong></div>
      </div>${actionButtons}`;
    } else if (conflict) {
      bodyEl.innerHTML = `<div style="background:var(--bg-card-subtle);padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;color:var(--accent-amber);text-transform:uppercase;">Advance Reservation</span><span style="font-size:11px;font-weight:800;color:var(--accent-amber);background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);padding:2px 8px;border-radius:999px;">🔒 ADVANCE BOOKING</span></div>
        ${row('Reserved Window', windowStr, 'style="color:var(--accent-blue);font-weight:700;"')}
        ${row('Reserved Plate / ID', conflict.staffId, 'style="font-family:var(--font-mono);font-weight:700;"')}
        ${row('Arrival Status', '<span style="color:var(--accent-amber);font-weight:700;">Scheduled (Pending Arrival)</span>')}
      </div>
      <div style="padding:14px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:var(--accent-amber);font-size:12.5px;line-height:1.5;margin-top:10px;">
        🔒 <strong>Bay Reserved for this Timeslot</strong><br/>Booked by <strong>${conflict.staffId}</strong> for ${windowStr}. Choose another timeslot or an open bay.
      </div>`;
    } else if (slot.type === 'staff') {
      bodyEl.innerHTML = `<div style="background:var(--bg-card-subtle);padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;color:var(--accent-primary);text-transform:uppercase;">Bay Details</span><span style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--bg-surface);padding:2px 8px;border-radius:999px;">${slot.size.toUpperCase()} · STAFF</span></div>
        ${row('Status', 'Dedicated Staff Bay')}
      </div>
      <div style="padding:14px;border-radius:10px;background:var(--bg-card-subtle);border:1px solid var(--border-subtle);font-size:12.5px;line-height:1.5;margin-top:10px;">
        👔 <strong>Dedicated Staff Bay</strong><br/>Use the <button onclick="window.closeSlotDrawer(); window.switchView('reservations');" style="background:none;border:none;color:var(--accent-primary);font-weight:800;cursor:pointer;text-decoration:underline;">Staff Bookings Console</button> to schedule an authorized booking.
      </div>`;
    } else {
      const defaultPlate = typeof generateRandomPlate === 'function' ? generateRandomPlate() : 'MH02DW9921';
      bodyEl.innerHTML = `<div style="background:var(--bg-card-subtle);padding:16px;border-radius:10px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;color:var(--accent-primary);text-transform:uppercase;">Bay Details</span><span style="font-size:11px;font-weight:700;color:var(--accent-green);background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);padding:2px 8px;border-radius:999px;">🟢 VACANT & AVAILABLE</span></div>
        ${row('Selected Window', windowStr, 'style="color:var(--accent-blue);font-weight:700;"')}
        ${row('Bay Type', slot.size.toUpperCase() + ' · ' + slot.type.toUpperCase())}
        ${row('Bay Status', '<span style="color:var(--accent-green);font-weight:700;">Vacant & Ready</span>')}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px;background:var(--bg-card);padding:16px;border-radius:12px;border:1px solid var(--border-subtle);">
        <div style="font-size:13px;font-weight:800;color:var(--text-main);">⚡ Finalize Selection for Bay <span style="color:var(--accent-primary)">${slot.id}</span></div>
        <div style="font-size:11.5px;color:var(--text-muted);">Active window: <strong>${windowObj.rangeFormatted} (${dateLbl})</strong></div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11.5px;font-weight:700;color:var(--text-muted);">License Plate</label>
          <div style="display:flex;gap:6px;">
            <input type="text" id="drawerPlateInput" placeholder="e.g. DL01AB1234" value="${defaultPlate}" class="ps-input-field" style="font-family:var(--font-mono);font-weight:700;" />
            <button type="button" class="ps-circle-action-btn" onclick="document.getElementById('drawerPlateInput').value = (typeof window.generateRandomPlate === 'function' ? window.generateRandomPlate() : 'MH02DW9921')" title="Randomize Plate">🎲</button>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11.5px;font-weight:700;color:var(--text-muted);">Vehicle Type</label>
          <select id="drawerTypeSelect" class="ps-input-field">
            <option value="car" ${slot.size === 'car' && slot.type !== 'ev' ? 'selected' : ''}>🚗 Car</option>
            <option value="suv" ${slot.size === 'suv' && slot.type !== 'ev' ? 'selected' : ''}>🚙 SUV</option>
            <option value="bike" ${slot.size === 'bike' ? 'selected' : ''}>🏍️ Bike</option>
            <option value="ev-car" ${slot.type === 'ev' ? 'selected' : ''}>⚡ EV</option>
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
          <button class="ps-btn-primary" onclick="window.instantParkFromDrawer('${slot.id}', '${lot.id}')" style="padding:12px;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;">⚡ Instant Check-In (Park Here Now)</button>
          <button class="ps-btn-secondary" onclick="window.confirmAdvanceDrawerBooking('${slot.id}', '${lot.id}')" style="padding:10px;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;">📅 Pre-Book for Timeslot (${windowObj.startTimeFormatted} – ${windowObj.endTimeFormatted})</button>
        </div>
      </div>`;
    }
  }

  if (drawer) { drawer.style.right = '0'; drawer.classList.add('open', 'active'); }
  if (backdrop) backdrop.classList.add('active');
}

function closeSlotDrawer() {
  const drawer = document.getElementById('slotInspectionDrawer') || document.getElementById('slotDrawer');
  if (drawer) {
    drawer.style.right = '-460px';
    drawer.classList.remove('open', 'active');
  }
  document.getElementById('slotDrawerBackdrop')?.classList.remove('active');
  appState.activeDrawerSlot = null;
  renderTopDownParkingLot();
  renderFullSlotMatrix();
}

function instantParkFromDrawer(slotId, lotId) {
  const plateInput = document.getElementById('drawerPlateInput');
  const typeSelect = document.getElementById('drawerTypeSelect');
  let plate = plateInput?.value?.trim().toUpperCase() || (typeof generateRandomPlate === 'function' ? generateRandomPlate() : 'MH02DW9921');
  const vType = typeSelect?.value || 'car';

  const lot = appState.lots.get(lotId);
  const slot = lot?.getSlot(slotId);
  if (!lot || !slot) return;

  if (slot.isOccupied) { showToast(`Slot ${slot.id} is already occupied!`, 'error'); return; }
  if (appState.activeVehicleNumbers.has(plate)) { showToast(`Vehicle ${plate} is already active!`, 'error'); return; }

  try {
    const owner = appState.currentUser ? (appState.currentUser.username || appState.currentUser.role) : (appState.currentUserRole || 'user');
    const ticket = generateTicket(new Vehicle(plate, vType), lot, slot, appState, owner);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    closeSlotDrawer();
    renderAll();
    showTicketModal(ticket, lot, slot);
    showToast(`Vehicle ${plate} checked in to bay ${slot.id}!`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function processExitFromDrawer() {
  const ticketId = appState.activeDrawerSlot?.slot?.currentTicketId;
  if (!ticketId) return;
  const ticket = appState.activeTickets.get(ticketId);
  const auth = canUserCheckoutTicket(ticket, appState.currentUser, appState.currentUserRole);
  if (!auth.allowed) {
    showToast(auth.reason || 'Access Restricted: You cannot checkout another user\'s vehicle.', 'warning');
    return;
  }
  closeSlotDrawer();
  handleProcessExit(ticketId);
}

function confirmAdvanceDrawerBooking(slotId, lotId) {
  const plate = document.getElementById('drawerPlateInput')?.value?.trim().toUpperCase();
  const vType = document.getElementById('drawerTypeSelect')?.value || 'car';
  if (!plate) { showToast('Please enter a license plate.', 'error'); return; }

  const windowObj = getActiveTimeslotWindow(appState.selectedTimeslot, appState.timeslotDayOffset);
  try {
    const owner = appState.currentUser ? (appState.currentUser.username || appState.currentUser.role) : (appState.currentUserRole || 'user');
    const res = bookAdvanceReservation(lotId, slotId, plate, vType, windowObj.startISO, windowObj.endISO, appState, owner);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    renderAll();
    closeSlotDrawer();
    showToast(`Bay ${slotId} reserved for ${plate} (${windowObj.rangeFormatted})!`, 'success');

    const lot = appState.lots.get(lotId);
    const slot = lot?.getSlot(slotId);
    if (lot && slot) showReservationPassModal(res, lot, slot, vType);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getBarcodeHTML() {
  const bars = Array.from({ length: 32 }, (_, i) => `<i style="width:${i % 3 === 0 ? 3 : 1}px;display:block;background:#08110f;"></i>`).join('');
  return `<div class="barcode" style="display:flex;align-items:stretch;justify-content:center;gap:2px;height:32px;margin-top:14px;padding:0 8px;background:#eef9ee;border-radius:4px;">${bars}</div>`;
}

function renderPassCard(badgeStatus, badgeClass, bayId, lotName, gridItems) {
  const gridHtml = gridItems.map(([lbl, val, sub]) => `<div><span>${lbl}</span><b style="font-family:var(--font-mono);font-size:12px">${val}</b><small style="color:var(--muted)">${sub || ''}</small></div>`).join('');
  return `
    <div class="pass" style="background:#091512;color:var(--text);border:1px dashed rgba(108,227,211,.45);border-radius:10px;padding:16px;margin:0 0 10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="color:var(--cyan);font:700 15px var(--display)">ParkPilot</strong>
        <span class="status ${badgeClass}" style="font-size:8px">● ${badgeStatus}</span>
      </div>
      <div class="pass-dest" style="text-align:center;margin:16px 0;">
        <span class="micro" style="color:var(--muted)">ASSIGNED BAY</span>
        <strong style="display:block;margin:4px 0 2px;color:var(--cyan);font:700 36px var(--display);letter-spacing:-.08em">${bayId}</strong>
        <small style="color:var(--muted);font-size:11px;">${lotName} · Level 1</small>
      </div>
      <div class="pass-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px solid var(--line);font-size:11px;">${gridHtml}</div>
      ${getBarcodeHTML()}
    </div>`;
}

function showReservationPassModal(reservation, lot, slot, vehicleType = 'car') {
  const modal = document.getElementById('ticketModal'), content = document.getElementById('ticketReceiptContent');
  const barcode = document.getElementById('ticketBarcodeText');
  if (!modal || !content) return;
  if (barcode) barcode.textContent = `${reservation.id}-${slot.id}`;
  const startStr = new Date(reservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = new Date(reservation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(reservation.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
  content.innerHTML = renderPassCard('RESERVATION', 'filling', slot.id, lot.name, [
    ['HOLDER', reservation.staffId, vehicleType.toUpperCase()],
    ['RES ID', reservation.id, 'Scheduled'],
    ['DATE', dateStr, 'Active'],
    ['WINDOW', `${startStr}–${endStr}`, 'No collision']
  ]);
  modal.classList.add('active');
}

function renderFullSlotMatrix() {
  const container = document.getElementById('fullSlotGridContainer');
  if (!container) return;

  let allSlots = [];
  for (const lot of appState.lots.values()) {
    for (const slot of lot.slots.values()) allSlots.push({ slot, lot });
  }

  const filter = appState.currentZoneFilter || 'all';
  if (filter !== 'all') {
    allSlots = allSlots.filter(({ slot }) => {
      if (filter === 'ev') return slot.type === 'ev';
      if (filter === 'car') return slot.size === 'car' && slot.type !== 'ev';
      if (filter === 'suv') return slot.size === 'suv';
      if (filter === 'bike') return slot.size === 'bike';
      return true;
    });
  }

  container.innerHTML = allSlots.map(({ slot, lot }) => {
    let statusText = 'AVAILABLE', statusColor = 'var(--accent-primary)';
    if (slot.isOccupied) { statusText = slot.currentVehicle?.number || 'PARKED'; statusColor = 'var(--accent-rose)'; }
    else if (slot.reservedFor) { statusText = `🛡️ ${slot.reservedFor}`; statusColor = 'var(--accent-amber)'; }
    const isSelected = appState.activeDrawerSlot?.slot?.id === slot.id && appState.activeDrawerSlot?.lot?.id === lot.id;

    return `
      <div class="ps-tower-card ${isSelected ? 'selected' : ''}" style="padding:14px;cursor:pointer;${isSelected ? 'border-color:var(--accent-primary);box-shadow:0 0 16px var(--accent-glow);' : ''}" onclick="window.openSlotDrawer('${slot.id}','${lot.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-family:var(--font-mono);font-size:14px">${slot.id}</strong>
          <span style="font-size:11px;font-weight:700;color:var(--text-muted)">${slot.size.toUpperCase()}</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin:4px 0;">${lot.name}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;font-weight:800;color:${statusColor}">${statusText}</div>
          <span style="font-size:11px;color:var(--accent-primary);font-weight:700;">Select →</span>
        </div>
      </div>`;
  }).join('');
}

function filterSlotsByZone(zone, btnEl) {
  appState.currentZoneFilter = zone;
  document.querySelector('#view-slots .ps-level-pills')?.querySelectorAll('.ps-level-pill')?.forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderFullSlotMatrix();
}

/* ==========================================================================
   8. RESERVATIONS MANAGEMENT & OVERLAP CHECKING
   ========================================================================== */

function canUserManageReservation(res, currentUser, currentRole) {
  if (currentRole === 'admin') return true;
  if (!currentUser || !res) return false;
  const username = (currentUser.username || '').toLowerCase();
  const displayName = (currentUser.displayName || '').toLowerCase();
  const staff = (res.staffId || '').toLowerCase();
  const owner = (res.owner || '').toLowerCase();
  return (staff === username || staff === displayName || owner === username || owner === displayName);
}

function renderReservationsTable() {
  const tbody = document.getElementById('reservationsTableBody');
  if (!tbody) return;

  const resArr = Array.from(appState.reservations.values());
  setText('activeReservationCount', `${resArr.length} Bookings`);

  if (resArr.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted);">No active reservations registered.</td></tr>`;
    return;
  }

  tbody.innerHTML = resArr.map(r => {
    const lotName = appState.lots.get(r.lotId)?.name || r.lotId;
    const start = new Date(r.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const end = new Date(r.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(r.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const statusColor = r.status === 'reserved' ? 'var(--lime, #a3e635)' : r.status === 'expired' ? 'var(--rose, #ef8c91)' : 'var(--text-muted)';
    const canManage = canUserManageReservation(r, appState.currentUser, appState.currentUserRole);

    const actionButtons = canManage
      ? `<button class="btn btn-outline" style="padding:4px 8px;font-size:10.5px;margin-right:4px;" onclick="window.openEditReservationModal('${r.id}')" title="Edit Reservation">✏️ Edit</button>
         <button class="btn btn-danger" style="padding:4px 8px;font-size:10.5px;" onclick="window.cancelReservation('${r.id}')" title="Cancel Reservation">✕ Cancel</button>`
      : `<span style="font-size:11px;color:var(--text-muted);font-weight:700;">🔒 Protected</span>`;

    return `
      <tr style="border-bottom:1px solid var(--border-subtle)">
        <td style="padding:10px 8px;"><strong>${r.id}</strong></td>
        <td><strong>${r.staffId}</strong></td>
        <td>${lotName}</td>
        <td><strong style="color:var(--accent-primary)">${r.slotId}</strong></td>
        <td>${dateStr} · ${start} - ${end}</td>
        <td><span style="color:${statusColor};font-weight:700;text-transform:uppercase;">${r.status}</span></td>
        <td style="text-align:right;white-space:nowrap;">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
}

function handleStaffReservationSubmit() {
  const staffId = document.getElementById('staffIdInput')?.value.trim();
  const lotId = document.getElementById('staffLotSelect')?.value;
  const slotId = document.getElementById('staffSlotSelect')?.value;
  const dateVal = document.getElementById('staffDateInput')?.value || new Date().toISOString().split('T')[0];
  const startStr = document.getElementById('staffStartTime')?.value;
  const endStr = document.getElementById('staffEndTime')?.value;
  const alertBox = document.getElementById('staffConflictAlert');
  const alertMsg = document.getElementById('staffConflictText');

  if (!staffId || !lotId || !slotId || !startStr || !endStr) {
    showToast('Please fill all reservation fields.', 'error');
    if (alertBox && alertMsg) { alertBox.style.display = 'block'; alertMsg.textContent = 'Please fill all required fields before confirming booking.'; }
    return;
  }

  const startISO = new Date(`${dateVal}T${startStr}`).toISOString();
  const endISO = new Date(`${dateVal}T${endStr}`).toISOString();

  if (new Date(endISO) <= new Date(startISO)) {
    const msg = `End time (${endStr}) must be after start time (${startStr}).`;
    showToast(msg, 'error');
    if (alertBox && alertMsg) { alertBox.style.display = 'block'; alertMsg.textContent = msg; }
    return;
  }

  try {
    const res = reserveStaffSlot(lotId, slotId, staffId, startISO, endISO, appState);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    renderAll();
    showToast(`✓ Staff Booking ${res.id} confirmed for ${slotId}`, 'success');
    if (alertBox) alertBox.style.display = 'none';
  } catch (err) {
    const errText = err.message || 'Time collision detected! Bay already reserved.';
    if (alertBox && alertMsg) { alertBox.style.display = 'block'; alertMsg.textContent = errText; }
    showToast(errText, 'error');
  }
}

/* ==========================================================================
   9. LIVE ANALYTICS & UTILIZATION METRICS
   ========================================================================== */

function renderAnalyticsStats() {
  const summary = typeof getAnalyticsSummary === 'function' ? getAnalyticsSummary(appState, appState.surgeMultiplier) : { totalServed: 0, avgOccupancy: 0, peakOccupancy: 0, busiestLotName: 'City Mall' };
  const departed = (appState.parkingHistory || []).length;
  setText('statVehiclesServed', `${departed} Departed (${summary.totalServed} Total)`);
  setText('statAvgOccupancy', `${summary.avgOccupancy}%`);
  setText('statPeakOccupancy', `${summary.peakOccupancy}%`);
  setText('statBusiestLot', summary.busiestLotName);

  const { cap, free, occ } = getNetworkBayTotals();
  setText('statTotalLots', String(appState.lots.size));
  setText('statTotalSlots', String(cap));
  setText('statAvailableSlots', String(free));
  setText('statOccupiedSlots', String(occ));
  setText('statActiveReservations', String(appState.reservations.size));
  setText('statTotalRevenue', `$${Math.round(calculateCurrentRevenue()).toLocaleString('en-US')}`);
}

function renderAnalyticsCharts() { renderAnalyticsStats(); }

/* ==========================================================================
   10. PARKING FACILITY (LOT) CRUD OPERATIONS
   ========================================================================== */

function updateNewLotTotalCapacity() {
  const b = parseInt(document.getElementById('clBike')?.value) || 0;
  const c = parseInt(document.getElementById('clCar')?.value) || 0;
  const s = parseInt(document.getElementById('clSuv')?.value) || 0;
  const e = parseInt(document.getElementById('clEv')?.value) || 0;
  const st = parseInt(document.getElementById('clStaff')?.value) || 0;
  setText('newLotTotalBaysBadge', `Total: ${b + c + s + e + st} Bays`);
}

async function fillLotCurrentCoords() {
  showToast('Resolving GPS coordinates...', 'info');
  try {
    const coords = (appState.userCoords && !appState.userCoords.isFallback)
      ? appState.userCoords
      : await getUserCoordinates();
    appState.userCoords = coords;
    const latInput = document.getElementById('clLat');
    const lngInput = document.getElementById('clLng');
    if (latInput) latInput.value = coords.lat.toFixed(4);
    if (lngInput) lngInput.value = coords.lng.toFixed(4);
    showToast(`📍 Applied GPS: ${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`, 'success');
  } catch (_) {
    showToast('Applied default City Center GPS coordinates', 'info');
  }
}

function openCreateLotModal() {
  if (appState.currentUserRole !== 'admin') {
    showToast('Access Denied: Only Super Admin can register new parking facilities.', 'warning');
    return;
  }
  const modal = document.getElementById('createLotModal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    const latInput = document.getElementById('clLat');
    const lngInput = document.getElementById('clLng');
    if (latInput && !latInput.value && appState.userCoords) latInput.value = appState.userCoords.lat.toFixed(4);
    if (lngInput && !lngInput.value && appState.userCoords) lngInput.value = appState.userCoords.lng.toFixed(4);
    updateNewLotTotalCapacity();
  }
}

function closeCreateLotModal() {
  closeModal('createLotModal');
}

function submitNewLot() {
  if (appState.currentUserRole !== 'admin') { showToast('Unauthorized: Admin privilege required.', 'error'); return; }
  const name = (document.getElementById('clName')?.value || '').trim();
  const address = (document.getElementById('clAddress')?.value || '').trim();
  const lat = parseFloat(document.getElementById('clLat')?.value);
  const lng = parseFloat(document.getElementById('clLng')?.value);
  if (!name || isNaN(lat) || isNaN(lng)) { showToast('Please fill in facility name and GPS coordinates.', 'error'); return; }

  const counts = {
    bike: parseInt(document.getElementById('clBike')?.value) || 0,
    car: parseInt(document.getElementById('clCar')?.value) || 0,
    suv: parseInt(document.getElementById('clSuv')?.value) || 0,
    ev: parseInt(document.getElementById('clEv')?.value) || 0,
    staff: parseInt(document.getElementById('clStaff')?.value) || 0
  };
  const lotId = 'LOT-' + String(appState.lots.size + 1).padStart(2, '0');
  const newLot = new ParkingLot(lotId, name, lat, lng, address || 'City Metro Sector', 1);
  const prefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || 'PK';

  const addSlots = (type, size, count, code) => {
    for (let i = 0; i < count; i++) newLot.addSlot(new Slot(`${prefix}-${code}${String(i + 1).padStart(2, '0')}`, type, size, 1));
  };
  addSlots('general', 'bike', counts.bike, 'B');
  addSlots('general', 'car', counts.car, 'C');
  addSlots('general', 'suv', counts.suv, 'S');
  addSlots('ev', 'car', counts.ev, 'E');
  addSlots('staff', 'car', counts.staff, 'ST');

  appState.lots.set(lotId, newLot);
  appState.selectedLotId = lotId;
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  populateDropdowns();
  renderAll();
  closeCreateLotModal();
  showToast(`Successfully registered ${name} with ${newLot.slots.size} bays!`, 'success');
}

function openEditLotModal(lotId) {
  if (appState.currentUserRole !== 'admin') {
    showToast('🔒 Access Denied: Only Super Admin can modify facilities.', 'error');
    return;
  }
  const lot = appState.lots.get(lotId), modal = document.getElementById('editLotModal');
  if (!lot || !modal) return;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('editLotId', lot.id);
  setVal('editLotName', lot.name);
  setVal('editLotAddress', lot.address || '');
  setVal('editLotLat', lot.lat);
  setVal('editLotLng', lot.lng);
  modal.classList.add('active'); modal.style.display = 'flex';
}

function closeEditLotModal() { closeModal('editLotModal'); }

function submitEditLot() {
  if (appState.currentUserRole !== 'admin') {
    showToast('🔒 Access Denied: Only Super Admin can modify facilities.', 'error');
    return;
  }
  const lot = appState.lots.get(document.getElementById('editLotId')?.value);
  if (!lot) return;
  const name = (document.getElementById('editLotName')?.value || '').trim();
  const address = (document.getElementById('editLotAddress')?.value || '').trim();
  const lat = parseFloat(document.getElementById('editLotLat')?.value);
  const lng = parseFloat(document.getElementById('editLotLng')?.value);
  if (!name || isNaN(lat) || isNaN(lng)) { showToast('Provide valid name and GPS coordinates', 'error'); return; }

  Object.assign(lot, { name, address, lat, lng });
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  populateDropdowns();
  renderAll();
  closeEditLotModal();
  showToast(`Updated facility: ${name}`, 'success');
}

function deleteLot(lotId) {
  if (appState.currentUserRole !== 'admin') {
    showToast('🔒 Access Denied: Only Super Admin can delete facilities.', 'error');
    return;
  }
  const lot = appState.lots.get(lotId);
  if (!lot) return;
  if (appState.lots.size <= 1) { showToast('Cannot delete the only facility in the network', 'warning'); return; }
  if (!confirm(`Are you sure you want to permanently delete facility "${lot.name}" (${lot.id})?`)) return;

  for (const [tId, ticket] of Array.from(appState.activeTickets.entries())) {
    if (ticket.lotId === lotId) {
      if (ticket.vehicle?.number) appState.activeVehicleNumbers.delete(ticket.vehicle.number);
      appState.activeTickets.delete(tId);
    }
  }
  for (const [rId, res] of Array.from(appState.reservations.entries())) {
    if (res.lotId === lotId) appState.reservations.delete(rId);
  }

  appState.lots.delete(lotId);
  if (appState.selectedLotId === lotId) appState.selectedLotId = appState.lots.keys().next().value;

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  populateDropdowns();
  renderAll();
  showToast(`Facility "${lot.name}" was deleted.`, 'info');
}

function renderParkingLotsList() {
  const container = document.getElementById('parkingLotsListContainer');
  if (!container) return;

  const lots = Array.from(appState.lots.values());
  if (lots.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No parking facilities registered.</div>';
    return;
  }

  const userLat = appState.userCoords?.lat || 12.9346, userLng = appState.userCoords?.lng || 77.6149;
  const isAdmin = appState.currentUserRole === 'admin';

  container.innerHTML = lots.map(lot => {
    const isSelected = lot.id === appState.selectedLotId;
    const totalSlots = typeof lot.getTotalSlotsCount === 'function' ? lot.getTotalSlotsCount() : lot.slots.size;
    const freeSlots = typeof lot.getAvailableSlotsCount === 'function' ? lot.getAvailableSlotsCount() : 0;
    const occupiedSlots = typeof lot.getOccupiedSlotsCount === 'function' ? lot.getOccupiedSlotsCount() : 0;
    const occRate = typeof lot.occupancyRate === 'function' ? lot.occupancyRate() : 0;
    const status = typeof lot.getStatus === 'function' ? lot.getStatus() : 'open';
    const statusColor = status === 'full' ? 'var(--rose, #ef8c91)' : status === 'filling' ? 'var(--amber, #ffb020)' : 'var(--lime, #a3e635)';
    const evSlots = Array.from(lot.slots.values()).filter(s => s.type === 'ev').length;
    const dist = typeof haversineDistance === 'function' ? haversineDistance(userLat, userLng, lot.lat, lot.lng) : 1.0;

    const statsGrid = [
      ['CAPACITY', totalSlots],
      ['AVAILABLE', freeSlots, 'var(--lime, #a3e635)'],
      ['OCCUPIED', occupiedSlots],
      ['EV CHARGERS', `⚡ ${evSlots}`, 'var(--cyan, #6ce3d3)'],
      ['DISTANCE', `📍 ${dist.toFixed(1)} km`]
    ].map(([lbl, val, col]) => `<div><span style="color:var(--text-muted);font-size:10px;display:block;">${lbl}</span><strong style="font-size:14px;color:${col || 'var(--text-main)'};">${val}</strong></div>`).join('');

    const adminButtons = isAdmin ? `
      <button class="btn btn-outline" style="flex:1;font-size:11px;padding:7px 10px;justify-content:center;" onclick="event.stopPropagation(); window.openEditLotModal('${lot.id}')">✏️ Edit</button>
      <button class="btn btn-danger" style="font-size:11px;padding:7px 10px;justify-content:center;" onclick="event.stopPropagation(); window.deleteLot('${lot.id}')">🗑️ Delete</button>
    ` : '';

    return `
      <div class="ps-lot-crud-card ${isSelected ? 'selected' : ''}" onclick="window.selectLot('${lot.id}')"
           style="cursor:pointer;background:var(--bg-card-subtle);border:${isSelected ? '2px solid var(--accent-primary, #ccff00)' : '1px solid var(--border-subtle)'};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px;transition:all 0.2s ease;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:18px;">🏢</span>
              <strong style="font-size:16px;color:var(--text-main);">${lot.name}</strong>
              <span style="font-size:10px;font-family:var(--font-mono);background:rgba(255,255,255,0.06);border:1px solid var(--line);padding:2px 6px;border-radius:4px;color:var(--accent-primary);">${lot.id}</span>
              ${isSelected ? '<span style="font-size:10px;font-weight:800;color:var(--accent-primary);background:rgba(204,255,0,0.14);border:1px solid var(--accent-primary);padding:2px 7px;border-radius:4px;">● ACTIVE</span>' : ''}
            </div>
            <p style="margin:4px 0 0;font-size:11.5px;color:var(--text-muted);">${lot.address || 'Metro Sector, Bengaluru'}</p>
          </div>
          <span style="font-size:10px;font-weight:800;color:${statusColor};background:rgba(255,255,255,0.05);border:1px solid ${statusColor};padding:3px 8px;border-radius:6px;text-transform:uppercase;">● ${status}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(80px, 1fr));gap:8px;background:rgba(0,0,0,0.15);padding:10px;border-radius:8px;font-size:11px;">${statsGrid}</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);font-weight:700;"><span>Occupancy Rate</span><span>${occRate}%</span></div>
          <div style="width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;"><div style="width:${occRate}%;height:100%;background:${statusColor};"></div></div>
        </div>
        <div style="display:flex;gap:8px;border-top:1px solid var(--border-subtle);padding-top:10px;">
          <button class="btn btn-outline" style="flex:1.2;font-size:11px;padding:7px 10px;justify-content:center;${isSelected ? 'border-color:var(--accent-primary);color:var(--accent-primary);font-weight:800;' : ''}"
                  onclick="event.stopPropagation(); window.selectLot('${lot.id}'); document.getElementById('bayColCenter')?.scrollIntoView({behavior:'smooth'});">${isSelected ? '✓ Active Bay Matrix' : '👁️ View Bays Matrix'}</button>
          ${adminButtons}
        </div>
      </div>`;
  }).join('');
}

function filterParkingLots(query) {
  const q = (query || '').toLowerCase().trim();
  document.querySelectorAll('.ps-lot-crud-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
  });
}

/* ==========================================================================
   11. MODAL DIALOGS, GLOBAL SEARCH & UTILITY HELPERS
   ========================================================================== */

function openEditReservationModal(resId) {
  const res = appState.reservations.get(resId), modal = document.getElementById('editReservationModal');
  if (!res || !modal) return;
  if (!canUserManageReservation(res, appState.currentUser, appState.currentUserRole)) {
    showToast('🔒 Access Restricted: Only the booking owner or Super Admin can edit this reservation.', 'warning');
    return;
  }
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('editResId', res.id);
  setVal('editResStaffId', res.staffId);
  const lotSelect = document.getElementById('editResLotSelect');
  if (lotSelect) {
    lotSelect.innerHTML = Array.from(appState.lots.values()).map(l => `<option value="${l.id}" ${l.id === res.lotId ? 'selected' : ''}>${l.name}</option>`).join('');
    lotSelect.onchange = () => populateEditResSlots(lotSelect.value, res.slotId);
  }
  populateEditResSlots(res.lotId, res.slotId);
  const d = new Date(res.startTime);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  setVal('editResDate', `${yyyy}-${mm}-${dd}`);
  setVal('editResStartTime', new Date(res.startTime).toTimeString().slice(0, 5));
  setVal('editResEndTime', new Date(res.endTime).toTimeString().slice(0, 5));
  modal.classList.add('active'); modal.style.display = 'flex';
}

function populateEditResSlots(lotId, selectedSlotId) {
  const slotSelect = document.getElementById('editResSlotSelect'), lot = appState.lots.get(lotId);
  if (!slotSelect || !lot) return;
  slotSelect.innerHTML = Array.from(lot.slots.values()).map(s => `<option value="${s.id}" ${s.id === selectedSlotId ? 'selected' : ''}>${s.id} (${s.type.toUpperCase()} - ${s.size})</option>`).join('');
}

function closeEditReservationModal() { closeModal('editReservationModal'); }

function submitEditReservation() {
  const res = appState.reservations.get(document.getElementById('editResId')?.value);
  if (!res) return;
  if (!canUserManageReservation(res, appState.currentUser, appState.currentUserRole)) {
    showToast('🔒 Access Restricted: Only the booking owner or Super Admin can edit this reservation.', 'warning');
    return;
  }
  const staffId = (document.getElementById('editResStaffId')?.value || '').trim().toUpperCase();
  const lotId = document.getElementById('editResLotSelect')?.value;
  const slotId = document.getElementById('editResSlotSelect')?.value;
  const dateVal = document.getElementById('editResDate')?.value || new Date().toISOString().split('T')[0];
  const sVal = document.getElementById('editResStartTime')?.value;
  const eVal = document.getElementById('editResEndTime')?.value;
  if (!staffId || !sVal || !eVal) { showToast('Please fill all fields', 'error'); return; }

  const [sH, sM] = sVal.split(':').map(Number), [eH, eM] = eVal.split(':').map(Number);
  const [dY, dM, dD] = dateVal.split('-').map(Number);
  const newStart = new Date(dY, dM - 1, dD, sH, sM, 0, 0);
  const newEnd = new Date(dY, dM - 1, dD, eH, eM, 0, 0);
  if (newStart >= newEnd) { showToast(`Start time (${sVal}) must be before end time (${eVal}).`, 'error'); return; }

  for (const other of appState.reservations.values()) {
    if (other.id !== res.id && other.lotId === lotId && other.slotId === slotId && other.status === 'reserved') {
      if (typeof hasOverlap === 'function' && hasOverlap(newStart, newEnd, other.startTime, other.endTime)) {
        showToast(`Collision: Slot ${slotId} is already booked by ${other.staffId}.`, 'error'); return;
      }
    }
  }

  if (res.lotId !== lotId || res.slotId !== slotId) {
    const oldSlot = appState.lots.get(res.lotId)?.getSlot(res.slotId);
    if (oldSlot && (oldSlot.reservedFor === res.staffId || oldSlot.reservationWindow?.reservationId === res.id)) {
      oldSlot.reservedFor = null; oldSlot.reservationWindow = null;
    }
  }

  Object.assign(res, { staffId, lotId, slotId, startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
  const newSlot = appState.lots.get(lotId)?.getSlot(slotId);
  if (newSlot) { newSlot.reservedFor = staffId; newSlot.reservationWindow = { startTime: res.startTime, endTime: res.endTime, reservationId: res.id }; }

  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  renderAll();
  closeEditReservationModal();
  showToast(`✓ Reservation ${res.id} updated successfully!`, 'success');
}

function cancelReservation(resId) {
  const res = appState.reservations.get(resId);
  if (!res) return;
  if (!canUserManageReservation(res, appState.currentUser, appState.currentUserRole)) {
    showToast('🔒 Access Restricted: Only the booking owner or Super Admin can cancel this reservation.', 'warning');
    return;
  }
  if (!confirm(`Cancel reservation ${res.id} for ${res.staffId}?`)) return;

  const slot = appState.lots.get(res.lotId)?.getSlot(res.slotId);
  if (slot && (slot.reservedFor === res.staffId || slot.reservationWindow?.reservationId === res.id)) {
    slot.reservedFor = null;
    slot.reservationWindow = null;
  }

  res.status = 'cancelled';
  if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
  renderAll();
  showToast(`Reservation ${res.id} cancelled. Bay released.`, 'info');
}

function printTicket() { window.print(); }

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); el.style.display = 'none'; }
}

function openQuickParkModal() {
  const m = document.getElementById('quickParkModal');
  if (m) { m.classList.add('active'); m.style.display = 'grid'; fillModalRandomPlate(); }
}

function openQuickParkForSlot(slotId) {
  const lot = appState.lots.get(appState.selectedLotId);
  const slot = lot?.getSlot(slotId);
  openQuickParkModal();
  if (slot) {
    const lotSel = document.getElementById('modalPreferredLotSelect');
    if (lotSel) lotSel.value = lot.id;
    const typeSel = document.getElementById('modalVehicleTypeSelect');
    if (typeSel) {
      if (slot.type === 'ev') typeSel.value = 'ev-car';
      else if (slot.size === 'suv') typeSel.value = 'suv';
      else if (slot.size === 'bike') typeSel.value = 'bike';
      else typeSel.value = 'car';
    }
  }
}

function viewActiveTicket(ticketId) {
  const ticket = appState.activeTickets.get(ticketId);
  if (!ticket) { showToast('Active ticket not found.', 'error'); return; }
  const auth = canUserCheckoutTicket(ticket, appState.currentUser, appState.currentUserRole);
  if (!auth.allowed) { showToast('Access Restricted: You can only view passes for your own vehicles.', 'warning'); return; }
  const lot = appState.lots.get(ticket.lotId);
  const slot = lot?.getSlot(ticket.slotId);
  if (lot && slot) showTicketModal(ticket, lot, slot);
}

function showTicketModal(ticket, lot, slot) {
  const modal = document.getElementById('ticketModal'), content = document.getElementById('ticketReceiptContent');
  const barcode = document.getElementById('ticketBarcodeText');
  if (!modal || !content) return;
  if (barcode) barcode.textContent = `${ticket.id}-${slot.id}`;
  const entryDate = new Date(ticket.entryTime);
  content.innerHTML = renderPassCard('VALID PASS', 'open', slot.id, lot.name, [
    ['VEHICLE', ticket.vehicle?.number || 'N/A', (ticket.vehicle?.type || 'car').toUpperCase()],
    ['TICKET', ticket.id, 'Active'],
    ['ENTRY', entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), entryDate.toLocaleDateString([], { month: 'short', day: 'numeric' })],
    ['RATE', '$3.50', 'per hour']
  ]);
  modal.classList.add('active'); modal.style.display = 'grid';
}

function showExitModal(result) {
  const modal = document.getElementById('exitModal'), content = document.getElementById('exitReceiptContent');
  if (!modal || !content) return;
  const { ticket, lot, slot, durationMinutes } = result;
  const fee = typeof calculateSessionFee === 'function' ? calculateSessionFee(ticket.vehicle?.type, durationMinutes, appState.surgeMultiplier) : 3.50;
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between"><span>Ticket:</span><strong>${ticket.id}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Facility:</span><strong>${lot.name}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Bay Freed:</span><strong>${slot.id}</strong></div>
    <div style="display:flex;justify-content:space-between"><span>Duration:</span><strong>${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m</strong></div>
    <div style="display:flex;justify-content:space-between;border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:6px;"><span>Total Paid:</span><strong style="color:#047857;font-size:18px">$${fee.toFixed(2)}</strong></div>`;
  modal.classList.add('active'); modal.style.display = 'grid';
}

function fillModalRandomPlate() {
  const el = document.getElementById('modalPlateInput');
  if (el) el.value = typeof generateRandomPlate === 'function' ? generateRandomPlate() : 'MH02DW9921';
}

function handleModalParkSubmit() {
  const plate = document.getElementById('modalPlateInput')?.value.trim().toUpperCase();
  const type = document.getElementById('modalVehicleTypeSelect')?.value || 'car';
  const lotPref = document.getElementById('modalPreferredLotSelect')?.value || 'auto';
  if (!plate) return;

  const vehicle = new Vehicle(plate, type);
  if (appState.activeVehicleNumbers.has(vehicle.number)) { showToast(`Duplicate Entry: Vehicle ${vehicle.number} is already active!`, 'error'); return; }

  let targetLot = lotPref === 'auto'
    ? (typeof getRecommendedLot === 'function' ? getRecommendedLot(appState.userCoords, vehicle, appState.lots)?.winningLot : null)
    : appState.lots.get(lotPref);

  if (!targetLot) { showToast('No compatible facility available.', 'error'); return; }
  const fit = typeof findBestFitSlot === 'function' ? findBestFitSlot(targetLot, vehicle) : null;
  if (!fit?.slot) { showToast(`No free bay in ${targetLot.name}!`, 'error'); return; }

  try {
    const owner = appState.currentUser ? (appState.currentUser.username || appState.currentUser.role) : (appState.currentUserRole || 'user');
    const ticket = generateTicket(vehicle, targetLot, fit.slot, appState, owner);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    closeModal('quickParkModal');
    renderAll();
    showTicketModal(ticket, targetLot, fit.slot);
    showToast(`Vehicle parked at ${fit.slot.id}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleProcessExit(query) {
  let ticketId = query;
  if (!appState.activeTickets.has(ticketId)) {
    for (const t of appState.activeTickets.values()) {
      if (t.vehicle?.number === (query || '').toUpperCase()) { ticketId = t.id; break; }
    }
  }
  if (!appState.activeTickets.has(ticketId)) { showToast(`No active session found for "${query}"`, 'error'); return; }

  const ticket = appState.activeTickets.get(ticketId);
  const auth = canUserCheckoutTicket(ticket, appState.currentUser, appState.currentUserRole);
  if (!auth.allowed) { showToast(auth.reason || 'Access Restricted: You cannot checkout another user\'s vehicle.', 'warning'); return; }

  try {
    const result = exitVehicle(ticketId, appState);
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage(appState);
    renderAll();
    showExitModal(result);
    showToast(`Vehicle departed from Bay ${result.slot.id}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateDropdowns() {
  const modalLot = document.getElementById('modalPreferredLotSelect');
  const staffLot = document.getElementById('staffLotSelect');
  const facilitySelector = document.getElementById('facilitySelector');
  const lotsArr = Array.from(appState.lots.values());
  const opts = lotsArr.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

  if (modalLot) modalLot.innerHTML = `<option value="auto">📍 Auto (Nearest GPS)</option>` + opts;
  if (staffLot) {
    staffLot.innerHTML = opts;
    staffLot.onchange = () => updateStaffSlotDropdown(staffLot.value);
    if (lotsArr.length > 0) updateStaffSlotDropdown(lotsArr[0].id);
  }
  if (facilitySelector) { facilitySelector.innerHTML = opts; facilitySelector.value = appState.selectedLotId; }
}

function updateStaffSlotDropdown(lotId) {
  const el = document.getElementById('staffSlotSelect'), lot = appState.lots.get(lotId);
  if (!el || !lot) return;
  el.innerHTML = Array.from(lot.slots.values()).filter(s => s.type === 'staff').map(s => `<option value="${s.id}">${s.id} (${s.size.toUpperCase()})</option>`).join('');
}

function openGlobalSearch() {
  const m = document.getElementById('globalSearchModal');
  const i = document.getElementById('globalSearchInput');
  if (m) { m.classList.add('active'); m.style.display = 'grid'; }
  if (i) { i.value = ''; i.focus(); runGlobalSearch(''); }
}

function closeGlobalSearch() {
  closeModal('globalSearchModal');
}

function runGlobalSearch(query) {
  const container = document.getElementById('globalSearchResults');
  if (!query || !query.trim()) {
    if (container) container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">Type a plate, slot ID, or facility...</div>';
    return [];
  }
  const q = query.toLowerCase().trim(), results = [];
  for (const t of appState.activeTickets.values()) {
    const plate = t.vehicle?.number || '', lotName = appState.lots.get(t.lotId)?.name || t.lotId;
    if (plate.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.slotId.toLowerCase().includes(q)) {
      results.push({ type: 'ticket', title: `🚗 ${plate} — ${t.id}`, sub: `Parked at ${lotName} [Bay ${t.slotId}]`, action: () => { closeGlobalSearch(); selectLot(t.lotId); openSlotDrawer(t.slotId, t.lotId); } });
    }
  }
  for (const lot of appState.lots.values()) {
    if (lot.name.toLowerCase().includes(q) || lot.id.toLowerCase().includes(q)) {
      results.push({ type: 'lot', title: `🏢 ${lot.name}`, sub: `${lot.getAvailableSlotsCount()} free bays`, action: () => { closeGlobalSearch(); selectLot(lot.id); switchView('dashboard'); } });
    }
    for (const slot of lot.slots.values()) {
      if (slot.id.toLowerCase().includes(q) && !results.some(r => r.sub?.includes(`[Bay ${slot.id}]`))) {
        results.push({ type: 'slot', title: `🅿️ Bay ${slot.id}`, sub: `${slot.isOccupied ? 'Occupied' : 'Available'} at ${lot.name}`, action: () => { closeGlobalSearch(); selectLot(lot.id); openSlotDrawer(slot.id, lot.id); } });
      }
    }
  }
  if (container) {
    window._searchResults = results;
    container.innerHTML = results.length === 0 ? '<div style="padding:16px;text-align:center;color:var(--text-muted)">No matching records found.</div>' :
      results.map((r, i) => `<div style="padding:10px;border-radius:8px;background:var(--bg-card-subtle);cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="window._searchResults[${i}].action()"><div><strong>${r.title}</strong><div style="font-size:11px;color:var(--text-muted)">${r.sub}</div></div><span>SELECT →</span></div>`).join('');
  }
  return results;
}

function resetSystemState() {
  if (!confirm('Reset all parking data to initial seed state?')) return;
  if (typeof clearLocalStorageState === 'function') clearLocalStorageState();
  seedInitialState();
  renderAll();
  updateDashboardKPIs();
  updateDashboardGreeting();
  showToast('✓ System state reset successfully to defaults.', 'info');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `ps-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (typeof toast.remove === 'function') toast.remove();
      else if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}

function notify(message) { showToast(message, 'info'); }

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function scrollToTop() {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function scrollToSection(sectionId) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(sectionId);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else if (typeof window !== 'undefined' && window.location) {
    const current = (window.location.pathname.split('/').pop() || 'index.html').replace(/#.*$/, '');
    if (current !== 'index.html' && current !== '') window.location.href = resolvePageUrl('index.html');
  }
}

function setupEventListeners() {
  if (typeof window !== 'undefined' && window._eventListenersInitialized) return;
  if (typeof window !== 'undefined') window._eventListenersInitialized = true;

  document.getElementById('staffReservationForm')?.addEventListener('submit', e => { e.preventDefault(); handleStaffReservationSubmit(); });

  const checkOverlapLive = () => {
    const lotId = document.getElementById('staffLotSelect')?.value, slotId = document.getElementById('staffSlotSelect')?.value;
    const dateVal = document.getElementById('staffDateInput')?.value || new Date().toISOString().split('T')[0];
    const startStr = document.getElementById('staffStartTime')?.value, endStr = document.getElementById('staffEndTime')?.value;
    const alertBox = document.getElementById('staffConflictAlert');
    if (!lotId || !slotId || !startStr || !endStr || !alertBox) return;

    const conflicts = typeof findConflictingReservations === 'function'
      ? findConflictingReservations(lotId, slotId, new Date(`${dateVal}T${startStr}`).toISOString(), new Date(`${dateVal}T${endStr}`).toISOString(), appState.reservations) : [];

    if (conflicts.length > 0) {
      alertBox.style.display = 'block';
      setText('staffConflictText', `Warning: Collides with booking ${conflicts[0].id} (${new Date(conflicts[0].startTime).toLocaleTimeString()} - ${new Date(conflicts[0].endTime).toLocaleTimeString()})`);
    } else alertBox.style.display = 'none';
  };

  const staffDateEl = document.getElementById('staffDateInput');
  if (staffDateEl && !staffDateEl.value) {
    const todayStr = new Date().toISOString().split('T')[0];
    staffDateEl.value = todayStr;
    staffDateEl.min = todayStr;
  }

  ['staffDateInput', 'staffStartTime', 'staffEndTime', 'staffSlotSelect'].forEach(id => document.getElementById(id)?.addEventListener('change', checkOverlapLive));

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openGlobalSearch(); }
    else if (e.key === 'Escape') { closeGlobalSearch(); closeSlotDrawer(); ['ticketModal', 'exitModal', 'quickParkModal', 'createLotModal'].forEach(closeModal); }
  });
}

/* ==========================================================================
   GLOBAL SCOPE / WINDOW EXPORTS
   ========================================================================== */
if (typeof window !== 'undefined') {
  Object.assign(window, {
    showToast, notify, switchView, selectLot, selectLotAndOpenConsole,
    selectLandingVType, executeLandingQuickPark, selectTimeslot, changeTimeslotDate,
    exitCurrentParkedVehicle, filterSlotsByZone, openSlotDrawer, closeSlotDrawer,
    processExitFromDrawer, openGlobalSearch, closeGlobalSearch,
    runGlobalSearch, fillModalRandomPlate, handleModalParkSubmit, handleProcessExit,
    closeModal, openQuickParkModal, resetSystemState, printTicket, resolveUserLocation,
    confirmAdvanceDrawerBooking, instantParkFromDrawer, showReservationPassModal,
    selectDashboardCategory, stepCurrentParkedVehicle, focusCurrentParkedSlot,
    openQuickParkForSlot, viewActiveTicket, getActiveTimeslotWindow, initApplicationState,
    renderTimeslotPills, renderTopDownParkingLot, openCreateLotModal, closeCreateLotModal,
    submitNewLot, updateNewLotTotalCapacity, fillLotCurrentCoords, openEditLotModal,
    closeEditLotModal, submitEditLot, deleteLot, renderParkingLotsList, filterParkingLots,
    openEditReservationModal, closeEditReservationModal, submitEditReservation,
    cancelReservation, deleteReservation: cancelReservation, renderAll, renderCurrentView,
    renderAnalyticsStats, renderAnalyticsCharts, seedInitialState, canUserCheckoutTicket,
    canUserManageReservation, updateLandingRecommendationPreview, scrollToTop, scrollToSection,
    updateDashboardGreeting, updateDashboardKPIs, handleAuthClick, handleConsoleAccess,
    handleLogout, quickLogin, handleLoginSubmit, handleSignupSubmit, toggleAuthMode,
    renderAuthView, selectFloor, startHeroClock, stopHeroClock
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canUserCheckoutTicket,
    canUserManageReservation,
    appState,
    handleProcessExit,
    openSlotDrawer,
    closeSlotDrawer,
    processExitFromDrawer,
    instantParkFromDrawer,
    handleModalParkSubmit,
    viewActiveTicket,
    stopHeroClock
  };
}
