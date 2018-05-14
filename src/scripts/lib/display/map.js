const $ = require('jquery')
const path = require('path')
const fs = require('fs')
const mv = require('mv')
const mapboxgl = require('mapbox-gl')
const EventEmitter = require('events')
const {remote, ipcRenderer, shell} = require('electron')
const {MenuItem, dialog} = remote
const settings = require('electron-settings')

module.exports.MapLoader = class MapLoader extends EventEmitter {
  constructor (dataLongitude, dataLatitude, dataYaw, dataLongitudeError, dataLatitudeError, dataHdop, menu, accessToken, mapNode, mapDragDropNode, mapImportButtonNode) {
    super()
    this.dataLongitude = dataLongitude
    this.dataLatitude = dataLatitude
    this.dataYaw = dataYaw
    this.dataLongitudeError = dataLongitudeError
    this.dataLatitudeError = dataLatitudeError
    this.dataHdop = dataHdop
    this.menu = menu
    this.map = null
    this.mapTilesDirectory = path.join(path.dirname(settings.file()), this.constructor.mapTilesDirName)
    this.accessToken = accessToken
    mapboxgl.accessToken = this.accessToken
    this.mapNode = mapNode
    this.mapDragDropNode = mapDragDropNode
    this.mapImportButtonNode = mapImportButtonNode
    this.downloadNode = undefined
    this.downloadStatusListener = undefined
    this.downloadStateListener = undefined
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
    this.on('update', function () { mapLoader.updatePlaneOrientation() })
    this.on('update', function () { mapLoader.updatePlaneGeoPosition() })
    this.attempMapLoad()
  }

  downloadMap () {
    if (this.downloadNode) {
      let mapLoader = this
      ipcRenderer.send('downloadFiles', 'Map', this.constructor.mapDownloadURL, this.mapTilesDirectory)

      this.downloadStatusListener = function (event, receivedBytes) {
        mapLoader.dragDropLayover.html('downloading... <br>' + (parseFloat(receivedBytes) / 17408901.12).toFixed(1) + '% of 1.74GB')
      }
      this.downloadStateListener = function (event, state) {
        mapLoader.attempMapLoad()
      }
      ipcRenderer.on('downloadStatusMap', this.downloadStatusListener)
      ipcRenderer.once('downloadStateMap', this.downloadStateListener)
    }
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
          ipcRenderer.send('downloadCancel', 'Map')
          mv(file.path, path.join(mapLoader.mapTilesDirectory, path.basename(file.path)), function (err) {
            if (err) mapLoader.displayImportError(err)
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

  updatePlaneOrientation () {
    if (this.map !== null) this.map.setLayoutProperty('planeImage', 'icon-rotate', this.dataYaw.getValue())
  }

  updatePlaneGeoPosition () {
    if (this.dataLongitude.isDupe() && this.dataLatitude.isDupe() && this.dataHdop.isDupe() && this.dataLongitudeError.isDupe() && this.dataLatitudeError.isDupe()) return
    this.planeNavigationPoint.coordinates[0] = this.dataLongitude.getValue()
    this.planeNavigationPoint.coordinates[1] = this.dataLatitude.getValue()
    if (!(this.map === null || this.map.getSource('planeCircle') === null)) {
      if (this.map.getSource('planeCircle') !== undefined) {
        let lngCalcError = this.dataLongitudeError.getValue() * this.dataHdop.getValue() * 2
        let latCalcError = this.dataLatitudeError.getValue() * this.dataHdop.getValue() * 2
        this.map.getSource('planeCircle').setData(this.createGeoJSONEclipse(this.planeNavigationPoint.coordinates, lngCalcError, latCalcError).data)
      }
    }
    if (this.planeSource !== null) this.planeSource.setData(this.planeNavigationPoint)
  }

  attempMapLoad () {
    let mapLoader = this
    if (this.downloadStatusListener !== undefined) {
      ipcRenderer.removeListener('downloadStatusMap', this.downloadStatusListener)
      this.downloadStatusListener = undefined
    }
    if (this.downloadStateListener !== undefined) {
      ipcRenderer.removeListener('downloadStateMap', this.downloadStateListener)
      this.downloadStateListener = undefined
    }
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
        mapLoader.dragDropLayover = $('#drag-drop-layover')
        mapLoader.dragDropLayover.html('Import your .mbtiles file here <br/> or <a id=\'download-map\'style=\'z-index:30; background-color:black; color:#00FFFF;\'>click here to download (1.74GB)</a>')
        mapLoader.downloadNode = $('#download-map')
        mapLoader.downloadNode.on('click', function (event) {
          mapLoader.dragDropLayover.html('downloading...')
          event.stopPropagation()
          mapLoader.downloadMap()
        })
        mapLoader.downloadNode.on('mouseenter', function () {
          mapLoader.downloadNode.css({'color': '#FF0000'})
        })
        mapLoader.downloadNode.on('mouseleave', function () {
          mapLoader.downloadNode.css({'color': '#00FFFF'})
        })
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
        ipcRenderer.send('downloadCancel', 'Map')
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
    this.mapNode.empty()
    this.constructor.mapStyle.sources['openmaptiles-japan'].tiles = this.tileURLs
    this.map = new mapboxgl.Map(this.constructor.mapOptions)
    let mapLoader = this
    let tmpMap = this.map
    this.map.on('load', function () {
      tmpMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

      let propertyList = $('#propertyList')
      tmpMap.on('mousemove', function (e) {
        // mapLoader.dataLatitude.setValue(e.lngLat.lat)
        // mapLoader.dataLongitude.setValue(e.lngLat.lng)
        // mapLoader.updatePlaneGeoPosition()
        propertyList.empty()
        let features = tmpMap.queryRenderedFeatures(e.point, {radius: 100})
        if (features[0]) {
          propertyList.html(JSON.stringify(e.lngLat, null, 2) + '<br/>' + JSON.stringify(features[0].properties, null, 2))
        } else {
          propertyList.html(JSON.stringify(e.lngLat, null, 2))
        }
      })

      tmpMap.addSource('planeCircle', mapLoader.createGeoJSONEclipse(mapLoader.planeNavigationPoint.coordinates, 10, 10))

      tmpMap.addLayer({
        'id': 'planeCircle',
        'type': 'fill',
        'source': 'planeCircle',
        'layout': {},
        'paint': {
          'fill-color': 'blue',
          'fill-opacity': 0.6
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

  createGeoJSONEclipse (center, radiusInMetersX, radiusInMetersY, points) {
    if (!points) points = 64

    let coords = {
      latitude: center[1],
      longitude: center[0]
    }

    let kmX = radiusInMetersX / 1000
    let kmY = radiusInMetersY / 1000

    let ret = []
    let distanceX = kmX / (111.320 * Math.cos(coords.latitude * Math.PI / 180))
    let distanceY = kmY / 110.574

    let theta, x, y
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI)
      x = distanceX * Math.cos(theta)
      y = distanceY * Math.sin(theta)

      ret.push([coords.longitude + x, coords.latitude + y])
    }
    ret.push(ret[0])

    return {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': [{
          'type': 'Feature',
          'geometry': {
            'type': 'Polygon',
            'coordinates': [ret]
          }
        }]
      }
    }
  }
}
module.exports.MapLoader.mapDownloadURL = 'http://www.space.tokyo.jp/ftp1/osm_tiles.mbtiles'
//  module.exports.MapLoader.mapDownloadURL = require('url').format({
//   pathname: path.join(require('os').homedir(), 'desktop', 'osm_tiles.mbtiles'),
//   protocol: 'file:',
//   slashes: true
// })
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
