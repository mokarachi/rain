/**
 * Frontend Engine & State Orchestrator
 */

// Global Application State
let currentUser = null;
let activeWorkerDate = "";
let selectedSlotIdx = 0;
let currentActiveSlotIdx = 0;
let masterWorkerMode = "single"; // "single" or "batch"
let adminTab = "daily"; // "daily", "monthly", "audit", "users"
let adminViewMode = "table"; // "table" or "map"
let selectedAdminDate = "";
let selectedAdminMonth = "";
let dailyDataCache = [];
let monthlyDataCache = [];
let leafletMap = null;
let mapMarkers = [];
let pendingAmendTarget = null;

// Slot Metadata Configuration (Dual Labels)
const SLOT_CONFIG = [
  { index: 0, utcStr: "03:00 - 06:00 UTC", pktBold: "11:00 PKT", pktSmall: "06:00 UTC" },
  { index: 1, utcStr: "06:00 - 09:00 UTC", pktBold: "14:00 PKT", pktSmall: "09:00 UTC" },
  { index: 2, utcStr: "09:00 - 12:00 UTC", pktBold: "17:00 PKT", pktSmall: "12:00 UTC" },
  { index: 3, utcStr: "12:00 - 15:00 UTC", pktBold: "20:00 PKT", pktSmall: "15:00 UTC" },
  { index: 4, utcStr: "15:00 - 18:00 UTC", pktBold: "23:00 PKT", pktSmall: "18:00 UTC" },
  { index: 5, utcStr: "18:00 - 21:00 UTC", pktBold: "02:00 PKT", pktSmall: "21:00 UTC" },
  { index: 6, utcStr: "21:00 - 00:00 UTC", pktBold: "05:00 PKT", pktSmall: "00:00 UTC" },
  { index: 7, utcStr: "00:00 - 03:00 UTC", pktBold: "08:00 PKT", pktSmall: "03:00 UTC Next" }
];

/**
 * SAFE DOM HELPER
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

/**
 * METEOROLOGICAL TIME & SYNOPTIC MATH ENGINE
 */

// 1. 03:00 UTC Synoptic Day Calculation
function getSynopticDate(d = new Date()) {
  const utcHours = d.getUTCHours();
  const dateCopy = new Date(d.getTime());
  if (utcHours < 3) {
    dateCopy.setUTCDate(dateCopy.getUTCDate() - 1);
  }
  return dateCopy.toISOString().split("T")[0];
}

// 2. Shifted Active Slot Schedule Formula (15-min Buffer Math)
function getActiveSlotIndex(d = new Date()) {
  const utcMins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const adjM = (utcMins - 165 + 1440) % 1440;
  const block = Math.floor(adjM / 180);
  const SLOT_MAP = [7, 0, 1, 2, 3, 4, 5, 6];
  return SLOT_MAP[block];
}

// Initialization on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  activeWorkerDate = getSynopticDate();
  selectedAdminDate = activeWorkerDate;
  
  const todayObj = new Date();
  const yr = todayObj.getFullYear();
  const mo = String(todayObj.getMonth() + 1).padStart(2, "0");
  selectedAdminMonth = `${yr}-${mo}`;

  currentActiveSlotIdx = getActiveSlotIndex();
  selectedSlotIdx = currentActiveSlotIdx;
  
  const datePicker = document.getElementById("admin-date-picker");
  if (datePicker) datePicker.value = selectedAdminDate;
  
  const monthPicker = document.getElementById("admin-month-picker");
  if (monthPicker) monthPicker.value = selectedAdminMonth;
});

/**
 * SERVER COMMUNICATION BRIDGE
 */
function callBackend(payload, callback) {
  if (typeof google !== "undefined" && google.script && google.script.run) {
    google.script.run
      .withSuccessHandler(res => callback(JSON.parse(res)))
      .withFailureHandler(err => alert("Server Error: " + err))
      .doPost({ postData: { contents: JSON.stringify(payload) } });
  } else {
    // Development Fetch Fallback
    fetch(https://script.google.com/macros/s/AKfycby7LsXeMc4o-iFMWrJ9Roa9oVH8fiz6ZGedeTYNP0wfWGqAWvOHdHdmQ6zqay3bEzmn/exec, {
      method: "POST",
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => callback(data))
    .catch(e => alert("Network Request Failed: " + e));
  }
}

/**
 * AUTHENTICATION LOGIC
 */
function handleLogin() {
  const phone = document.getElementById("login-phone").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  if (!phone || !pin) {
    alert("Please enter phone and 4-digit PIN.");
    return;
  }

  callBackend({ action: "login", phone: phone, pin: pin }, res => {
    if (res.status === "success") {
      currentUser = res;
      document.getElementById("login-view").classList.add("hidden");
      document.getElementById("app-header").classList.remove("hidden");
      setText("user-badge", `${res.name} (${res.role})`);

      routeDashboardByRole(res.role);
    } else {
      alert("Authentication Failed: " + res.message);
    }
  });
}

function logout() {
  currentUser = null;
  location.reload();
}

function routeDashboardByRole(role) {
  document.getElementById("worker-view").classList.add("hidden");
  document.getElementById("master-worker-view").classList.add("hidden");
  document.getElementById("admin-view").classList.add("hidden");

  if (role === "WORKER") {
    document.getElementById("worker-view").classList.remove("hidden");
    initWorkerDashboard();
  } else if (role === "MASTER_WORKER") {
    document.getElementById("master-worker-view").classList.remove("hidden");
    initMasterWorkerDashboard();
  } else if (role === "FIELD_SUPERVISOR") {
    document.getElementById("admin-view").classList.remove("hidden");
    document.getElementById("tab-monthly").classList.add("hidden");
    document.getElementById("tab-audit").classList.add("hidden");
    document.getElementById("tab-users").classList.add("hidden");
    switchAdminTab("daily");
  } else if (role === "SILENT_ADMIN") {
    document.getElementById("admin-view").classList.remove("hidden");
    document.getElementById("tab-monthly").classList.add("hidden");
    document.getElementById("tab-audit").classList.add("hidden");
    document.getElementById("tab-users").classList.add("hidden");
    switchAdminTab("daily");
  } else if (role === "OPERATIONAL_ADMIN") {
    document.getElementById("admin-view").classList.remove("hidden");
    document.getElementById("tab-audit").classList.add("hidden");
    document.getElementById("tab-users").classList.add("hidden");
    switchAdminTab("daily");
  } else if (role === "ADMIN") {
    document.getElementById("admin-view").classList.remove("hidden");
    switchAdminTab("daily");
  }
}

/**
 * WORKER DASHBOARD LOGIC
 */
function initWorkerDashboard() {
  setText("worker-station-name", currentUser.station);
  setText("worker-synoptic-date", "Rainfall Date: " + activeWorkerDate);
  setText("worker-date-display", activeWorkerDate);

  populateAccumulateDropdowns();
  loadWorkerData();
}

function changeWorkerDate(delta) {
  const d = new Date(activeWorkerDate);
  d.setDate(d.getDate() + delta);
  activeWorkerDate = d.toISOString().split("T")[0];
  setText("worker-synoptic-date", "Rainfall Date: " + activeWorkerDate);
  setText("worker-date-display", activeWorkerDate);
  loadWorkerData();
}

function loadWorkerData() {
  callBackend({ action: "get_daily_summary", date: activeWorkerDate, phone: currentUser.phone, role: currentUser.role }, res => {
    if (res.status === "success") {
      const myData = res.matrix.find(m => m.station === currentUser.station);
      if (myData) {
        renderWorkerGrid(myData.slots);
        let totStr = myData.hasTraceOnly ? "T (Trace)" : myData.total.toFixed(1) + " mm";
        setText("worker-total-rain", totStr);
        setText("worker-slot-counter", `Slots: ${myData.completedCount}/8`);
      }
    }
  });
}

function renderWorkerGrid(slotsArray) {
  const grid = document.getElementById("slot-grid");
  if (!grid) return;
  grid.innerHTML = "";

  SLOT_CONFIG.forEach((slot, idx) => {
    const rawVal = slotsArray[idx];
    let statusClass = "slot-card-pending";
    let displayVal = rawVal;

    if (rawVal !== "-") {
      if (rawVal === "SEE_NEXT") {
        statusClass = "slot-card-merged";
        displayVal = "→ Next";
      } else if (Math.abs(parseFloat(rawVal) - 0.01) < 0.001) {
        statusClass = "slot-card-recorded";
        displayVal = "T";
      } else {
        statusClass = "slot-card-recorded";
        displayVal = parseFloat(rawVal).toFixed(1) + "m";
      }
    }

    if (idx === selectedSlotIdx) {
      statusClass += " border-2 border-white scale-105 z-10";
    }

    const card = document.createElement("div");
    card.className = `p-2 rounded-xl text-center cursor-pointer transition border font-mono ${statusClass}`;
    card.onclick = () => selectWorkerSlot(idx);
    card.innerHTML = `
      <div class="text-[10px] font-bold opacity-80">${slot.pktBold}</div>
      <div class="text-xs font-black mt-1">${displayVal}</div>
    `;
    grid.appendChild(card);
  });

  updateWorkerSlotSelectionDisplay(slotsArray[selectedSlotIdx]);
}

function selectWorkerSlot(idx) {
  selectedSlotIdx = idx;
  loadWorkerData();
}

function updateWorkerSlotSelectionDisplay(currentVal) {
  const cfg = SLOT_CONFIG[selectedSlotIdx];
  setText("active-slot-label-bold", cfg.pktBold);
  setText("active-slot-label-small", `(${cfg.pktSmall})`);

  const inputEl = document.getElementById("worker-input-val");
  const saveBtn = document.getElementById("btn-save-reading");

  // Locking Rule for Workers
  const isToday = (activeWorkerDate === getSynopticDate());
  const isAllowedSlot = (selectedSlotIdx === currentActiveSlotIdx || selectedSlotIdx === (currentActiveSlotIdx - 1 + 8) % 8);

  if (!isToday || !isAllowedSlot) {
    inputEl.disabled = true;
    saveBtn.disabled = true;
    saveBtn.classList.add("opacity-50", "cursor-not-allowed");
    setText("edit-attempt-counter", "🔒 Historical Slot Locked");
  } else {
    inputEl.disabled = false;
    saveBtn.disabled = false;
    saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
    setText("edit-attempt-counter", "Active Recording Slot");
  }

  if (currentVal && currentVal !== "-" && currentVal !== "SEE_NEXT") {
    inputEl.value = (Math.abs(parseFloat(currentVal) - 0.01) < 0.001) ? "T" : currentVal;
  } else {
    inputEl.value = "";
  }
}

function navSlot(delta) {
  let next = selectedSlotIdx + delta;
  if (next >= 0 && next < 8) {
    selectWorkerSlot(next);
  }
}

function setTraceValue() {
  document.getElementById("worker-input-val").value = "T";
}

function saveWorkerReading() {
  let valStr = document.getElementById("worker-input-val").value.trim().toUpperCase();
  let numVal = (valStr === "T") ? 0.01 : parseFloat(valStr);

  if (isNaN(numVal) && valStr !== "T") {
    alert("Please enter a valid numeric value or tap 'Set Trace (T)'.");
    return;
  }

  callBackend({
    action: "submit_reading",
    phone: currentUser.phone,
    station: currentUser.station,
    utcSlot: SLOT_CONFIG[selectedSlotIdx].utcStr,
    rainfallDate: activeWorkerDate,
    rainfallValue: numVal,
    role: currentUser.role
  }, res => {
    if (res.status === "success") {
      alert("Reading saved!");
      loadWorkerData();
    } else {
      alert("Error: " + res.message);
    }
  });
}

function populateAccumulateDropdowns() {
  const startSel = document.getElementById("acc-start-slot");
  const endSel = document.getElementById("acc-end-slot");
  if (!startSel || !endSel) return;

  startSel.innerHTML = "";
  endSel.innerHTML = "";

  SLOT_CONFIG.forEach(s => {
    startSel.innerHTML += `<option value="${s.index}">${s.pktBold} (${s.utcStr})</option>`;
    endSel.innerHTML += `<option value="${s.index}">${s.pktBold} (${s.utcStr})</option>`;
  });
}

function submitAccumulation() {
  const startIdx = parseInt(document.getElementById("acc-start-slot").value);
  const endIdx = parseInt(document.getElementById("acc-end-slot").value);
  const totVal = parseFloat(document.getElementById("acc-total-val").value);

  if (startIdx >= endIdx) {
    alert("Start slot must precede end slot.");
    return;
  }
  if (isNaN(totVal)) {
    alert("Enter valid accumulated total rainfall.");
    return;
  }

  callBackend({
    action: "accumulate_submit",
    phone: currentUser.phone,
    station: currentUser.station,
    rainfallDate: activeWorkerDate,
    startSlotIdx: startIdx,
    endSlotIdx: endIdx,
    totalVal: totVal,
    role: currentUser.role
  }, res => {
    if (res.status === "success") {
      alert("Accumulated total merged successfully.");
      toggleModal("accumulate-modal", false);
      loadWorkerData();
    } else {
      alert("Error: " + res.message);
    }
  });
}

/**
 * MASTER WORKER DASHBOARD LOGIC
 */
function initMasterWorkerDashboard() {
  const dropdown = document.getElementById("mw-station-dropdown");
  if (dropdown && currentUser.stationList) {
    dropdown.innerHTML = "";
    currentUser.stationList.forEach(st => {
      dropdown.innerHTML += `<option value="${st.name}">${st.name}</option>`;
    });
  }

  const batchSlotSel = document.getElementById("mw-batch-slot-select");
  if (batchSlotSel) {
    batchSlotSel.innerHTML = "";
    SLOT_CONFIG.forEach(s => {
      batchSlotSel.innerHTML += `<option value="${s.utcStr}">${s.pktBold} (${s.utcStr})</option>`;
    });
  }

  renderBatchGrid();
}

function setMasterWorkerMode(mode) {
  masterWorkerMode = mode;
  if (mode === "single") {
    document.getElementById("btn-mw-mode-single").className = "px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded";
    document.getElementById("btn-mw-mode-batch").className = "px-3 py-1 text-slate-400 hover:text-white text-xs font-bold rounded";
    document.getElementById("mw-single-station-picker").classList.remove("hidden");
    document.getElementById("mw-batch-container").classList.add("hidden");
    document.getElementById("worker-view").classList.remove("hidden");
    onMasterStationChange();
  } else {
    document.getElementById("btn-mw-mode-single").className = "px-3 py-1 text-slate-400 hover:text-white text-xs font-bold rounded";
    document.getElementById("btn-mw-mode-batch").className = "px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded";
    document.getElementById("mw-single-station-picker").classList.add("hidden");
    document.getElementById("worker-view").classList.add("hidden");
    document.getElementById("mw-batch-container").classList.remove("hidden");
  }
}

function onMasterStationChange() {
  const stName = document.getElementById("mw-station-dropdown").value;
  currentUser.station = stName;
  initWorkerDashboard();
}

function renderBatchGrid() {
  const grid = document.getElementById("batch-7x3-grid");
  if (!grid || !currentUser.stationList) return;
  grid.innerHTML = "";

  currentUser.stationList.forEach((st, idx) => {
    const card = document.createElement("div");
    card.className = "bg-slate-900 p-2 rounded-xl border border-slate-700 flex items-center justify-between gap-2";
    card.innerHTML = `
      <div class="truncate text-xs font-bold text-slate-300 w-1/2">${st.name}</div>
      <div class="flex items-center gap-1 w-1/2">
        <input id="batch-input-${idx}" data-station="${st.name}" type="text" placeholder="0.0" class="w-full bg-slate-800 border border-slate-700 rounded p-1 text-xs text-emerald-400 font-mono text-center">
        <button onclick="document.getElementById('batch-input-${idx}').value='T'" class="px-2 py-1 bg-purple-600/30 text-purple-300 text-[10px] font-bold rounded">T</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function saveMasterBatch() {
  const slotStr = document.getElementById("mw-batch-slot-select").value;
  const items = [];

  currentUser.stationList.forEach((st, idx) => {
    const el = document.getElementById(`batch-input-${idx}`);
    if (el) {
      let valStr = el.value.trim().toUpperCase();
      let val = (valStr === "T") ? 0.01 : (valStr === "" ? null : parseFloat(valStr));
      items.push({ station: st.name, value: val });
    }
  });

  callBackend({
    action: "master_batch_submit",
    phone: currentUser.phone,
    utcSlot: slotStr,
    rainfallDate: activeWorkerDate,
    items: items
  }, res => {
    if (res.status === "success") {
      alert("Batch grid saved!");
    } else {
      alert("Error: " + res.message);
    }
  });
}

/**
 * ADMIN & SUPERVISOR DASHBOARD LOGIC
 */
function switchAdminTab(tab) {
  adminTab = tab;
  document.getElementById("panel-daily-table").classList.add("hidden");
  document.getElementById("panel-monthly-table").classList.add("hidden");
  document.getElementById("panel-gis-map").classList.add("hidden");
  document.getElementById("panel-audit-log").classList.add("hidden");
  document.getElementById("panel-system-users").classList.add("hidden");

  document.getElementById("daily-date-controls").classList.add("hidden");
  document.getElementById("monthly-date-controls").classList.add("hidden");
  document.getElementById("view-mode-toggle").classList.add("hidden");

  // Reset tab buttons styling
  ["daily", "monthly", "audit", "users"].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    if (btn) btn.className = "px-3 py-1.5 text-slate-400 hover:text-white text-xs font-bold rounded flex items-center gap-1.5";
  });

  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) activeBtn.className = "px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1.5";

  if (tab === "daily") {
    document.getElementById("daily-date-controls").classList.remove("hidden");
    document.getElementById("view-mode-toggle").classList.remove("hidden");
    if (adminViewMode === "table") {
      document.getElementById("panel-daily-table").classList.remove("hidden");
    } else {
      document.getElementById("panel-gis-map").classList.remove("hidden");
    }
    loadAdminDailyData();
  } else if (tab === "monthly") {
    document.getElementById("monthly-date-controls").classList.remove("hidden");
    document.getElementById("view-mode-toggle").classList.remove("hidden");
    if (adminViewMode === "table") {
      document.getElementById("panel-monthly-table").classList.remove("hidden");
    } else {
      document.getElementById("panel-gis-map").classList.remove("hidden");
    }
    loadAdminMonthlyData();
  } else if (tab === "audit") {
    document.getElementById("panel-audit-log").classList.remove("hidden");
    loadAuditLogs();
  } else if (tab === "users") {
    document.getElementById("panel-system-users").classList.remove("hidden");
    loadUsersStatus();
  }
}

function setAdminViewMode(mode) {
  adminViewMode = mode;
  document.getElementById("btn-view-table").className = (mode === "table") ? "px-2.5 py-1 bg-slate-700 text-white text-xs font-bold rounded" : "px-2.5 py-1 text-slate-400 hover:text-white text-xs font-bold rounded";
  document.getElementById("btn-view-map").className = (mode === "map") ? "px-2.5 py-1 bg-slate-700 text-white text-xs font-bold rounded" : "px-2.5 py-1 text-slate-400 hover:text-white text-xs font-bold rounded";

  if (adminTab === "daily") switchAdminTab("daily");
  else if (adminTab === "monthly") switchAdminTab("monthly");

  if (mode === "map") {
    setTimeout(initOrRefreshMap, 200);
  }
}

function navAdminDate(delta) {
  const d = new Date(selectedAdminDate);
  d.setDate(d.getDate() + delta);
  selectedAdminDate = d.toISOString().split("T")[0];
  document.getElementById("admin-date-picker").value = selectedAdminDate;
  loadAdminDailyData();
}

function onAdminDateChange() {
  selectedAdminDate = document.getElementById("admin-date-picker").value;
  loadAdminDailyData();
}

function onAdminMonthChange() {
  selectedAdminMonth = document.getElementById("admin-month-picker").value;
  loadAdminMonthlyData();
}

function loadAdminDailyData() {
  callBackend({ action: "get_daily_summary", date: selectedAdminDate, phone: currentUser.phone, role: currentUser.role }, res => {
    if (res.status === "success") {
      dailyDataCache = res.matrix;
      renderDailyMatrix(res.matrix);
      if (adminViewMode === "map") renderMapMarkersDaily(res.matrix);
    }
  });
}

function renderDailyMatrix(matrix) {
  const tbody = document.getElementById("daily-matrix-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  const canAmend = (currentUser.role === "ADMIN" || currentUser.role === "OPERATIONAL_ADMIN" || currentUser.role === "FIELD_SUPERVISOR");

  matrix.forEach(row => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/50 transition";

    let slotsHtml = "";
    row.slots.forEach((sVal, slotIdx) => {
      let cellDisp = sVal;
      let cellClass = "text-slate-400";

      if (sVal === "SEE_NEXT") {
        cellDisp = "→ Next";
        cellClass = "text-purple-400 font-bold";
      } else if (Math.abs(parseFloat(sVal) - 0.01) < 0.001) {
        cellDisp = "T";
        cellClass = "text-purple-300 font-bold";
      } else if (sVal !== "-") {
        cellClass = "text-emerald-400 font-bold";
        cellDisp = parseFloat(sVal).toFixed(1);
      }

      let clickAttr = canAmend ? `onclick="openAdminAmendModal('${row.station}', '${selectedAdminDate}', '${SLOT_CONFIG[slotIdx].utcStr}', '${sVal}')"` : "";
      slotsHtml += `<td ${clickAttr} class="p-2 text-center border-r border-slate-800 ${cellClass} ${canAmend ? 'cursor-pointer hover:bg-blue-900/30' : ''}">${cellDisp}</td>`;
    });

    let totDisp = row.hasTraceOnly ? "T" : row.total.toFixed(1) + " mm";

    tr.innerHTML = `
      <td class="p-2.5 font-bold text-slate-200 border-r border-slate-700">${row.station}</td>
      ${slotsHtml}
      <td class="p-2.5 text-right font-black text-blue-400 bg-slate-800/40">${totDisp}</td>
    `;
    tbody.appendChild(tr);
  });
}

function loadAdminMonthlyData() {
  callBackend({ action: "get_monthly_summary", month: selectedAdminMonth }, res => {
    if (res.status === "success") {
      monthlyDataCache = res.matrix;
      renderMonthlyMatrix(res.matrix);
      if (adminViewMode === "map") renderMapMarkersMonthly(res.matrix);
    }
  });
}

function renderMonthlyMatrix(matrix) {
  const theadRow = document.getElementById("monthly-table-header");
  const tbody = document.getElementById("monthly-matrix-body");
  if (!theadRow || !tbody) return;

  theadRow.innerHTML = `<th class="p-2 border-r border-slate-700 min-w-[160px]">Station Name</th>`;
  for (let d = 1; d <= 31; d++) {
    theadRow.innerHTML += `<th class="p-1 text-center border-r border-slate-800 w-8">${d}</th>`;
  }
  theadRow.innerHTML += `<th class="p-2 text-right bg-slate-800/80 min-w-[80px]">Total</th>`;

  tbody.innerHTML = "";
  matrix.forEach(row => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-800/50 transition";

    let daysHtml = "";
    row.days.forEach((val, idx) => {
      let disp = "-";
      let cls = "text-slate-500";
      if (row.hasTraceDay[idx]) {
        disp = "T";
        cls = "text-purple-300 font-bold";
      } else if (val > 0) {
        disp = val.toFixed(1);
        cls = "text-emerald-400 font-bold";
      }

      const dateStr = `${selectedAdminMonth}-${String(idx + 1).padStart(2, "0")}`;
      daysHtml += `<td onclick="jumpToDailyDate('${dateStr}')" class="p-1 text-center border-r border-slate-800 ${cls} cursor-pointer hover:bg-blue-900/30">${disp}</td>`;
    });

    tr.innerHTML = `
      <td class="p-2 font-bold text-slate-200 border-r border-slate-700">${row.station}</td>
      ${daysHtml}
      <td class="p-2 text-right font-black text-blue-400 bg-slate-800/40">${row.monthlyTotal.toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function jumpToDailyDate(dateStr) {
  selectedAdminDate = dateStr;
  document.getElementById("admin-date-picker").value = dateStr;
  switchAdminTab("daily");
}

function loadAuditLogs() {
  callBackend({ action: "get_audit_logs" }, res => {
    if (res.status === "success") {
      const tbody = document.getElementById("audit-log-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      res.logs.forEach(log => {
        tbody.innerHTML += `
          <tr class="hover:bg-slate-800/50">
            <td class="p-2 text-slate-400">${new Date(log.timestamp).toLocaleString()}</td>
            <td class="p-2 font-bold text-slate-200">${log.user} (${log.phone})</td>
            <td class="p-2 text-blue-400">${log.user}</td>
            <td class="p-2 text-slate-300"><span class="px-2 py-0.5 bg-slate-800 rounded border border-slate-700">${log.role}</span></td>
            <td class="p-2 font-bold text-emerald-400">${log.action}</td>
            <td class="p-2 text-slate-400">${log.details}</td>
          </tr>
        `;
      });
    }
  });
}

function loadUsersStatus() {
  callBackend({ action: "get_users_status" }, res => {
    if (res.status === "success") {
      const tbody = document.getElementById("users-status-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      res.users.forEach(u => {
        tbody.innerHTML += `
          <tr class="hover:bg-slate-800/50">
            <td class="p-2 font-bold text-slate-200">${u.phone}</td>
            <td class="p-2 text-blue-400">${u.name}</td>
            <td class="p-2"><span class="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">${u.role}</span></td>
            <td class="p-2 font-bold">${u.status}</td>
            <td class="p-2 text-slate-400">${u.lastLogin !== "N/A" ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
          </tr>
        `;
      });
    }
  });
}

/**
 * GIS MAP ENGINE (Leaflet.js)
 */
function initOrRefreshMap() {
  if (!leafletMap) {
    leafletMap = L.map("map-container").setView([24.93, 67.11], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors"
    }).addTo(leafletMap);
  } else {
    leafletMap.invalidateSize();
  }
}

function renderMapMarkersDaily(matrix) {
  clearMapMarkers();
  matrix.forEach(st => {
    if (st.lat && st.lon) {
      const color = getBubbleColor(st.total, st.hasTraceOnly);
      const radius = getBubbleRadius(st.total, st.hasTraceOnly);

      const circle = L.circleMarker([st.lat, st.lon], {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: radius
      }).addTo(leafletMap);

      let valStr = st.hasTraceOnly ? "Trace (T)" : st.total.toFixed(1) + " mm";
      circle.bindPopup(`
        <div class="font-sans">
          <h4 class="font-bold text-blue-400 text-sm mb-1">${st.station}</h4>
          <p class="text-xs text-slate-300">24hr Total: <b class="text-white">${valStr}</b></p>
          <p class="text-[10px] text-slate-400 mt-1 font-mono">Lat: ${st.lat}, Lon: ${st.lon}</p>
        </div>
      `);
      mapMarkers.push(circle);
    }
  });
}

function renderMapMarkersMonthly(matrix) {
  clearMapMarkers();
  matrix.forEach(st => {
    const coords = currentUser.coordsMap ? currentUser.coordsMap[st.station] : null;
    if (coords) {
      const color = getBubbleColor(st.monthlyTotal, false);
      const radius = getBubbleRadius(st.monthlyTotal, false);

      const circle = L.circleMarker([coords.lat, coords.lon], {
        color: color,
        fillColor: color,
        fillOpacity: 0.7,
        radius: radius
      }).addTo(leafletMap);

      circle.bindPopup(`
        <div class="font-sans">
          <h4 class="font-bold text-blue-400 text-sm mb-1">${st.station}</h4>
          <p class="text-xs text-slate-300">Monthly Total: <b class="text-white">${st.monthlyTotal.toFixed(1)} mm</b></p>
        </div>
      `);
      mapMarkers.push(circle);
    }
  });
}

function clearMapMarkers() {
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];
}

function getBubbleColor(val, isTrace) {
  if (isTrace) return "#8b5cf6"; // Purple
  if (val === 0) return "#9ca3af"; // Gray
  if (val > 0 && val <= 10) return "#22c55e"; // Green
  if (val > 10 && val <= 50) return "#3b82f6"; // Blue
  return "#ef4444"; // Red (>50mm)
}

function getBubbleRadius(val, isTrace) {
  if (isTrace) return 8;
  if (val === 0) return 6;
  if (val > 0 && val <= 10) return 10;
  if (val > 10 && val <= 50) return 14;
  return 18;
}

/**
 * AMENDMENT & OTP MODALS
 */
function openAdminAmendModal(station, date, slotStr, currentVal) {
  pendingAmendTarget = { station, date, slotStr };
  setText("amend-target-station", station);
  setText("amend-target-date", date);
  setText("amend-target-slot", slotStr);
  document.getElementById("amend-input-val").value = (currentVal === "SEE_NEXT" || currentVal === "-") ? "" : currentVal;
  toggleModal("admin-amend-modal", true);
}

function submitAdminAmendment() {
  let valStr = document.getElementById("amend-input-val").value.trim().toUpperCase();
  let numVal = (valStr === "T") ? 0.01 : parseFloat(valStr);

  if (isNaN(numVal) && valStr !== "T") {
    alert("Enter valid value.");
    return;
  }

  callBackend({
    action: "admin_amend",
    phone: currentUser.phone,
    role: currentUser.role,
    station: pendingAmendTarget.station,
    utcSlot: pendingAmendTarget.slotStr,
    targetDate: pendingAmendTarget.date,
    rainfallValue: numVal
  }, res => {
    if (res.status === "success") {
      alert("Amendment applied.");
      toggleModal("admin-amend-modal", false);
      loadAdminDailyData();
    } else {
      alert("Error: " + res.message);
    }
  });
}

function triggerSendOTP() {
  const phone = document.getElementById("reset-phone").value.trim();
  if (!phone) return alert("Enter phone.");
  callBackend({ action: "send_otp", phone: phone }, res => {
    alert(res.message);
  });
}

function triggerResetPIN() {
  const phone = document.getElementById("reset-phone").value.trim();
  const otp = document.getElementById("reset-otp").value.trim();
  const newPin = document.getElementById("reset-new-pin").value.trim();

  if (!phone || !otp || !newPin) return alert("Fill all fields.");

  callBackend({ action: "reset_pin", phone: phone, otp: otp, newPin: newPin }, res => {
    alert(res.message);
    if (res.status === "success") toggleModal("forgot-pin-modal", false);
  });
}

function toggleModal(id, show) {
  const el = document.getElementById(id);
  if (el) {
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }
}

/**
 * 1-PAGE PDF EXPORT ENGINE (html2pdf.js Direct Download)
 */
function exportReportPDF() {
  const element = document.getElementById("printable-report-container");
  const isLandscape = (adminTab === "monthly");
  
  // Set printable header metadata
  document.getElementById("pdf-header").classList.remove("hidden");
  document.getElementById("pdf-footer").classList.remove("hidden");

  const title = (adminTab === "daily") ? `Daily Rainfall Summary - ${selectedAdminDate}` : `Monthly Rainfall Summary - ${selectedAdminMonth}`;
  setText("pdf-report-title", title);

  const now = new Date();
  const nowUtc = now.toISOString().replace("T", " ").substring(0, 16) + " UTC";
  setText("pdf-timestamp", `Report generated on ${nowUtc}`);

  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3],
    filename: `Karachi_Rainfall_Report_${adminTab}_${new Date().getTime()}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "in", format: "a4", orientation: isLandscape ? "landscape" : "portrait" }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    document.getElementById("pdf-header").classList.add("hidden");
    document.getElementById("pdf-footer").classList.add("hidden");
  });
}
