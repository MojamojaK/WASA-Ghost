const {Chart} = require('chart.js')
const EventEmitter = require('events')
const path = require('path')
const os = require('os')
const fs = require('fs')
const $ = require('jquery')
const settings = require('electron-settings')

class EmptyTab extends EventEmitter {
  constructor (name) {
    super()
    this.name = name
    this.content = ''
    let emptyTab = this
    this.on('click', function () { emptyTab.displayContent() })
    this.on('unclick', function () { emptyTab.hideContent() })
  }

  displayContent () {
    if (this.picker) {
      this.picker.display(this)
      this.updateContent()
    }
  }

  getContent () {
    return this.content
  }

  setContent (content) {
    this.content = content
  }

  updateContent () {}

  hideContent () {}
}

class SCWTab extends EmptyTab {
  constructor (name) {
    super(name)
    this.setContent($('<webview id=\'scw\' class=\'tool-viewer-inner\' src=\'https://supercweather.com\'></webview>'))
  }
}

class GraphTab extends EmptyTab {
  constructor (name, dataObjects) {
    super(name)
    this.dataObjects = dataObjects
    this.chartInfos = {}
    this.content = $('<div></div>')
    this.content.attr('class', 'vert-wrapper tool-viewer-inner')
    this.content.css({width: '100%'})
    this.graphCount = Object.keys(dataObjects).length
    let graphTab = this
    Object.keys(dataObjects).forEach(function (key, index) {
      graphTab.prepareConfig(key)
    })
    this.createChart()
    this.on('update', function (time) { graphTab.updateTab(time) })
    this.on('resize', function () { graphTab.displayContent() })
    this.constructor.tabs.push(this)
  }

  prepareConfig (name) {
    let graphTab = this
    let objects = this.dataObjects[name]
    this.chartInfos[name] = {}
    let chartInfo = this.chartInfos[name]
    chartInfo.chartNode = $('<canvas></canvas>')
    chartInfo.chartNode.attr('id', name + '-chart')
    chartInfo.chartNode.attr('class', 'graph-outline')
    let chartContainer = $('<div class=\'chart-container\'></div>')
    chartContainer.css('height', (100 / graphTab.graphCount).toFixed(1) + '%')
    chartInfo.chartNode.appendTo(chartContainer)
    chartContainer.appendTo(this.content)
    chartInfo.option = {
      maintainAspectRatio: false,
      title: {
        display: true,
        text: name,
        fontColor: 'white'
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      legend: {
        labels: {
          fontColor: 'white'
        }
      },
      animation: {
        duration: 0
      },
      scales: {
        xAxes: [{
          display: true,
          type: 'time',
          distribution: 'linear',
          bounds: 'ticks',
          scaleLabel: {
            display: true,
            labelString: 'Time',
            fontColor: 'white'
          },
          time: {
            unit: 'second',
            parser: 'x',
            tooltipFormat: 'll HH:mm:ss',
            displayFormats: {
              second: 'HH:mm:ss'
            }
          },
          gridLines: {
            display: false,
            color: 'rgba(255, 255, 255, 1)'
          },
          ticks: {
            fontColor: 'white'
          }
        }],
        yAxes: [{
          display: true,
          gridLines: {
            color: 'rgba(255, 255, 255, 1)'
          },
          ticks: {
            fontColor: 'white'
          },
          position: 'left',
          id: 'y-axis-1'
        }, {
          display: false,
          gridLines: {
            color: 'rgba(255, 0, 0, 1)'
          },
          ticks: {
            fontColor: 'white'
          },
          position: 'right',
          id: 'y-axis-2'
        }]
      }
    }
    chartInfo.timeLabels = []
    chartInfo.data = {
      labels: chartInfo.timeLabels,
      datasets: []
    }
    chartInfo.colors = {}
    chartInfo.rawData = {}
    chartInfo.objects = {}
    Object.keys(objects).forEach(function (key, index) {
      let color = graphTab.stringToColour(key)
      chartInfo.colors[key] = color
      chartInfo.rawData[key] = [{x: 0, y: 0}]
      chartInfo.data.datasets.push({
        label: key,
        backgroundColor: color,
        borderColor: color,
        data: chartInfo.rawData[key],
        fill: false,
        yAxisID: 'y-axis-' + objects[key].axis
      })
      if (objects[key].axis === 2) { // 右側y軸を必要に応じて設定
        chartInfo.option.scales.yAxes[0].gridLines.color = 'rgba(0, 0, 255, 1)'
        chartInfo.option.scales.yAxes[1].display = true
      }
      if (objects[key].obj.chartInfo === undefined) {
        chartInfo.objects[key] = objects[key].obj
      }
    })
    this.chartInfos[name] = chartInfo
    this.initiated = false
  }

  stringToColour (str) {
    let newColour = this.constructor.colorDictionary[str]
    if (newColour !== undefined) return newColour
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    let colour = 'rgba('
    for (let i = 0; i < 3; i++) {
      let value = (hash >> (i * 8)) & 0xFF
      colour += value.toString() + ','
    }
    colour += '1)'
    return colour
  }

  createChart () {
    let graphTab = this
    Object.keys(this.chartInfos).forEach(function (key, index) {
      let chartInfo = graphTab.chartInfos[key]
      if (chartInfo.chart === undefined) {
        chartInfo.chart = new Chart(chartInfo.chartNode, {
          type: 'line',
          data: chartInfo.data,
          options: chartInfo.option
        }).stop()
      } else {
        chartInfo.chart.update()
      }
    })
  }

  updateTab (time) {
    let graphTab = this
    Object.keys(this.chartInfos).forEach(function (key, index) {
      let chartInfo = graphTab.chartInfos[key]
      if (chartInfo.chart !== undefined) {
        chartInfo.timeLabels.push(time)
        while (chartInfo.timeLabels.length > 200) {
          chartInfo.timeLabels.shift()
        }
        let timeLabelLength = chartInfo.timeLabels.length
        Object.keys(chartInfo.rawData).forEach(function (key, index) {
          let rawDataArray = chartInfo.rawData[key]
          rawDataArray.push({x: time, y: chartInfo.objects[key].getValue()})
          while (rawDataArray.length > timeLabelLength) {
            rawDataArray.shift()
          }
        })
        if (graphTab.picker.currentTab === graphTab) {
          chartInfo.chart.update()
        }
      }
      if (!graphTab.initiated) {
        chartInfo.timeLabels.shift()
        Object.keys(chartInfo.rawData).forEach(function (key, index) {
          chartInfo.rawData[key].shift()
        })
        graphTab.initiated = true
      }
    })
  }

  updateContent () {
    let graphTab = this
    Object.keys(this.chartInfos).forEach(function (key, index) {
      let chartInfo = graphTab.chartInfos[key]
      if (chartInfo.chart !== undefined) {
        chartInfo.chart.render()
      }
    })
  }

  hideContent () {
    let graphTab = this
    Object.keys(this.chartInfos).forEach(function (key, index) {
      let chartInfo = graphTab.chartInfos[key]
      if (chartInfo.chart !== undefined) {
        chartInfo.chart.stop()
      }
    })
  }
}

GraphTab.colorDictionary = {
  'Air': '#1E90FF',
  'Ground': '#FA8072',
  'Yaw': '#7FFF00',
  'Pitch': '#B22222',
  'Roll': '#8A2BE2',
  'Cadence': '#0000FF',
  'Altitude': '#FF0000'
}
GraphTab.tabs = []

class TunnelTab extends EmptyTab {
  constructor (name, data1, data2) {
    super(name)
    this.data1 = data1
    this.data2 = data2
    let tunnelTab = this
    this.enabled = false
    this.content = $('<div class=\'tool-viewer-inner\' style=\'overflow-y:auto\'></div>')
    this.descriptionNode1 = $('<div>風洞試験用のタブです。通常は使いません。</div>')
    this.tmpTNode = $('<div>風温(℃) T:<input id=\'tunnelTemp\' step=\'0.1\' type=\'number\' value=\'25\'/>℃</div>')
    this.tmpPNode = $('<div>測定時の大気圧(Pa) P:<input id=\'tunnelPres\' type=\'number\' value=\'101325\'/>Pa</div>')
    this.tmpMNode = $('<div>マノメータの読み(Pa) Δh: <input id=\'tunnelMano\' step=\'0.01\' type=\'number\' value=\'0.01\'/>Pa</div>')
    this.formulaNode = $('<div>風速 U=395.673 × √(Δh × (1 + 0.00366 × T) / P) = <input id=\'tunnelSpeed\'  type=\'number\' disabled/>m/s</div>')
    this.rawData1 = $('<div>機速計1:<input id=\'speedRawData1\' type=\'number\'/ value=\'0\' disabled />回インタラプト/s</div>')
    this.rawData2 = $('<div>機速計2:<input id=\'speedRawData2\' type=\'number\'/ value=\'0\' disabled />回インタラプト/s</div>')

    this.temperatureNode = this.tmpTNode.find('#tunnelTemp')
    this.pressureNode = this.tmpPNode.find('#tunnelPres')
    this.manometerNode = this.tmpMNode.find('#tunnelMano')
    this.speedometerNode = this.formulaNode.find('#tunnelSpeed')
    this.speedData1 = this.rawData1.find('#speedRawData1')
    this.speedData2 = this.rawData2.find('#speedRawData2')

    this.paramK1Node = $('<div>係数k\'1: <input id=\'paramK1\' type=\'number\' disabled /></div>')
    this.paramK2Node = $('<div>係数k\'2: <input id=\'paramK2\' type=\'number\' disabled /></div>')
    this.paramK1 = this.paramK1Node.find('#paramK1')
    this.paramK2 = this.paramK2Node.find('#paramK2')

    this.aveParamK1Node = $('<div>最小二乗法k1: <input id=\'aveParamK1\' type=\'number\' disabled /></div>')
    this.aveParamK2Node = $('<div>最小二乗法k2: <input id=\'aveParamK2\' type=\'number\' disabled /></div>')
    this.aveParamK1 = this.aveParamK1Node.find('#aveParamK1')
    this.aveParamK2 = this.aveParamK2Node.find('#aveParamK2')

    this.plotButton = $('<button>Plot</button>')
    this.plotButton.on('click', function () {
      tunnelTab.plot()
      tunnelTab.updateAverage()
    })
    this.delButton = $('<button>Delete</button>')
    this.delButton.on('click', function () {
      tunnelTab.remove()
      tunnelTab.updateAverage()
    })
    this.clearButton = $('<button>Clear</button>')
    this.clearButton.on('click', function () {
      tunnelTab.clear()
      tunnelTab.updateAverage()
    })
    this.exportButton = $('<button>Export</button>')
    this.exportButton.on('click', function () {
      tunnelTab.updateAverage()
      tunnelTab.exportCSV()
    })

    this.tableWrapper = $('<div></div>')
    this.dataTableNode = $('<table id=\'tunnelTable\'></table>')
    this.tableWrapper.append(this.dataTableNode)
    this.dataList = ['Time', 'dH', 'U', 'i1', 'i2', 'k1', 'k2', 'T', 'P']
    this.dataLength = this.dataList.length
    this.dataTable = {
      Time: Date.now,
      T: tunnelTab.temperatureNode,
      P: tunnelTab.pressureNode,
      dH: tunnelTab.manometerNode,
      U: tunnelTab.speedometerNode,
      i1: tunnelTab.speedData1,
      i2: tunnelTab.speedData2,
      k1: tunnelTab.paramK1,
      k2: tunnelTab.paramK2
    }
    this.createTable()
    this.content.append(this.descriptionNode1)
    this.content.append('<br/>')
    this.content.append(this.tmpTNode)
    this.content.append(this.tmpPNode)
    this.content.append(this.tmpMNode)
    this.content.append(this.formulaNode)
    this.content.append(this.rawData1)
    this.content.append(this.rawData2)
    this.content.append(this.paramK1Node)
    this.content.append(this.paramK2Node)
    this.content.append(this.aveParamK1Node)
    this.content.append(this.aveParamK2Node)
    this.content.append(this.plotButton)
    this.content.append(this.delButton)
    this.content.append(this.clearButton)
    this.content.append(this.exportButton)
    this.content.append(this.tableWrapper)
    this.updateCalculation()
    this.setContent(this.content)
    this.data1.on('update', function () {
      tunnelTab.speedData1.val(tunnelTab.data1.getRawValue())
      tunnelTab.updateCalculation()
    })
    this.data2.on('update', function () {
      tunnelTab.speedData2.val(tunnelTab.data2.getRawValue())
      tunnelTab.updateCalculation()
    })
    this.temperatureNode.on('change keydown paste input', function () {
      tunnelTab.updateCalculation()
    })
    this.pressureNode.on('change keydown paste input', function () {
      tunnelTab.updateCalculation()
    })
    this.manometerNode.on('change keydown paste input', function () {
      tunnelTab.updateCalculation()
    })
    this.speedometerNode.on('change input', function () {
      tunnelTab.updateCalculation()
    })
  }

  updateCalculation () {
    let temperature = this.temperatureNode.val()
    let pressure = this.pressureNode.val()
    let dH = this.manometerNode.val()
    let speed = 0
    if (pressure === 0) {
      this.speedometerNode.val(speed)
    } else {
      speed = 395.673 * Math.sqrt((dH - 16.7) * (1 + 0.00366 * temperature) / pressure)
      this.speedometerNode.val(speed)
    }
    let i1 = this.data1.getRawValue()
    let k1 = 0
    if (i1 !== 0) k1 = speed / i1
    let i2 = this.data2.getRawValue()
    let k2 = 0
    if (i2 !== 0) k2 = speed / i2
    this.paramK1.val(k1)
    this.paramK2.val(k2)
  }

  createTable () {
    let dataTableTopRow = $('<tr></tr>')
    for (let i = 0; i < this.dataLength; i++) {
      dataTableTopRow.append($('<th>' + this.dataList[i] + '</th>'))
    }
    this.dataTableNode.append(dataTableTopRow)
  }

  plot () {
    let plotRow = $('<tr></tr>')
    plotRow.append($('<th>' + new Date().toLocaleTimeString() + '</th>'))
    for (let i = 1; i < this.dataLength; i++) {
      let value = parseFloat(this.dataTable[this.dataList[i]].val())
      plotRow.append($('<th>' + value + '</th>'))
    }
    this.dataTableNode.append(plotRow)
  }

  remove () {
    if (this.dataTableNode.find('tr').length > 1) {
      this.dataTableNode.find('tr').last().remove()
    }
  }

  clear () {
    this.dataTableNode.empty()
    this.createTable()
  }

  exportCSV () {
    let tmpTunnel = this
    let exportDir = settings.get('log.dirName', path.join(os.homedir(), 'documents', 'GhostLogs'))
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir)
    }
    let fileNumber = 1
    let fileSafe = false
    let fileName = 'tunnel1.csv'
    while (!fileSafe) {
      fileSafe = true
      fileName = 'tunnel' + fileNumber + '.csv'
      fs.readdirSync(exportDir).forEach(function (file) {
        if (path.basename(file).toString() === fileName) {
          fileNumber += 1
          fileSafe = false
        }
      })
    }
    let exportFile = path.join(exportDir, fileName)
    let writeStr = 'TunnelLog,,Average,'
    writeStr += this.aveParamK1.val() + ','
    writeStr += this.aveParamK2.val() + '\n'
    this.dataTableNode.children().each(function (i, obj1) {
      $(obj1).children().each(function (j, obj2) {
        writeStr += $(obj2).html()
        if (j === tmpTunnel.dataLength - 1) writeStr += '\n'
        else writeStr += ','
      })
    })
    fs.writeFile(exportFile, writeStr, function (err) {
      if (err) throw err
      console.log('tunnel data saved')
    })
  }

  updateAverage () {
    let uIndex = this.dataList.indexOf('U')
    let i1index = this.dataList.indexOf('i1')
    let i2index = this.dataList.indexOf('i2')
    let uList = []
    let i1list = []
    let i2list = []
    this.dataTableNode.children().each(function (i, obj) {
      if (i > 0) {
        uList.push(parseFloat($($(obj).children()[uIndex]).html()))
        i1list.push(parseInt($($(obj).children()[i1index]).html()))
        i2list.push(parseInt($($(obj).children()[i2index]).html()))
      }
    })
    let aveParam1 = this.lsm(i1list, uList).a
    let aveParam2 = this.lsm(i2list, uList).a
    this.aveParamK1.val(aveParam1)
    this.aveParamK2.val(aveParam2)
  }

  // 最小二乗法を求めてくれるやつ
  lsm (xList, yList) {
    let n = xList.length
    let sigmaX = 0
    let sigmaY = 0
    let sigmaXY = 0
    let sigmaXX = 0
    for (let i = 0; i < n; i++) {
      sigmaX += xList[i]
      sigmaY += yList[i]
      sigmaXY += xList[i] * yList[i]
      sigmaXX += xList[i] * xList[i]
    }
    let a = 0
    let b = 0
    let divb = (n * sigmaXX - sigmaX * sigmaX)
    if (divb !== 0) {
      a = (n * sigmaXY - sigmaX * sigmaY) / divb
      b = (sigmaXX * sigmaY - sigmaXY * sigmaX) / divb
    }
    return {a: a, b: b}
  }
}

module.exports.EmptyTab = EmptyTab
module.exports.SCWTab = SCWTab
module.exports.GraphTab = GraphTab
module.exports.TunnelTab = TunnelTab
