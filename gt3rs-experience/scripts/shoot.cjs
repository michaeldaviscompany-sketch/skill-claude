// Test visuel : charge le site, attend le modèle, capture chaque section,
// relève les erreurs console et les métriques WebGL (draw calls, triangles).
// Usage : node scripts/shoot.cjs <url> <outDir> [mobile]
const { chromium, devices } = require('playwright')
const fs = require('fs')

;(async () => {
  const url = process.argv[2] || 'http://localhost:4173/'
  const out = process.argv[3] || 'shots'
  const mobile = process.argv[4] === 'mobile'
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const ctx = await browser.newContext(mobile ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const logs = []
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`) })
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
  const t0 = Date.now()
  await page.goto(url, { waitUntil: 'load', timeout: 120000 })
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 240000 }).catch(() => logs.push('[test] loader still visible'))
  console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's')
  await page.waitForTimeout(6500) // intro
  const sections = (process.argv[5] || 'hero:0,hero:0.9,design:0.1,design:0.32,design:0.55,design:0.77,design:0.97,engineering:0.1,engineering:0.38,engineering:0.64,engineering:0.92,performance:0.3,performance:0.85,configurator:0.5,details:0.5,finale:0.8,sources:0').split(',')
  for (const s of sections) {
    const [id, frac] = s.split(':')
    await page.evaluate(([id, frac]) => {
      const el = document.getElementById(id)
      const top = el.getBoundingClientRect().top + window.scrollY
      const len = Math.max(0, el.offsetHeight - window.innerHeight)
      window.__lenisJump?.(top + len * Number(frac))
    }, [id, frac])
    await page.waitForTimeout(3500)
    const info = await page.evaluate(() => {
      const gl = window.__gl
      return gl ? { calls: gl.info.render.calls, tris: gl.info.render.triangles, geos: gl.info.memory.geometries, tex: gl.info.memory.textures } : null
    })
    const name = `${out}/${id}-${frac}.png`
    await page.screenshot({ path: name })
    console.log(name, JSON.stringify(info))
  }
  console.log('LOGS:\n' + logs.slice(0, 40).join('\n'))
  await browser.close()
})()
