//clicks through the whole flow at 430 px wide and checks refresh resumes mid-session
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' })
const page = await (await browser.newContext({ viewport: { width: 430, height: 900 }, deviceScaleFactor: 2 })).newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.goto(BASE)
await page.click('text=Start setup')
await page.click('text=Continue')
await page.setInputFiles('input[type=file]', { name: 't.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
await page.waitForSelector('text=courses read', { timeout: 5000 })
await page.click('text=Continue')
await page.click('text=Continue')
await page.screenshot({ path: 'compare/out/flow-plan-430.png' })
await page.click("text=Start today's practice")
await page.click('text=Start session')
for (let i = 0; i < 3; i++) {
  await page.click("text=I'm sure")
  await page.click('.ans >> nth=1')
  await page.click('text=Check answer')
  if (i === 1) { await page.reload(); await page.waitForSelector('.h2') }
  await page.click(i < 2 ? 'text=Next question' : 'text=Start scenario')
}
await page.click('.ans >> nth=2'); await page.click('text=Continue')
await page.click('.ans >> nth=0'); await page.click('text=Continue')
await page.fill('#mine', 'Extend the test two weeks, then decide.')
await page.click('text=Compare with a model answer')
for (const g of await page.$$('[role=group][aria-labelledby^=cp-]')) await (await g.$('button')).click()
await page.click('text=Finish scenario')
await page.waitForSelector('text=Session complete')
const recalled = await page.textContent('.num-xl')
await page.click('text=Interview')
await page.screenshot({ path: 'compare/out/flow-summary-430.png' })
await page.click('text=See my skills')
await page.click('text=Statistical inference')
await page.waitForSelector('text=Next practice')
await page.goto(`${BASE}/today`)
const done = await page.textContent('text=Done for today')
await browser.close()
console.log('recalled:', recalled, '| done line:', done, '| errors:', errors.length ? errors : 'none')
