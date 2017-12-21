const EventEmitter = require('events')

module.exports.Orientation = class Orientation extends EventEmitter {
  constructor (orientationNode) {
    super()
    this.orientationNode = orientationNode
    this.value = 0
    let tmpOrientation = this
    this.on('update', function () { tmpOrientation.setOrientation() })
  }

  getValue () {
    return this.value
  }

  setValue (val) {
    this.value = val
  }

  setRandom () {
    this.value = parseFloat((Math.random() * 360).toFixed(1))
  }

  setOrientation () {
    let tmpOrientation = this
    function needleStep (now) { tmpOrientation.orientationNode.css({'-webkit-transform': 'rotate(' + now + 'deg)'}) }
    this.orientationNode.animate({degree: this.value}, {duration: 30, step: needleStep})
  }
}
