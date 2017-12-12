class Graphics extends EventEmitter {};
const graphics = new Graphics();

function setup_graphics(){
	console.log("setup graphics");
	function resize_window(){
		gauge.emit('resize');
		meter.emit('resize');
	}
	window.addEventListener('resize', resize_window);

	document.addEventListener('drop', function (e) {
		e.preventDefault();
		e.stopPropagation();
  	});
	document.addEventListener('dragover', function (e) {
		e.preventDefault();
		e.stopPropagation();
	});

	function update_status(){
		if (saved_configs.graphics_enabled){
			graphics_status_node.html('Graphics Running');
			graphics_icon_node.attr('src', path.join(__dirname, 'static', 'graphics-start.png'));
		}
		else{
			graphics_status_node.html('Graphics Paused');
			graphics_icon_node.attr('src', path.join(__dirname, 'static', 'graphics-stop.png'));
		}
	}

	update_status();

	function toggle_graphics(){
		saved_configs.graphics_enabled = !saved_configs.graphics_enabled;
		write_config();
		update_status();
	}

	graphics_toggle_node.on('click', toggle_graphics);

	function update_graphics(){
		if (saved_configs.graphics_enabled){
			gauge.emit('update');
			meter.emit('update');
			map_event.emit('update');
			orientation.emit('update');
		}
	}

	graphics.on('update', update_graphics);
}