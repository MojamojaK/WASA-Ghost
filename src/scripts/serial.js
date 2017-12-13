class Serial extends EventEmitter{};
let serial_event = new Serial();

function setup_serial(){
  console.log("setup serial");

  function list_ports(){
    serial_node.html('');
    serialport.list(function (err, ports){
      ports.forEach(function (port){
        const name = port.comName.split('/');
        const id = name[name.length - 1];
        serial_node.append($("<option id='" + id + "'' value='" + port.comName + "''>" + port.comName + "</option>"));
      });
    });
  }

  list_ports();

  serial_refresh_node.on('click', list_ports);

  serial_connect_node.on('click', serial_connect);

  let prop_rot, tach_rot;
  let tach_d, prop_d;
  let altitude;
  let heading, roll, pitch;
  let accel_x, accel_y, accel_z;
  let calib_a, calib_m, calib_g, calib_s;
  let last_time;
  function unpack_data(frame){
    console.log('got frame type: ', frame.type);
    if (frame.type == 0x90){
      let buffer = frame.data;
      prop_rot  = buffer[1] | (buffer[2] << 8);
      tach_rot  = buffer[3] | (buffer[4] << 8);
      tach_d    = (((((buffer[8] << 8) | buffer[7]) << 8) | buffer[6]) << 8) | buffer[5];
      prop_d    = (((((buffer[12] << 8) | buffer[11]) << 8) | buffer[10]) << 8) | buffer[9];
      altitude  = (buffer[25] | buffer[26] << 8) / 100;
      heading    = buffer[13] | buffer[14] << 8;
      roll    = buffer[15] | buffer[16] << 8;
      pitch    = buffer[17] | buffer[18] << 8;
      accel_x    = buffer[19] | buffer[20] << 8;
      accel_y    = buffer[21] | buffer[22] << 8;
      accel_z    = buffer[23] | buffer[24] << 8;
      if (heading & 0x8000) heading -= 0x10000; // 2byte signed から 4byte signed に変換
      if (roll    & 0x8000) roll    -= 0x10000; // 2byte signed から 4byte signed に変換
      if (pitch   & 0x8000) pitch   -= 0x10000; // 2byte signed から 4byte signed に変換
      if (accel_x & 0x8000) accel_x -= 0x10000; // 2byte signed から 4byte signed に変換
      if (accel_y & 0x8000) accel_y -= 0x10000; // 2byte signed から 4byte signed に変換
      if (accel_z & 0x8000) accel_z -= 0x10000; // 2byte signed から 4byte signed に変換
      heading   += 180
      roll     /= 100;
      pitch     /= 100;
      accel_x   /= 100;
      accel_y   /= 100;
      accel_z   /= 100;
      calib_a    = (buffer[27] & 0x03);
      calib_m    = (buffer[27] & 0x0C) >> 2;
      calib_g    = (buffer[27] & 0x30) >> 4;
      calib_s    = (buffer[27] & 0xC0) >> 6;
      last_time   = (((((buffer[31] << 8) | buffer[30]) << 8) | buffer[29]) << 8) | buffer[28];
      
      cadence_info.value         = prop_rot;
      rudder_info.value         = 0;
      elevator_info.value       = 0;
      alti_meter_info.value       = [altitude];
      speed_meter_info.value       = [tach_rot / 500, 0];
      yaw_info.value          = heading;
      pitch_info.value        = pitch;
      roll_info.value          = roll;
      logger.emit('data');
      graphics.emit('update');
      clock.emit('update');
    }
    else if (frame.type == C.FRAME_TYPE.AT_COMMAND_RESPONSE) {
      // This frame is definitely the response!
      console.log("Node identifier:", frame);
    }
  }

  let connection;
  let serial_button_enable = true;
  
  function serial_connect(){
    if (serial_node.val() == null) return;
    if (serial_button_enable){
      serial_status_node.html("Serial Loading...");
      serial_button_enable = false;
      setTimeout(function(){serial_button_enable = true;}, 1000);
      if (connection){
        connection.close(function(){
          console.log("connection closed");
          connection = undefined;
          serial_icon_node.attr("src", "static/disconnect-icon.png");
          serial_status_node.html("Serial Disconnected");
        });
      }
      else{
        open_connection();
      }
    }
  }

  function retry_connection(){
    console.log('retrying connection');
    if (connection){
      serial_button_enable = false;
      connection.close(function(){
        console.log("connection closed");
        connection = undefined;
        serial_icon_node.attr("src", "static/disconnect-icon.png");
        serial_status_node.html("Serial Disconnected");
        open_connection();
        setTimeout(function(){serial_button_enable = true;}, 1000);
      });
    }
  }
  

  function open_connection(){
    const port_name = serial_node.val();
    console.log("attempt connection to", port_name);

    let xbeeAPI = new xbee_api.XBeeAPI({
      api_mode: 2,
      parser_buffer_size: 64,
      builder_buffer_size: 128
    });
    
    connection = new serialport(port_name, {
      autoOpen: false,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      flowControl: false,
    });

    connection.pipe(xbeeAPI.parser);    // XBee-api->Serialの通信の確立
    xbeeAPI.builder.pipe(connection);    // Serial->XBee-apiの通信の確立

    connection.open(function(err){
      if (err){
        console.log("connection failed", err);
        serial_icon_node.attr("src", "static/disconnect-icon.png");
        serial_status_node.html("Serial Disconnected");
      }
      else{
        console.log("connection opened");
        serial_icon_node.attr("src", "static/connect-icon.png");
        serial_status_node.html("Serial Connected");
        xbeeAPI.parser.on("data", unpack_data);
        xbeeAPI.on('error', retry_connection);
        var frame_obj = {
          type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
          destination64: "0013a2004070d534",
          data: "" // Can either be string or byte array.
        };
         xbeeAPI.builder.write(frame_obj);
      }
    });
  }
}