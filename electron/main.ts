import { app, BrowserWindow } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import net from 'net'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port
      server.close(() => resolve(port))
    })
  })
}

function waitForServer(port: number, timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const check = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' })
      socket.on('connect', () => { socket.destroy(); resolve() })
      socket.on('error', () => {
        socket.destroy()
        if (Date.now() - start > timeout) reject(new Error('Server timeout'))
        else setTimeout(check, 200)
      })
    }
    check()
  })
}

async function createWindow() {
  const port = await findFreePort()
  serverProcess = spawn('node', [path.join(__dirname, '../dist-server/index.js')], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe',
  })
  await waitForServer(port)
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${port}`)
  }
  mainWindow.on('closed', () => { mainWindow = null })
}

app.on('ready', createWindow)
app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill()
  app.quit()
})
