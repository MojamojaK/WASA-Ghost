const DegToRad = Math.PI / 180;
const TwoPi = 2 * Math.PI;

let window_node;

let port_name;
let serial_node;
let serial_connect_node;

let log_dir_node;
let log_dir_select_node;
let log_filename_node;

let log_status_node;
let log_icon_node;
let log_toggle_node;

let graphics_status_node;
let graphics_icon_node;
let graphics_toggle_node;

let debug_toggle_node;
let debug_icon_node;
let debug_status_node;

let speech_toggle_node;
let speech_icon_node;
let speech_status_node;

let CadenceScale;
let cadence_info;
let rudder_info;
let elevator_info;

let alti_meter_info
let speed_meter_info;

let yaw_info
let pitch_info;
let roll_info;

let date_node;
let clock_node;

const radiusMultiplier = [0.9, 0.02, 0.01, 0.15, 0.75, 0.775, 0.05, 0.65, 0.105, 0.07, 0.85, 0.075, 0.06];
const meter_x_offset = ["3.5%", "5.049%", "5.691%", "6.183%", "6.598%"] // (Math.sqrt(2.4 * i) + 3.5)
let data_path;

if (process.platform == "darwin") {
    data_path = path.join(os.homedir(), "Library", "Application Support", "ghost");
} else if (process.platform == "win32") {
    data_path = path.join(os.homedir(), "AppData", "Roaming", "ghost");
} else {
    data_path = path.join(os.homedir(), ".ghost");
}

const config_path = path.join(data_path, "config.json");

const default_configs = {
    main_directory: data_path,
    log_directory: path.join(os.homedir(), "documents", "ghostLogs"),
    graphics_enabled: true,
    debugger_enabled: false
};

let saved_configs = {};

function write_config() {
    fs.writeFile(config_path, JSON.stringify(saved_configs, null, '\t'), function(err) {
        if (err) console.log(err)
    });
}

function get_constants() {
    if (fs.existsSync(config_path)) {
        try {
            saved_configs = JSON.parse(fs.readFileSync(config_path, 'utf8'));
        } catch (e) {}
    }
    Object.keys(default_configs).forEach(function(key) {
        if (saved_configs[key] == undefined) {
            saved_configs[key] = default_configs[key];
        }
    });
    if (saved_configs.main_directory != data_path) {
        saved_configs.main_directory = data_path;
    }
    write_config();
}

function setup_constants() {
    console.log("setup constants");
    get_constants();

    window_node = $(window);
    serial_node = $('#serial_list');
    serial_connect_node = $('#connect-button');
    serial_icon_node = $('#connect-icon');
    serial_status_node = $('#connect-status');
    serial_refresh_node = $('#refresh_serial');

    log_dir_node = $('#log-dir');
    log_dir_select_node = $('#select-log-button');
    log_filename_node = $('#log-filename');

    log_status_node = $('#log-status');
    log_icon_node = $('#log-icon');
    log_toggle_node = $('#log-button');

    graphics_status_node = $('#graphic-status');
    graphics_icon_node = $('#graphic-icon');
    graphics_toggle_node = $('#graphic-button');

    debug_toggle_node = $('#debug-button');
    debug_status_node = $('#debug-status');
    debug_icon_node = $('#debug-icon');

    speech_toggle_node = $('#speech-button');
    speech_status_node = $('#speech-status');
    speech_icon_node = $('#speech-icon');

    cadence_info = {
        value_node: $('#cadence_value'),
        needle_node: $('#cadence_gauge_needle'),
        outline_node: document.getElementById('cadence_gauge_outline'),
        canvas_context: document.getElementById('cadence_gauge_outline').getContext('2d'),
        is_cadenece: true,
        scale: DegToRad * 0.9,
        arc_start: Math.PI,
        arc_end: 0,
        anti_clockwise: false,
        tick_min: 0,
        tick_max: 200,
        tick_draw_offset: 0,
        tick_large_offset: 0,
        tick_large_size: 50,
        tick_offset: -90,
        tick_multiplier: 0.9,
        text_offset: 0,
        text_multiplier: 1,
        value_multiplier: 1,
        fixed: 0,
        widthMultiplier: [0.5, 0.4, 0.4],
        heightMultiplier: [0.6, 0.6, 0.6],
        value: 0
    };

    rudder_info = {
        value_node: $('#rudder_value'),
        needle_node: $('#rudder_gauge_needle'),
        outline_node: document.getElementById('rudder_gauge_outline'),
        canvas_context: document.getElementById('rudder_gauge_outline').getContext('2d'),
        is_cadenece: false,
        scale: DegToRad,
        arc_start: 2 * Math.PI / 3 * 0.99,
        arc_end: Math.PI / 3 * 1.01,
        anti_clockwise: false,
        tick_min: -60,
        tick_max: 240,
        tick_draw_offset: 0,
        tick_large_offset: 180,
        tick_large_size: 30,
        tick_offset: 0,
        tick_multiplier: 1,
        text_offset: -90,
        text_multiplier: 1,
        value_multiplier: 0.1,
        fixed: 1,
        widthMultiplier: [0.5, 1, 0.5],
        heightMultiplier: [0.5, 1, 0.5],
        value: 0
    };

    elevator_info = {
        value_node: $('#elevator_value'),
        needle_node: $('#elevator_gauge_needle'),
        outline_node: document.getElementById('elevator_gauge_outline'),
        canvas_context: document.getElementById('elevator_gauge_outline').getContext('2d'),
        is_cadenece: false,
        scale: DegToRad,
        arc_start: 5 * Math.PI / 6,
        arc_end: 7 * Math.PI / 6,
        anti_clockwise: true,
        tick_min: -60,
        tick_max: 240,
        tick_draw_offset: 90,
        tick_large_offset: 180,
        tick_large_size: 30,
        tick_offset: 90,
        tick_multiplier: -1,
        text_offset: -90,
        text_multiplier: -1,
        value_multiplier: 0.1,
        fixed: 1,
        widthMultiplier: [0.5, 1, 0.5],
        heightMultiplier: [0.5, 1, 0.5],
        value: 0
    };

    alti_meter_info = {
        name: 'altitude',
        arrows: ['altitude'],
        color: ["#FF0000", "#C0C000", "#00A000", "#00A000", "#00A000", "#00A000", "#00A000", "#00A000", "#C0C000", "#FF0000"],
        right: true,
        max: 10,
        value: [0],
        tmp_val: [0],
        node: $("#altitude_meter"),
        arrow_nodes: [$("#altitude_meter_arrow")],
        value_nodes: [$("#altitude_meter_value")],
        height: 0,
        bottom: 0
    };

    speed_meter_info = {
        name: 'speed',
        arrows: ['air_speed', 'ground_speed'],
        color: ["#FF0000", "#FF0000", "#00A000", "#00A000", "#00A000", "#00A000", "#00A000", "#C0C000", "#C0C000", "#FF0000"],
        right: false,
        max: 10,
        value: [0, 0],
        tmp_val: [0, 0],
        node: $("#speed_meter"),
        arrow_nodes: [$("#air_speed_meter_arrow"), $("#ground_speed_meter_arrow")],
        value_nodes: [$("#air_speed_meter_value"), $("#ground_speed_meter_value")],
        height: 0,
        bottom: 0
    };

    yaw_info = {
        node: $("#yaw_plane"),
        value: 0
    };

    pitch_info = {
        node: $("#pitch_plane"),
        value: 0
    };

    roll_info = {
        node: $("#roll_plane"),
        value: 0
    };

    date_node = $('#date-display');
    time_node = $('#time-display');
    freq_node = $('#freq-display');
}