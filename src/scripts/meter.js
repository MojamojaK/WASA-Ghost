class Meter extends EventEmitter {};
const meter = new Meter();

function setup_meter(){
  console.log("setup meter");

  function render_meter(info){
    let value = "linear-gradient(to bottom, white 0%, white 1%, ";
    for (let i = 0; i < 10; i++){
      value += info.color[i] + " " +(i * 10 + ((i==0)?1:0)).toString() + "%, " + info.color[i] + " " + (i * 10 + 9).toString() + "%, white " + (i * 10 + 9).toString() + "%, white " + ((i+1) * 10).toString() + "%";
      if (i >= 9)value += ")";
      else value += ", ";
    }
    let meter_node = info.node;
    meter_node.css({"background": value});
    let height = meter_node.height();
    let unit = height / 10;
    let bottom = window_node.height() - meter_node.offset().top - height;
    info.height = height;
    info.bottom = bottom;
    let e;
    for (let i = 0; i <= 10; i++){
      e = $("<div id='" + info.name + "_" + i.toString() + "'class='meter_number " + info.name + "_meter_number' style='bottom: " + (((bottom + unit * i) * 0.97).toFixed(3)).toString() + "px;'>" + i.toString() +"</div>");
      $("#" + info.name).append(e);
      if (i < 5){
        if (info.right) e.css({"right" : meter_x_offset[i]});
        else e.css({"left" : meter_x_offset[i]});
      }
    }
  }
  
  render_meter(alti_meter_info);
  render_meter(speed_meter_info);

  function resize_meter(info) {
    let meter_node = info.node;
    let height = meter_node.height();
    let unit = height / 10;
    let bottom = window_node.height() - meter_node.offset().top - height;
    info.height = height;
    info.bottom = bottom;
    hnameu = "#" + info.name + "_";
    let e;
    for (let i = 0; i <= 10; i++){
      e = $(hnameu + i);
      e.css({"bottom": ((bottom + unit * i) * 0.97).toFixed(3) + "px"});
      if (i < 5){
        if (info.right) e.css({"right" : meter_x_offset[i]});
        else e.css({"left" : meter_x_offset[i]});
      }
    }
    let l = info.arrows.length;
    if (l != info.tmp_val.length) return;
    if (saved_configs.graphics_enabled) info.tmp_val = info.value;
    let arrow_meter_node, i, y, x;
    for (let k = 0; k < l; k++){
      arrow_meter_node = info.arrow_nodes[k];
      info.value_nodes[k].html((info.tmp_val[k] * 1.0).toFixed(2));
      i = info.tmp_val[k] / info.max;
      y = ((info.bottom + info.height * i - arrow_meter_node.outerHeight()/2)) + "px";
      if (i < 0.5) x = (Math.sqrt(28.8 * i) + 5.5) + "%";
      else x = "10%";
      if (info.right){
        arrow_meter_node.css({
          "bottom": y,
          "right": x
        });
      }
      else {
        arrow_meter_node.css({
          "bottom": y,
          "left": x
        });
      }
    }
  }

  function set_arrow(info) {
    let l = info.arrows.length;
    if (l != info.tmp_val.length) return;
    if (saved_configs.graphics_enabled) info.tmp_val = info.value;
    let arrow_meter_node, i, y, x;
    for (let k = 0; k < l; k++){
      arrow_meter_node = info.arrow_nodes[k];
      info.value_nodes[k].html((info.tmp_val[k] * 1.0).toFixed(2));
      i = info.tmp_val[k] / info.max;
      y = ((info.bottom + info.height * i - arrow_meter_node.outerHeight()/2)) + "px";
      if (i < 0.5) x = (Math.sqrt(28.8 * i) + 5.5) + "%";
      else x = "10%";
      if (info.right){
        arrow_meter_node.animate({
          "bottom": y,
          "right": x
        }, 30);
      }
      else {
        arrow_meter_node.animate({
          "bottom": y,
          "left": x
        }, 30);
      }
    }
  }

  function resize_meters_all(){
    resize_meter(alti_meter_info);
    resize_meter(speed_meter_info);
  }

  function update_meters_all(){
    set_arrow(alti_meter_info);
    set_arrow(speed_meter_info);
  }

  update_meters_all();

  meter.on('resize', resize_meters_all);
  meter.on('update', update_meters_all);

}