let menu = new Menu();
let submenu_edit = new Menu();
let submenu_view = new Menu();
let submenu_window = new Menu();
let submenu_help = new Menu();

let fake_serial = new MenuItem({label: 'Toggle Data Generator', click(){debug.emit('toggle')}, type: 'checkbox'});

submenu_edit.append(new MenuItem({role: 'copy'}));
submenu_edit.append(new MenuItem({role: 'paste'}));
submenu_edit.append(new MenuItem({label: 'Import Map Tiles', click(){import_mbtiles();}}));
submenu_edit.append(fake_serial);

submenu_view.append(new MenuItem({role: 'reload'}));
submenu_view.append(new MenuItem({role: 'forcereload'}));
submenu_view.append(new MenuItem({role: 'toggledevtools'}));
submenu_view.append(new MenuItem({type: 'separator'}));
submenu_view.append(new MenuItem({role: 'togglefullscreen'}));

submenu_help.append(new MenuItem({label: 'Learn More', click () { Electron.shell.openExternal('https://youtu.be/MJdz3i44dIc') }}));


if (process.platform === 'darwin') {
  let submenu_app = new Menu();
  submenu_app.append(new MenuItem({role: 'about'}));
  submenu_app.append(new MenuItem({type: 'separator'}));
  submenu_app.append(new MenuItem({role: 'services', submenu: []}));
  submenu_app.append(new MenuItem({type: 'separator'}));
  submenu_app.append(new MenuItem({role: 'hideothers'}));
  submenu_app.append(new MenuItem({role: 'unhide'}));
  submenu_app.append(new MenuItem({type: 'separator'}));
  submenu_app.append(new MenuItem({role: 'quit'}));
  menu.append(new MenuItem({label: 'Ghost', submenu: submenu_app}));

  let submenu_speech = new Menu();
  submenu_speech.append(new MenuItem({role: 'startspeaking'}));
  submenu_speech.append(new MenuItem({role: 'stopspeaking'}));
  submenu_edit.append(new MenuItem({type: 'separator'}));
  submenu_edit.append(new MenuItem({label: 'Speech', submenu: submenu_speech}));

  submenu_window.append(new MenuItem({role: 'close'}));
  submenu_window.append(new MenuItem({role: 'minimize'}));
  submenu_window.append(new MenuItem({role: 'zoom'}));
  submenu_window.append(new MenuItem({type: 'separator'}));
  submenu_window.append(new MenuItem({role: 'front'}));
}
else{
  submenu_window.append(new MenuItem({role: 'minimize'}));
  submenu_window.append(new MenuItem({role: 'close'}));
}

menu.append(new MenuItem({label: 'Edit', submenu: submenu_edit}));
menu.append(new MenuItem({label: 'View', submenu: submenu_view}));
menu.append(new MenuItem({label: 'Window', submenu: submenu_window}));
menu.append(new MenuItem({label: 'Help', submenu: submenu_help}));

Menu.setApplicationMenu(menu);