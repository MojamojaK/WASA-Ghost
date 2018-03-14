/*
DONE:
  clock, gauge, generator, map, menu, meter, orientatton, speech, secret, graphics, serial

TODO:
  gps, graph, acc, nofly-zone
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

// ログを取る項目とそれの順番を指定できます。下の生データ辞書"data"参考
const logKeys = ['time', 'altitude', 'airSpeed', 'groundSpeed', 'cadence', 'rudder', 'elevator', 'yaw', 'pitch', 'roll', 'latitude', 'longitude', 'rudderTemp', 'rudderLoad', 'rudderVolt', 'elevatorTemp', 'elevatorLoad', 'elevatorVolt']

const altimeterColor = ['#FF0000', '#C0C000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#FF0000']
const speedMeterColor = ['#FF0000', '#FF0000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#C0C000', '#FF0000']

let ghostMenu = new GhostMenu()

const cadenceOptions = new GaugeOptions(true, DegToRad * 0.9, Math.PI, 0, false, 0, 200, 0, 0, 50, -90, 0.9, 0, 1, 0, [0.5, 0.4, 0.4], [0.6, 0.6, 0.6])
const rudderOptions = new GaugeOptions(false, DegToRad, 2 * Math.PI / 3 * 0.99, Math.PI / 3 * 1.01, false, -60, 240, 0, 180, 30, 0, 1, -90, 1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])
const elevatorOptions = new GaugeOptions(false, DegToRad, 5 * Math.PI / 6, 7 * Math.PI / 6, true, -60, 240, 90, 180, 30, 90, -1, -90, -1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])

window.onload = function () {
  // 生データの辞書
  let data = {
    time: new Time(),
    freq: new Freq(),
    altitude: new Value(0, 0.01, 0, 1023, 2),
    airSpeed: new AirSpeedValue(0, 6.15180146890866e-7, 0, 100000, 2, 0.449023921989541),
    // 風洞試験2回目係数k: 6.12515993890615e-7
    // 風洞試験3回目係数k: 6.15180146890866e-7。
    // 機速受信値は interrupts / kiloseconds。これを meters / second に直す係数k
    // スリット数は100、FALLINGを検知するのでそのまま使う
    // 0.001 (i/ks -> i/s) * p (i/s -> m/s)
    groundSpeed: new Value(0, 0.01, 0, 1000, 2), // TODO
    cadence: new Value(0, 0.00046875, 0, 426666, 0),
    // 回転数受信値は interrupts / kiloseconds。これを rotation / minute に直す係数r
    // スリット数は64、CHANGEを検知するので2倍で128
    // r = 0.00046875
    // = 0.001 (i/ks -> i/s) * 60 (i/s -> i/m)/ 128(i/m -> r/m)
    // 426666 = 200 / 0.00046875
    rudder: new Value(0, 0.1, -1500, 3000, 1),
    elevator: new Value(0, 0.1, -1500, 3000, 1),
    yaw: new Value(0, 1, 0, 360, 0),
    pitch: new Value(0, 0.01, 0, 36000, 1),
    roll: new Value(0, 0.01, 0, 36000, 1),
    longitude: new Value(1395238890, 0.0000001, 1395188890, 100000, 6), // MAYBE TODO
    latitude: new Value(359752780, 0.0000001, 359702780, 100000, 6), // MAYBE TODO
    rudderTemp: new Value(20, 1, 0, 40, 0),
    rudderLoad: new Value(0, 1, 0, 1500, 0),
    rudderVolt: new Value(1130, 0.01, 900, 360, 2),
    elevatorTemp: new Value(20, 1, 0, 40, 0),
    elevatorLoad: new Value(0, 1, 0, 1500, 0),
    elevatorVolt: new Value(1130, 0.01, 900, 360, 2)
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

  let mapLoader = new MapLoader(data.longitude, data.latitude, data.yaw, ghostMenu, 'NOT-REQUIRED-WITH-YOUR-VECTOR-TILES-DATA', $('#map'), $('#mapDragDrop'), $('#import-map-button'))

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

  let rudderTemp = new Plain(data.rudderTemp, $('#rudderTemp'))
  let rudderLoad = new Plain(data.rudderLoad, $('#rudderLoad'))
  let rudderVolt = new Plain(data.rudderVolt, $('#rudderVolt'))
  let elevatorTemp = new Plain(data.elevatorTemp, $('#elevatorTemp'))
  let elevatorLoad = new Plain(data.elevatorLoad, $('#elevatorLoad'))
  let elevatorVolt = new Plain(data.elevatorVolt, $('#elevatorVolt'))

  let speech = new Speech(data.cadence, $('#speech-icon'), $('#speech-status'), $('#speech-button'))

  let graphicObjects = [mapLoader, altitudeMeter, airSpeedMeter, groundSpeedMeter, cadenceGauge,
    rudderGauge, elevatorGauge, yawOrientation, pitchOrientation, rollOrientation,
    rudderTemp, rudderLoad, rudderVolt, elevatorTemp, elevatorLoad, elevatorVolt]

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
