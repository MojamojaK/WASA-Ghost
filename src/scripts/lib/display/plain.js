const EventEmitter = require('events')

module.exports.Plain = class Value extends EventEmitter {
  constructor (data, valueNode) {
    super()
    this.data = data
    this.valueNode = valueNode
    let obj = this
    this.on('update', function () { obj.update() })
  }

  update () {
    this.valueNode.html(this.data.getValue())
  }
}
