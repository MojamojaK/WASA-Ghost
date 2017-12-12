function setup_secret(){
	console.log("setup secret");
	let k = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66];
	let kp = 0;
	
	let cover_node = $('#cover');
	let audio = new Audio('./static/secret.mp3');
	function secret() {
		audio.play();
		cover_node.prepend("<img id='secret' src='./static/secret.png' />");
		cover_node.show();
		setTimeout(function(){
			cover_node.empty();
			cover_node.hide();
		}, 2500);
	}
	function handleSecret(e){
		if (e.keyCode == k[kp]) {
			if (++kp == k.length) {
		 		secret();
		 		kp = 0;
			}
	  	}
		else kp = 0;
	}
	document.addEventListener('keydown', handleSecret);
}