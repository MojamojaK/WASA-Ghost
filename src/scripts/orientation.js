class Orientation extends EventEmitter {};
const orientation = new Orientation();

function setup_orientation(){
  function set_orientation(info){
    function needle_step(now) {info.node.css({'-webkit-transform':'rotate(' + now + 'deg)'});}
    info.node.animate({degree: info.value}, {duration: 30, step: needle_step});
  }

  function update_orientation(){
    set_orientation(yaw_info);
    set_orientation(pitch_info);
    set_orientation(roll_info);
  }
  orientation.on('update', update_orientation);
}