const EventEmitter = require('events')

class Value extends EventEmitter {
  constructor (initial = 0, serialMultiplier = 1, inputOffset = 0, inputSize = 1, outputFixed = 1) {
    super()
    this.value = initial
    this.serialMultiplier = serialMultiplier
    this.inputOffset = inputOffset
    this.inputSize = inputSize
    this.outputFixed = outputFixed
    this.lastValue = initial
    this.dupe = false
  }

  setValue (val) {
    this.value = val
    this.dupe = this.value === this.lastValue
    this.lastValue = this.value
    this.emit('update')
    return true
  }

  getValue () {
    return parseFloat((this.value * this.serialMultiplier).toFixed(this.outputFixed))
  }

  getRawValue () {
    return this.value
  }

  setRandom () {
    this.setValue(parseInt(Math.random() * this.inputSize + this.inputOffset))
  }

  isDupe () {
    return this.dupe
  }
}

class Time extends Value {
  constructor () {
    super(new Date(), 1, 0, 1, 0)
    this.dateString = this.value.toLocaleDateString()
    this.timeString = this.value.toLocaleTimeString()
    this.updateTime()
  }

  updateTime () {
    let tmpTime = this
    this.value = new Date()
    this.dateString = this.value.toLocaleDateString()
    this.timeString = this.value.toLocaleTimeString()
    setTimeout(function () {
      tmpTime.updateTime()
      tmpTime.emit('update')
    }, 1000 - this.value % 1000)
  }

  getValue () {
    return Date.now()
  }

  setRandom () {}
}

class Freq extends Value {
  setRandom () {
    this.increment()
  }

  increment () {
    this.value++
    this.emit('update')
    return true
  }

  reset () {
    this.value = 0
  }
}

class AirSpeedValue extends Value {
  constructor (initial = 0, serialMultiplier = 1, inputOffset = 0, inputSize = 1, outputFixed = 1, serialOffset = 0) {
    super(initial, serialMultiplier, inputOffset, inputSize, outputFixed)
    this.serialOffset = serialOffset
  }

  getValue () {
    let airSpeed = parseFloat((this.value * this.serialMultiplier).toFixed(this.outputFixed))
    if (airSpeed < 5) {
      return airSpeed
    } else {
      return airSpeed + this.serialOffset
    }
  }
}

module.exports.Value = Value
module.exports.Time = Time
module.exports.Freq = Freq
module.exports.AirSpeedValue = AirSpeedValue
