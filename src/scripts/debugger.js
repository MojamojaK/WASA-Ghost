class Debug extends EventEmitter {};
const debug = new Debug();

function menu_debugger_toggle(){
  debug.emit('toggle');
}

function setup_debugger(){
  function randomUpdate(){
    cadence_info.value    = (Math.random() * 250).toFixed(0);
    rudder_info.value     = (Math.random() * 3000 - 1500).toFixed(1);
    elevator_info.value   = (Math.random() * 3000 - 1500).toFixed(1);
    alti_meter_info.value   = [(Math.random() * 10).toFixed(1)];
    speed_meter_info.value  = [(Math.random() * 10).toFixed(1), (Math.random() * 10).toFixed(1)];
    yaw_info.value      = parseFloat((Math.random() * 360).toFixed(1));
    pitch_info.value    = (Math.random() * 360).toFixed(1);
    roll_info.value     = (Math.random() * 360).toFixed(1);
    graphics.emit('update');
    logger.emit('data');
    clock.emit('update');
  }

  let interval;
  function set_debugger(){
    if (saved_configs.debugger_enabled){
      console.log('data generator ON');
      interval = setInterval(randomUpdate, 200);
      debug_icon_node.attr('src', 'static/debug-on.png');
      debug_status_node.html('Data Generator Enabled');
    }
    else {
      console.log('data generator OFF');
      clearInterval(interval);
      debug_icon_node.attr('src', 'static/debug-off.png')
      debug_status_node.html('Data Generator Disabled');
    }
    fake_serial.checked = saved_configs.debugger_enabled;
  }

  set_debugger();

  function toggle_debugger(){
    saved_configs.debugger_enabled = !saved_configs.debugger_enabled;
    write_config();
    set_debugger();
  }

  debug.on('toggle', toggle_debugger);
  debug_toggle_node.on('click', toggle_debugger);
}