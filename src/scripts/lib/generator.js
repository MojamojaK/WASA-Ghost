const EventEmitter = require('events')
const MenuItem = require('electron').remote.MenuItem

module.exports.DataGenerator = class DataGenerator extends EventEmitter {
  constructor (configurator, iconNode, statusNode, toggleNode, graphicsManager, logger, data) {
    super()
    this.configurator = configurator
    this.interval = undefined
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.graphicsManager = graphicsManager
    this.logger = logger
    this.data = data
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
    this.logger.emit('data')
    this.graphicsManager.emit('update')
  }

  toggleStatus () {
    this.configurator.generatorEnabled = !this.configurator.generatorEnabled
    this.configurator.emit('write')
    this.setStatus()
  }

  setupMenu () {
    let generator = this
    this.configurator.menu.subMenuEdit.insert(2, new MenuItem({
      label: 'Toggle Data Generator',
      click () { generator.toggleStatus() },
      type: 'checkbox',
      checked: generator.configurator.generatorEnabled
    }))
  }

  setStatus () {
    if (this.configurator.generatorEnabled) {
      console.log('data generator ON')
      let generator = this
      this.interval = setInterval(function () { generator.randomUpdate() }, 200)
      this.iconNode.attr('src', 'static/debug-on.png')
      this.statusNode.html('Data Generator Enabled')
    } else {
      console.log('data generator OFF')
      clearInterval(this.interval)
      this.iconNode.attr('src', 'static/debug-off.png')
      this.statusNode.html('Data Generator Disabled')
    }
    this.configurator.menu.generatorLabel = this.configurator.generatorEnabled
  }
}
