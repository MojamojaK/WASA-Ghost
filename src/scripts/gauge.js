const EventEmitter = require('events')

module.exports.GaugeOptions = class GaugeOptions {
  constructor (
    isCadence,
    scale,
    arcStart,
    arcEnd,
    isAntiClockwise,
    tickMin,
    tickMax,
    tickDrawOffset,
    tickLargeOffset,
    tickLargeSize,
    tickOffset,
    tickMultiplier,
    textOffset,
    textMultiplier,
    valueMultiplier,
    fixed,
    widthMultiplier,
    heightMultiplier
  ) {
    this.isCadence = isCadence
    this.scale = scale
    this.arcStart = arcStart
    this.arcEnd = arcEnd
    this.isAntiClockwise = isAntiClockwise
    this.tickMin = tickMin
    this.tickMax = tickMax
    this.tickDrawOffset = tickDrawOffset
    this.tickLargeOffset = tickLargeOffset
    this.tickLargeSize = tickLargeSize
    this.tickOffset = tickOffset
    this.tickMultiplier = tickMultiplier
    this.textOffset = textOffset
    this.textMultiplier = textMultiplier
    this.valueMultiplier = valueMultiplier
    this.fixed = fixed
    this.widthMultiplier = widthMultiplier
    this.heightMultiplier = heightMultiplier
  }
}

module.exports.Gauge = class Gauge extends EventEmitter {
  constructor (windowNode, valueNode, needleNode, canvasNode, gaugeOptions) {
    super()
    this.windowNode = windowNode
    this.valueNode = valueNode
    this.needleNode = needleNode
    this.canvasNode = canvasNode[0]
    this.gaugeOptions = gaugeOptions
    this.canvasContext = this.canvasNode.getContext('2d')
    this.widthMul = []
    this.heightMul = []
    this.radius = 0
    this.radiusMul = []
    this.value = 0
    let tmpGauge = this
    this.windowNode.on('resize', function () { tmpGauge.updateGauge() })
    this.on('update', function () { tmpGauge.updateData() })

    this.updateGauge()
  }

  getValue () {
    if (this.isCadence) {
      return this.value
    } else {
      return this.value / 10
    }
  }

  setValue (val) {
    this.value = val
  }

  setRandom () {
    if (this.gaugeOptions.isCadenece) {
      this.value = (Math.random() * 3000 - 1500).toFixed(1)
    } else {
      this.value = (Math.random() * 200).toFixed(0)
    }
  }

  updateData () {
    let val = this.value * this.gaugeOptions.valueMultiplier
    let deg = val * this.gaugeOptions.tickMultiplier + this.gaugeOptions.tickOffset
    this.valueNode.html(val.toFixed(this.gaugeOptions.fixed))
    let tmpGauge = this
    function needleStep (now) { tmpGauge.needleNode.css({'-webkit-transform': 'rotate(' + now + 'deg)'}) }
    this.needleNode.animate({degree: deg}, {duration: 30, step: needleStep})
  }

  updateGauge () {
    this.updateMetrics()
    this.repositionNeedle()
    this.repositionValue()
    this.drawGauge()
  }

  updateMetrics () {
    this.width = this.canvasNode.scrollWidth
    this.height = this.canvasNode.scrollHeight
    for (let i = 0; i < this.gaugeOptions.widthMultiplier.length; i++) {
      this.widthMul[i] = this.width * this.gaugeOptions.widthMultiplier[i]
    }
    for (let i = 0; i < this.gaugeOptions.widthMultiplier.length; i++) {
      this.heightMul[i] = this.height * this.gaugeOptions.heightMultiplier[i]
    }
    if (this.widthMul[1] < this.heightMul[1]) this.radius = this.widthMul[2]
    else this.radius = this.heightMul[2]
    for (let i = 0; i < this.constructor.radiusMultiplier.length; i++) {
      this.radiusMul[i] = this.radius * this.constructor.radiusMultiplier[i]
    }
  }

  repositionNeedle () {
    this.needleNode.css({
      'height': this.radiusMul[4] + 'px',
      'top': (this.heightMul[0] - this.radiusMul[4]) + 'px'
    })
  }

  repositionValue () {
    if (!this.gaugeOptions.isCadence) {
      this.valueNode.css({
        'width': this.radius * 0.6 + 'px',
        'height': this.radius * 0.18 + 'px',
        'left': (this.widthMul[0] - this.radius * 0.3) + 'px',
        'top': (this.heightMul[0] + this.radius * 0.08) + 'px',
        'font-size': this.radius * 0.2 + 'px'
      })
    }
  }

  drawGauge () {
    let canvas = this.canvasNode
    let context = this.canvasContext
    canvas.width = this.width
    canvas.height = this.height
    context.arc(
      this.widthMul[0],
      this.heightMul[0],
      this.radiusMul[0],
      this.gaugeOptions.arcStart,
      this.gaugeOptions.arcEnd,
      this.gaugeOptions.isAntiClockwise
    )
    context.lineWidth = this.radiusMul[1]
    context.strokeStyle = '#00FFFF'
    context.stroke()
    context.beginPath()
    context.arc(this.widthMul[0], this.heightMul[0], this.radiusMul[2], 0, 2 * Math.PI, false)
    context.fillStyle = '#FFFFFF'
    context.fill()
    context.font = 'italic ' + (this.radiusMul[3]).toFixed(3) + 'px sans-serif'
    context.textBaseline = 'top'
    let rad
    let cosRad, sinRad
    let archX, archY
    let lineWidth
    let text
    let innerX, innerY
    let fromX, fromY
    let toX, toY
    for (let tick = this.gaugeOptions.tickMin; tick <= this.gaugeOptions.tickMax; tick += 10) {
      rad = (tick + this.gaugeOptions.tickDrawOffset) * this.gaugeOptions.scale
      cosRad = Math.cos(rad)
      sinRad = Math.sin(rad)
      if ((tick + this.gaugeOptions.tickLargeOffset) % this.gaugeOptions.tickLargeSize === 0) {
        archX = cosRad * this.radiusMul[5]
        archY = sinRad * this.radiusMul[5]
        lineWidth = this.radiusMul[6]
        text = ((tick + this.gaugeOptions.textOffset) * this.gaugeOptions.textMultiplier).toString()
        innerX = this.widthMul[0] - cosRad * this.radiusMul[7] - this.radiusMul[8]
        innerY = this.heightMul[0] - sinRad * this.radiusMul[7] - this.radiusMul[9]
        if (this.gaugeOptions.isCadence) {
          if (tick > 190) innerX -= this.radiusMul[11]
          if (tick < 100) innerX += this.radiusMul[9]
        } else {
          if (tick === 230) innerX -= this.radiusMul[6]
          else if (tick === 90) innerX += this.radiusMul[12]
        }
        context.fillText(text, innerX, innerY)
        context.stroke()
      } else {
        archX = cosRad * this.radiusMul[10]
        archY = sinRad * this.radiusMul[10]
        lineWidth = this.radiusMul[2]
      }
      innerX = cosRad * this.radiusMul[0]
      innerY = sinRad * this.radiusMul[0]
      fromX = this.widthMul[0] - archX
      fromY = this.heightMul[0] - archY
      toX = this.widthMul[0] - innerX
      toY = this.heightMul[0] - innerY
      context.beginPath()
      context.moveTo(fromX, fromY)
      context.lineTo(toX, toY)
      context.lineWidth = lineWidth
      context.strokeStyle = '#FFFFFF'
      context.stroke()
    }
  }
}

module.exports.Gauge.radiusMultiplier = [0.9, 0.02, 0.01, 0.15, 0.75, 0.775,
  0.05, 0.65, 0.105, 0.07, 0.85, 0.075, 0.06]
