const EventEmitter = require('events')

module.exports.FreqDisplay = class FreqDisplay extends EventEmitter {
  constructor (dataDate, dataFreq, freqNode) {
    super()
    this.dataDate = dataDate
    this.dataFreq = dataFreq
    this.freqNode = freqNode
    this.timeout = undefined
    let tmpClock = this
    this.dataFreq.on('update', function () { tmpClock.updateFreq() })
    this.dataDate.on('update', function () { tmpClock.displayFreq() })
    this.displayFreq()
  }

  updateFreq () {
    clearTimeout(this.timeout)
    this.freqNode.css({backgroundColor: 'green'})
    let tmpFreqNode = this.freqNode
    this.timeout = setTimeout(function () {
      tmpFreqNode.css({backgroundColor: 'black'})
    }, 1000)
  }

  displayFreq () {
    this.freqNode.html(this.dataFreq.getValue() + 'Hz')
    this.dataFreq.reset() // setValue(0) では毎秒更新が行われてしまう (緑になる)
  }
}
