const {Chart} = require('chart.js')
const EventEmitter = require('events')
const $ = require('jquery')

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

module.exports.EmptyTab = EmptyTab
module.exports.SCWTab = SCWTab
module.exports.GraphTab = GraphTab
