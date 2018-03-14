const fs = require('fs')
const path = require('path')
const {dialog} = require('electron').remote
const EventEmitter = require('events')

module.exports.Playback = class Playback extends EventEmitter {
  constructor (graphicsManager, data, logger, iconNode, statusNode, toggleNode) {
    super()
    this.graphicsManager = graphicsManager
    this.data = data
    this.logger = logger
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.enabled = false
    this.input = []
    this.index = 0
    this.currentFrameTime = 0
    this.playbackLength = 0
    this.dataPacket = []
    this.dataLength = this.logger.logKeys.length
    this.lastTime = 0
    let playback = this
    this.toggleNode.on('click', function () { playback.toggle() })
  }

  toggle () {
    this.enabled = !this.enabled
    let playback = this
    if (this.enabled) {
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
                  if (playback.input[0] === playback.logger.constructor.logHeader) {
                    playback.index = 1
                    playback.dataPacket = playback.input[playback.index].split(',')
                    playback.currentFrameTime = parseInt(playback.dataPacket[playback.logger.logKeys.indexOf('time')])
                    playback.iconNode.attr('src', 'static/playback-on.png')
                    playback.statusNode.html('Playback Enabled')
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
  }

  displayFrames () {
    if (this.enabled) {
      if (this.dataPacket.length !== this.dataLength) { // ログデータの種類の数が一致しない
        if (this.dataPacket.length !== 1 || this.dataPacket[0] !== '') this.displayDataError(this.index + 1) // エラーの場所を特定
        this.enabled = false
        this.iconNode.attr('src', 'static/playback-off.png')
        this.statusNode.html('Playback Disabled')
        return
      }
      for (let i = 0; i < this.dataLength; i++) {
        let data = this.data[this.logger.logKeys[i]]
        data.setValue(this.dataPacket[i] / data.serialMultiplier)
      }
      this.graphicsManager.emit('update')
      console.log(this.index)
      if (this.index < this.playbackLength) {
        this.index++
        this.dataPacket = this.input[this.index].split(',')
        console.log(this.dataPacket)
        let oldFrameTime = this.currentFrameTime
        this.currentFrameTime = parseInt(this.dataPacket[this.logger.logKeys.indexOf('time')])
        let playback = this
        setTimeout(function () { playback.displayFrames() }, this.currentFrameTime - oldFrameTime)
      }
    } else {
      this.iconNode.attr('src', 'static/playback-off.png')
      this.statusNode.html('Playback Disabled')
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
