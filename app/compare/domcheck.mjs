//checks the rendered DOM on every route against the design specification
import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' })
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await p.goto('http://localhost:5173/'); await p.evaluate(() => localStorage.clear())
await p.click('text=Start setup'); await p.click('text=Continue')
await p.setInputFiles('input[type=file]', { name: 't.pdf', mimeType: 'application/pdf', buffer: Buffer.from('x') })
await p.waitForSelector('text=courses read'); await p.click('text=Continue'); await p.click('text=Continue'); await p.click("text=Start today's practice")
const bad = {}
const routes = ['/', '/setup/survey', '/setup/record', '/setup/topics', '/setup/plan', '/today', '/skills', '/skills/inference', '/profile', '/session/question']
for (const path of routes) {
  await p.goto('http://localhost:5173' + path); await p.waitForTimeout(300)
  if (path === '/session/question') { await p.click("text=I'm sure"); await p.click('.ans >> nth=3'); await p.click('text=Check answer'); await p.waitForTimeout(200) }
  const hits = await p.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el)
      if (cs.backgroundImage !== 'none') out.push(['bg-image', el.tagName])
      if (cs.boxShadow !== 'none') out.push(['shadow', el.tagName])
      if (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') out.push(['outline', el.tagName])
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (cs['border' + side + 'Width'] !== '0px' && cs['border' + side + 'Style'] !== 'none') out.push(['border', el.tagName, side])
      if (cs.fontFamily.replace(/"/g, '') !== 'Gilroy' && !(el instanceof SVGElement)) out.push(['font', el.tagName, cs.fontFamily])
      if (el.children.length === 0 && /[–—·•]/.test(el.textContent || '')) out.push(['dash-or-dot', el.tagName, el.textContent.slice(0, 30)])
    }
    return out
  })
  if (hits.length) bad[path] = hits.slice(0, 6)
}
await b.close()
console.log(Object.keys(bad).length ? JSON.stringify(bad, null, 1) : 'DOM clean on all routes')
