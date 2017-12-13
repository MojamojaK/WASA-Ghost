# Ghost
Ghost is a BADASS Telemetry Monitor Application for Waseda Aeronautics and Space Associations's Human Powered Aircraft Project.

## Installation
```
//TODO
```

## Contribution

[Node.js](https://nodejs.org/) must be installed for development.

#### Setup

1. Open terminal for UNIX Systems or Command Prompt for Windows

2. Simply clone this repository to your computer. You may have to [install git](https://git-scm.com/downloads) or [GitHub Desktop](https://desktop.github.com). Since this is a private repository, you may also be required to enter your GitHub username and password.

```bash
$ git clone https://github.com/MojamojaK/ghost.git
```

3. Install all packages.
```bash
$ npm install
```

4. If you are on Windows, install [windows-build-tools](https://www.npmjs.com/package/windows-build-tools) to allow python use of npm. This enables rebuilding from source for the [serialport](https://www.npmjs.com/package/serialport) module.
```bash
$ npm --add-python-to-path=‘true’ --debug install --global windows-build-tools
```

5. Run rebuild command. This rebuilds all plaftorm native packages to become compatible to [Electron](https://electronjs.org).
```bash
$ npm run rebuild
```

6. You may now start and run the application with.
```bash
$ npm run
```

All codes should be implemented in the **src** directory.

Build resources such as application icons should be in the **build** directory.

#### Building

Run the commands below for each platform.

Since codes are left unsigned, Operating Systems may initially reject installation.

Building Configurations should be in **build-config.json** . See [electron-builder](https://www.electron.build).

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
