const $ = require('jquery');				// JQueryライブラリ
const mapboxgl = require('mapbox-gl');		// マップ表示用ライブラリ
const serialport = require('serialport');	// シリアル送受信用ライブラリ
const SerialPort = serialport.SerialPort;	// ライブラリの必要クラスを引っ張ってくる
const xbee_api = require('xbee-api');
const C = xbee_api.constants;
const Electron = require('electron');		// Electronのライブラリ
const remote = Electron.remote;				// Electronクライアント用ライブラリ
const {Menu, MenuItem, dialog} = remote;	// メニューやポップアップ用ライブラリ
const EventEmitter = require('events');		// イベントハンドラー用ライブラリ


const path = require('path');				// 各OSにおけるディレクトリの表示方法を対応させるライブラリ (Mac/Linux: "a/b/c", Windows: "a\b\c")
const fs = require("fs");					// ファイルアクセス用ライブラリ
const os = require("os");					// OSの情報を取得するライブラリ
const mv = require("mv");					// ファイル移動をしてくれる簡易ライブラリ

const synth = window.speechSynthesis;		// 喋らせるライブラリ (現在Macのみ対応)