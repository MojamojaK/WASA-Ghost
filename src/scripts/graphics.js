const path = require('path')
const EventEmitter = require('events')

module.exports.Graphics = class Graphics extends EventEmitter {
  constructor (configurator, iconNode, statusNode, toggleNode, data) {
    super()
    this.configurator = configurator
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.data = data
    let graphics = this
    this.toggleNode.on('click', function () { graphics.toggleGraphics() })
    this.on('update', function () { graphics.updateGraphics() })
    this.setupStatus()
  }

  setupStatus () {
    if (this.configurator.graphicsEnabled) {
      this.statusNode.html('Graphics Running')
      this.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'graphics-start.png'))
    } else {
      this.statusNode.html('Graphics Paused')
      this.iconNode.attr('src', path.join(path.dirname(__dirname), 'static', 'graphics-stop.png'))
    }
    this.emit('update')
  }

  toggleGraphics () {
    this.configurator.graphicsEnabled = !this.configurator.graphicsEnabled
    this.configurator.emit('write')
    this.setupStatus()
  }

  updateGraphics () {
    if (this.configurator.graphicsEnabled) {
      let graphics = this
      Object.keys(this.data).map(function (key, index) {
        graphics.data[key].emit('update')
      })
    } else {
      this.data.clock.emit('update')
    }
  }
}
