const EventEmitter = require('events')

module.exports.Clock = class Clock extends EventEmitter {
  constructor (dateNode, timeNode, freqNode) {
    super()
    this.dateNode = dateNode
    this.timeNode = timeNode
    this.freqNode = freqNode
    this.timeout = undefined
    this.freqCount = 0
    this.lastFreq = undefined
    this.lastDate = undefined
    this.timeVal = Date.now()
    let tmpClock = this
    this.on('update', function () { tmpClock.updateFreq() })
    this.displayTime()
  }

  getValue () {
    return this.timeVal
  }

  setValue (val) {
    this.timeVal = val
  }

  setRandom () {
    this.timeVal = Date.now()
  }

  displayTime () {
    let d = new Date()
    let localeDateString = d.toLocaleDateString()
    if (localeDateString !== this.lastDate) {
      this.dateNode.html(localeDateString)
      this.lastDate = localeDateString
    }
    this.timeNode.html(d.toLocaleTimeString())
    let tmpClock = this
    setTimeout(function () { tmpClock.displayTime() }, 1000 - d % 1000)
    if (this.freqCount !== this.lastFreq) {
      this.freqNode.html(this.freqCount + 'Hz')
      this.lastFreq = this.freqCount
    }
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
