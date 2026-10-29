import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const [url, widthArg = '1440', heightArg = '1000', screenshotArg] = process.argv.slice(2)

if (!url || !screenshotArg) {
  console.error('Usage: node hybrid03-visual-audit.mjs <url> <width> <height> <screenshot.png>')
  process.exit(2)
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const width = Number.parseInt(widthArg, 10)
const height = Number.parseInt(heightArg, 10)
const screenshotPath = resolve(screenshotArg)
const port = 9337
const profile = mkdtempSync(join(tmpdir(), 'otonom-edge-audit-'))

const edge = spawn(
  edgePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

function readJson(endpoint) {
  return new Promise((resolveRead, rejectRead) => {
    get(`http://127.0.0.1:${port}${endpoint}`, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        try {
          resolveRead(JSON.parse(body))
        } catch (error) {
          rejectRead(error)
        }
      })
    }).on('error', rejectRead)
  })
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await readJson('/json/version')
    } catch {
      await delay(100)
    }
  }
  throw new Error('Edge DevTools endpoint did not become ready')
}

let socket
const pending = new Map()
let requestId = 0

function send(method, params = {}) {
  requestId += 1
  const id = requestId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolveSend, rejectSend) => {
    pending.set(id, { resolve: resolveSend, reject: rejectSend })
  })
}

async function main() {
  await waitForDebugger()
  const targets = await readJson('/json/list')
  const page = targets.find((target) => target.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('No Edge page target was available')

  socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener('open', resolveOpen, { once: true })
    socket.addEventListener('error', rejectOpen, { once: true })
  })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 600,
    screenWidth: width,
    screenHeight: height,
  })
  await send('Page.navigate', { url })

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = await send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    })
    if (state.result.value === 'complete') break
    await delay(100)
  }
  await delay(1200)

  const audit = await send('Runtime.evaluate', {
    expression: `(() => {
      const viewportWidth = document.documentElement.clientWidth
      const offenders = [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            id: element.id,
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
          }
        })
        .filter((item) => item.width > 1 && (item.left < -1 || item.right > viewportWidth + 1))
        .slice(0, 30)
      const logo = document.querySelector('img[src*="/brand/otonom/"]')
      return {
        url: location.href,
        title: document.title,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        viewport: {
          innerWidth,
          innerHeight,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
        },
        logo: logo ? {
          src: logo.getAttribute('src'),
          alt: logo.getAttribute('alt'),
          width: Math.round(logo.getBoundingClientRect().width * 10) / 10,
          transform: getComputedStyle(logo).transform,
        } : null,
        hasApplicationError: document.body.innerText.includes('Application error'),
        offenders,
      }
    })()`,
    returnByValue: true,
  })

  const screenshot = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'))
  console.log(JSON.stringify(audit.result.value, null, 2))
}

try {
  await main()
} finally {
  try {
    if (socket?.readyState === WebSocket.OPEN) await send('Browser.close')
  } catch {
    edge.kill()
  }
  if (edge.exitCode === null) {
    await Promise.race([
      new Promise((resolveExit) => edge.once('exit', resolveExit)),
      delay(2000),
    ])
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  } catch (error) {
    console.warn(`Temporary Edge profile cleanup deferred: ${error.code ?? 'unknown error'}`)
  }
}
