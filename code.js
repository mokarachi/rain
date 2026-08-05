function doGet(e) {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Centralized Sheet reference
function getSpreadsheet() {
  // 👉 Replace with your actual Google Sheet URL
  return SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1f4wTe0EMd5FB270u07kd8muFDb0OeqzgVyOvOjehmM8/edit?gid=0#gid=0");
}

function getWorkersDB() {
  return {
    "0000": { name: "Master System Admin", role: "ADMIN", default_pin: "0000" },
    "1111": { name: "Silent Observer Admin 1", role: "SILENT_ADMIN", default_pin: "1111" },
    "1112": { name: "Silent Observer Admin 2", role: "SILENT_ADMIN", default_pin: "1112" },
    "2222": { name: "Master Field Worker", role: "MASTER_WORKER", default_pin: "2222" },
    "3333": { name: "Field Supervisor", role: "FIELD_SUPERVISOR", default_pin: "3333" },
    "4444": { name: "Duty Operational Admin", role: "OPERATIONAL_ADMIN", default_pin: "4444" },
    // Weather station workers
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

function doPost(e) {
  var action = e.parameter.action;
  if (action === "login") return login(e);
  if (action === "send_otp") return sendOTP(e);
  if (action === "reset_pin") return resetPin(e);
  if (action === "submit_rainfall") return submitRainfall(e);
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid action" })).setMimeType(ContentService.MimeType.JSON);
}

function login(e) {
  var phone = e.parameter.phone;
  var pin = e.parameter.pin;
  var db = getWorkersDB();
  var user = db[phone];
  if (!user) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "User not found" })).setMimeType(ContentService.MimeType.JSON);

  var sheet = getSpreadsheet().getSheetByName("User_Pins");
  var pins = sheet.getRange(2,1,sheet.getLastRow()-1,2).getValues();
  var foundPin = user.default_pin;
  for (var i=0;i<pins.length;i++){
    if (pins[i][0]==phone) foundPin=pins[i][1];
  }
  if (pin===foundPin) {
    logActivity(phone,"LOGIN");
    return ContentService.createTextOutput(JSON.stringify({ status:"success", role:user.role, station:user.name })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status:"error", message:"Invalid PIN" })).setMimeType(ContentService.MimeType.JSON);
}

function sendWhatsAppOTP(phone, otp) {
  // Meta WhatsApp Cloud API integration goes here
}

function sendOTP(e) {
  var phone = e.parameter.phone;
  var otp = Math.floor(1000+Math.random()*9000).toString();
  sendWhatsAppOTP(phone, otp);
  var cache = CacheService.getUserCache();
  cache.put(phone+"_otp", otp, 300);
  return ContentService.createTextOutput(JSON.stringify({ status:"success", message:"OTP sent" })).setMimeType(ContentService.MimeType.JSON);
}

function resetPin(e) {
  var phone = e.parameter.phone;
  var otp = e.parameter.otp;
  var newPin = e.parameter.newPin;
  var cache = CacheService.getUserCache();
  var storedOtp = cache.get(phone+"_otp");
  if (storedOtp===otp) {
    var sheet = getSpreadsheet().getSheetByName("User_Pins");
    sheet.appendRow([phone,newPin,new Date()]);
    return ContentService.createTextOutput(JSON.stringify({ status:"success", message:"PIN updated" })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status:"error", message:"Invalid OTP" })).setMimeType(ContentService.MimeType.JSON);
}

function submitRainfall(e) {
  var phone = e.parameter.phone;
  var station = e.parameter.station;
  var slot = e.parameter.slot;
  var rainfall = e.parameter.rainfall;
  var date = e.parameter.date;
  var sheet = getSpreadsheet().getSheetByName("Submissions");
  var values = sheet.getDataRange().getValues();
  var updated=false;
  for (var i=1;i<values.length;i++){
    if (values[i][1]==phone && values[i][2]==station && values[i][3]==slot && values[i][4]==date){
      sheet.getRange(i+1,5).setValue(rainfall);
      updated=true;
      break;
    }
  }
  if (!updated) sheet.appendRow([new Date(),phone,station,slot,rainfall,date]);
  logActivity(phone,"NEW_SUBMISSION");
  return ContentService.createTextOutput(JSON.stringify({ status:"success", message:"Rainfall recorded" })).setMimeType(ContentService.MimeType.JSON);
}

function logActivity(phone,action) {
  var sheet = getSpreadsheet().getSheetByName("User_Activity_Log");
  sheet.appendRow([new Date(),phone,action]);
}
