const EventEmitter = require('events')

module.exports.Value = class Value extends EventEmitter {
  constructor (valueNode, initial) {
    super()
    this.valueNode = valueNode
    this.value = initial
    let obj = this
    this.on('update', function () { obj.update() })
  }

  setValue (val) {
    this.value = val
  }

  getValue () {
    return this.value
  }

  setRandom () {
    this.setValue((Math.random() * 10).toFixed(1))
  }

  update () {
    this.valueNode.html(this.value)
  }
}
