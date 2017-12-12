/*
	動作確認環境
	macOS High Sierra v10.13.2
	Node	v8.9.1
	npm	 	v5.6.0

	by Kazuki Fujita 34代 WASA 電装班長
*/
const Electron = require('electron');

const app = Electron.app; // アプリケーション管理用モジュール
const BrowserWindow = Electron.BrowserWindow; // ブラウザ管理用モジュール

const Express = require('express');
const ex_app = Express(); // マップデータ配信用expressモジュール

const path = require('path'); // path オブジェクト：内部ファイルのURL化に使用
const url = require('url'); // url オブジェクト：内部ファイルのURL化に使用
const os = require('os'); // OSの情報を取得するライブラリ
const fs = require('fs');

const MBTiles = require('@mapbox/mbtiles');

let data_path;

if (process.platform == "darwin") {
    data_path = path.join(os.homedir(), "Library", "Application Support", "ghost");
} else if (process.platform == "win32") {
    data_path = path.join(os.homedir(), "AppData", "Roaming", "ghost");
} else {
    data_path = path.join(os.homedir(), ".ghost");
}

if (!fs.existsSync(data_path)) {
    fs.mkdirSync(data_path);
}

const tilesDir = path.join(data_path, 'map_tiles'); // マップデータのディレクトリ

if (!fs.existsSync(tilesDir)) {
    fs.mkdirSync(tilesDir);
}

// ウィンドウオブジェクトをグローバル変数化する。
// ガーベッジコレクション時にウィンドウが閉じてしまう現象を防ぐ
let mainWindow

// ウィンドウ生成
function createWindow() {
    // ブラウザウィンドの生成
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            nodeIntegrationInWorker: true
        },
        icon: path.join(__dirname, 'static', 'ghost.png')
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // (デバッグ用) デベロッパ用ツールを開く
    mainWindow.webContents.openDevTools();

    console.log('Opened Ghost on platform =', process.platform);

    // ウィンドウが閉じられた場合に発生するイベントに対するハンドラー設定
    mainWindow.on('closed', function() {
        // 複数のウィンドウを生成した場合もここでnullにする(配列などで)
        // null にすることでガーベッジコレクションを有効にしてヒープを解放する
        mainWindow = null
    });
}
// ウィンドウ生成準備完了時に発生するイベントに対するハンドラー設定
app.on('ready', createWindow);

// 全てのウィンドウが閉じられた場合に発生するイベントに対するハンドラー設定
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
});

setInterval(function() {
    let appMetrics = app.getAppMetrics();
    let processes = appMetrics.length;
    let sum_percent = 0;
    for (let i = 0; i < processes; i++) {
        sum_percent += appMetrics[i].cpu.percentCPUUsage;
    }
    console.log("CPU Usage: " + sum_percent);
}, 1000);


ex_app.use('/static', Express.static(path.join(__dirname, 'static')));

// mbtilesからpbfのblobをsqlite3でクエリしてから送信手法を取る場合
function getContentType(t) {
    let header = {};
    header["Access-Control-Allow-Origin"] = "*";
    header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
    header["Cache-Control"] = "public, max-age=604800";
    if (t === "png") {
        header["Content-Type"] = "image/png";
    }
    if (t === "jpg") {
        header["Content-Type"] = "image/jpeg";
    }
    if (t === "pbf") {
        header["Content-Type"] = "application/x-protobuf";
        header["Content-Encoding"] = "gzip";
    }
    return header;
}

ex_app.get('/map_tiles/:s/:z/:x/:y.:t', function(req, res) {
    //console.log("GPS requesting tile: (x,y,z) = (" + req.params.x +", " + req.params.y + ", " + req.params.z + ")");
    new MBTiles(path.join(tilesDir, req.params.s + '.mbtiles'), function(err, mbtiles) {
        mbtiles.getTile(req.params.z, req.params.x, req.params.y, function(err, tile, headers) {
            if (err) {
                console.log(err);
                let header = {};
                header["Access-Control-Allow-Origin"] = "*";
                header["Access-Control-Allow-Headers"] = "Origin, X-Requested-With, Content-Type, Accept";
                header["Content-Type"] = "text/plain";
                res.set(header);
                res.status(404).send('Tile rendering error: ' + err + '\n');
            } else {
                res.set(getContentType(req.params.t));
                res.send(tile);
            }
        });
        if (err) console.log("error opening database");
    });
});

// start up the server
console.log('Map Server listening on port: ' + 3000);
ex_app.listen(3000);