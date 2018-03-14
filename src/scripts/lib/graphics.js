const path = require('path')
const EventEmitter = require('events')
const settings = require('electron-settings')

module.exports.GraphicsManager = class Graphics extends EventEmitter {
  constructor (graphicArray, iconNode, statusNode, toggleNode) {
    super()
    this.graphicArray = graphicArray
    this.iconNode = iconNode
    this.statusNode = statusNode
    this.toggleNode = toggleNode
    this.graphicsEnabled = settings.get('graphics.enabled', true)
    let tmpGraphics = this
    this.toggleNode.on('click', function () { tmpGraphics.toggleGraphics() })
    this.on('update', function () { tmpGraphics.updateGraphics() })
    this.setupStatus()
  }

  setupStatus () {
    if (this.graphicsEnabled) {
      this.statusNode.html('Graphics Running')
      this.iconNode.attr('src', path.join(path.dirname(path.dirname(__dirname)), 'static', 'graphics-start.png'))
      this.emit('update')
    } else {
      this.statusNode.html('Graphics Paused')
      this.iconNode.attr('src', path.join(path.dirname(path.dirname(__dirname)), 'static', 'graphics-stop.png'))
    }
  }

  toggleGraphics () {
    this.graphicsEnabled = !this.graphicsEnabled
    settings.set('graphics.enabled', this.graphicsEnabled)
    this.setupStatus()
  }

  updateGraphics () {
    if (this.graphicsEnabled) {
      let size = this.graphicArray.length
      for (let i = 0; i < size; i++) {
        this.graphicArray[i].emit('update')
      }
    }
  }
}
