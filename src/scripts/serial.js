const $ = require('jquery')
const path = require('path')
const SerialPort = require('serialport')
const XBeeAPI = require('xbee-api')
const C = XBeeAPI.constants
// const serialUtil = SerialPort.SerialPort
const EventEmitter = require('events')

module.exports.Serial = class Serial extends EventEmitter {
  constructor (graphicsManager, listNode, refreshNode, iconNode, statusNode, toggleNode, logger, data) {
    super()
    this.graphicsManager = graphicsManager
    this.listNode = listNode
    this.refreshNode = refreshNode
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.logger = logger
    this.data = data
    this.xbee = undefined
    this.connection = undefined
    this.toggleEnable = true
    this.listPorts()
    let serial = this
    this.refreshNode.on('click', function () { serial.listPorts() })
    this.toggleNode.on('click', function () { serial.toggleConnection() })
  }

  listPorts () {
    this.listNode.html('')
    let serial = this
    SerialPort.list(function (err, ports) {
      if (err) {
        serial.listNode.append($('<option value=\'null\'>ERROR</option'))
      } else {
        ports.forEach(function (port) {
          let basename = port.comName.split('/')
          let comId = basename[basename.length - 1]
          serial.listNode.append($('<option id=\'' + comId + '\'value=\'' + port.comName + '\'>' + port.comName + '</option>'))
        })
      }
    })
  }

  toggleConnection () {
    if (this.listNode.val() === null || this.listNode.val() === 'null') return
    if (this.toggleEnable) {
      this.statusNode.html('Serial Loading...')
      this.toggleEnable = false
      let serial = this
      setTimeout(function () { serial.toggleEnable = true }, 1000)
      if (this.connection) this.closePort()
      else this.openPort()
    }
  }

  openPort () {
    let portName = this.listNode.val()
    console.log('attempt connection to', portName)
    this.xbee = new XBeeAPI.XBeeAPI({
      api_mode: 2,
      parser_buffer_size: 64,
      builder_buffer_size: 128
    })

    this.connection = new SerialPort(portName, {
      autoOpen: false,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      flowControl: false
    })

    this.connection.pipe(this.xbee.parser)
    this.xbee.builder.pipe(this.connection)

    let serial = this
    this.connection.open(function (err) {
      if (err) {
        console.log('connection failed', err)
        serial.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'disconnect-icon.png'))
        serial.statusNode.html('Serial Disconnected')
      } else {
        console.log('connection opened')
        serial.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'connect-icon.png'))
        serial.statusNode.html('Serial Connected')
        serial.xbee.parser.on('data', function (frame) { serial.unpackData(frame) })
        serial.xbee.on('err', function () { serial.retryPort() })
        let testFrameObj = {
          type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
          destination64: '0013a2004070d534',
          data: '' // Can either be string or byte array.
        }
        serial.xbee.builder.write(testFrameObj)
      }
    })
  }

  closePort () {
    let serial = this
    this.connection.close(function () {
      console.log('connection closed')
      serial.connection = undefined
      serial.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'disconnect-icon.png'))
      serial.statusNode.html('Serial Disconnected')
    })
  }

  retryPort () {
    console.log('connection retrying')
    if (this.connection) {
      this.toggleEnable = false
      let serial = this
      this.connection.close(function () {
        console.log('connection closed')
        serial.connection = undefined
        serial.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'disconnect-icon.png'))
        serial.openPort()
        setTimeout(function () { serial.toggleEnable = true }, 1000)
      })
    }
  }

  unpackData (frame) {
    console.log('got frame type: ', frame.type)
    if (frame.type === 0x90) {
      let buffer = frame.data
      let cadence = buffer[1] | (buffer[2] << 8)
      let airSpeedRotation = buffer[3] | (buffer[4] << 8)
      // let airSpeedDeltaT = (((((buffer[8] << 8) | buffer[7]) << 8) | buffer[6]) << 8) | buffer[5]
      // let cadenceDeltaT = (((((buffer[12] << 8) | buffer[11]) << 8) | buffer[10]) << 8) | buffer[9]
      let altitude = (buffer[25] | buffer[26] << 8) / 100
      let heading = buffer[13] | buffer[14] << 8
      let roll = buffer[15] | buffer[16] << 8
      let pitch = buffer[17] | buffer[18] << 8
      let accelX = buffer[19] | buffer[20] << 8
      let accelY = buffer[21] | buffer[22] << 8
      let accelZ = buffer[23] | buffer[24] << 8
      if (heading & 0x8000) heading -= 0x10000 // 2byte signed から 4byte signed に変換
      if (roll & 0x8000) roll -= 0x10000 // 2byte signed から 4byte signed に変換
      if (pitch & 0x8000) pitch -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelX & 0x8000) accelX -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelY & 0x8000) accelY -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelZ & 0x8000) accelZ -= 0x10000 // 2byte signed から 4byte signed に変換
      heading += 180
      roll /= 100
      pitch /= 100
      accelX /= 100
      accelY /= 100
      accelZ /= 100
      // let calibAccelerometer = (buffer[27] & 0x03)
      // let calibMagnetometer = (buffer[27] & 0x0C) >> 2
      // let calibGyrosensor = (buffer[27] & 0x30) >> 4
      // let calibSystem = (buffer[27] & 0xC0) >> 6
      // let lastTime = (((((buffer[31] << 8) | buffer[30]) << 8) | buffer[29]) << 8) | buffer[28]

      this.data.cadenceGauge.setValue(cadence)
      this.data.rudderGauge.setValue(0) // TODO
      this.data.elevatorGauge.setValue(0) // TODO
      this.data.altitudeMeterInfo.setValue(altitude)
      this.data.airSpeedMeterInfo.setValue(airSpeedRotation / 500)
      this.data.airSpeedMeterInfo.setValue(0) // TODO
      this.data.yawOrientation.setValue(heading)
      this.data.pitchOrientation.setValue(pitch)
      this.data.rollOrientation.setValue(roll)
      this.data.mapLoader.setValue(heading) // TODO GPS

      this.logger.emit('data')
      this.graphicsManager.emit('update')
    } else if (frame.type === C.FRAME_TYPE.AT_COMMAND_RESPONSE) {
      // テストパケットの受信
      console.log('Node identifier:', frame)
    }
  }
}
