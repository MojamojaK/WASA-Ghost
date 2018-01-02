const $ = require('jquery')
const EventEmitter = require('events')

module.exports.ToolPicker = class ToolPicker extends EventEmitter {
  constructor (windowNode, pickerNode, viewerNode, tabArray) {
    super()
    this.windowNode = windowNode
    this.pickerNode = pickerNode
    this.viewerNode = viewerNode
    this.tabArray = tabArray
    this.tabCount = 0
    if (tabArray !== undefined && tabArray.length > 0) {
      this.tabCount = tabArray.length
      for (let i = 0; i < this.tabCount; i++) {
        this.initialCreateTab(this.tabArray[i])
      }
      this.tabArray[0].emit('click')
    }
    let toolPicker = this
    this.windowNode.on('resize', function () {
      if (toolPicker.currentTab !== undefined) {
        toolPicker.currentTab.emit('resize')
      }
    })
  }

  initialCreateTab (tabObject) {
    tabObject.picker = this
    let tabWidth = (100 / this.tabCount) + '%'
    let tabNode = $('<div></div>')
    tabNode.attr('id', tabObject.name)
    tabNode.attr('class', 'hori-inner middle-text center-text tab')
    tabNode.html(tabObject.name)
    tabNode.css('width', tabWidth)
    tabNode.appendTo(this.pickerNode)
    tabNode.on('click', function () { tabObject.emit('click') })
    tabObject.node = tabNode
  }

  display (tab) {
    let tabContent = tab.getContent()
    this.viewerNode.html('')
    this.viewerNode.append(tabContent)
    if (this.currentTab !== undefined) {
      this.currentTab.emit('unclick')
      this.currentTab.node.css({'background-color': '#000000'})
    }
    this.currentTab = tab
    this.currentTab.node.css({'background-color': '#0000EE'})
  }
}
