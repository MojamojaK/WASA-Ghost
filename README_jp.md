# Ghost
Ghostへようこそ
Ghostとは、早稲田大学宇宙航空研究会・鳥人間プロジェクト
人力飛行機用テレメトリアプリケーションです

## インストール方法
```
//TODO
```

## 開発

開発には [Node.js](https://nodejs.org/) のインストールが必須となります。

#### - 開発環境設定

1. UNIX系システム(Mac/Linux等)ではターミナル、Windowsではコマンドプロンプトを開く。

2. このレポジトリをクローンする。
[gitをインストール](https://git-scm.com/downloads)、または [GitHub Desktop をインストール](https://desktop.github.com)する必要があります。 
このレポジトリはプライベートレポジトリなので、GitHubのユーザ名及びパスワードの入力を求められることがあります。

```bash
$ git clone https://github.com/MojamojaK/ghost.git
```

3. 各パッケージをインストールする。

```bash
$ npm install
```

4. Windows使用の場合は [windows-build-tools](https://www.npmjs.com/package/windows-build-tools)をインストールする。
npmによるpythonの使用が可能になります。
[serialport](https://www.npmjs.com/package/serialport)モジュールのリビルド(再コンパイル)をするときに必要となります。

```bash
$ npm --add-python-to-path='true' --debug install --global windows-build-tools
```

5. リビルド(再コンパイル)する.
各モジュールが[Electron](https://electronjs.org)に適応するようにリビルドが行われます.

```bash
$ npm run rebuild
```

6. アプリケーションの実行。

```bash
$ npm run
```

コードは **src** ディレクトリに入れてください.

ビルドに必要なリソース(アプリケーションアイコン等)は **build** ディレクトリに入れてください.

#### - ビルド

インストーラを作成するには以下のプログラムを実行するしてください。

Since codes are left unsigned, Operating Systems may initially reject installation.

Building Configurations should be in **build-config.json** . See [electron-builder](https://www.electron.build).

Built installers will be put in the **dist** directory

##### Windows
This will build a nsis installer for Windows 64bit.

**Will only work on Windows.** May work on Mac with [wine](https://www.winehq.org) installed, but is known to be unreliable.
```bash
$ npm run build_win
```

##### Mac 
This will build a dmg image for MacOS.
Works on all plaforms.
```bash
$ npm run build_mac
```

##### Linux
This will build an AppItem for Linux.
Works on all plaforms.
```bash
$ npm run build_linux
```
