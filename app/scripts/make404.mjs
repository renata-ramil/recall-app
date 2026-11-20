//GitHub Pages serves docs/404.html for any unknown path: a copy of the demo page, plus a jump back into the pilot for pilot paths
import { readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
const html = readFileSync('../docs/index.html', 'utf8')
const jump = `<script>if (location.pathname.indexOf('/recall-app/pilot/') === 0) location.replace('/recall-app/pilot/')</script>`
writeFileSync('../docs/404.html', html.replace('<head>', `<head>\n    ${jump}`))
unlinkSync('../docs/log-url.txt')
//the landing page lives once, at docs/landing
rmSync('../docs/pilot/landing', { recursive: true, force: true })
console.log('wrote docs/404.html')
