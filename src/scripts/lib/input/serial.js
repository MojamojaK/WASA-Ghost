const $ = require('jquery')
const path = require('path')
const SerialPort = require('serialport')
const XBeeAPI = require('xbee-api')
const C = XBeeAPI.constants
// const serialUtil = SerialPort.SerialPort
const EventEmitter = require('events')
const {GraphTab} = require('../toolbar/tabs.js')

module.exports.Serial = class Serial extends EventEmitter {
  constructor (graphicsManager, logger, data, listNode, refreshNode, iconNode, statusNode, toggleNode) {
    super()
    this.graphicsManager = graphicsManager
    this.logger = logger
    this.data = data
    this.listNode = listNode
    this.refreshNode = refreshNode
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.xbee = undefined
    this.connection = undefined
    this.toggleEnable = true
    this.listPorts()
    let serial = this
    this.refreshNode.on('click', function () { serial.listPorts() })
    this.toggleNode.on('click', function () { serial.toggleConnection() })
  }

  listPorts () {
    this.listNode.empty()
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
      parser_buffer_size: 512,
      builder_buffer_size: 512
    })

    this.connection = new SerialPort(portName, {
      autoOpen: false,
      baudRate: 57600,
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
        serial.iconNode.attr('src', path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'static', 'disconnect-icon.png'))
        serial.statusNode.html('Serial Disconnected')
      } else {
        console.log('connection opened')
        serial.iconNode.attr('src', path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'static', 'connect-icon.png'))
        serial.statusNode.html('Serial Connected')
        serial.xbee.parser.on('data', function (frame) { serial.unpackData(frame) })
        serial.xbee.on('error', function () { serial.retryPort() })
        let testFrameObj = {
          type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
          destination64: '0000000000000000',
          data: [0xFE, 0xEF] // Can either be string or byte array.
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
      serial.iconNode.attr('src', path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'static', 'disconnect-icon.png'))
      serial.statusNode.html('Serial Disconnected')
      serial.xbee.parser.removeAllListeners()
      serial.xbee.removeAllListeners()
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
        serial.iconNode.attr('src', path.join(path.dirname(path.dirname(path.dirname(__dirname))), 'static', 'disconnect-icon.png'))
        serial.openPort()
        setTimeout(function () { serial.toggleEnable = true }, 1000)
      })
    }
  }

  unpackData (frame) {
    // console.log('got frame type: ', frame.type)
    if (frame.type === 0x90) {
      let buffer = frame.data
      let cadence = (buffer[1] | buffer[2] << 8 | buffer[3] << 16 | buffer[4] << 24)
      let airSpeed = (buffer[5] | buffer[6] << 8 | buffer[7] << 16 | buffer[8] << 24)
      let heading = (buffer[9] | buffer[10] << 8)
      let roll = buffer[11] | buffer[12] << 8
      let pitch = buffer[13] | buffer[14] << 8
      let accelX = buffer[15] | buffer[16] << 8
      let accelY = buffer[17] | buffer[18] << 8
      let accelZ = buffer[19] | buffer[20] << 8
      if (heading & 0x8000) heading -= 0x10000 // 2byte signed から 4byte signed に変換
      if (roll & 0x8000) roll -= 0x10000 // 2byte signed から 4byte signed に変換
      if (pitch & 0x8000) pitch -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelX & 0x8000) accelX -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelY & 0x8000) accelY -= 0x10000 // 2byte signed から 4byte signed に変換
      if (accelZ & 0x8000) accelZ -= 0x10000 // 2byte signed から 4byte signed に変換
      heading += 180
      let calibAccelerometer = (buffer[21] & 0x03)
      let calibMagnetometer = (buffer[21] & 0x0C) >> 2
      let calibGyrosensor = (buffer[21] & 0x30) >> 4
      let calibSystem = (buffer[21] & 0xC0) >> 6
      let altitude = (buffer[22] | buffer[23] << 8)
      // if (altitude > 10) altitude = 10
      // else if (altitude < 0) altitude = 0
      let longitude = (buffer[24] | buffer[25] << 8 | buffer[26] << 16 | buffer[27] << 24)
      let latitude = (buffer[28] | buffer[29] << 8 | buffer[30] << 16 | buffer[31] << 24)
      let groundSpeed = buffer[32] | (buffer[33] << 8)
      let gpsAltitude = buffer[34] | buffer[35] << 8 | buffer[36] << 16 | buffer[37] << 24
      let satellites = buffer[38]
      let hdop = buffer[39] | buffer[40] << 8 | buffer[41] << 16 | buffer[42]
      let gpsCourse = buffer[43] | buffer[44] << 8
      let longitudeError = buffer[73] | buffer[74] << 8
      let latitudeError = buffer[75] | buffer[76] << 8
      let temperature = buffer[45] | buffer[46] << 8
      if (temperature & 0x8000) temperature -= 0x10000 // 2byte signed から 4byte signed に変換
      let airPressure = buffer[47] | buffer[48] << 8 | buffer[49] << 16 | buffer[50] << 24
      let humidity = buffer[51] | (buffer[52] << 8)
      let rudderPos = buffer[55] | (buffer[56] << 8)
      if (rudderPos & 0x8000) rudderPos -= 0x10000 // 2byte signed から 4byte signed に変換
      let rudderLoad = buffer[57] | (buffer[58] << 8)
      let rudderTemp = buffer[59] | (buffer[60] << 8)
      let rudderVolt = buffer[61] | (buffer[62] << 8)
      let elevatorPos = buffer[65] | (buffer[66] << 8)
      if (elevatorPos & 0x8000) elevatorPos -= 0x10000 // 2byte signed から 4byte signed に変換
      let elevatorLoad = buffer[67] | (buffer[68] << 8)
      let elevatorTemp = buffer[69] | (buffer[70] << 8)
      let elevatorVolt = buffer[71] | (buffer[72] << 8)
      let timeNow = Date.now()
      this.data.cadence.setValue(cadence)
      this.data.rudder.setValue(rudderPos)
      this.data.elevator.setValue(elevatorPos)
      this.data.altitude.setValue(altitude)
      this.data.airSpeed.setValue(airSpeed)
      this.data.groundSpeed.setValue(groundSpeed)
      this.data.yaw.setValue(heading)
      this.data.pitch.setValue(pitch)
      this.data.roll.setValue(roll)
      this.data.calSystem.setValue(calibSystem)
      this.data.calAccel.setValue(calibAccelerometer)
      this.data.calGyro.setValue(calibGyrosensor)
      this.data.calMag.setValue(calibMagnetometer)
      this.data.latitude.setValue(latitude)
      this.data.longitude.setValue(longitude)
      this.data.satellites.setValue(satellites)
      this.data.hdop.setValue(hdop)
      this.data.gpsAltitude.setValue(gpsAltitude)
      this.data.gpsCourse.setValue(gpsCourse)
      this.data.longitudeError.setValue(longitudeError)
      this.data.latitudeError.setValue(latitudeError)
      this.data.rudderLoad.setValue(rudderLoad)
      this.data.rudderTemp.setValue(rudderTemp)
      this.data.rudderVolt.setValue(rudderVolt)
      this.data.elevatorLoad.setValue(elevatorLoad)
      this.data.elevatorTemp.setValue(elevatorTemp)
      this.data.elevatorVolt.setValue(elevatorVolt)
      this.data.temperature.setValue(temperature)
      this.data.airPressure.setValue(airPressure)
      this.data.humidity.setValue(humidity)
      this.data.freq.increment()
      for (let i = 0; i < GraphTab.tabs.length; i++) {
        GraphTab.tabs[i].emit('update', timeNow)
      }
      this.logger.emit('data')
      this.graphicsManager.emit('update')
    } else if (frame.type === C.FRAME_TYPE.AT_COMMAND_RESPONSE) {
      // テストパケットの受信
      console.log('Node identifier:', frame)
    }
  }
}
