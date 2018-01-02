const EventEmitter = require('events')

module.exports.Orientation = class Orientation extends EventEmitter {
  constructor (orientationNode, parent) {
    super()
    this.orientationNode = orientationNode
    this.lastValue = undefined
    this.value = 0
    this.parent = parent
    let tmpOrientation = this
    this.on('update', function () { tmpOrientation.setOrientation() })
  }

  getValue () {
    return this.value
  }

  setValue (val) {
    this.value = parseFloat(val)
    if (this.parent !== undefined) {
      this.parent.yaw = this.value
    }
  }

  setRandom () {
    this.setValue((Math.random() * 360).toFixed(1))
  }

  setOrientation () {
    if (this.value === this.lastValue) return
    let tmpOrientation = this
    function needleStep (now) { tmpOrientation.orientationNode.css({'-webkit-transform': 'rotate(' + now + 'deg)'}) }
    this.orientationNode.animate({degree: this.value}, {duration: 30, step: needleStep})
    if (this.parent !== undefined) {
      this.parent.emit('updateHeading')
    }
    this.lastValue = this.value
  }
}
