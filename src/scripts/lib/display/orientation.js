const EventEmitter = require('events')

module.exports.Orientation = class Orientation extends EventEmitter {
  constructor (data, orientationNode) {
    super()
    this.data = data
    this.orientationNode = orientationNode
    this.value = 0
    let tmpOrientation = this
    this.on('update', function () { tmpOrientation.setOrientation() })
  }

  setOrientation () {
    let value = this.data.getValue()
    if (this.data.isDupe()) return
    let tmpOrientation = this
    function needleStep (now) { tmpOrientation.orientationNode.css({'-webkit-transform': 'rotate(' + now + 'deg)'}) }
    this.orientationNode.animate({degree: value}, {duration: 30, step: needleStep})
    this.lastValue = value
  }
}
