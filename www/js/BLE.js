var service_uuid = "0000180d-0000-1000-8000-00805f9b34fb";
var characteristic_uuid = "00002A37-0000-1000-8000-00805f9b34fb";
var lastReadingTime = new Date().getTime();

function startBLE(button) {
  if (button != undefined) {
    button.text("Scanning ...");
    /*  button.on("click",function(){
        if(confirm("Scanning For Device Do You Want To Interrupt The Scan"))ble.stopScan(function(){},function(){});
      });*/
  }
  ble.startScan([service_uuid], function(device) {
    ble.autoConnect(device.id, function() {
      alert("connected to BLE device");
      app.bleConnected = true;
      app.bleDevice_id = device.id;
      button.text("Disconnect Bluetooth");
      //app.loadView(1).then(app.initCssStates).then(app.initButtons);
      ble.startNotification(device.id, service_uuid, characteristic_uuid, function(pData) {
        pData = new Uint8Array(pData);
        //SHOW THE DATA HERE

        if (pData.length >= 1) var hr = pData[1];
        var hrFormat = pData[0] & 0x01;
        var sensorContact = true;
        var contactSupported = !((pData[0] & 0x06) == 0);
        if (contactSupported) {
          sensorContact = ((pData[0] & 0x06) >> 1) == 3;
        }
        var energyExpended = (pData[0] & 0x08) >> 3;
        var rrPresent = (pData[0] & 0x10) >> 4;
        var hrValue = (hrFormat == 1 ? pData[1] + (pData[2] << 8) : pData[1]) & (hrFormat == 1 ? 0x0000FFFF : 0x000000FF);
        $("#hr_val").text(hrValue + " bpm");
        if (!contactSupported && hrValue == 0) {
          // note does this apply to all sensors, also 3rd party
          sensorContact = false;
        }
        var sensorContactFinal = sensorContact;
        var offset = hrFormat + 2;
        var energy = 0;
        if (energyExpended == 1) {
          energy = (pData[offset] & 0xFF) + ((pData[offset + 1] & 0xFF) << 8);
          offset += 2;
        }
        if (rrPresent == 1) {
          var len = pData.length;
          while (offset < len) {
            var rrValue = parseInt((pData[offset] & 0xFF) + ((pData[offset + 1] & 0xFF) << 8));
            offset += 2;
            console.log("leastReading: " + lastReadingTime);
            console.log("Now: " + new Date().getTime());
            var timeDiff = new Date().getTime() - lastReadingTime;
            console.log("timeDiff: " + timeDiff);
            //Send data to server
            if (app.sendEnabled) {
              var load = rrValue + "," + timeDiff + "," + app.session_id + "," + hrValue;
              console.log("MQTT sending");
              console.log(load);
              if(window.navigator.onLine)mqttClient.publish("data" + app.device_id, load);
              else app.saveData("hrmData",load);
              lastReadingTime = new Date().getTime();
            }
          }
        }

      }, function() {});
    }, function() {});

  }, function() {
    alert("Device Not Found")
  });
}

function writeBLE(data, id) {
  ble.write(id, service_uuid, characteristic_uuid, stringToBytes(data), function() {}, function() {});
}

/* Drivers */
function stringToBytes(string) {
  var array = new Uint8Array(string.length);
  for (var i = 0, l = string.length; i < l; i++) {
    array[i] = string.charCodeAt(i);
  }
  return array.buffer;
}

function bytesToString(buffer) {
  return String.fromCharCode.apply(null, new Uint8Array(buffer));
}
/* END Drivers */
