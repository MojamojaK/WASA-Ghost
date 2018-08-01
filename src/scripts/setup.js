/*
DONE:
  clock, gauge, generator, map, menu, meter, orientation, speech, secret, graphics, serial, graph, acc

TODO:
  gps, nofly-zone
*/
const $ = require('jquery')

const {GhostMenu} = require('./scripts/lib/menu.js')
const {Value, Time, Freq, AirSpeedValue} = require('./scripts/lib/value.js')
const {Logger} = require('./scripts/lib/logger.js')
const {Secret} = require('./scripts/lib/secret.js')
const {GraphicsManager} = require('./scripts/lib/graphics.js')

const {DataGenerator} = require('./scripts/lib/input/generator.js')
const {Serial} = require('./scripts/lib/input/serial.js')
const {Playback} = require('./scripts/lib/input/playback.js')

const {SCWTab, GraphTab, TunnelTab} = require('./scripts/lib/toolbar/tabs.js')
const {ToolPicker} = require('./scripts/lib/toolbar/tool-picker.js')

const {Clock} = require('./scripts/lib/display/clock.js')
const {FreqDisplay} = require('./scripts/lib/display/freqDisplay.js')
const {MapLoader} = require('./scripts/lib/display/map.js')
const {Meter, MeterInfo} = require('./scripts/lib/display/meter.js')
const {Gauge, GaugeOptions} = require('./scripts/lib/display/gauge.js')
const {Orientation} = require('./scripts/lib/display/orientation.js')
const {Speech} = require('./scripts/lib/display/speech.js')
const {Plain} = require('./scripts/lib/display/plain.js')

const windowNode = $(window)

const DegToRad = Math.PI / 180

// 色を増やすだけで高度・機速の目盛りが増やせます (たぶん下から順です)
const altimeterColor = ['#FF0000', '#C0C000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#FF0000']
const speedMeterColor = ['#FF0000', '#FF0000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#C0C000', '#FF0000']

let ghostMenu = new GhostMenu()

const cadenceOptions = new GaugeOptions(true, DegToRad * 0.9, Math.PI, 0, false, 0, 200, 0, 0, 50, -90, 0.9, 0, 1, 0, [0.5, 0.4, 0.4], [0.6, 0.6, 0.6])
const rudderOptions = new GaugeOptions(false, DegToRad, 2 * Math.PI / 3 * 0.99, Math.PI / 3 * 1.01, false, -60, 240, 0, 180, 30, 0, 1, -90, 1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])
const elevatorOptions = new GaugeOptions(false, DegToRad, 5 * Math.PI / 6, 7 * Math.PI / 6, true, -60, 240, 90, 180, 30, 90, -1, -90, -1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])

// ログを取る項目とそれの順番を指定できます。下の生データ辞書"data"参考
const logKeys = ['time', 'altitude', 'airSpeed', 'groundSpeed', 'cadence', 'rudder', 'elevator',
  'yaw', 'pitch', 'roll', 'accelX', 'accelY', 'accelZ', 'calSystem', 'calAccel', 'calGyro', 'calMag',
  'longitude', 'latitude', 'satellites', 'hdop', 'longitudeError', 'latitudeError', 'gpsAltitude', 'gpsCourse',
  'rudderTemp', 'rudderLoad', 'rudderVolt', 'elevatorTemp', 'elevatorLoad', 'elevatorVolt',
  'temperature', 'humidity', 'airPressure']

window.onload = function () {
  // 生データの辞書
  let data = {
    time: new Time(),
    freq: new Freq(),
    altitude: new Value(0, 0.01, 0, 1023, 2),
    airSpeed: new AirSpeedValue(0, 6.30619595750219E-07 * 1.3126, 0, 16255401, 2, 0.108955808944537),
    // 風洞試験2回目係数k: 6.12515993890615e-7
    // 風洞試験3回目係数k: 6.15180146890866e-7。 6.30619595750219E-07
    // 2018/07/13 追記: 1.3126は2018年第3回TFのログに基づいて算出した補正値 無風だったので対地機速と対気機速で最小二乗法を算出 (間違えなく正確ではないけどマシにはなるはず)
    // 機速受信値は interrupts / kiloseconds。これを meters / second に直す係数k
    // スリット数は100、FALLINGを検知するのでそのまま使う
    // 0.001 (i/ks -> i/s) * p (i/s -> m/s)
    // 16255401 = 10 /  6.15180146890866e-7
    groundSpeed: new Value(0, 0.001, 0, 12000, 2),
    cadence: new Value(0, 0.0009375, 0, 213333, 0),
    // 回転数受信値は interrupts / kiloseconds。これを rotation / minute に直す係数r
    // スリット数は32、CHANGEを検知するので2倍で64
    // r = 0.0009375
    // = 0.001 (i/ks -> i/s) * 60 (i/s -> i/m)/ 64(i/m -> r/m)
    // 213333 = 200 / 0.0009375
    rudder: new Value(0, 0.1, -1500, 3000, 1),
    elevator: new Value(0, 0.1, -1500, 3000, 1),
    accelX: new Value(0, 0.01, -2000, 4000, 2),
    accelY: new Value(0, 0.01, -2000, 4000, 2),
    accelZ: new Value(0, 0.01, -2000, 4000, 2),
    yaw: new Value(360, 1, 0, 360, 0),
    pitch: new Value(0, 0.01, 0, 36000, 1),
    roll: new Value(0, 0.01, 0, 36000, 1),
    calSystem: new Value(0, 1, 0, 4, 0),
    calAccel: new Value(0, 1, 0, 4, 0),
    calGyro: new Value(0, 1, 0, 4, 0),
    calMag: new Value(0, 1, 0, 4, 0),
    longitude: new Value(1395238890, 0.0000001, 1395188890, 100000, 6),
    latitude: new Value(359752780, 0.0000001, 359702780, 100000, 6),
    satellites: new Value(0, 1, 0, 12, 0),
    hdop: new Value(0, 0.01, 1, 3000, 2),
    longitudeError: new Value(50, 0.1, 0, 1000, 1),
    latitudeError: new Value(50, 0.1, 0, 1000, 1),
    gpsAltitude: new Value(0, 0.01, 1, 1000, 2),
    gpsCourse: new Value(0, 0.01, 0, 36000, 2),
    rudderTemp: new Value(20, 1, 0, 40, 0),
    rudderLoad: new Value(0, 1, 0, 1500, 0),
    rudderVolt: new Value(1130, 0.01, 900, 360, 2),
    elevatorTemp: new Value(20, 1, 0, 40, 0),
    elevatorLoad: new Value(0, 1, 0, 1500, 0),
    elevatorVolt: new Value(1130, 0.01, 900, 360, 2),
    temperature: new Value(0, 0.01, 0, 40, 1),
    humidity: new Value(50, 1, 0, 100, 0),
    airPressure: new Value(101325, 0.01, 90000, 30000, 0)
  }

  // ツールバーの設定
  let weatherTab = new SCWTab('SCW')
  let graphTab1 = new GraphTab('Graphs(1)', {
    'Cadence | Altitude': {
      'Cadence': {obj: data.cadence, axis: 1},
      'Altitude': {obj: data.altitude, axis: 2}
    },
    'Speed': {
      'Air': {obj: data.airSpeed, axis: 1},
      'Ground': {obj: data.groundSpeed, axis: 1}
    }
  })
  let graphTab2 = new GraphTab('Graphs(2)', {
    'Orientation': {
      'Yaw': {obj: data.yaw, axis: 1},
      'Pitch': {obj: data.pitch, axis: 1},
      'Roll': {obj: data.roll, axis: 1}
    }
  })
  let windTunnelTab = new TunnelTab('Tunnel', data.airSpeed, data.cadence)
  let toolPicker = new ToolPicker(windowNode, $('#tool-picker'), $('#tool-viewer'), [weatherTab, graphTab1, graphTab2, windTunnelTab])

  let freqDisplay = new FreqDisplay(data.time, data.freq, $('#freq-display'))
  let clock = new Clock(data.time, $('#date-display'), $('#time-display'))

  let mapLoader = new MapLoader(data.longitude, data.latitude, data.yaw, data.longitudeError, data.latitudeError, data.hdop, data.accelX, data.accelY, data.groundSpeed, data.gpsCourse,
    ghostMenu, 'NOT-REQUIRED-WITH-YOUR-VECTOR-TILES-DATA', $('#map'), $('#mapDragDrop'), $('#import-map-button'))

  let gpsSatellite = new Plain(data.satellites, $('#gps-satellites'))
  let gpsCourse = new Plain(data.gpsCourse, $('#gps-course'))
  let gpsHdop = new Plain(data.hdop, $('#gps-hdop'))
  let gpsAltitude = new Plain(data.gpsAltitude, $('#gps-altitude'))
  let longitudeError = new Plain(data.longitudeError, $('#gps-longitude-error'))
  let latitudeError = new Plain(data.latitudeError, $('#gps-latitude-error'))

  let altitudeMeter = new MeterInfo(data.altitude, $('#altitudeMeterArrow'), $('#altitudeMeterValue'))
  let airSpeedMeter = new MeterInfo(data.airSpeed, $('#airSpeedMeterArrow'), $('#airSpeedMeterValue'))
  let groundSpeedMeter = new MeterInfo(data.groundSpeed, $('#groundSpeedMeterArrow'), $('#groundSpeedMeterValue'))
  let rightMeter = new Meter(windowNode, 'Altitude', true, $('#altitude'), $('#altitudeMeter'), [altitudeMeter], altimeterColor)
  let leftMeter = new Meter(windowNode, 'Speed', false, $('#speed'), $('#speedMeter'), [airSpeedMeter, groundSpeedMeter], speedMeterColor)

  let cadenceGauge = new Gauge(data.cadence, windowNode, $('#cadenceValue'), $('#cadenceGaugeNeedle'), $('#cadenceGaugeOutline'), cadenceOptions)
  let rudderGauge = new Gauge(data.rudder, windowNode, $('#rudderValue'), $('#rudderGaugeNeedle'), $('#rudderGaugeOutline'), rudderOptions)
  let elevatorGauge = new Gauge(data.elevator, windowNode, $('#elevatorValue'), $('#elevatorGaugeNeedle'), $('#elevatorGaugeOutline'), elevatorOptions)

  let yawOrientation = new Orientation(data.yaw, $('#yawPlane'))
  let pitchOrientation = new Orientation(data.pitch, $('#pitchPlane'))
  let rollOrientation = new Orientation(data.roll, $('#rollPlane'))

  let yawValue = new Plain(data.yaw, $('#orientation-yaw'), -360)
  let pitchValue = new Plain(data.pitch, $('#orientation-pitch'))
  let rollValue = new Plain(data.roll, $('#orientation-roll'))

  let accelX = new Plain(data.accelX, $('#accel-x'))
  let accelY = new Plain(data.accelY, $('#accel-y'))
  let accelZ = new Plain(data.accelZ, $('#accel-z'))

  let calSystem = new Plain(data.calSystem, $('#cal-system'))
  let calAccel = new Plain(data.calAccel, $('#cal-accel'))
  let calGyro = new Plain(data.calGyro, $('#cal-gyro'))
  let calMag = new Plain(data.calMag, $('#cal-mag'))

  let rudderTemp = new Plain(data.rudderTemp, $('#rudderTemp'))
  let rudderLoad = new Plain(data.rudderLoad, $('#rudderLoad'))
  let rudderVolt = new Plain(data.rudderVolt, $('#rudderVolt'))
  let elevatorTemp = new Plain(data.elevatorTemp, $('#elevatorTemp'))
  let elevatorLoad = new Plain(data.elevatorLoad, $('#elevatorLoad'))
  let elevatorVolt = new Plain(data.elevatorVolt, $('#elevatorVolt'))

  let temperature = new Plain(data.temperature, $('#temperature'))
  let humidity = new Plain(data.humidity, $('#humidity'))
  let airPressure = new Plain(data.airPressure, $('#air-pressure'))

  let speech = new Speech(data.groundSpeed, $('#speech-icon'), $('#speech-status'), $('#speech-button'))

  let graphicObjects = [mapLoader, gpsSatellite, gpsCourse, gpsHdop, gpsAltitude, longitudeError, latitudeError, altitudeMeter, airSpeedMeter, groundSpeedMeter, cadenceGauge,
    rudderGauge, elevatorGauge, yawOrientation, pitchOrientation, rollOrientation, yawValue, pitchValue, rollValue, calSystem, calAccel, calGyro, calMag,
    accelX, accelY, accelZ, rudderTemp, rudderLoad, rudderVolt, elevatorTemp, elevatorLoad, elevatorVolt, temperature, humidity, airPressure]

  let logger = new Logger(data, logKeys, $('#log-icon'), $('#log-status'), $('#log-button'), $('#log-filename'), $('#select-log-button'), $('#log-dir'))
  let graphicsManager = new GraphicsManager(graphicObjects, $('#graphic-icon'), $('#graphic-status'), $('#graphic-button'))

  let playback = new Playback(graphicsManager, data, logger, $('#playback-icon'), $('#playback-status'), $('#playback-button'))
  let dataGenerator = new DataGenerator(graphicsManager, logger, data, ghostMenu, $('#debug-icon'), $('#debug-status'), $('#debug-button'))
  let serial = new Serial(graphicsManager, logger, data, $('#serial-list'), $('#refresh-serial'), $('#connect-icon'), $('#connect-status'), $('#connect-button'))

  let secret = new Secret($('#cover'))
  let objectArray = [clock, freqDisplay, mapLoader, altitudeMeter, airSpeedMeter, rightMeter, leftMeter, cadenceGauge, rudderGauge, elevatorGauge, yawOrientation, pitchOrientation, rollOrientation, dataGenerator, logger, playback, graphicsManager, serial, speech, toolPicker, secret]
  console.log('Debug', objectArray)
  ghostMenu.update()
}
