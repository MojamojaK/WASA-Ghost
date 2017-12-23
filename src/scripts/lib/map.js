const $ = require('jquery')
const path = require('path')
const fs = require('fs')
const mv = require('mv')
const mapboxgl = require('mapbox-gl')
const EventEmitter = require('events')
const {remote, ipcRenderer, shell} = require('electron')
const {MenuItem, dialog} = remote
const settings = require('electron-settings')

module.exports.Coordinate = class Coordinate extends EventEmitter {
  constructor (intial, parent, index) {
    super()
    this.value = intial
    this.index = index
    if (this.constructor.parent === undefined) this.constructor.parent = parent
    let coordinate = this
    this.on('update', function () { coordinate.updateDisplay() })
    this.constructor.parent.constructor.coordinates.push(this)
  }

  getValue () {
    return this.value
  }

  setRandom () {}

  setValue (val) {
    this.value = val
    this.constructor.parent.planeNavigationPoint.coordinates[this.index] = this.value
  }

  updateDisplay () {
    if (this.index === 1) this.constructor.parent.emit('updateCoord')
  }
}

module.exports.MapLoader = class MapLoader extends EventEmitter {
  constructor (menu, accessToken, mapNode, mapDragDropNode, mapImportButtonNode) {
    super()
    this.menu = menu
    this.map = null
    this.mapTilesDirectory = path.join(path.dirname(settings.file()), this.constructor.mapTilesDirName)
    this.accessToken = accessToken
    mapboxgl.accessToken = this.accessToken
    this.mapNode = mapNode
    this.mapDragDropNode = mapDragDropNode
    this.mapImportButtonNode = mapImportButtonNode
    this.yaw = 0
    this.planeNavigationPoint = {
      type: 'Point',
      coordinates: [139.523889, 35.975278]
    }
    this.tileURLs = []
    this.createPlaneNav()
    this.setupClickEvents()
    this.setupDragDropEvents()
    this.setupMenu()
    let mapLoader = this
    this.on('load', function () { mapLoader.drawMap() })
    this.on('updateHeading', function () { mapLoader.updatePlaneOrientation() })
    this.on('updateCoord', function () { mapLoader.updatePlaneGeoPosition() })
    this.attempMapLoad()
  }

  createPlaneNav () {
    this.planeSource = null
    this.planeWidth = 128
    this.planeData = new Uint8Array(this.planeWidth * this.planeWidth * 4)
    for (let i = 0; i < this.planeWidth; i++) {
      for (let j = 0; j < this.planeWidth; j++) {
        let offset = (j * this.planeWidth + i) * 4
        if ((i >= 61 && i <= 66) || (j >= 23 && j <= 28)) {
          this.planeData[offset + 0] = 255
          this.planeData[offset + 1] = 0
          this.planeData[offset + 2] = 0
          this.planeData[offset + 3] = 255
        }
      }
    }
    this.planeImage = {
      width: this.planeWidth,
      height: this.planeWidth,
      data: this.planeData
    }
  }

  openMapDirectory () {
    if (!fs.existsSync(this.mapTilesDirectory)) {
      fs.mkdirSync(this.mapTilesDirectory)
    }
    shell.openItem(this.mapTilesDirectory)
  }

  setupDragDropEvents () {
    $(document).on('drop', function (e) {
      e.preventDefault()
      e.stopPropagation()
    })
    $(document).on('dragover', function (e) {
      e.preventDefault()
      e.stopPropagation()
    })
    let mapLoader = this
    this.mapDragDropNode.on('drop', function (event) {
      event.preventDefault()
      event.stopPropagation()
      for (let file of event.originalEvent.dataTransfer.files) {
        if (path.parse(file.path).ext === '.mbtiles') {
          if (!fs.existsSync(mapLoader.mapTilesDirectory)) {
            fs.mkdirSync(mapLoader.mapTilesDirectory)
          }
          mv(file.path, path.join(mapLoader.mapTilesDirectory, path.basename(file.path)), function (err) {
            if (err) mapLoader.displayImportError()
            else mapLoader.attempMapLoad()
          })
        } else {
          mapLoader.displayImportError()
        }
      }
    })
  }

  setupClickEvents () {
    let mapLoader = this
    this.mapDragDropNode.on('click', function () { mapLoader.displayImportMapTiles() })
    this.mapImportButtonNode.on('click', function () { mapLoader.displayImportMapTiles() })
  }

  setupMenu () {
    let mapLoader = this
    this.menu.subMenuEdit.insert(2, new MenuItem({
      label: 'Import Map Tiles',
      click () { mapLoader.displayImportMapTiles() }
    }))
    this.menu.subMenuEdit.insert(3, new MenuItem({
      label: 'Open Map Directory',
      click () { mapLoader.openMapDirectory() }
    }))
  }

  setValueCoordinate (lng, lat) {
    this.constructor.coordinates[0].setValue(lng)
    this.constructor.coordinates[1].setValue(lat)
  }

  updatePlaneOrientation () {
    if (this.map !== null) this.map.setLayoutProperty('planeImage', 'icon-rotate', this.yaw)
  }

  updatePlaneGeoPosition () {
    if (this.planeSource !== null) this.planeSource.setData(this.planeNavigationPoint)
  }

  attempMapLoad () {
    let mapLoader = this
    if (!fs.existsSync(this.mapTilesDirectory)) {
      fs.mkdirSync(this.mapTilesDirectory)
    }
    fs.readdir(this.mapTilesDirectory, function (err, item) {
      if (err) {
        console.log('Attempt Map Load', err)
        return
      }
      let MBTiles = require('@mapbox/mbtiles')
      mapLoader.tileURLs = []
      let invalidDataFiles = []
      let tmpIndex = 0
      function validateMapData (err, tile) {
        if (err) {
          invalidDataFiles.push(item[tmpIndex])
        } else {
          mapLoader.tileURLs.push(mapLoader.constructor.serverLocation + '/' + mapLoader.constructor.mapTilesDirName + '/' + path.parse(item[tmpIndex]).name + '/{z}/{x}/{y}.pbf')
        }
        tmpIndex++
      }
      function handleInvalidFiles () {
        let invalidString = ''
        const invalidFilesDirName = 'invalids'
        const invalidFilesDirectory = path.join(mapLoader.mapTilesDirectory, invalidFilesDirName)
        for (let i = 0; i < invalidDataFiles.length; i++) {
          invalidString += invalidDataFiles[i] + '\n'
        }
        dialog.showMessageBox({
          title: 'Invalid Map Data Files Found',
          type: 'error',
          buttons: ['OK'],
          message: 'Invalid Map Data Files Found',
          detail: invalidString
        }, function (res) {
          if (!fs.existsSync(invalidFilesDirectory)) {
            fs.mkdirSync(invalidFilesDirectory)
          }
          for (let i = 0; i < invalidDataFiles.length; i++) {
            mv(path.join(mapLoader.mapTilesDirectory, invalidDataFiles[i]), path.join(invalidFilesDirectory, invalidDataFiles[i]), function (err) {
              if (err) console.log('mv', err)
            })
          }
        }
        )
      }
      function handleEmptyFiles () {
        $('#dragdrop_layover').html('Import your .mbtiles file here')
        dialog.showMessageBox({
          title: 'Missing Map Tiles',
          type: 'error',
          buttons: ['Ignore', 'Import'],
          message: 'Missing Map Tiles',
          detail: 'Supported data type: mbtiles'
        }, function (res) {
          if (res === 1) mapLoader.displayImportMapTiles()
        })
      }
      function displayPopups () {
        if (invalidDataFiles.length > 0) handleInvalidFiles()
        if (mapLoader.tileURLs.length < 1) handleEmptyFiles()
        else mapLoader.emit('load')
      }
      function validateMapDataAll () {
        if (item) {
          if (tmpIndex >= item.length) displayPopups()
          else if (path.parse(item[tmpIndex]).ext === '.mbtiles') {
            let mbtiles = new MBTiles(path.join(mapLoader.mapTilesDirectory, item[tmpIndex]), function (err, mbtiles) {
              if (err) {
                validateMapData(err)
              } else {
                mbtiles.getTile(0, 0, 0, function (err, tile, headers) {
                  validateMapData(err)
                  validateMapDataAll()
                })
              }
            })
            if (mbtiles) {}
          } else {
            tmpIndex++
            validateMapDataAll()
          }
        } else displayPopups()
      }
      validateMapDataAll()
    })
  }

  displayImportMapTiles () {
    let mapLoader = this
    dialog.showOpenDialog({
      title: 'Import MBTiles',
      properties: ['openFile', 'treatPackageAsDirectory'],
      filters: [{name: 'MBTiles', extensions: ['mbtiles']}]
    }, function (srcFile) {
      if (srcFile) {
        let filePath = srcFile[0]
        if (!fs.existsSync(mapLoader.mapTilesDirectory)) {
          fs.mkdirSync(mapLoader.mapTilesDirectory)
        }
        mv(filePath, path.join(mapLoader.mapTilesDirectory, path.basename(filePath)), function (err) {
          if (err) mapLoader.displayImportError(err)
          else mapLoader.attempMapLoad()
        })
      }
    })
  }

  displayImportError (err) {
    console.log(err)
    dialog.showMessageBox({
      title: 'Import Error',
      type: 'error',
      buttons: ['OK'],
      message: 'Import Error',
      detail: 'Unable to Import Map Data.'
    })
  }

  drawMap () {
    this.mapNode.html('')
    this.constructor.mapStyle.sources['openmaptiles-japan'].tiles = this.tileURLs
    this.map = new mapboxgl.Map(this.constructor.mapOptions)
    let mapLoader = this
    let tmpMap = this.map
    this.map.on('load', function () {
      tmpMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

      let propertyList = $('#propertyList')
      tmpMap.on('mousemove', function (e) {
        mapLoader.setValueCoordinate(e.lngLat.lng, e.lngLat.lat)
        mapLoader.updatePlaneGeoPosition()
        propertyList.html('')
        let features = tmpMap.queryRenderedFeatures(e.point, {radius: 100})
        if (features[0]) {
          propertyList.html(JSON.stringify(e.lngLat, null, 2) + '<br/>' + JSON.stringify(features[0].properties, null, 2))
        } else {
          propertyList.html(JSON.stringify(e.lngLat, null, 2))
        }
      })

      tmpMap.addSource('planeNav', {
        type: 'geojson',
        data: mapLoader.planeNavigationPoint
      })
      mapLoader.planeSource = tmpMap.getSource('planeNav')

      tmpMap.addImage('planeImage', mapLoader.planeImage)
      tmpMap.addLayer({
        id: 'planeImage',
        type: 'symbol',
        source: 'planeNav',
        layout: {
          'icon-image': 'planeImage',
          'icon-size': 1.0,
          'icon-offset': [0, 39],
          'icon-rotation-alignment': 'map'
        }
      })

      tmpMap.on('click', 'okegawa_point', function (e) {
        tmpMap.flyTo({
          center: e.features[0].geometry.coordinates,
          zoom: 13,
          speed: 0.9,
          curve: 1,
          easing: function (t) {
            return t
          }
        })
      })

      let mapCanvas = tmpMap.getCanvas()
      tmpMap.on('mouseenter', 'okegawa_point', function () { mapCanvas.style.cursor = 'pointer' })
      tmpMap.on('mouseleave', 'okegawa_point', function () { mapCanvas.style.cursor = '' })
    })

    this.map.on('error', function () {})
  }
}

module.exports.MapLoader.serverLocation = 'http://localhost:3000'
module.exports.MapLoader.mapTilesDirName = 'mapTiles'
module.exports.MapLoader.mapStyle = {
  version: 8,
  sources: {
    'openmaptiles-japan': {
      type: 'vector',
      tiles: [],
      minzoom: 0,
      maxzoom: 14
    },
    'okegawa_point': {
      type: 'geojson',
      data: {
        type: 'Point',
        coordinates: [139.523889, 35.975278]
      }
    }
  },
  layers: [{
    id: 'water',
    source: 'openmaptiles-japan',
    'source-layer': 'water',
    interactive: true,
    type: 'line',
    paint: {
      'line-color': '#0761FC'
    }
  },
  {
    id: 'aeroway',
    source: 'openmaptiles-japan',
    'source-layer': 'aeroway',
    interactive: true,
    type: 'line',
    paint: {
      'line-color': '#FC7907',
      'line-width': 5
    }
  },
  {
    id: 'boundary',
    source: 'openmaptiles-japan',
    'source-layer': 'boundary',
    interactive: true,
    type: 'line',
    paint: {
      'line-color': '#66FF99',
      'line-width': 1
    }
  },
  {
    id: 'transportation',
    source: 'openmaptiles-japan',
    'source-layer': 'transportation',
    interactive: true,
    type: 'line',
    paint: {
      'line-color': '#660099',
      'line-width': 1
    }
  },
  {
    id: 'okegawa_point',
    type: 'circle',
    source: 'okegawa_point',
    paint: {
      'circle-radius': 10,
      'circle-color': '#007CBF'
    },
    minzoom: 3
  }
  ]
}
module.exports.MapLoader.mapOptions = {
  container: 'map',
  center: [139.523889, 35.975278],
  zoom: 13,
  minZoom: 1,
  maxZoom: 18,
  attributionControl: false,
  style: module.exports.MapLoader.mapStyle
}
module.exports.MapLoader.coordinates = []
