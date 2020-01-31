var mqttClient = null;
var testVar = "0";
document.addEventListener('deviceready', startApp, false);

var app = {
  paramsDeviceState: false,
  high_intensity: 360,
  normal_intensity: 180,
  low_intensity: 60,
  start_timeout: 10,
  mode: 1,
  sendEnabled: false,
  device_id: "A7D997B46F",
  view: 1,
  mqttConnected: false,
  bleConnected: false,
  paramsDeviceConnected: false,
  lastSendTime: 0,
  session_id: "test",
  bleDevice_id: "notConnected",
  bleNecessity: true,
  session_initiated: false,
  serialReg: "",
  paramsDeviceConnected: false,
  externalDeviceTopics: new Array(),
  // Application Constructor
  initialize: function() {

    this.paramsDeviceState = false;
    this.high_intensity = 360;
    this.normal_intensity = 180;
    this.low_intensity = 60;
    this.start_timeout = 10;
    this.mode = 1;
    this.sendEnabled = false;
    if (localStorage.getItem("device_id") !== null && localStorage.getItem("device_id") !== undefined) this.device_id = localStorage.getItem("device_id");
    else this.device_id = "CA8D9478C6"; //'mqttjs_' + Math.random().toString(16).substr(2, 8)
    this.view = 1;
    this.mqttConnected = false;
    this.bleConnected = false;
    this.paramsDeviceConnected = false;
    this.bleNecessity = true;
    this.lastSendTime = new Date().getTime();
    this.bleDevice_id = "notConnected";
    this.session_initiated = false;
    this.serialReg = "";
    this.externalDeviceTopics = new Array();
    if (localStorage.getItem('session_id') !== undefined) this.session_id = localStorage.getItem('session_id');
    else this.session_id = "test";

    return new Promise(function(resolve, reject) {
      resolve();
    })
  },

  onDeviceReady: function() {
    app.loadView(1).then(app.initCssStates).then(app.initButtons);
    cordova.plugins.backgroundMode.enable();
    window.plugins.insomnia.keepAwake()
    cordova.plugins.backgroundMode.on('activate', function() {
      cordova.plugins.backgroundMode.disableWebViewOptimizations();
    });
    app.connectToMqttServer();
    app.startSerial();
    setTimeout(function() {
      app.writeToESP("init" + app.device_id, "1,");
    }, 20000)
  },

  initButtons: function(id) {
    $("button[name='start_stop']").on("click", function() {
      if (app.view != 1 || ((app.bleConnected || !app.bleNecessity) && app.mqttConnected && app.paramsDeviceConnected)) {
        var view = app.view == 1 ? app.view + 1 : 1;
        app.view = view;
        app.loadView(view).then(app.initCssStates).then(app.initButtons);
      }
      setTimeout(function() {
        if (!app.sendEnabled) {
          if ((app.bleConnected || !app.bleNecessity) && app.mqttConnected && app.paramsDeviceConnected) {
            if (!app.session_initiated) {
              app.writeToESP("init" + app.device_id, app.mode + ",");
              app.session_initiated = true;
            } else {
              app.writeToESP("command" + app.device_id, "0,");
            }
            //  console.log(app.pad(parseInt(app.start_timeout / 60),2)+":"+app.pad(app.start_timeout % 60,2));
            //  $("#timer").text(app.pad(parseInt((parseInt(app.start_timeout)+1) / 60),2)+":"+app.pad((parseInt(app.start_timeout)+1) % 60,2));
          } else {
            alert("All Devices Must Be Connected To Be Able To Start A New Session");
            $(".icon-settings").click();
          }
        } else {
          if (app.mqttConnected) app.writeToESP("command" + app.device_id, "0,");
          else alert("Could not Stop The Session Due To Poor Internet Connextion, Please Stop it Manually.");
        }
      }, 400);
    });
    $('.dose').on("click", function() {
      $(this).data("selected", "true");
      var index = $(".dose").index(this);
      app.mode = parseInt(index);
      app.initCssStates(app.mode);
    });
    $('.icon-settings').on("click", function() {
      if ($(".settings").css("display") == "none") app.loadSettingsPanel();
      else $(".settings").css("display", "none")
    });
    $('button[name="connectBle"]').on("click", function() {
      if (app.bleConnected) ble.disconnect(app.bleDevice_id, app.bleDisconnected, function() {});
      else app.connectToBLE();
    });

  },
  loadSettingsPanel: function() {
    $(".settings").css("display", "flex");
    console.log(app);
    $(".settings").html('<div class="settings_form"><h3>Settings</h3><div class="state"> <h6>Device ID </h6> <input type="text" name="device_id" value="' + app.device_id + '"></div><div class="state"> <h6>Parameters Device </h6> <div class="' + (app.paramsDeviceConnected ? "connected" : "notConnected") + '"></div></div><div class="state"> <h6>Bluetooth Connection </h6> <label class="container">Necessary<input name="bleNecessity" type="checkbox" ' + (app.bleNecessity ? 'checked="checked"' : '') + '><span class="checkmark"></span></label><div class="' + (app.bleConnected ? "connected" : "notConnected") + '"></div></div><div class="state"> <h6>MQTT Connection </h6> <div class="' + (app.mqttConnected ? "connected" : "notConnected") + '"></div></div></div>');
    $("input[name='device_id']").on("change", function() {
      localStorage.setItem("device_id", $("input[name='device_id']").val());
      app.device_id = $("input[name='device_id']").val()
    });
    $(".settings").on("click", function(e) {
      if (e.target == this) { // only if the target itself has been clicked
        $(".settings").css("display", "none");
      }
    });
    $('input[name="bleNecessity"]').on("click", function() {
      app.bleNecessity = $(this).prop("checked");
    });
  },
  loadView: function(id) {
    app.view = id;
    switch (id) {
      case 1:
        $(".app").html('<i class="feather icon-settings"></i><button name="connectBle">' + (app.bleConnected ? "Disconnect Bluetooth" : "Connect Bluetooth") + '</button><div class="hr_container"><i class="fas fa-heartbeat"></i><h1 id="hr_val"> --- bpm</h1></div><h2 id="title">Please Select A Dose</h2><div class="dose_options"><button class="dose" type="button" name="high">HIGH</button><button class="dose" type="button" name="normal">NORMAL</button><button class="dose" type="button" name="low">LIGHT</button></div><button type="button" name="start_stop">START</button>')
        break;
      case 2:
        $(".app").html('<div class="hr_container"><i class="fas fa-heartbeat"></i><h1 id="hr_val"> --- bpm</h1></div><div class="titles"><h4 id="session_id">Session id : --------</h4><h2 id="title">Please Climb In And Close The Lid For Calibration</h2></div><button type="button" name="start_stop">STOP</button>');
        break;
      case 3:
        $(".app").html('<div class="hr_container"><i class="fas fa-heartbeat"></i><h1 id="hr_val"> --- bpm</h1></div><div class="titles"><h4 id="session_id">Session id : --------</h4><h2 id="title">Session Will Start In</h2></div><div class="timer_container"><h1 id="timer">00:60</h1></div><button type="button" name="start_stop">STOP</button>');
        break;
    }
    return new Promise(function(resolve, reject) {
      resolve(app.mode);
    });
  },
  initCssStates: function(mode) {
    $(".dose").css("background", "#FBFCFC");
    $(".dose").css("color", "black");
    $(".dose").eq(mode).css("background", "#90A4AE");
    $(".dose").eq(mode).css("color", "#FBFCFC");
    $("button[name='connectToBLE']").text((app.bleConnected ? "Disconnect Bluetooth" : "Connect Bluetooth"));
    switch (app.view) {
      case 1:
        $("button[name='start_stop']").css("background", "#2ECC71");
        $(".hr_container").css("margin-top", "5vh");
        break;
      case 2:
        $("button[name='start_stop']").css("background", "#F44336");
        $("#title").text("Please Climb In And Close The Lid For Calibration");
        $(".hr_container").css("margin-top", "10vh");
        break;
      case 3:
        $("button[name='start_stop']").css("background", "#F44336");
        $("#title").text("SESSION WILL END IN");
        $(".hr_container").css("margin-top", "10vh");
        break;
    }
    return new Promise(function(resolve, reject) {
      resolve(app.mode);
    });
  },
  connectToBLE: function() {
    ble.enable(function() {}, function() {});
    ble.stopScan(function() {}, function() {});
    if (app.bleDevice_id != "notConnected" || app.bleConnected) ble.disconnect(app.bleDevice_id, app.bleDisconnected, function() {});
    startBLE($("button[name='connectBle']"));
  },

  connectToMqttServer: function() {
    mqttClient = mqtt.connect("ws://13.48.47.167:9000", {
      clientId: "APP" + app.device_id
    });
    console.log("MQTT Connected");
    mqttClient.subscribe("command" + app.device_id);
    mqttClient.subscribe("settings" + app.device_id);
    mqttClient.subscribe("status" + app.device_id);
    mqttClient.subscribe("ping" + app.device_id);
    mqttClient.on("connect", function() {
      if (!app.paramsDeviceConnected) app.writeSerial("localSetup-init*");
      app.mqttConnected = true;
      app.writeToESP("status" + app.device_id, "a,1," + (app.bleConnected ? 1 : 0) + "," + app.device_id);
      app.writeToESP("ping" + app.device_id, " ");
    });
    mqttClient.on("disconnect", function() {
      if (app.paramsDeviceConnected) app.writeSerial("localSetup-init*");
      app.mqttConnected = false;
      app.writeToESP("status" + app.device_id, "a,0," + (app.bleConnected ? 1 : 0) + "," + app.device_id);
    });
    mqttClient.on("message", handleMQTTCallback);
    if(window.navigator.onLine)mqttClient.publish("getSettings", "s," + app.device_id);
    else app.writeToESP("settings"+app.device_id+"-"+app.high_intensity+","+app.normal_intensity+","+app.low_intensity+","+app.start_timeout+"*");
  },
  timer: setInterval(function() {
    var time = $("#timer").text().toString().split(':');
    var timestamp = parseInt(time[0]) * 60 + parseInt(time[1]);

    if (timestamp > 0) {
      timestamp--;
      var minutes = parseInt(timestamp / 60);
      var seconds = timestamp % 60;
      new Promise(function(resolve, reject) {
        $("#timer").text(app.pad(minutes, 2) + ":" + app.pad(seconds, 2));
        resolve();
      }).then(function() {
        if (timestamp == 0) app.timeoutCallback();
      })
    } else if (timestamp <= 0) {
      $("#timer").text("00:00");
      app.writeToESP("command" + app.device_id, "0,");
    }

  }, 1000),
  timeoutCallback: function() {
    console.log("timesUp");
  },
  pad: function(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  },
  bleDisconnected: function() {
    app.bleConnected = false;
    app.bleDevice_id = "notConnected";
    alert("Blueooth Device Disconnected");
    $("button[name='connectBle']").text("Connect Bluetooth");
    $("#hr_val").text("--- bpm");
  },
  startSerial: function() {
    serial.requestPermission(
      function(successMessage) {
        serial.open({
            baudRate: 115200
          },
          function(successMessage) {
            app.paramsDeviceConnected = true;
            app.writeToESP("status" + app.device_id, "m,1" + "," + app.device_id);
            app.serialConnectionTimer = setTimeout(function() {
              if (app.paramsDeviceConnected) {
                app.paramsDeviceConnected = false;
                app.writeToESP("status" + app.device_id, "m,0" + "," + app.device_id);
              } else {
                app.writeSerial("localSetup-init*");
              }
            }, 4000)
            serial.registerReadCallback(
              function success(data) {
                var view = new Uint8Array(data);
                app.serialToString(view);
              },
              function error() {
                new Error("Failed to register read callback");
              });
            app.writeSerial("localSetup-init*");
          },
          app.SerialErrorCallback
        );
      },
      app.SerialErrorCallback
    );
  },
  SerialErrorCallback: function(message) {
    alert('Error: Could not connect to device ' + message + "Reconnecting");
    app.startSerial();
  },
  serialToString: function(view) {
    if (view.length >= 1) {
      for (var i = 0; i < view.length; i++) {
        // if we received a \n, the message is complete, display it
        if (view[i] === 13) { // check if the read rate correspond to the ESP serial print rate
          app.serialDataCallback(app.serialReg);
          app.serialReg = '';
        } // if not, concatenate with the begening of the message
        else {
          var temp_str = String.fromCharCode(view[i]);
          app.serialReg += temp_str;
        }
      }
    }
  },
  serialDataCallback: function(rawData) {
    console.log(rawData);
    rawData = rawData.replace(/(\r\n|\n|\r)/gm, "");
    app.paramsDeviceConnected = true;
    if (rawData[0] == "a" && rawData.length == 1) {
      clearTimeout(app.serialConnectionTimer);
      app.serialConnectionTimer = null;
      app.serialConnectionTimer = setTimeout(function() {
        if (app.paramsDeviceConnected) {
          app.paramsDeviceConnected = false;
          app.writeToESP("status" + app.device_id, "m,0" + "," + app.device_id);
        } else {
          app.writeSerial("localSetup-init*");
        }
      }, 4000)
    } else {
      //s/p,subject,data
      var data = rawData.split('-');
      if (data[0] == 's') {
        mqttClient.subscribe(data[1]);
        if (!app.externalDeviceTopics.includes(data[1])) app.externalDeviceTopics.push(data[1]);
      } else if (data[0] == 'p') {
        if(window.navigator.onLine)app.writeToESP(data[1], data[2]);
        else app.handleMQTTCallback(data[1],data[2]);
      }
    }

  },
  writeSerial: function(data) {
    serial.write(data, function() {}, function() {
      alert("couldn't send");
      app.startSerial();
    });
  },
  writeToESP:function(topic,data){
    /*f(window.navigator.onLine) mqttClient.publish(topic, data);
    else*/ app.writeSerial(topic + "-" + data + "*");
  },
  handleMQTTCallback:function(topic, payload) {
    var device_id = app.device_id;
    var data = payload.toString().split(",");
    console.log(data);
    if (app.externalDeviceTopics.includes(topic) && window.navigator.onLine) {
      app.writeSerial(topic + "-" + payload.toString() + "*");
    }
    if (topic === "newSession" + device_id) {
      let id = sha256(data[1] + new Date().getTime()).toString().substring(0, 10).toUpperCase();
      app.writeToESP("command"+device_id,"1,"+id+","+data[2]+","+data[3]);
    }
    if (topic === "command" + device_id) {
      if (data[0] == '1') {
        app.sendEnabled = true;
        app.session_id = data[1];
        app.loadView(3).then(app.initCssStates).then(app.initButtons);
        localStorage.setItem("session_id", data[1]);
        $("#session_id").text("SESSION ID: " + data[1]);
        app.mode = parseInt(data[2]);
        app.lastSendTime = new Date().getTime();
        app.timeoutCallback = function() {
          $("button[name='start_stop']").click();
        }
        var minutes = parseInt(parseInt(data[3]) / 60);
        var seconds = parseInt(data[3]) % 60;
        $("#timer").text(app.pad(minutes, 2) + ":" + app.pad(seconds, 2));
      } else if (data[0] == '0') {
        app.sendEnabled = false;
        setTimeout(function() {
          if (app.bleConnected && !app.sendEnabled) ble.disconnect(app.bleDevice_id, app.bleDisconnected, function() {});
        }, 60000);
        app.session_initiated = false;
        app.loadView(1).then(app.initCssStates).then(app.initButtons);
        $("#timer").text("00:00");
      }
    } else if (topic === "settings" + device_id) {
      app.high_intensity = parseFloat(data[0]) / 10;
      app.normal_intensity = parseFloat(data[1]) / 10;
      app.low_intensity = parseFloat(data[2]) / 10;
      app.start_timeout = data[3];
      console.log(app);
    } else if (topic === "status" + device_id) {
      if (data[0] == 'm') {
        app.paramsDeviceConnected = parseInt(data[1]) == 1 ? true : false;
      }
    } else if (topic === "ping" + device_id) {
      console.log("PINGED");
      app.writeToESP("status" + app.device_id, "a," + (app.mqttConnected ? 1 : 0) + "," + (app.bleConnected ? 1 : 0) + "," + app.device_id);
    } else if (topic.includes("data") && data.length>4){
        //SAVE PARAMS DATA LOCALLY
        app.saveData("paramData",data);
    }
  },
  serialConnectionTimer: null,
  saveData:function(name,data){

  },
  publishData:function(){

  }

};
//startApp();
function startApp() {
  app.initialize().then(app.onDeviceReady);
}
