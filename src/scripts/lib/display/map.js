const $ = require('jquery')
const path = require('path')
const fs = require('fs')
const mv = require('mv')
const mapboxgl = require('mapbox-gl')
const EventEmitter = require('events')
const {remote, ipcRenderer, shell} = require('electron')
const {MenuItem, dialog} = remote
const settings = require('electron-settings')

const DegToRad = Math.PI / 180

module.exports.MapLoader = class MapLoader extends EventEmitter {
  constructor (dataLongitude, dataLatitude, dataYaw, dataLongitudeError, dataLatitudeError,
    dataHdop, dataAccelX, dataAccelY, dataSpeed, dataCourse,
    menu, accessToken, mapNode, mapDragDropNode, mapImportButtonNode) {
    super()
    this.dataLongitude = dataLongitude
    this.dataLatitude = dataLatitude
    this.dataYaw = dataYaw
    this.dataLongitudeError = dataLongitudeError
    this.dataLatitudeError = dataLatitudeError
    this.dataHdop = dataHdop
    this.dataAccelX = dataAccelX
    this.dataAccelY = dataAccelY
    this.dataGPSSpeed = dataSpeed
    this.dataGPSCourse = dataCourse
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
    this.planeNavigationPoint = {
      type: 'Point',
      coordinates: [139.523889, 35.975278]
    }
    this.tileURLs = []
    this.planeSource = null
    this.planeCircle = null
    this.courseArrowVisible = true
    this.accelArrowVisible = true
    this.createArrow()
    this.createPlaneNav()
    this.setupClickEvents()
    this.setupDragDropEvents()
    this.setupMenu()
    let mapLoader = this
    this.on('load', function () { mapLoader.drawMap() })
    this.on('update', function () { mapLoader.updatePlane() })
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
    this.planeWidth = 128
    this.planeData = new Uint8Array(this.planeWidth * this.planeWidth * 4)
    for (let i = 0; i < this.planeWidth; i++) {
      for (let j = 0; j < this.planeWidth; j++) {
        let offset = (j * this.planeWidth + i) * 4
        if ((i >= 61 && i <= 66) || (j >= 23 && j <= 28)) {
          this.planeData[offset + 0] = 255 // R
          this.planeData[offset + 1] = 0 // G
          this.planeData[offset + 2] = 0 // B
          this.planeData[offset + 3] = 255 // A
        }
      }
    }
    this.planeImage = {
      width: this.planeWidth,
      height: this.planeWidth,
      data: this.planeData
    }
  }

  createArrow () {
    this.arrowWidth = 128
    this.arrowWidthHalf = this.arrowWidth / 2
    this.arrowPurpleData = new Uint8Array(this.arrowWidth * this.arrowWidth * 4)
    this.arrowGreenData = new Uint8Array(this.arrowWidth * this.arrowWidth * 4)
    for (let i = 0; i < this.arrowWidth; i++) {
      for (let j = 0; j <= this.arrowWidth; j++) { // タテの線を書く
        let sum = i + j
        if (j >= 61 && j <= 66) {
          let offset = (i * this.arrowWidth + j) * 4
          this.arrowPurpleData[offset + 0] = 255
          this.arrowPurpleData[offset + 1] = 0
          this.arrowPurpleData[offset + 2] = 255
          this.arrowPurpleData[offset + 3] = 255
          this.arrowGreenData[offset + 0] = 0
          this.arrowGreenData[offset + 1] = 255
          this.arrowGreenData[offset + 2] = 0
          this.arrowGreenData[offset + 3] = 255
        } else if (sum >= this.arrowWidthHalf - 3 && sum <= this.arrowWidthHalf + 3) {
          let offset = (i * this.arrowWidth + j) * 4
          this.arrowPurpleData[offset + 0] = 255
          this.arrowPurpleData[offset + 1] = 0
          this.arrowPurpleData[offset + 2] = 255
          this.arrowPurpleData[offset + 3] = 255
          this.arrowGreenData[offset + 0] = 0
          this.arrowGreenData[offset + 1] = 255
          this.arrowGreenData[offset + 2] = 0
          this.arrowGreenData[offset + 3] = 255
          let xFlipOffset = (i * this.arrowWidth + this.arrowWidth - j - 1) * 4
          this.arrowPurpleData[xFlipOffset + 0] = 255
          this.arrowPurpleData[xFlipOffset + 1] = 0
          this.arrowPurpleData[xFlipOffset + 2] = 255
          this.arrowPurpleData[xFlipOffset + 3] = 255
          this.arrowGreenData[xFlipOffset + 0] = 0
          this.arrowGreenData[xFlipOffset + 1] = 255
          this.arrowGreenData[xFlipOffset + 2] = 0
          this.arrowGreenData[xFlipOffset + 3] = 255
        }
      }
    }
    this.courseArrowImage = {
      width: this.arrowWidth,
      height: this.arrowWidth,
      data: this.arrowGreenData
    }
    this.accelArrowImage = {
      width: this.arrowWidth,
      height: this.arrowWidth,
      data: this.arrowPurpleData
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

  updatePlane () {
    // 位置情報の更新
    if (!(this.dataLongitude.isDupe() || this.dataLatitude.isDupe())) {
      this.planeNavigationPoint.coordinates[0] = this.dataLongitude.getValue()
      this.planeNavigationPoint.coordinates[1] = this.dataLatitude.getValue()
      if (this.planeSource !== null) this.planeSource.setData(this.planeNavigationPoint)
    }

    // 誤差楕円の更新
    if (!(this.dataLongitude.isDupe() || this.dataLatitude.isDupe() || this.dataHdop.isDupe() || this.dataLongitudeError.isDupe() || this.dataLatitudeError.isDupe())) {
      if (this.planeCircle !== null) {
        let lngCalcError = this.dataLongitudeError.getValue() * this.dataHdop.getValue() * 2
        let latCalcError = this.dataLatitudeError.getValue() * this.dataHdop.getValue() * 2
        this.planeCircle.setData(this.createGeoJSONEclipse(this.planeNavigationPoint.coordinates, lngCalcError, latCalcError).data)
      }
    }

    // 機首方向の更新
    if (!this.dataYaw.isDupe()) {
      if (this.map !== null) this.map.setLayoutProperty('planeImage', 'icon-rotate', this.dataYaw.getValue())
    }

    // GPS進行方向の更新
    if (!(this.dataGPSCourse.isDupe() || this.dataGPSSpeed.isDupe())) {
      let gpsCourse = this.dataGPSCourse.getValue()
      let gpsSpeed = this.dataGPSSpeed.getValue()
      if (this.map !== null) {
        if (gpsSpeed > 0.1) {
          if (!this.courseArrowVisible) {
            this.map.setLayoutProperty('courseArrowImage', 'visibility', 'visible')
            this.courseArrowVisible = true
          }
          this.map.setLayoutProperty('courseArrowImage', 'icon-rotate', gpsCourse)
        } else {
          if (this.courseArrowVisible) {
            this.map.setLayoutProperty('courseArrowImage', 'visibility', 'none')
            this.courseArrowVisible = false
          }
        }
      }
    }

    // 加速度方向の更新
    if (!(this.dataAccelX.isDupe() || this.dataAccelY.isDupe() || this.dataYaw.isDupe())) {
      let accelX = this.dataAccelX.getValue()
      let accelY = this.dataAccelY.getValue()
      let accel = Math.sqrt(accelX * accelX + accelY * accelY)
      if (accel > 1) {
        let accelAngle = this.dataYaw.getValue() + Math.atan(accelX / accelY) / DegToRad // 加速度矢印の角度(degree)
        if (accelY < 0) accelAngle += 180
        if (this.map !== null) {
          if (!this.accelArrowVisible) {
            this.map.setLayoutProperty('accelArrowImage', 'visibility', 'visible')
            this.accelArrowVisible = true
          }
          this.map.setLayoutProperty('accelArrowImage', 'icon-rotate', accelAngle)
        }
      } else {
        if (this.map !== null) {
          if (this.accelArrowVisible) {
            this.map.setLayoutProperty('accelArrowImage', 'visibility', 'none')
            this.accelArrowVisible = false
          }
        }
      }
    }
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
    let mapBoxMap = this.map
    this.map.on('load', function () {
      // ズーム・方向ボタンの設置
      mapBoxMap.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // マウスの挙動設定
      let propertyList = $('#propertyList')
      mapBoxMap.on('mousemove', function (e) {
        // mapLoader.dataLatitude.setValue(e.lngLat.lat)
        // mapLoader.dataLongitude.setValue(e.lngLat.lng)
        // mapLoader.updatePlane()
        propertyList.empty()
        let features = mapBoxMap.queryRenderedFeatures(e.point, {radius: 100})
        if (features[0]) {
          propertyList.html(JSON.stringify(e.lngLat, null, 2) + '<br/>' + JSON.stringify(features[0].properties, null, 2))
        } else {
          propertyList.html(JSON.stringify(e.lngLat, null, 2))
        }
      })

      // 誤差楕円の設置
      mapBoxMap.addSource('planeCircle', mapLoader.createGeoJSONEclipse(mapLoader.planeNavigationPoint.coordinates, 10, 10))
      mapLoader.planeCircle = mapBoxMap.getSource('planeCircle')
      mapBoxMap.addLayer({
        'id': 'planeCircle',
        'type': 'fill',
        'source': 'planeCircle',
        'layout': {},
        'paint': {
          'fill-color': 'blue',
          'fill-opacity': 0.6
        }
      })

      // 機体位置情報のソース設定
      mapBoxMap.addSource('planeNav', {
        type: 'geojson',
        data: mapLoader.planeNavigationPoint
      })
      mapLoader.planeSource = mapBoxMap.getSource('planeNav')

      // GPS進行方向矢印の設定・設置
      if (mapLoader.courseArrowImage !== null) {
        mapBoxMap.addImage('courseArrowImage', mapLoader.courseArrowImage)
        mapBoxMap.addLayer({
          'id': 'courseArrowImage',
          'type': 'symbol',
          'source': 'planeNav',
          'layout': {
            'icon-image': 'courseArrowImage',
            'icon-size': 1.0,
            'icon-offset': [0, -63],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        })
      }

      // 加速度矢印の設定・設置
      if (mapLoader.accelArrowImage !== null) {
        mapBoxMap.addImage('accelArrowImage', mapLoader.accelArrowImage)
        mapBoxMap.addLayer({
          'id': 'accelArrowImage',
          'type': 'symbol',
          'source': 'planeNav',
          'layout': {
            'icon-image': 'accelArrowImage',
            'icon-size': 1.0,
            'icon-offset': [0, -63],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        })
      }

      // 機体位置の設定・設置
      if (mapLoader.planeImage !== null) {
        mapBoxMap.addImage('planeImage', mapLoader.planeImage)
        mapBoxMap.addLayer({
          id: 'planeImage',
          type: 'symbol',
          source: 'planeNav',
          layout: {
            'icon-image': 'planeImage',
            'icon-size': 1.0,
            'icon-offset': [0, 39],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        })
      }

      // 桶川ポイントの設置
      mapBoxMap.on('click', 'okegawa_point', function (e) {
        mapBoxMap.flyTo({
          center: e.features[0].geometry.coordinates,
          zoom: 13,
          speed: 0.9,
          curve: 1,
          easing: function (t) {
            return t
          }
        })
      })

      let mapCanvas = mapBoxMap.getCanvas()
      mapBoxMap.on('mouseenter', 'okegawa_point', function () { mapCanvas.style.cursor = 'pointer' })
      mapBoxMap.on('mouseleave', 'okegawa_point', function () { mapCanvas.style.cursor = '' })
    })

    this.map.on('error', function () {})
  }

  createGeoJSONEclipse (center, radiusInMetersX, radiusInMetersY, pointCount) {
    if (!pointCount) pointCount = 64

    let coords = {
      latitude: center[1],
      longitude: center[0]
    }

    let kmX = radiusInMetersX / 1000
    let kmY = radiusInMetersY / 1000

    let ret = []
    let distanceX = kmX / (111.320 * Math.cos(coords.latitude * DegToRad))
    let distanceY = kmY / 110.574

    let theta, x, y
    for (let i = 0; i < pointCount; i++) {
      theta = (i / pointCount) * (2 * Math.PI)
      x = distanceX * Math.cos(theta)
      y = distanceY * Math.sin(theta)

      ret.push([coords.longitude + x, coords.latitude + y])
    }
    ret.push(ret[0])

    let geojson = {
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
    return geojson
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
