//sends one row per event to the project's Google Sheet through an Apps Script web app; rows wait in a queue until sent
import { APP_VERSION, LOG_URL } from './config'

const QKEY = 'recall.pilot.queue'
type Row = Record<string, string | number>

function queue(): Row[] {
  try { return JSON.parse(localStorage.getItem(QKEY) ?? '[]') } catch { return [] }
}
function store(rows: Row[]) {
  try { localStorage.setItem(QKEY, JSON.stringify(rows)) } catch { /* ignore */ }
}
function code(): string {
  try { return JSON.parse(localStorage.getItem('recall.pilot.v1') ?? '{}').code ?? '' } catch { return '' }
}

//no names, emails or course grades are ever sent: only the study code and app answers
export function logEvent(event: string, fields: Row = {}) {
  const row: Row = { event, code: code(), ts: new Date().toISOString(), app: APP_VERSION, ...fields }
  store([...queue(), row])
  void flush()
}

//the sheet address can also sit in docs/pilot/log-url.txt, so it can be set on GitHub without rebuilding the app
let url = LOG_URL
let looked = false
async function endpoint(): Promise<string> {
  if (url || looked) return url
  looked = true
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}log-url.txt`, { cache: 'no-store' })
    const t = r.ok ? (await r.text()).trim() : ''
    if (t.startsWith('https://script.google.com/') || t.startsWith('http://localhost')) url = t
  } catch { /* stays on the device */ }
  return url
}

let sending = false
export async function flush() {
  if (sending) return
  const target = await endpoint()
  if (!target || sending) return
  sending = true
  try {
    let rows = queue()
    while (rows.length) {
      const batch = rows.slice(0, 20)
      //text/plain keeps this a simple request, which Apps Script accepts from any page
      await fetch(target, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(batch) })
      //rows added while sending stay in the queue
      rows = queue().slice(batch.length)
      store(rows)
    }
  } catch { /* offline: the queue stays and is sent next time */ } finally { sending = false }
}

export function pendingRows(): number { return queue().length }

if (typeof window !== 'undefined') window.addEventListener('online', () => void flush())
