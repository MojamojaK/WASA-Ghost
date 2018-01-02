/*
DONE:
  clock, gauge, generator, map, menu, meter, orientatton, speech, secret, graphics, serial

TODO:
  gps, graph, acc, nofly-zone
*/
const $ = require('jquery')

const {GhostMenu} = require('./scripts/lib/menu.js')
const {Coordinate, MapLoader} = require('./scripts/lib/map.js')
const {Meter, MeterInfo} = require('./scripts/lib/meter.js')
const {Clock} = require('./scripts/lib/clock.js')
const {Gauge, GaugeOptions} = require('./scripts/lib/gauge.js')
const {Orientation} = require('./scripts/lib/orientation.js')
const {Logger} = require('./scripts/lib/logger.js')
const {DataGenerator} = require('./scripts/lib/generator.js')
const {Speech} = require('./scripts/lib/speech.js')
const {Secret} = require('./scripts/lib/secret.js')
const {Graphics} = require('./scripts/lib/graphics.js')
const {Serial} = require('./scripts/lib/serial.js')
const {Playback} = require('./scripts/lib/playback.js')
const {SCWTab, GraphTab} = require('./scripts/lib/tab.js')
const {ToolPicker} = require('./scripts/lib/tool-picker.js')

const windowNode = $(window)

const DegToRad = Math.PI / 180

const altimeterColor = ['#FF0000', '#C0C000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#FF0000']
const speedMeterColor = ['#FF0000', '#FF0000', '#00A000', '#00A000', '#00A000', '#00A000', '#00A000', '#C0C000', '#C0C000', '#FF0000']

let ghostMenu = new GhostMenu()

const cadenceOptions = new GaugeOptions(true, DegToRad * 0.9, Math.PI, 0, false, 0, 200, 0, 0, 50, -90, 0.9, 0, 1, 1, 0, [0.5, 0.4, 0.4], [0.6, 0.6, 0.6])
const rudderOptions = new GaugeOptions(false, DegToRad, 2 * Math.PI / 3 * 0.99, Math.PI / 3 * 1.01, false, -60, 240, 0, 180, 30, 0, 1, -90, 1, 0.1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])
const elevatorOptions = new GaugeOptions(false, DegToRad, 5 * Math.PI / 6, 7 * Math.PI / 6, true, -60, 240, 90, 180, 30, 90, -1, -90, -1, 0.1, 1, [0.5, 1, 0.5], [0.5, 1, 0.5])

window.onload = function () {
  let clock = new Clock($('#date-display'), $('#time-display'), $('#freq-display'))
  let mapLoader = new MapLoader(ghostMenu, 'NOT-REQUIRED-WITH-YOUR-VECTOR-TILES-DATA', $('#map'), $('#mapDragDrop'), $('#import-map-button'))
  let altitudeMeterInfo = new MeterInfo($('#altitudeMeterArrow'), $('#altitudeMeterValue'))
  let airSpeedMeterInfo = new MeterInfo($('#airSpeedMeterArrow'), $('#airSpeedMeterValue'))
  let groundSpeedMeterInfo = new MeterInfo($('#groundSpeedMeterArrow'), $('#groundSpeedMeterValue'))
  let rightMeter = new Meter(windowNode, 'Altitude', true, $('#altitude'), $('#altitudeMeter'), [altitudeMeterInfo], altimeterColor)
  let leftMeter = new Meter(windowNode, 'Speed', false, $('#speed'), $('#speedMeter'), [airSpeedMeterInfo, groundSpeedMeterInfo], speedMeterColor)
  let cadenceGauge = new Gauge(windowNode, $('#cadenceValue'), $('#cadenceGaugeNeedle'), $('#cadenceGaugeOutline'), cadenceOptions)
  let rudderGauge = new Gauge(windowNode, $('#rudderValue'), $('#rudderGaugeNeedle'), $('#rudderGaugeOutline'), rudderOptions)
  let elevatorGauge = new Gauge(windowNode, $('#elevatorValue'), $('#elevatorGaugeNeedle'), $('#elevatorGaugeOutline'), elevatorOptions)
  let yawOrientation = new Orientation($('#yawPlane'), mapLoader)
  let pitchOrientation = new Orientation($('#pitchPlane'))
  let rollOrientation = new Orientation($('#rollPlane'))
  let longitude = new Coordinate(139.523889, mapLoader, 0)
  let latitude = new Coordinate(35.975278, mapLoader, 1)
  let data = {
    clock: clock,
    altitude: altitudeMeterInfo,
    airSpeed: airSpeedMeterInfo,
    groundSpeed: groundSpeedMeterInfo,
    cadence: cadenceGauge,
    rudder: rudderGauge,
    elevator: elevatorGauge,
    yaw: yawOrientation,
    pitch: pitchOrientation,
    roll: rollOrientation,
    latitude: latitude,
    longitude: longitude
  }
  let logger = new Logger($('#log-icon'), $('#log-status'), $('#log-button'), $('#log-filename'), $('#select-log-button'), $('#log-dir'), data)
  let playback = new Playback($('#playback-icon'), $('#playback-status'), $('#playback-button'), logger, data)
  let weatherTab = new SCWTab('SCW')
  let graphTab1 = new GraphTab('Graphs(1)', {
    'Cadence | Altitude': {
      'Cadence': {obj: cadenceGauge, axis: 1},
      'Altitude': {obj: altitudeMeterInfo, axis: 2}
    },
    'Speed': {
      'Air': {obj: airSpeedMeterInfo, axis: 1},
      'Ground': {obj: groundSpeedMeterInfo, axis: 1}
    }
  })
  let graphTab2 = new GraphTab('Graphs(2)', {
    'Orientation': {
      'Yaw': {obj: yawOrientation, axis: 1},
      'Pitch': {obj: pitchOrientation, axis: 1},
      'Roll': {obj: rollOrientation, axis: 1}
    }
  })
  let toolPicker = new ToolPicker(windowNode, $('#tool-picker'), $('#tool-viewer'), [weatherTab, graphTab1, graphTab2])
  let graphicsManager = new Graphics($('#graphic-icon'), $('#graphic-status'), $('#graphic-button'), data)
  let dataGenerator = new DataGenerator(ghostMenu, $('#debug-icon'), $('#debug-status'), $('#debug-button'), graphicsManager, logger, data)
  let serial = new Serial($('#serial-list'), $('#refresh-serial'), $('#connect-icon'), $('#connect-status'), $('#connect-button'), graphicsManager, logger, data)
  let speech = new Speech($('#speech-icon'), $('#speech-status'), $('#speech-button'), cadenceGauge)
  let secret = new Secret($('#cover'))
  let objectArray = [clock, mapLoader, altitudeMeterInfo, airSpeedMeterInfo, rightMeter, leftMeter, cadenceGauge, rudderGauge, elevatorGauge, yawOrientation, pitchOrientation, rollOrientation, dataGenerator, logger, playback, graphicsManager, serial, speech, toolPicker, secret]
  console.log('Debug', objectArray)
  ghostMenu.update()
}
