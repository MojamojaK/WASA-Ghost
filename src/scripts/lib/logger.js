const path = require('path')
const fs = require('fs')
const {dialog} = require('electron').remote
const EventEmitter = require('events')

module.exports.Logger = class Logger extends EventEmitter {
  constructor (configurator, iconNode, statusNode, toggleNode, fileNameNode, dirSelectNode, dirNode, data) {
    super()
    this.configurator = configurator
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.fileNameNode = fileNameNode
    this.dirSelectNode = dirSelectNode
    this.dirNode = dirNode
    this.data = data
    this.enabled = false
    this.unlocked = true
    this.toggling = false
    this.fileName = ''
    let logger = this
    this.dirSelectNode.on('click', function () { logger.setLogDir() })
    this.toggleNode.on('click', function () { logger.toggleLog() })
    this.on('open', function () { logger.open() })
    this.on('close', function () { logger.close() })
    this.on('data', function () { logger.logData() })
    this.dirNode.html(this.configurator.logDirectory + '/')
  }

  setLogDir () {
    let logger = this
    dialog.showOpenDialog({
      title: 'Select Log Directory',
      defaultPath: logger.configurator.logDirectory,
      properties: ['openDirectory', 'treatPackageAsDirectory', 'createDirectory', 'promptToCreate']
    }, function (srcFileName) {
      if (srcFileName) {
        let dirPath = srcFileName[0]
        logger.configurator.logDirectory = dirPath
        logger.configurator.emit('write')
        logger.dirNode.html(logger.configurator.logDirectory + '/')
      }
    })
  }

  toggleLog () {
    if (!this.toggling) {
      this.toggling = true
      if (!this.enabled) {
        this.fileName = path.join(this.configurator.logDirectory, this.fileNameNode.val() + '.csv')
        if (path.basename(this.fileName) === '.csv') {
          this.toggling = false
          return
        }
        let logger = this
        fs.access(this.fileName, function (err) {
          if (err) {
            if (!fs.existsSync(logger.configurator.logDirectory)) {
              fs.mkdirSync(logger.configurator.logDirectory)
            }
            if (!fs.existsSync(path.dirname(logger.fileName))) {
              fs.mkdirSync(path.dirname(logger.fileName))
            }
            fs.writeFile(logger.fileName, logger.constructor.logHeader, function (err) {
              if (!err) logger.emit('open')
              else logger.toggling = false
            })
          } else {
            dialog.showMessageBox({
              title: 'File Already Exists',
              type: 'warning',
              buttons: ['Ignore', 'Cancel'],
              message: 'File "' + logger.fileNameNode.val() + '.csv" already exists',
              detail: 'Ignoring will append data to file'
            }, function (res) {
              if (res === 0) logger.emit('open')
              else logger.toggling = false
            })
          }
        })
      } else {
        this.emit('close')
      }
    }
  }

  open () {
    console.log('openning logger')
    this.toggling = false
    this.enabled = true
    this.statusNode.html('Logging...')
    this.iconNode.attr('src', path.join(path.dirname(path.dirname(__dirname)), 'static', 'log-on.png'))
  }

  close () {
    console.log('closing logger')
    this.toggling = false
    this.enabled = false
    this.statusNode.html('Logging Disabled')
    this.iconNode.attr('src', path.join(path.dirname(path.dirname(__dirname)), 'static', 'log-off.png'))
  }

  logData () {
    if (this.enabled) {
      if (this.unlocked) {
        this.unlocked = false
        let logKeys = this.constructor.logKeys
        let dataCount = logKeys.length - 1
        let writeStr = ''
        for (let i = 0; i < dataCount; i++) {
          writeStr += this.data[logKeys[i]].getValue() + ','
        }
        writeStr += this.data[logKeys[dataCount]].getValue() + '\n'
        let logger = this
        fs.appendFile(this.fileName, writeStr, function () {
          logger.unlocked = true
        })
      } else {
        console.log('hit write lock')
      }
    }
  }
}

module.exports.Logger.logKeys = ['clock', 'cadence', 'altitude', 'airSpeed', 'groundSpeed', 'rudder', 'elevator', 'yaw', 'pitch', 'roll', 'longitude', 'latitude']
module.exports.Logger.logHeader = 'ghostlog\n'
