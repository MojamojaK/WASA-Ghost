class Clock extends EventEmitter {};
const clock = new Clock();

function setup_clock(){
	let freq_count = 0;

	function display_time(){
		let d = new Date();
		date_node.html(d.toLocaleDateString());
		time_node.html(d.toLocaleTimeString());
		setTimeout(display_time, 1000 - d % 1000);
		freq_node.html(freq_count + "Hz");
		freq_count = 0;
	}
	display_time();

	let timeout;
	function update_freq(){
		clearTimeout(timeout);
		freq_node.css({backgroundColor: "green"});
		timeout = setTimeout(function(){freq_node.css({backgroundColor: "black"});}, 1000);
		freq_count++;
	}

	clock.on('update', update_freq);
}