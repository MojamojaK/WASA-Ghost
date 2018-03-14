const Electron = require('electron')
const remote = Electron.remote
const {Menu, MenuItem} = remote

module.exports.GhostMenu = class GhostMenu {
  constructor () {
    this.menu = new Menu()
    this.subMenuEdit = new Menu()
    this.subMenuView = new Menu()
    this.subMenuWindow = new Menu()
    this.subMenuHelp = new Menu()

    this.subMenuEdit.append(new MenuItem({role: 'copy'}))
    this.subMenuEdit.append(new MenuItem({role: 'paste'}))

    this.subMenuView.append(new MenuItem({role: 'reload'}))
    this.subMenuView.append(new MenuItem({role: 'forcereload'}))
    this.subMenuView.append(new MenuItem({role: 'toggledevtools'}))
    this.subMenuView.append(new MenuItem({type: 'separator'}))
    this.subMenuView.append(new MenuItem({role: 'togglefullscreen'}))

    this.subMenuHelp.append(new MenuItem({label: 'Learn More', click () { Electron.shell.openExternal('https://youtu.be/MJdz3i44dIc') }}))

    // process.platform === 'darwin' はMac用の設定です
    if (process.platform === 'darwin') {
      this.subMenuApp = new Menu()
      this.subMenuApp.append(new MenuItem({role: 'about'}))
      this.subMenuApp.append(new MenuItem({type: 'separator'}))
      this.subMenuApp.append(new MenuItem({role: 'services', submenu: []}))
      this.subMenuApp.append(new MenuItem({type: 'separator'}))
      this.subMenuApp.append(new MenuItem({role: 'hideothers'}))
      this.subMenuApp.append(new MenuItem({role: 'unhide'}))
      this.subMenuApp.append(new MenuItem({type: 'separator'}))
      this.subMenuApp.append(new MenuItem({role: 'quit'}))
      this.menu.append(new MenuItem({label: 'Ghost', submenu: this.subMenuApp}))

      this.subMenuSpeech = new Menu()
      this.subMenuSpeech.append(new MenuItem({role: 'startspeaking'}))
      this.subMenuSpeech.append(new MenuItem({role: 'stopspeaking'}))
      this.subMenuEdit.append(new MenuItem({type: 'separator'}))
      this.subMenuEdit.append(new MenuItem({label: 'Speech', submenu: this.subMenuSpeech}))

      this.subMenuWindow.append(new MenuItem({role: 'close'}))
      this.subMenuWindow.append(new MenuItem({role: 'minimize'}))
      this.subMenuWindow.append(new MenuItem({role: 'zoom'}))
      this.subMenuWindow.append(new MenuItem({type: 'separator'}))
      this.subMenuWindow.append(new MenuItem({role: 'front'}))
    } else {
      this.subMenuWindow.append(new MenuItem({role: 'minimize'}))
      this.subMenuWindow.append(new MenuItem({role: 'close'}))
    }

    this.menu.append(new MenuItem({label: 'Edit', submenu: this.subMenuEdit}))
    this.menu.append(new MenuItem({label: 'View', submenu: this.subMenuView}))
    this.menu.append(new MenuItem({label: 'Window', submenu: this.subMenuWindow}))
    this.menu.append(new MenuItem({label: 'Help', submenu: this.subMenuHelp}))

    this.update()
  }

  update () {
    Menu.setApplicationMenu(this.menu)
  }
}
