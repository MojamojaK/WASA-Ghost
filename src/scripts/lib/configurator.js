const path = require('path')
const os = require('os')
const fs = require('fs')
const EventEmitter = require('events')

module.exports.Configurator = class Configurator extends EventEmitter {
  static getDataPath () {
    let tmpPath
    if (process.platform === 'darwin') {
      tmpPath = path.join(os.homedir(), 'Library', 'Application Support', 'ghost')
    } else if (process.platform === 'win32') {
      tmpPath = path.join(os.homedir(), 'AppData', 'Roaming', 'ghost')
    } else {
      tmpPath = path.join(os.homedir(), '.ghost')
    }
    return tmpPath
  }

  constructor (menu) {
    super()
    this.menu = menu
    this.mainDirectory = this.constructor.getDataPath()
    this.configFile = path.join(this.mainDirectory, 'config.json')
    this.logDirectory = path.join(os.homedir(), 'documents', 'GhostLogs')
    this.graphicsEnabled = true
    this.generatorEnabled = false
    this.readConfig()
    this.writeConfig()
    let tmpConfigurator = this
    this.on('write', function () { tmpConfigurator.writeConfig() })
  }

  readConfig () {
    let tmpConfig = {}
    if (fs.existsSync(this.configFile)) {
      try {
        tmpConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
      } catch (e) {}
    }
    for (let i = 0; i < this.constructor.keys.length; i++) {
      if (tmpConfig[this.constructor.keys[i]] !== undefined) {
        this[this.constructor.keys[i]] = tmpConfig[this.constructor.keys[i]]
      }
    }
    if (this.mainDirectory !== this.mainDirectory) {
      this.mainDirectory = this.mainDirectory
    }
  }

  writeConfig () {
    let tmpConfig = {}
    for (let i = 0; i < this.constructor.keys.length; i++) {
      tmpConfig[this.constructor.keys[i]] = this[this.constructor.keys[i]]
    }
    fs.writeFile(this.configFile, JSON.stringify(tmpConfig, null, '\t'), function (err) {
      if (err) console.log(err)
    })
  }
}

module.exports.Configurator.keys = ['mainDirectory', 'logDirectory', 'graphicsEnabled', 'generatorEnabled']
