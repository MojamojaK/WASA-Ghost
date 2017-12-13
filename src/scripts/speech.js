class SpeechEvent extends EventEmitter {};
const speech_event = new SpeechEvent();

function speak(str){};

function setup_speech() {
  if (process.platform === 'darwin'){
    function _speak(str, delay){
      speech_event.emit('speak', str, delay);
    }
    speak = _speak;
    function say(str, delay){
      if (delay == undefined){
        synth.speak(new SpeechSynthesisUtterance(str));
      }
      else{
        setTimeout(function(){synth.speak(new SpeechSynthesisUtterance(str))}, delay);
      }
    }

    function say_cadence(){
      speak(cadence_info.value)
    }
    speech_event.on('speak', say);
    let speech_enabled = false;
    let interval;
    function toggle_speech(){
      speech_enabled = !speech_enabled;
      if (speech_enabled){
        speech_icon_node.attr('src', 'static/speech-on.png');
        speech_status_node.html('Speech Enabled');
        interval = setInterval(say_cadence, 1500);
      }
      else{
        clearInterval(interval);
        speech_icon_node.attr('src', 'static/speech-off.png');
        speech_status_node.html('Speech Disabled');
      }
    }
    speech_toggle_node.on('click', toggle_speech);
  }
}