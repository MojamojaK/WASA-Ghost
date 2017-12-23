const EventEmitter = require('events')

module.exports.Clock = class Clock extends EventEmitter {
  constructor (dateNode, timeNode, freqNode) {
    super()
    this.dateNode = dateNode
    this.timeNode = timeNode
    this.freqNode = freqNode
    this.timeout = undefined
    let tmpClock = this
    this.on('update', function () { tmpClock.updateFreq() })
    this.displayTime()
    this.freqCount = 0
  }

  getValue () {
    return Date.now()
  }

  setValue () {}

  setRandom () {}

  displayTime () {
    let d = new Date()
    this.dateNode.html(d.toLocaleDateString())
    this.timeNode.html(d.toLocaleTimeString())
    let tmpClock = this
    setTimeout(function () { tmpClock.displayTime() }, 1000 - d % 1000)
    this.freqNode.html(this.freqCount + 'Hz')
    this.freqCount = 0
  }

  updateFreq () {
    clearTimeout(this.timeout)
    this.freqNode.css({backgroundColor: 'green'})
    let tmpFreqNode = this.freqNode
    this.timeout = setTimeout(function () {
      tmpFreqNode.css({backgroundColor: 'black'})
    }, 1000)
    this.freqCount++
  }
}
