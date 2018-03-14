const EventEmitter = require('events')

module.exports.Clock = class Clock extends EventEmitter {
  constructor (dataDate, dateNode, timeNode) {
    super()
    this.dataDate = dataDate
    this.dateNode = dateNode
    this.timeNode = timeNode
    this.lastDate = undefined
    this.timeVal = Date.now()
    let tmpClock = this
    this.dataDate.on('update', function () { tmpClock.displayTime() })
  }

  displayTime () {
    if (this.dataDate.dateString !== this.lastDate) {
      this.dateNode.html(this.dataDate.dateString)
      this.lastDate = this.dataDate.dateString
    }
    this.timeNode.html(this.dataDate.timeString)
  }
}
