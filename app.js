function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.innerText = text;
}

function login() {
  var phone = document.getElementById("phone").value;
  var pin = document.getElementById("pin").value;
  google.script.run.withSuccessHandler(function(res){
    if (res.status==="success") {
      document.getElementById("login-container").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      setText("station-name", res.station);
      setText("today-date", new Date().toDateString());
    } else {
      alert(res.message);
    }
  }).login({phone:phone,pin:pin});
}

function openForgotPin() {
  document.getElementById("forgot-pin-modal").classList.remove("hidden");
}

function closeForgotPin() {
  document.getElementById("forgot-pin-modal").classList.add("hidden");
}

function sendOTP() {
  var phone = document.getElementById("otp-phone").value;
  google.script.run.withSuccessHandler(function(res){
    alert(res.message);
  }).sendOTP({phone:phone});
}

function resetPin() {
  var phone = document.getElementById("otp-phone").value;
  var otp = document.getElementById("otp-code").value;
  var newPin = document.getElementById("new-pin").value;
  google.script.run.withSuccessHandler(function(res){
    alert(res.message);
    closeForgotPin();
  }).resetPin({phone:phone,otp:otp,newPin:newPin});
}

function setTrace() {
  document.getElementById("rainfall-input").value = "T";
}

function saveReading() {
  var rainfall = document.getElementById("rainfall-input").value;
  var phone = document.getElementById("phone").value;
  var station = document.getElementById("station-name").innerText;
  var slot = "current"; // simplified
  var date = new Date().toDateString();
  google.script.run.withSuccessHandler(function(res){
    alert(res.message);
  }).submitRainfall({phone:phone,station:station,slot:slot,rainfall:rainfall,date:date});
}
