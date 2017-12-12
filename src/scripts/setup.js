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
