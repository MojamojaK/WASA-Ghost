require('./requires.js');
require('./constants.js');
require('./map.js');
require('./clock.js');
require('./gauge.js');
require('./meter.js');
require('./orientation.js');
require('./graphics.js');
require('./serial.js');
require('./logging.js');
require('./secret.js');
require('./speech.js');
require('./debugger.js');
require('./menu.js');
require('./setup.js');

window.onload = function(){
  setup_constants();
  setup_clock();
  setup_map();
  setup_gauge();
  setup_meter();
  setup_orientation();
  setup_serial();
  setup_logging();
  setup_graphics();
  setup_secret();
  setup_speech();
  try{setup_debugger();} catch(e){console.log("no debug");}
}
