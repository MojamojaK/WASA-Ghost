const $ = require('jquery')
const EventEmitter = require('events')

module.exports.Secret = class Secret extends EventEmitter {
  constructor (coverNode) {
    super()
    this.coverNode = coverNode
    this.audio = new Audio('./static/secret.mp3')
    this.keyPosition = 0
    let tmpSecret = this
    $(document).on('keydown', function (event) { tmpSecret.handle(event) })
    this.on('display', function () { tmpSecret.display() })
  }

  handle (event) {
    if (event.keyCode === this.constructor.keys[this.keyPosition]) {
      if (++this.keyPosition === this.constructor.keys.length) {
        this.emit('display')
        this.keyPosition = 0
      }
    } else this.keyPosition = 0
  }

  display () {
    this.audio.play()
    this.coverNode.prepend('<img id=\'secret\' src=\'./static/secret.png\' />')
    this.coverNode.show()
    let tmpSecret = this
    setTimeout(function () {
      tmpSecret.coverNode.empty()
      tmpSecret.coverNode.hide()
    }, 2500)
  }
}

module.exports.Secret.keys = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66]
