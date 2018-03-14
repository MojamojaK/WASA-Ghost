const EventEmitter = require('events')
const MenuItem = require('electron').remote.MenuItem
const settings = require('electron-settings')
const {GraphTab} = require('../toolbar/tabs.js')

module.exports.DataGenerator = class DataGenerator extends EventEmitter {
  constructor (graphicsManager, logger, data, menu, iconNode, statusNode, toggleNode) {
    super()
    this.graphicsManager = graphicsManager
    this.logger = logger
    this.data = data
    this.menu = menu
    this.interval = undefined
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.generatorEnabled = settings.get('generator.enabled')
    let generator = this
    this.toggleNode.on('click', function () { generator.emit('toggle') })
    this.on('toggle', function () { generator.toggleStatus() })
    this.setupMenu()
    this.setStatus()
  }

  randomUpdate () {
    let generator = this
    Object.keys(this.data).map(function (key, index) {
      generator.data[key].setRandom()
    })
    let timeNow = Date.now()
    for (let i = 0; i < GraphTab.tabs.length; i++) {
      GraphTab.tabs[i].emit('update', timeNow)
    }
    this.logger.emit('data')
    this.graphicsManager.emit('update')
  }

  toggleStatus () {
    this.generatorEnabled = !this.generatorEnabled
    settings.set('generator.enabled', this.generatorEnabled)
    this.setStatus()
  }

  setupMenu () {
    let generator = this
    this.menu.subMenuEdit.insert(2, new MenuItem({
      label: 'Toggle Data Generator',
      click () { generator.toggleStatus() },
      type: 'checkbox',
      checked: generator.generatorEnabled
    }))
  }

  setStatus () {
    if (this.generatorEnabled) {
      console.log('data generator ON')
      let tmpGenerator = this
      this.interval = setInterval(function () { tmpGenerator.randomUpdate() }, 200)
      this.iconNode.attr('src', 'static/debug-on.png')
      this.statusNode.html('Data Generator Enabled')
    } else {
      console.log('data generator OFF')
      clearInterval(this.interval)
      this.iconNode.attr('src', 'static/debug-off.png')
      this.statusNode.html('Data Generator Disabled')
    }
    this.menu.generatorLabel = this.generatorEnabled
  }
}
