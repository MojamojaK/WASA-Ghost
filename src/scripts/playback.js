const fs = require('fs')
const path = require('path')
const {dialog} = require('electron').remote
const EventEmitter = require('events')

module.exports.Playback = class Playback extends EventEmitter {
  constructor (iconNode, statusNode, toggleNode, logger, data) {
    super()
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.logger = logger
    this.data = data
    this.enabled = false
    this.input = []
    this.index = 0
    this.currentFrameTime = 0
    this.playbackLength = 0
    this.dataPacket = []
    this.dataLength = this.logger.constructor.logKeys.length
    this.lastTime = 0
    let playback = this
    this.toggleNode.on('click', function () { playback.toggle() })
  }

  toggle () {
    this.enabled = !this.enabled
    let playback = this
    dialog.showOpenDialog({
      title: 'Select Log File',
      properties: ['openFile', 'treatPackageAsDirectory'],
      filters: [{name: 'csv', extensions: ['csv']}]
    }, function (srcFile) {
      if (srcFile) {
        let filePath = srcFile[0]
        fs.access(filePath, function (err) {
          if (err) playback.displayLoadError(path.basename(filePath))
          else {
            fs.readFile(filePath, {encoding: 'utf-8'}, function (err, data) {
              if (err) playback.displayLoadError(path.basename(filePath))
              else {
                playback.input = data.split('\n')
                playback.playbackLength = playback.input.length
                if (playback.input[0] + '\n' === playback.logger.constructor.logHeader) {
                  playback.index = 1
                  playback.dataPacket = playback.input[playback.index].split(',')
                  playback.currentFrameTime = parseInt(playback.dataPacket[playback.logger.constructor.logKeys.indexOf('clock')])
                  playback.displayFrames()
                } else {
                  playback.displayWrongType()
                }
              }
            })
          }
        })
      }
    })
  }

  displayFrames () {
    if (this.dataPacket.length !== this.dataLength) {
      if (this.dataPacket.length !== 1 || this.dataPacket[0] !== '') this.displayDataError(this.index + 1)
      return
    }
    let logKeys = this.logger.constructor.logKeys
    for (let i = 0; i < this.dataLength; i++) {
      this.data[logKeys[i]].setValue(this.dataPacket[i])
      this.data[logKeys[i]].emit('update')
    }
    console.log(this.index)
    if (this.index < this.playbackLength) {
      this.index++
      this.dataPacket = this.input[this.index].split(',')
      let oldFrameTime = this.currentFrameTime
      this.currentFrameTime = parseInt(this.dataPacket[this.logger.constructor.logKeys.indexOf('clock')])
      let playback = this
      setTimeout(function () { playback.displayFrames() }, this.currentFrameTime - oldFrameTime)
    }
  }

  displayLoadError (filename) {
    dialog.showMessageBox({
      title: 'File Invalid',
      type: 'error',
      buttons: ['OK'],
      message: 'File Invalid',
      detail: 'file ' + filename + ' is invalid'
    })
  }

  displayWrongType () {
    dialog.showMessageBox({
      title: 'File Invalid',
      type: 'error',
      buttons: ['OK'],
      message: 'File Invalid',
      detail: 'Invalid ghost log'
    })
  }

  displayDataError (line) {
    dialog.showMessageBox({
      title: 'Data Invalid',
      type: 'error',
      buttons: ['OK'],
      message: 'Data Invalid',
      detail: line + ': Data is invalid'
    })
  }
}
