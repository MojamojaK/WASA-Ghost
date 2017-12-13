class Logger extends EventEmitter {};
const logger = new Logger();
let log_enabled = false;
let logging_allowed = true;
let toggling = false;

function setup_logging(){
  log_dir_select_node.on('click', set_log_dir);
  log_dir_node.html(saved_configs.log_directory + "/");
  
  let filename = "";
  function toggle_log(){
    if (!toggling){
      toggling = true;
      if (!log_enabled){
        filename = path.join(saved_configs.log_directory, log_filename_node.val() + ".csv");
        fs.access(filename, function(err){
          if (err){
            if (!fs.existsSync(saved_configs.log_directory)){
              fs.mkdirSync(saved_configs.log_directory);
            }
            fs.writeFile(filename, "", function(err){
              if (!err) logger.emit('open');
              else toggling = false;
            });
          }
          else{
            dialog.showMessageBox({
                title: "File Already Exists",
                type: "warning",
                buttons: ["Ignore", "Cancel"],
                message: "File \"" + log_filename_node.val() + ".csv\" already exists",
                detail: "Ignoring will append data to file"
              }, function(res){
                if (res == 0) logger.emit('open');
                else toggling = false;
              }
            );
          }
        });
      }
      else{
        logger.emit('close');
      }
    }
  }

  function open_logger(){
    console.log('openning logger');
    toggling = false;
    log_enabled = true;
    log_status_node.html('Logging...');
    log_icon_node.attr('src', path.join(__dirname, 'static', 'log-on.png'));
  }

  function close_logger(){
    console.log('closing logger');
    toggling = false;
    log_enabled = false;
    log_status_node.html('Logging Disabled');
    log_icon_node.attr('src', path.join(__dirname, 'static', 'log-off.png'));
  }

  function log_data(){
    if (log_enabled){
      if (logging_allowed){
        logging_allowed = false;
        let write_data = [
          Date.now().toString(),
          cadence_info.value.toString(),
          alti_meter_info.value[0].toString(),
          speed_meter_info.value[0].toString(),
          speed_meter_info.value[1].toString(),
          yaw_info.value.toString(),
          pitch_info.value.toString(),
          roll_info.value.toString()
        ];
        let lm1 = write_data.length-1;
        let write_str = "";
        for (let i = 0; i < lm1; i++) write_str += write_data[i] + ",";
        write_str += write_data[lm1] + "\n";
        fs.appendFile(filename, write_str, function(){
          logging_allowed = true;
        });
      }else{
        console.log('stopped');
      }
    }
  }

  log_toggle_node.on('click', toggle_log);
  logger.on('open', open_logger);
  logger.on('close', close_logger);
  logger.on('data', log_data);
}

function set_log_dir(){
  dialog.showOpenDialog({
    title: "Select Log Directory",
    defaultPath: saved_configs.log_directory,
    properties: ["openDirectory", "treatPackageAsDirectory", "createDirectory", "promptToCreate"]
  }, function(src_file){
    if (src_file){
      let dir_path = src_file[0];
      saved_configs.log_directory = dir_path;
      write_config();
      log_dir_node.html(saved_configs.log_directory + "/");
    }
  });
}