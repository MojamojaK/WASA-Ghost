const path = require('path')
const os = require('os')
const fs = require('fs')
const {dialog} = require('electron').remote
const EventEmitter = require('events')
const settings = require('electron-settings')
const Tone = require('tone')

class Logger extends EventEmitter {
  constructor (data, logKeys, iconNode, statusNode, toggleNode, fileNameNode, dirSelectNode, dirNode) {
    super()
    this.data = data
    this.logKeys = logKeys
    this.iconNode = iconNode // トグルボタンの絵アイコン
    this.statusNode = statusNode // ONかOFFかの文字を表示する
    this.toggleNode = toggleNode // トグルボタン
    this.fileNameNode = fileNameNode // ログを入れるファイル名
    this.dirSelectNode = dirSelectNode // ログを入れるディレクトリを選択するためのボタン
    this.dirNode = dirNode // ログを入れるディレクトリ名
    this.logDirectory = settings.get('log.dirName', path.join(os.homedir(), 'documents', 'GhostLogs'))
    this.enabled = false
    this.unlocked = true
    this.toggling = false
    this.fileName = ''
    let logger = this
    this.dirSelectNode.on('click', function () { logger.setLogDir() })
    this.toggleNode.on('click', function () { logger.toggleLog() })
    this.on('open', function () { logger.open() })
    this.on('close', function () { logger.close() })
    this.on('data', function (time) { logger.logData(time) })
    this.dirNode.html(this.logDirectory + '/')
  }

  setLogDir () {
    let logger = this
    dialog.showOpenDialog({
      title: 'Select Log Directory',
      defaultPath: logger.logDirectory,
      properties: ['openDirectory', 'treatPackageAsDirectory', 'createDirectory', 'promptToCreate']
    }, function (srcFileName) {
      if (srcFileName) {
        let dirPath = srcFileName[0]
        logger.logDirectory = dirPath
        settings.set('log.dirName', logger.logDirectory)
        logger.dirNode.html(logger.logDirectory + '/')
      }
    })
  }

  toggleLog () {
    if (!this.toggling) {
      this.toggling = true
      if (!this.enabled) {
        this.fileName = path.join(this.logDirectory, this.fileNameNode.val() + '.csv')
        if (path.basename(this.fileName) === '.csv') {
          this.toggling = false
          return
        }
        let logger = this
        fs.access(this.fileName, function (err) {
          if (err) { // ファイルが存在しない場合 (もしくはアクセスできない場合)
            if (!fs.existsSync(logger.logDirectory)) { // ディレクトリが存在しない場合
              fs.mkdirSync(logger.logDirectory) // ディレクトリを作成
            }
            if (!fs.existsSync(path.dirname(logger.fileName))) { // ファイルが存在しない場合
              fs.mkdirSync(path.dirname(logger.fileName)) // ファイルを作成
            }
            let initialStr = logger.constructor.logHeader + '\n'
            console.log(initialStr)
            for (let i = 0; i < logger.logKeys.length - 1; i++) {
              initialStr += logger.logKeys[i] + ','
            }
            initialStr += logger.logKeys[logger.logKeys.length - 1] + '\n'
            fs.writeFile(logger.fileName, initialStr, function (err) {
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
    let logger = this
    setTimeout(function () {
      console.log('openning logger')
      logger.toggling = false
      logger.enabled = true
      logger.statusNode.html('Logging...')
      logger.iconNode.attr('src', path.join(path.dirname(path.dirname(__dirname)), 'static', 'log-on.png'))
      logger.emit('data')
    }, 1500)
    let synth = new Tone.Synth().toMaster()
    synth.triggerAttackRelease('C4', '8n')
    setTimeout(function () {
      synth.triggerAttackRelease('C4', '8n')
      setTimeout(function () {
        synth.triggerAttackRelease('C4', '8n')
        setTimeout(function () {
          synth.triggerAttackRelease('C5', '8n')
        }, 500)
      }, 500)
    }, 500)
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
        let dataCountm1 = this.logKeys.length - 1
        let writeStr = ''
        for (let i = 0; i < dataCountm1; i++) {
          writeStr += this.data[this.logKeys[i]].getValue() + ','
        }
        writeStr += this.data[this.logKeys[dataCountm1]].getValue() + '\n'
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

Logger.logHeader = 'ghostlog'

module.exports.Logger = Logger
