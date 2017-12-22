const $ = require('jquery')
const EventEmitter = require('events')

module.exports.MeterInfo = class MeterInfo extends EventEmitter {
  constructor (arrowNode, valueNode) {
    super()
    this.arrowNode = arrowNode
    this.valueNode = valueNode
    this.value = 0
    this.staticValue = 0
    this.parent = undefined
    let tmpMeterInfo = this
    this.on('update', function () { tmpMeterInfo.setArrow(false) })
  }

  getValue () {
    return this.value
  }

  setValue (val) {
    this.value = parseFloat(val)
  }

  setRandom () {
    this.setValue((Math.random() * 10).toFixed(1))
  }

  setArrow (resize) {
    // if (saved_configs.graphics_enabled)
    this.staticValue = this.value
    this.valueNode.html((this.staticValue * 1.0).toFixed(2))
    let fraction = this.staticValue / this.parent.numberNodeCount
    let y = ((this.parent.bottom + this.parent.height * fraction - this.arrowNode.outerHeight() / 2)) + 'px'
    let x
    if (fraction < 0.5) {
      x = (Math.sqrt(28.8 * fraction) + 5.5) + '%'
    } else {
      x = '10%'
    }
    if (resize) {
      if (this.parent.meterIsRight) this.arrowNode.css({bottom: y, right: x})
      else this.arrowNode.css({bottom: y, left: x})
    } else {
      if (this.parent.meterIsRight) this.arrowNode.animate({bottom: y, right: x}, 30)
      else this.arrowNode.animate({bottom: y, left: x}, 30)
    }
  }
}

module.exports.Meter = class Meter extends EventEmitter {
  constructor (windowNode, meterName, meterIsRight, meterWrapperNode, meterNode, meterInfoArray, meterColorArray) {
    super()
    this.windowNode = windowNode
    this.meterName = meterName
    this.meterIsRight = meterIsRight
    this.meterWrapperNode = meterWrapperNode
    this.meterNode = meterNode
    this.meterInfoArray = meterInfoArray
    this.meterInfoCount = this.meterInfoArray.length
    for (let i = 0; i < this.meterInfoCount; i++) {
      this.meterInfoArray[i].parent = this
    }
    this.meterColorArray = meterColorArray
    this.numberNodeArray = []
    this.numberNodeCount = this.meterColorArray.length
    this.height = 0
    this.unit = 0
    this.bottom = 0
    this.draw()
    let tmpMeter = this
    this.windowNode.on('resize', function () { tmpMeter.resize() })
  }

  updateSize () {
    this.height = this.meterNode.height()
    this.unit = this.height / this.numberNodeCount
    this.bottom = this.windowNode.height() - this.meterNode.offset().top - this.height
  }

  drawLines () {
    let unit = parseInt((100 / this.numberNodeCount).toFixed(2))
    let backgroundString = 'linear-gradient(to bottom, white 0%, white 1%, '
    for (let i = 0; i < this.numberNodeCount; i++) {
      backgroundString += this.meterColorArray[i]
      backgroundString += ' '
      backgroundString += i * unit + ((i === 0) ? 1 : 0)
      backgroundString += '%, '
      backgroundString += this.meterColorArray[i]
      backgroundString += ' '
      backgroundString += i * unit + (unit - 1)
      backgroundString += '%, white '
      backgroundString += i * unit + (unit - 1)
      backgroundString += '%, white '
      backgroundString += (i + 1) * unit
      backgroundString += '%'
      if (i < this.numberNodeCount - 1) backgroundString += ', '
    }
    backgroundString += ')'
    this.meterNode.css({'background': backgroundString})
  }

  drawNumbers () {
    for (let i = 0; i <= this.numberNodeCount; i++) {
      let numberNodeString = "<div id='"
      numberNodeString += this.meterName
      numberNodeString += 'Num'
      numberNodeString += i.toString()
      numberNodeString += "' class='meter-number' >"
      numberNodeString += i.toString()
      numberNodeString += '</div>'
      let numberNode = $(numberNodeString)
      this.meterWrapperNode.append(numberNode)
      this.numberNodeArray[i] = numberNode
      if (this.meterIsRight) numberNode.css({'right': '7%', 'text-align': 'right'})
      else numberNode.css({'left': '7%'})
    }
  }

  static meterOffset (x) {
    return Math.sqrt(2.4 * x) + 3.5 + '%'
  }

  positionNumbers () {
    for (let i = 0; i <= this.numberNodeCount; i++) {
      let numberNode = this.numberNodeArray[i]
      numberNode.css({'bottom': ((this.bottom + this.unit * i) * 0.97).toFixed(3) + 'px'})
      if (i < (this.numberNodeCount / 2)) {
        if (this.meterIsRight) numberNode.css({'right': this.constructor.meterOffset(i)})
        else numberNode.css({'left': this.constructor.meterOffset(i)})
      }
    }
  }

  moveArrows (resize) {
    for (let i = 0; i < this.meterInfoCount; i++) {
      this.meterInfoArray[i].setArrow(resize)
    }
  }

  draw () {
    this.updateSize()
    this.drawNumbers()
    this.positionNumbers()
    this.drawLines()
    this.moveArrows(true)
  }

  resize () {
    this.updateSize()
    this.positionNumbers()
    this.moveArrows(true)
  }
}
