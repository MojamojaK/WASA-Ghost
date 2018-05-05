const EventEmitter = require('events')
const synth = window.speechSynthesis // 喋らせるライブラリ (現在Macのみ対応?)

module.exports.Speech = class Speech extends EventEmitter {
  constructor (data, iconNode, statusNode, toggleNode, speechObject) {
    super()
    if (process.platform === 'darwin') {
      this.data = data
      this.iconNode = iconNode
      this.statusNode = statusNode
      this.toggleNode = toggleNode
      this.speechObject = speechObject
      this.enabled = false
      this.interval = null
      let tmpSpeech = this
      this.toggleNode.on('click', function () { tmpSpeech.toggleSpeech() })
    } else {
      console.log('invalid platform for speech')
    }
  }

  toggleSpeech () {
    this.enabled = !this.enabled
    if (this.enabled) {
      this.iconNode.attr('src', 'static/speech-on.png')
      this.statusNode.html('Speech Enabled')
      let tmpSpeech = this
      this.interval = setInterval(function () { tmpSpeech.sayValue() }, 1500)
    } else {
      clearInterval(this.interval)
      this.iconNode.attr('src', 'static/speech-off.png')
      this.statusNode.html('Speech Disabled')
    }
  }

  speak (str, delay) {
    if (delay === undefined) synth.speak(new SpeechSynthesisUtterance(str))
    else setTimeout(function () { synth.speak(new SpeechSynthesisUtterance(str)) }, delay)
  }

  sayValue () {
    this.speak(this.data.getValue())
  }
}
