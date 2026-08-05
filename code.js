// ===========================================================================
// WHATSAPP API KEYS (For PIN Reset OTP Messages)
// ===========================================================================
var WHATSAPP_ACCESS_TOKEN = "YOUR_META_WHATSAPP_ACCESS_TOKEN";
var WHATSAPP_PHONE_NUMBER_ID = "YOUR_META_PHONE_NUMBER_ID";

// ===========================================================================
// PRIVATE WORKER & ADMIN DATABASE
// ===========================================================================
function getWorkersDB() {
  return {
    "0000":         { name: "Master System Admin", role: "ADMIN", default_pin: "0000" },
    "1111":         { name: "Silent Observer Admin 1", role: "SILENT_ADMIN", default_pin: "1111" },
    "1112":         { name: "Silent Observer Admin 2", role: "SILENT_ADMIN", default_pin: "1112" },
    "2222":         { name: "Master Field Worker", role: "MASTER_WORKER", default_pin: "2222" },
    "3333":         { name: "Field Supervisor", role: "FIELD_SUPERVISOR", default_pin: "3333" },
    "4444":         { name: "Duty Operational Admin", role: "OPERATIONAL_ADMIN", default_pin: "4444" },
    "923133764792": { name: "L_01-Gulshan-e-Hadeed", role: "WORKER", default_pin: "1234", lat: 24.867919, lon: 67.361431 },
    "923420474962": { name: "L_02-Met, University Road", role: "WORKER", default_pin: "1234", lat: 24.930107, lon: 67.143418 },
    "923131212478": { name: "L_03-PAF Faisal Base", role: "WORKER", default_pin: "1234", lat: 24.883975, lon: 67.117187 },
    "923332214521": { name: "L_04-Gulshan-e-Maymar", role: "WORKER", default_pin: "1234", lat: 25.168330, lon: 67.129236 },
    "923001234567": { name: "L_05-Nazimabad", role: "WORKER", default_pin: "1234", lat: 24.924013, lon: 67.023095 },
    "923001234568": { name: "L_06-Airport Old Area", role: "WORKER", default_pin: "1234", lat: 24.902283, lon: 67.139008 },
    "923000000001": { name: "L_07-North Karachi", role: "WORKER", default_pin: "1234", lat: 24.974353, lon: 67.065499 },
    "923000000002": { name: "L_08-Korangi", role: "WORKER", default_pin: "1234", lat: 24.883387, lon: 67.146332 },
    "923000000003": { name: "L_09-Orangi Town", role: "WORKER", default_pin: "1234", lat: 24.946026, lon: 67.006342 },
    "923000000004": { name: "L_10-Sadi Town", role: "WORKER", default_pin: "1234", lat: 24.967870, lon: 67.174043 },
    "923000000005": { name: "L_11-DHA Phase(VII)", role: "WORKER", default_pin: "1234", lat: 24.820536, lon: 67.072301 },
    "923000000006": { name: "L_12-Keamari", role: "WORKER", default_pin: "1234", lat: 24.820930, lon: 66.979051 },
    "923000000007": { name: "L_13-Jinnah Terminal", role: "WORKER", default_pin: "1234", lat: 24.909500, lon: 67.174499 },
    "923000000008": { name: "L_14-Surjani Town", role: "WORKER", default_pin: "1234", lat: 25.029557, lon: 67.068330 },
    "923000000009": { name: "L_15-PAF-Masroor", role: "WORKER", default_pin: "1234", lat: 24.877618, lon: 66.952994 },
    "923000000010": { name: "L_16-Bahria Town", role: "WORKER", default_pin: "1234", lat: 25.017388, lon: 67.315665 },
    "923000000011": { name: "L_17-Saddar Town", role: "WORKER", default_pin: "1234", lat: 24.860866, lon: 67.028331 }
  };
}

var ALL_SLOTS = [
  "03:00 - 06:00 UTC",
  "06:00 - 09:00 UTC",
  "09:00 - 12:00 UTC",
  "12:00 - 15:00 UTC",
  "15:00 - 18:00 UTC",
  "18:00 - 21:00 UTC",
  "21:00 - 00:00 UTC",
  "00:00 - 03:00 UTC"
];

function getActiveSlotInfo() {
  var now = new Date();
  var M = now.getUTCHours() * 60 + now.getUTCMinutes();
  
  var dateObj = new Date(now.getTime());
  if (M < 345) {
    dateObj.setUTCDate(dateObj.getUTCDate() - 1);
  }
  var rainfallDateStr = Utilities.formatDate(dateObj, "UTC", "yyyy-MM-dd");

  var adjM = (M - 345 + 1440) % 1440;
  var block = Math.floor(adjM / 180);
  var SLOT_MAP = [7, 0, 1, 2, 3, 4, 5, 6];

  return {
    rainfallDate: rainfallDateStr,
    slotIdx: SLOT_MAP[block]
  };
}

function getCurrentSlotIndex() {
  return getActiveSlotInfo().slotIdx;
}

function cleanDigits(val) {
  return String(val || "").replace(/\D/g, "");
}

function cleanSlot(val) {
  return String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanStr(val) {
  return String(val || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getUserPin(ss, phone) {
  var pinSheet = ss.getSheetByName("User_Pins");
  if (pinSheet) {
    var rows = pinSheet.getDataRange().getDisplayValues();
    for (var i = 1; i < rows.length; i++) {
      if (cleanDigits(rows[i][0]) === cleanDigits(phone)) {
        return String(rows[i][1]).trim();
      }
    }
  }
  var db = getWorkersDB();
  return db[phone] ? db[phone].default_pin : null;
}

function setUserPin(ss, phone, newPin) {
  var pinSheet = ss.getSheetByName("User_Pins");
  if (!pinSheet) {
    pinSheet = ss.insertSheet("User_Pins");
    pinSheet.appendRow(["Phone Number", "PIN Code", "Updated At (UTC)"]);
  }
  var rows = pinSheet.getDataRange().getDisplayValues();
  var targetPhone = cleanDigits(phone);
  var updated = false;

  for (var i = 1; i < rows.length; i++) {
    if (cleanDigits(rows[i][0]) === targetPhone) {
      pinSheet.getRange(i + 1, 2).setValue("'" + newPin);
      pinSheet.getRange(i + 1, 3).setValue(new Date().toISOString());
      updated = true;
      break;
    }
  }

  if (!updated) {
    pinSheet.appendRow(["'" + targetPhone, "'" + newPin, new Date().toISOString()]);
  }
}

function logUserActivity(ss, phone, category, details) {
  try {
    var db = getWorkersDB();
    var role = db[phone] ? db[phone].role : "UNKNOWN";
    var station = db[phone] ? db[phone].name : "Unknown Station";

    var actSheet = ss.getSheetByName("User_Activity_Log");
    if (!actSheet) {
      actSheet = ss.insertSheet("User_Activity_Log");
      actSheet.appendRow(["Timestamp (UTC)", "Phone Number", "User Role", "Station Name", "Action Category", "Activity Details"]);
    }
    actSheet.appendRow([new Date().toISOString(), "'" + phone, role, station, category, details]);
  } catch(err) { Logger.log("Log error: " + err.toString()); }
}

// ===========================================================================
// GET ROUTE
// ===========================================================================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var db = getWorkersDB();
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "";
    var phone = (e && e.parameter && e.parameter.phone) ? cleanDigits(e.parameter.phone) : "";

    if (action === "login") {
      var inputPin = (e.parameter && e.parameter.pin) ? String(e.parameter.pin).trim() : "";
      if (!db[phone]) {
        return responseJSON({ status: "error", message: "Invalid Mobile Number." });
      }
      var validPin = getUserPin(ss, phone);
      if (!inputPin || inputPin === validPin || inputPin === db[phone].default_pin) {
        logUserActivity(ss, phone, "LOGIN", "User logged in successfully.");
        return responseJSON({ status: "success", role: db[phone].role, station: db[phone].name });
      } else {
        return responseJSON({ status: "error", message: "Incorrect PIN Code." });
      }
    }

    if (action === "send_otp") {
      if (!db[phone]) {
        return responseJSON({ status: "error", message: "Phone number not registered." });
      }
      var otp = Math.floor(1000 + Math.random() * 9000).toString();
      PropertiesService.getScriptProperties().setProperty("OTP_" + phone, otp + "_" + new Date().getTime());
      
      sendWhatsAppOTP(phone, otp);
      logUserActivity(ss, phone, "OTP_REQUEST", "Requested PIN Reset OTP via WhatsApp.");
      return responseJSON({ status: "success", message: "OTP sent to your WhatsApp number!" });
    }

    if (action === "reset_pin") {
      var inputOtp = String(e.parameter.otp || "").trim();
      var newPin = String(e.parameter.new_pin || "").trim();

      var storedData = PropertiesService.getScriptProperties().getProperty("OTP_" + phone);
      if (!storedData) {
        return responseJSON({ status: "error", message: "No OTP request found. Please request a new OTP." });
      }

      var parts = storedData.split("_");
      var correctOtp = parts[0];
      var timeSent = parseInt(parts[1]);

      if (new Date().getTime() - timeSent > 600000) {
        return responseJSON({ status: "error", message: "OTP expired. Please request a new code." });
      }

      if (inputOtp === correctOtp) {
        setUserPin(ss, phone, newPin);
        PropertiesService.getScriptProperties().deleteProperty("OTP_" + phone);
        logUserActivity(ss, phone, "PIN_RESET", "User successfully reset their PIN.");
        return responseJSON({ status: "success", message: "PIN reset successful! You can now log in." });
      } else {
        return responseJSON({ status: "error", message: "Incorrect OTP code." });
      }
    }

    if (!db[phone]) {
      return responseJSON({ status: "error", message: "Unauthorized Request." });
    }

    var activeInfo = getActiveSlotInfo();
    var userRole = db[phone].role;
    var targetDate = (e && e.parameter && e.parameter.target_date) ? String(e.parameter.target_date).trim() : "";
    var targetYM = (e && e.parameter && e.parameter.year_month) ? String(e.parameter.year_month).trim() : "";

    if (action === "get_stations_list") {
      var stationList = [];
      for (var p in db) {
        if (db[p].role === "WORKER") stationList.push({ phone: p, name: db[p].name });
      }
      return responseJSON({ status: "success", stations: stationList });
    }

    if ((action === "get_admin_data" || action === "get_master_all_data") && (userRole === "ADMIN" || userRole === "SILENT_ADMIN" || userRole === "OPERATIONAL_ADMIN" || userRole === "FIELD_SUPERVISOR" || userRole === "MASTER_WORKER")) {
      if (userRole === "FIELD_SUPERVISOR") {
        targetDate = activeInfo.rainfallDate;
      }
      return fetchAdminMasterSummary(ss, activeInfo, targetDate);
    }

    if (action === "get_monthly_summary" && (userRole === "ADMIN" || userRole === "SILENT_ADMIN" || userRole === "OPERATIONAL_ADMIN")) {
      return fetchAdminMonthlySummary(ss, targetYM);
    }

    if (action === "get_activity_logs" && userRole === "ADMIN") {
      return fetchActivityLogs(ss);
    }

    if (action === "get_system_users" && (userRole === "ADMIN" || userRole === "SILENT_ADMIN" || userRole === "OPERATIONAL_ADMIN")) {
      return fetchSystemUsersStatus(ss);
    }

    if (action === "get_worker_data") {
      var targetPhone = (e.parameter.target_phone && userRole === "MASTER_WORKER") ? cleanDigits(e.parameter.target_phone) : phone;
      return fetchWorkerHistory(ss, targetPhone, activeInfo, targetDate);
    }

    return ContentService.createTextOutput("System Online & Operational.");

  } catch (err) {
    return responseJSON({ status: "error", message: "doGet Error: " + err.toString() });
  }
}


// ===========================================================================
// POST ROUTE
// ===========================================================================
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var db = getWorkersDB();

    var sheet = ss.getSheetByName("Submissions") || ss.insertSheet("Submissions");
    var auditSheet = ss.getSheetByName("Audit_Log") || ss.insertSheet("Audit_Log");

    var data = JSON.parse(e.postData.contents);
    var phone = cleanDigits(data.phone);
    var adminPhone = cleanDigits(data.admin_phone);
    var masterPhone = cleanDigits(data.master_worker_phone);

    var callerPhone = adminPhone || masterPhone || phone;
    if (!db[callerPhone]) {
      return responseJSON({ status: "error", message: "Unauthorized Request." });
    }

    var userRole = db[callerPhone].role;

    if (userRole === "SILENT_ADMIN") {
      return responseJSON({ status: "error", message: "🔒 Silent Admin has view-only permissions." });
    }

    var station = data.station || (db[phone] ? db[phone].name : "Unknown Station");
    var timestampStr = data.timestamp || new Date().toISOString();
    var activeInfo = getActiveSlotInfo();

    var now = new Date();
    if (now.getUTCHours() < 3) now.setUTCDate(now.getUTCDate() - 1);
    var todayRainfallDateStr = Utilities.formatDate(now, "UTC", "yyyy-MM-dd");

    // 1. ADMIN, OPERATIONAL ADMIN, & FIELD SUPERVISOR AMENDMENTS
    if (userRole === "ADMIN" || userRole === "OPERATIONAL_ADMIN" || userRole === "FIELD_SUPERVISOR") {
      var targetSlot = String(data.utc_slot || "").trim();
      var rainfall = data.rainfall !== undefined ? (data.rainfall === "SEE_NEXT" ? "SEE_NEXT" : parseFloat(data.rainfall)) : 0;
      var targetDateStr = data.target_date ? String(data.target_date).trim() : getRainfallDateStr(timestampStr, targetSlot);

      if (userRole === "FIELD_SUPERVISOR" && targetDateStr !== activeInfo.rainfallDate) {
        return responseJSON({ status: "error", message: "🔒 Field Supervisor can only amend entries for TODAY." });
      }

      if (userRole === "OPERATIONAL_ADMIN") {
        var yesterdayObj = new Date(new Date().getTime() - 86400000);
        var yesterdayStr = Utilities.formatDate(yesterdayObj, "UTC", "yyyy-MM-dd");
        if (targetDateStr !== activeInfo.rainfallDate && targetDateStr < yesterdayStr) {
          return responseJSON({ status: "error", message: "🔒 Operational Admin can only amend entries for TODAY and YESTERDAY." });
        }
      }

      saveOrUpdateRecord(sheet, auditSheet, timestampStr, userRole + "_AMEND", phone, station, targetSlot, rainfall, targetDateStr);

      var displayRain = (rainfall === 0.01) ? "Trace (T)" : rainfall + " mm";
      logUserActivity(ss, callerPhone, userRole + "_AMEND", userRole + " amended " + station + " | Slot: " + targetSlot + " | Date: " + targetDateStr + " to " + displayRain);

      return responseJSON({ result: "success", action: userRole + "_AMEND" });
    }

    // 2. MASTER WORKER BATCH SUBMIT
    if (data.is_batch_slot_submit === true && userRole === "MASTER_WORKER") {
      var batchSlot = String(data.utc_slot || "").trim();
      var batchSlotIdx = ALL_SLOTS.indexOf(batchSlot);

      if (batchSlotIdx > activeInfo.slotIdx) {
        return responseJSON({ status: "error", message: "⛔ Future slots cannot be recorded." });
      }

      var readings = data.readings || [];
      var savedCount = 0;

      readings.forEach(function(item) {
        var stPhone = cleanDigits(item.phone);
        var stName = item.station;
        var stRain = item.rainfall !== undefined ? (item.rainfall === "SEE_NEXT" ? "SEE_NEXT" : parseFloat(item.rainfall)) : null;

        if (stPhone && stRain !== null && !isNaN(stRain)) {
          saveOrUpdateRecord(sheet, auditSheet, timestampStr, "MASTER_BATCH_SUBMIT", stPhone, stName, batchSlot, stRain, activeInfo.rainfallDate);
          savedCount++;
        }
      });

      logUserActivity(ss, callerPhone, "MASTER_BATCH_SUBMIT", "Saved batch readings for " + savedCount + " stations in slot [" + batchSlot + "]");
      return responseJSON({ result: "batch_success", count: savedCount });
    }

    // 3. ACCUMULATIVE MERGE SUBMISSION
    if (data.is_accumulative_merge === true) {
      var startSlotIdx = parseInt(data.start_slot_idx);
      var endSlotIdx = parseInt(data.end_slot_idx);
      var totalRainfall = parseFloat(data.rainfall) || 0;

      var checkSlotName = ALL_SLOTS[endSlotIdx];
      var checkRainfallDate = getRainfallDateStr(timestampStr, checkSlotName);

      if (checkRainfallDate > activeInfo.rainfallDate || (checkRainfallDate === activeInfo.rainfallDate && endSlotIdx > activeInfo.slotIdx)) {
        return responseJSON({ status: "error", message: "⛔ Future slots cannot be included." });
      }

      for (var sIdx = startSlotIdx; sIdx <= endSlotIdx; sIdx++) {
        var slotName = ALL_SLOTS[sIdx];
        var isFinalSlot = (sIdx === endSlotIdx);
        var slotRainfall = isFinalSlot ? totalRainfall : "SEE_NEXT";
        var logType = isFinalSlot ? (userRole === "MASTER_WORKER" ? "MASTER_ACCUMULATE_TOTAL" : "ACCUMULATE_TOTAL") : "ACCUMULATE_SKIPPED";

        saveOrUpdateRecord(sheet, auditSheet, timestampStr, logType, phone, station, slotName, slotRainfall, activeInfo.rainfallDate);
      }

      logUserActivity(ss, callerPhone, "ACCUMULATIVE_ENTRY", "Saved " + totalRainfall + " mm accumulative rain for " + station);
      return responseJSON({ result: "accumulated_success" });
    }

    // 4. WORKER SINGLE SLOT SUBMISSION
    var targetSlot = String(data.utc_slot || "").trim();
    var rainfall = data.rainfall !== undefined ? (data.rainfall === "SEE_NEXT" ? "SEE_NEXT" : parseFloat(data.rainfall)) : 0;

    var targetSlotIdx = ALL_SLOTS.indexOf(targetSlot);
    var rainfallDateStr = getRainfallDateStr(timestampStr, targetSlot);

    if (rainfallDateStr > activeInfo.rainfallDate || (rainfallDateStr === activeInfo.rainfallDate && targetSlotIdx > activeInfo.slotIdx)) {
      logUserActivity(ss, callerPhone, "REJECTED_SUBMIT", "Attempted future slot: " + targetSlot);
      return responseJSON({ status: "error", message: "⛔ Future slots cannot be recorded." });
    }

    if (userRole === "WORKER" || userRole === "MASTER_WORKER") {
      if (rainfallDateStr === activeInfo.rainfallDate && targetSlotIdx < (activeInfo.slotIdx - 1)) {
        logUserActivity(ss, callerPhone, "REJECTED_SUBMIT", "Attempted locked past slot: " + targetSlot);
        return responseJSON({ status: "error", message: "🔒 Past slots are locked. Contact Admin." });
      }

      var auditRows = auditSheet.getDataRange().getDisplayValues();
      var editCount = 0;

      for (var k = 1; k < auditRows.length; k++) {
        var aPhone = cleanDigits(auditRows[k][2]);
        var aSlot = String(auditRows[k][4]).trim();
        var aDate = String(auditRows[k][6]).substring(0, 10);

        if (aPhone === phone && aSlot === targetSlot && aDate === rainfallDateStr) {
          editCount++;
        }
      }

      if (editCount >= 3) {
        logUserActivity(ss, callerPhone, "REJECTED_SUBMIT", "Attempted 4th update on slot: " + targetSlot + " (Max 3 reached)");
        return responseJSON({ status: "error", message: "🚫 Maximum 3 updates reached for this slot. Contact Admin." });
      }
    }

    var actionType = (userRole === "MASTER_WORKER" ? "MASTER_WORKER_SUBMIT" : "UPDATE");
    saveOrUpdateRecord(sheet, auditSheet, timestampStr, actionType, phone, station, targetSlot, rainfall, rainfallDateStr);

    var displayRain = (rainfall === 0.01) ? "Trace (T)" : rainfall + " mm";
    logUserActivity(ss, callerPhone, actionType, "Recorded " + displayRain + " for " + station + " | Slot: " + targetSlot + " | Date: " + rainfallDateStr);

    return responseJSON({ result: "success" });

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}


function saveOrUpdateRecord(sheet, auditSheet, timestampStr, actionType, phone, station, slot, rainfall, explicitDateStr) {
  var rainfallDateStr = explicitDateStr || getRainfallDateStr(timestampStr, slot);
  var displayRows = sheet.getDataRange().getDisplayValues();
  var updatedRowIndex = -1;

  var targetPhoneDigits = cleanDigits(phone);
  var targetStationClean = cleanStr(station);

  for (var i = 1; i < displayRows.length; i++) {
    var rPhone = cleanDigits(displayRows[i][1]);
    var rStation = cleanStr(displayRows[i][2]);
    var rSlot = cleanStr(displayRows[i][3]);
    var rDate = String(displayRows[i][5] || displayRows[i][0]).substring(0, 10);

    var matchStation = (rStation === targetStationClean || rPhone === targetPhoneDigits);
    if (matchStation && rSlot === cleanStr(slot) && rDate === rainfallDateStr) {
      updatedRowIndex = i + 1;
      break;
    }
  }

  auditSheet.appendRow([timestampStr, actionType, phone, station, slot, rainfall, rainfallDateStr]);

  if (updatedRowIndex > 0) {
    sheet.getRange(updatedRowIndex, 1).setValue(timestampStr);
    sheet.getRange(updatedRowIndex, 5).setValue(rainfall);
    sheet.getRange(updatedRowIndex, 6).setValue("'" + rainfallDateStr);
  } else {
    sheet.appendRow([timestampStr, "'" + phone, station, slot, rainfall, "'" + rainfallDateStr]);
  }
}

function getRainfallDateStr(timestampStr, slot) {
  var d = new Date(timestampStr);
  if (slot.indexOf("00:00 - 03:00") !== -1) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return Utilities.formatDate(d, "UTC", "yyyy-MM-dd");
}

function sendWhatsAppOTP(recipientPhone, otpCode) {
  if (!WHATSAPP_ACCESS_TOKEN || WHATSAPP_ACCESS_TOKEN.indexOf("YOUR_") !== -1) return;
  var url = "https://graph.facebook.com/v19.0/" + WHATSAPP_PHONE_NUMBER_ID + "/messages";
  var payload = {
    "messaging_product": "whatsapp",
    "to": recipientPhone,
    "type": "text",
    "text": { "body": "🔒 Monsoon System PIN Reset Code: " + otpCode + "\n\nUse this code on the web login page to reset your PIN. Valid for 10 minutes." }
  };
  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": { "Authorization": "Bearer " + WHATSAPP_ACCESS_TOKEN },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  UrlFetchApp.fetch(url, options);
}

function fetchWorkerHistory(ss, phone, activeInfo, customDate) {
  var sheet = ss.getSheetByName("Submissions") || ss.insertSheet("Submissions");
  var auditSheet = ss.getSheetByName("Audit_Log") || ss.insertSheet("Audit_Log");
  
  var displayRows = sheet.getDataRange().getDisplayValues();
  var auditRows = auditSheet.getDataRange().getDisplayValues();

  var rainfallDate = customDate || activeInfo.rainfallDate;

  var targetPhoneClean = cleanDigits(phone);
  var entries = {};
  var editCounts = {};
  var totalRainfall = 0;

  for (var i = 1; i < displayRows.length; i++) {
    var rPhone = cleanDigits(displayRows[i][1]);
    var rSlot = String(displayRows[i][3]).trim();
    var rDate = String(displayRows[i][5] || displayRows[i][0]).substring(0, 10);

    if (rPhone === targetPhoneClean && rDate === rainfallDate) {
      var rawVal = displayRows[i][4];
      if (String(rawVal).toUpperCase().indexOf("SEE_NEXT") !== -1) {
        entries[rSlot] = "SEE_NEXT";
      } else {
        var mm = parseFloat(rawVal) || 0;
        entries[rSlot] = mm;
        totalRainfall += mm;
      }
    }
  }

  for (var j = 1; j < auditRows.length; j++) {
    var aPhone = cleanDigits(auditRows[j][2]);
    var aSlot = String(auditRows[j][4]).trim();
    var aDate = String(auditRows[j][6]).substring(0, 10);

    if (aPhone === targetPhoneClean && aDate === rainfallDate) {
      editCounts[aSlot] = (editCounts[aSlot] || 0) + 1;
    }
  }

  return responseJSON({
    status: "success",
    rainfall_date: rainfallDate,
    today_rainfall_date: activeInfo.rainfallDate,
    total_mm: parseFloat(totalRainfall.toFixed(2)),
    entries: entries,
    edit_counts: editCounts,
    current_slot_idx: activeInfo.slotIdx
  });
}

function fetchAdminMasterSummary(ss, activeInfo, customDate) {
  try {
    var sheet = ss.getSheetByName("Submissions") || ss.insertSheet("Submissions");
    var displayRows = sheet.getDataRange().getDisplayValues();
    var db = getWorkersDB();

    var rainfallDate = String(customDate || "").trim();
    if (!rainfallDate || rainfallDate === "undefined" || rainfallDate === "null") {
      rainfallDate = activeInfo.rainfallDate;
    }

    var masterData = {};

    for (var p in db) {
      if (db[p] && db[p].role === "WORKER") {
        masterData[db[p].name] = { 
          phone: p, 
          lat: db[p].lat || 24.9, 
          lon: db[p].lon || 67.1, 
          slots: {}, 
          total: 0 
        };
      }
    }

    for (var i = 1; i < displayRows.length; i++) {
      var station = String(displayRows[i][2] || "").trim();
      var slot = String(displayRows[i][3] || "").trim();
      var rawVal = displayRows[i][4];
      var rawDate = String(displayRows[i][5] || displayRows[i][0]).substring(0, 10);

      if (station && (rawDate.indexOf(rainfallDate) !== -1 || rainfallDate.indexOf(rawDate) !== -1)) {
        if (!masterData[station]) {
          masterData[station] = { phone: "", lat: 24.9, lon: 67.1, slots: {}, total: 0 };
        }
        
        if (String(rawVal).toUpperCase().indexOf("SEE_NEXT") !== -1) {
          masterData[station].slots[slot] = "SEE_NEXT";
        } else {
          var mm = parseFloat(rawVal);
          masterData[station].slots[slot] = isNaN(mm) ? 0 : mm;
        }
      }
    }

    for (var st in masterData) {
      var sum = 0;
      ALL_SLOTS.forEach(function(s) {
        var val = masterData[st].slots ? masterData[st].slots[s] : null;
        if (typeof val === "number" && !isNaN(val)) {
          sum += val;
        }
      });
      masterData[st].total = parseFloat(sum.toFixed(2));
    }

    return responseJSON({
      status: "success",
      rainfall_date: rainfallDate,
      today_rainfall_date: activeInfo.rainfallDate,
      stations: masterData,
      current_slot_idx: activeInfo.slotIdx
    });

  } catch (err) {
    return responseJSON({ status: "error", message: "Admin Error: " + err.toString() });
  }
}

function fetchAdminMonthlySummary(ss, yearMonth) {
  try {
    var sheet = ss.getSheetByName("Submissions") || ss.insertSheet("Submissions");
    var displayRows = sheet.getDataRange().getDisplayValues();
    var db = getWorkersDB();

    var activeInfo = getActiveSlotInfo();
    var targetYM = String(yearMonth || "").trim();
    if (!targetYM || targetYM === "undefined" || targetYM === "null") {
      targetYM = activeInfo.rainfallDate.substring(0, 7);
    }

    var parts = targetYM.split("-");
    var year = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    var daysInMonth = new Date(year, month, 0).getDate();

    var masterData = {};

    for (var p in db) {
      if (db[p] && db[p].role === "WORKER") {
        masterData[db[p].name] = { 
          phone: p, 
          lat: db[p].lat || 24.9, 
          lon: db[p].lon || 67.1, 
          days: {}, 
          monthly_total: 0 
        };
      }
    }

    for (var i = 1; i < displayRows.length; i++) {
      var station = String(displayRows[i][2] || "").trim();
      var rawVal = displayRows[i][4];
      var rawDate = String(displayRows[i][5] || displayRows[i][0]).substring(0, 10);

      if (station && rawDate.indexOf(targetYM) === 0) {
        if (!masterData[station]) {
          masterData[station] = { phone: "", lat: 24.9, lon: 67.1, days: {}, monthly_total: 0 };
        }
        
        var dayNum = parseInt(rawDate.split("-")[2]);
        if (String(rawVal).toUpperCase().indexOf("SEE_NEXT") === -1) {
          var mm = parseFloat(rawVal);
          if (!isNaN(mm)) {
            masterData[station].days[dayNum] = (masterData[station].days[dayNum] || 0) + mm;
          }
        }
      }
    }

    for (var st in masterData) {
      var mSum = 0;
      for (var d = 1; d <= daysInMonth; d++) {
        if (masterData[st].days[d] !== undefined) {
          mSum += masterData[st].days[d];
          masterData[st].days[d] = parseFloat(masterData[st].days[d].toFixed(2));
        }
      }
      masterData[st].monthly_total = parseFloat(mSum.toFixed(2));
    }

    return responseJSON({
      status: "success",
      year_month: targetYM,
      days_in_month: daysInMonth,
      stations: masterData
    });

  } catch (err) {
    return responseJSON({ status: "error", message: "Monthly Fetch Error: " + err.toString() });
  }
}

function fetchActivityLogs(ss) {
  try {
    var actSheet = ss.getSheetByName("User_Activity_Log");
    if (!actSheet) return responseJSON({ status: "success", logs: [] });

    var displayRows = actSheet.getDataRange().getDisplayValues();
    var logs = [];

    var startIdx = Math.max(1, displayRows.length - 100);
    for (var i = displayRows.length - 1; i >= startIdx; i--) {
      logs.push({
        timestamp: displayRows[i][0],
        phone: displayRows[i][1],
        role: displayRows[i][2],
        station: displayRows[i][3],
        category: displayRows[i][4],
        details: displayRows[i][5]
      });
    }

    return responseJSON({ status: "success", logs: logs });

  } catch (err) {
    return responseJSON({ status: "error", message: "Activity Log Error: " + err.toString() });
  }
}

function fetchSystemUsersStatus(ss) {
  try {
    var db = getWorkersDB();
    var actSheet = ss.getSheetByName("User_Activity_Log");
    var lastLoginMap = {};

    if (actSheet) {
      var displayRows = actSheet.getDataRange().getDisplayValues();
      for (var i = 1; i < displayRows.length; i++) {
        var timestamp = displayRows[i][0];
        var phone = cleanDigits(displayRows[i][1]);
        var category = displayRows[i][4];

        if (category === "LOGIN") {
          lastLoginMap[phone] = timestamp;
        }
      }
    }

    var userList = [];
    for (var p in db) {
      var userObj = db[p];
      var lastLogin = lastLoginMap[p] || null;

      userList.push({
        phone: p,
        name: userObj.name,
        role: userObj.role,
        is_logged_in: lastLogin !== null,
        last_login: lastLogin ? lastLogin : "Never Logged In"
      });
    }

    return responseJSON({ status: "success", users: userList });

  } catch (err) {
    return responseJSON({ status: "error", message: "Users Fetch Error: " + err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function testLogin() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Admin Test: " + doGet({ parameter: { action: "login", phone: "0000", pin: "0000" } }).getContent());
  Logger.log("Worker Test: " + doGet({ parameter: { action: "login", phone: "923133764792", pin: "1234" } }).getContent());
}
