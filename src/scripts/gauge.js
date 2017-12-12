class Gauge extends EventEmitter {};
const gauge = new Gauge();

function setup_gauge(){
	console.log("setup gauge");

	function draw_gauge(info){
		let canvas = info.outline_node;
		let context = info.canvas_context;
		canvas.width = canvas.scrollWidth;
		canvas.height = canvas.scrollHeight;
		let width = canvas.width;
		let height = canvas.height;
		let widthMul = [];
		let heightMul = [];
		for (let i = 0; i < info.widthMultiplier.length; i++) widthMul[i] = width * info.widthMultiplier[i];
		for (let i = 0; i < info.heightMultiplier.length; i++) heightMul[i] = height * info.heightMultiplier[i];
		let radius = 0;
		if (widthMul[1] < heightMul[1]) radius = widthMul[2];
		else radius = heightMul[2];
		let radiusMul = [];
		for (let i = 0; i < radiusMultiplier.length; i++) radiusMul[i] = radius * radiusMultiplier[i];
		info.needle_node.css({
			"height" : radiusMul[4] + "px",
			"top" : (heightMul[0] - radiusMul[4]) + "px"
		});
		if (!info.is_cadenece){
			info.value_node.css({
				"width": radius * 0.6 + "px",
				"height": radius * 0.18 + "px",
				"left": (widthMul[0] - radius * 0.3) + "px",
				"top": (heightMul[0] + radius * 0.08) + "px",
				"font-size": radius * 0.2 + "px"
			});
		}
		context.arc(widthMul[0], heightMul[0], radiusMul[0], info.arc_start,  info.arc_end, info.anti_clockwise);
		context.lineWidth = radiusMul[1];
		context.strokeStyle = "#00FFFF";
		context.stroke();
		context.beginPath();
		context.arc(widthMul[0], heightMul[0], radiusMul[2], 0, TwoPi, false);
		context.fillStyle = "#FFFFFF";
		context.fill();
		context.font = "italic " + (radiusMul[3]).toFixed(3) + "px sans-serif";
		context.textBaseline = "top";
		let rad;
		let cosRad, sinRad;
		let arch_x, arch_y;
		let line_width;
		let text;
		let inner_x, inner_y;
		let from_x, from_y;
		let to_x, to_y;
		for (let tick = info.tick_min; tick <= info.tick_max; tick += 10){
			rad 	= (tick + info.tick_draw_offset) * info.scale;
			cosRad 	= Math.cos(rad);
			sinRad 	= Math.sin(rad);
			if ((tick + info.tick_large_offset) % info.tick_large_size == 0){
				arch_x		= cosRad * radiusMul[5];
				arch_y		= sinRad * radiusMul[5];
				line_width	= radiusMul[6];
				text		= ((tick + info.text_offset) * info.text_multiplier).toString();
				inner_x		= widthMul[0] - cosRad * radiusMul[7] - radiusMul[8];
				inner_y		= heightMul[0] - sinRad * radiusMul[7] - radiusMul[9];
				if (info.is_cadenece){
					if (tick > 190) inner_x -= radiusMul[11];
					if (tick < 100) inner_x += radiusMul[9];
				}
				else{
					if (tick == 230) inner_x -= radiusMul[6];
					else if (tick == 90) inner_x += radiusMul[12];
				}
				context.fillText(text, inner_x, inner_y);
				context.stroke();
			}
			else{
				arch_x = cosRad * radiusMul[10];
				arch_y = sinRad * radiusMul[10];
				line_width = radiusMul[2];
			}
			inner_x = cosRad * radiusMul[0];
			inner_y = sinRad * radiusMul[0];
			from_x = widthMul[0] - arch_x;
			from_y = heightMul[0] - arch_y;
			to_x = widthMul[0] - inner_x;
			to_y = heightMul[0] - inner_y;
			context.beginPath();
			context.moveTo(from_x, from_y);
			context.lineTo(to_x, to_y);
			context.lineWidth = line_width;
			context.strokeStyle = "#FFFFFF";
			context.stroke();
		}
	}
	
	function update_gauge(info){
		let val = info.value * info.value_multiplier;
		let deg = val * info.tick_multiplier + info.tick_offset;
		info.value_node.html(val.toFixed(info.fixed));
		function needle_step(now) {info.needle_node.css({"-webkit-transform":"rotate(" + now + "deg)"});}
		info.needle_node.animate({degree: deg}, {duration: 30, step: needle_step});
	}

	function resize_gauge(){
		draw_gauge(cadence_info);
		draw_gauge(rudder_info);
		draw_gauge(elevator_info);
	}

	function update_gauge_all(){
		update_gauge(cadence_info);
		update_gauge(rudder_info);
		update_gauge(elevator_info);
	}

	resize_gauge();
	update_gauge_all();

	gauge.on('resize', resize_gauge);
	gauge.on('update', update_gauge_all);
}