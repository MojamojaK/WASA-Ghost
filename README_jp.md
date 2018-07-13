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

ビルドされたアプリケーションは、コードサインしてないので一部OSから実行を拒否されます。

ビルド用の設定は **build-config.json** から行ってください。 詳しくは [electron-builder](https://www.electron.build).

ビルドされたインストーラは **dist** ディレクトリに置かれます。

##### Windows
Windows 64bit用 nsisインストーラを生成します。
**Windowsでしか動きません** [wine](https://www.winehq.org)を使えばMacでも使えるかもしれませんが、動作は不安定です。
```bash
$ npm run build_win
```

##### Mac 
MacOS用dmgイメージを生成します。
すべてのプラットフォームで実行できます。
```bash
$ npm run build_mac
```

##### Linux
Linux用appImageを生成します。
すべてのプラットフォームで実行できます。
```bash
$ npm run build_linux
```
