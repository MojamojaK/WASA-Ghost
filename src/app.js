/*
  動作確認環境
  macOS High Sierra v10.13.2
  Node  v8.9.1
  npm   v5.6.0

  by Kazuki Fujita 34代 WASA 電装班長
  //test commit//
*/
const {app, BrowserWindow, ipcMain, Notification, shell} = require('electron')

const Express = require('express')
const exApp = Express() // マップデータ配信用expressモジュール

const path = require('path') // path オブジェクト：内部ファイルのURL化に使用
const url = require('url') // url オブジェクト：内部ファイルのURL化に使用
const os = require('os') // OSの情報を取得するライブラリ
const fs = require('fs')
const mv = require('mv')
const settings = require('electron-settings')

const MBTiles = require('@mapbox/mbtiles')

const dataPath = path.dirname(settings.file())

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath)
}

const tilesDir = path.join(dataPath, 'mapTiles') // マップデータのディレクトリ

if (!fs.existsSync(tilesDir)) {
  fs.mkdirSync(tilesDir)
}

// ウィンドウオブジェクトをグローバル変数化する。
// ガーベッジコレクション時にウィンドウが閉じてしまう現象を防ぐ
let mainWindow

// ウィンドウ生成
function createWindow () {
  // ブラウザウィンドの生成
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegrationInWorker: true
    },
    icon: path.join(__dirname, 'static', 'ghost.png')
  })

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // (デバッグ用) デベロッパ用ツールを開く
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.setFrameRate(30)

  console.log('Opened Ghost on platform =', process.platform)

  // ウィンドウが閉じられた場合に発生するイベントに対するハンドラー設定
  mainWindow.on('closed', function () {
    // 複数のウィンドウを生成した場合もここでnullにする(配列などで)
    // null にすることでガーベッジコレクションを有効にしてヒープを解放する
    mainWindow = null
  })

  let downloadType = 'Normal'
  let downloadDestination = path.join(os.homedir(), 'downloads')
  let downloadItem
  let downloadItemName
  let downloadCompleteNotification = new Notification({
    title: 'File Download Complete',
    silent: false
  })

  downloadCompleteNotification.on('click', function () {
    shell.openItem(downloadDestination)
  })

  function removeDownloadsFolder () {
    let donwnloadsFile = path.join(downloadDestination, '.downloads')
    if (fs.existsSync(donwnloadsFile)) {
      if (fs.existsSync(path.join(donwnloadsFile, downloadItemName))) {
        fs.unlinkSync(path.join(donwnloadsFile, downloadItemName))
      }
      if (fs.existsSync(path.join(donwnloadsFile, '.DS_Store'))) {
        fs.unlinkSync(path.join(donwnloadsFile, '.DS_Store'))
      }
      let files = fs.readdirSync(donwnloadsFile)
      if (files && !files.length) {
        fs.rmdir(donwnloadsFile, function (err) {
          if (err) console.log(err)
        })
      }
    }
  }

  mainWindow.webContents.session.on('will-download', function (event, item, webContents) {
    downloadItem = item
    downloadItemName = downloadItem.getFilename()
    if (!fs.existsSync(path.join(downloadDestination, '.downloads'))) {
      fs.mkdirSync(path.join(downloadDestination, '.downloads'))
    }
    item.setSavePath(path.join(downloadDestination, '.downloads', downloadItemName))
    item.on('updated', function (event, state) {
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused')
        } else {
          let receivedBytes = item.getReceivedBytes()
          console.log('Received bytes: ', receivedBytes)
          if (mainWindow !== null && mainWindow.webContents !== null) {
            if (downloadType === 'Map') {
              mainWindow.setProgressBar(receivedBytes / 1740890112)
            }
            mainWindow.webContents.send('downloadStatus' + downloadType, receivedBytes)
          }
        }
      }
    })
    item.once('done', function (event, state) {
      if (state === 'completed') {
        console.log('Download successfully')
        if (Notification.isSupported()) {
          downloadCompleteNotification.show()
        }
        mv(path.join(downloadDestination, '.downloads', downloadItemName), path.join(downloadDestination, downloadItemName), function (err) {
          if (err) console.log(err)
          removeDownloadsFolder()
          if (mainWindow !== null && mainWindow.webContents !== null) {
            mainWindow.webContents.send('downloadState' + downloadType, state)
          }
        })
      } else {
        console.log('Download failed: ', state)
        removeDownloadsFolder()
        if (mainWindow !== null && mainWindow.webContents !== null) {
          mainWindow.webContents.send('downloadState' + downloadType, state)
        }
      }
      mainWindow.setProgressBar(-1)
    })
  })

  ipcMain.on('downloadFiles', function (event, type, fileURL, destination) {
    downloadType = type
    downloadDestination = destination
    mainWindow.webContents.downloadURL(fileURL)
  })

  ipcMain.on('downloadCancel', function (event, type) {
    if (downloadItem !== undefined) {
      downloadType = type
      downloadItem.cancel()
      downloadItem = undefined
      mainWindow.setProgressBar(-1)
    }
  })
}

// ウィンドウ生成準備完了時に発生するイベントに対するハンドラー設定
app.on('ready', createWindow)

// 全てのウィンドウが閉じられた場合に発生するイベントに対するハンドラー設定
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

setInterval(function () {
  let appMetrics = app.getAppMetrics()
  let processes = appMetrics.length
  let sumPercent = 0
  for (let i = 0; i < processes; i++) {
    sumPercent += appMetrics[i].cpu.percentCPUUsage
  }
  console.log('CPU Usage: ' + sumPercent)
}, 1000)

exApp.use('/static', Express.static(path.join(__dirname, 'static')))

// mbtilesからpbfのblobをsqlite3でクエリしてから送信手法を取る場合
function getContentType (t) {
  let header = {}
  header['Access-Control-Allow-Origin'] = '*'
  header['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'
  header['Cache-Control'] = 'public, max-age=604800'
  if (t === 'png') {
    header['Content-Type'] = 'image/png'
  }
  if (t === 'jpg') {
    header['Content-Type'] = 'image/jpeg'
  }
  if (t === 'pbf') {
    header['Content-Type'] = 'application/x-protobuf'
    header['Content-Encoding'] = 'gzip'
  }
  return header
}

exApp.get('/mapTiles/:s/:z/:x/:y.:t', function (req, res) {
  // console.log("GPS requesting tile: (x,y,z) = (" + req.params.x +", " + req.params.y + ", " + req.params.z + ")")
  let mbtiles = new MBTiles(path.join(tilesDir, req.params.s + '.mbtiles'), function (err, mbtiles) {
    mbtiles.getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {
      if (err) {
        console.log(err)
        let header = {}
        header['Access-Control-Allow-Origin'] = '*'
        header['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'
        header['Content-Type'] = 'text/plain'
        res.set(header)
        res.status(404).send('Tile rendering error: ' + err + '\n')
      } else {
        res.set(getContentType(req.params.t))
        res.send(tile)
      }
    })
    if (err) console.log('error opening database')
  })
  mbtiles = undefined
  if (mbtiles) console.log(mbtiles)
})

// start up the server
console.log('Map Server listening on port: ' + 3000)
exApp.listen(3000)
