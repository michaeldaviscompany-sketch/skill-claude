// Test des interactions : teinte (balayage), pack Weissach, DRS/airbrake, plan rapproché.
// Usage : node scripts/interact.cjs <url> <outDir>
const { chromium } = require('playwright')
const fs = require('fs')

;(async () => {
  const url = process.argv[2]
  const out = process.argv[3]
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const logs = []
  page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message))
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForFunction(() => !document.querySelector('.loader'), null, { timeout: 240000 })
  await page.waitForTimeout(6000)
  const jump = (id, f) =>
    page.evaluate(([id, f]) => {
      const el = document.getElementById(id)
      const top = el.getBoundingClientRect().top + window.scrollY
      window.__lenisJump(top + (el.offsetHeight - innerHeight) * f)
    }, [id, f])
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, timeout: 180000 })

  await jump('configurator', 0.5)
  await page.waitForTimeout(3500)
  await page.click('button[aria-label^="Vert Python"]')
  await page.waitForTimeout(500)
  await shot('paint-mid')
  await page.waitForTimeout(2500)
  await shot('paint-python')
  await page.click('.toggle--big')
  await page.waitForTimeout(2500)
  await shot('weissach-off')

  await jump('engineering', 0.1)
  await page.waitForTimeout(3500)
  await page.click('button[role="radio"]:has-text("Airbrake")')
  await page.waitForTimeout(2500)
  await shot('airbrake')

  await jump('details', 0.5)
  await page.waitForTimeout(3500)
  await page.click('.detail-nav button:has-text("Roue")')
  await page.waitForTimeout(3500)
  await shot('focus-wheel')
  await page.click('.detail-nav button:has-text("Habitacle")')
  await page.waitForTimeout(3500)
  await shot('focus-cockpit')
  console.log('ERRORS:', logs.length ? logs.join('\n') : 'aucune')
  await browser.close()
})()
