var MQTTconnected = false;
var MQTTtopic = "";
if (localStorage.getItem("MQTTtopic") !== null) {
  MQTTtopic = localStorage.getItem("MQTTtopic")
}

function startMQTT() {
  cordova.plugins.CordovaMqTTPlugin.connect({
    url: "tcp://18.191.166.212", //a public broker used for testing purposes only. Try using a self hosted broker for production.
    port: 80,
    clientId: "Hani",
    connectionTimeout: 3000,
    username: "uname",
    password: 'pass',
    keepAlive: 60,
    isBinaryPayload: false, //setting this 'true' will make plugin treat all data as binary and emit ArrayBuffer instead of string on events
    success: function(s) {
      alert("Connect to Device through Internet");
      MQTTconnected = true;
    },
    error: function(e) {
      alert("Connection to Device through Internet Error");
    },
    onConnectionLost: function() {
      alert("Disconnected From Internet");
      MQTTconnected = false;
    },

  });
}

function writeMQTT(data) {
  if (MQTTconnected) {
    if (MQTTtopic.length > 1) {
      cordova.plugins.CordovaMqTTPlugin.publish({
        topic: MQTTtopic,
        payload: data,
        qos: 0,
        retain: false,
        success: function(s) {},
        error: function(e) {}
      })
    } else alert("Not Connected to Device through Internet.")
  } else alert("Not Connected to Internet");
}
