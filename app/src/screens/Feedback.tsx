import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Btn, Opt } from '../components/ui'
import { Page } from '../components/Page'
import { logEvent } from '../pilot/log'
import { APP_VERSION, PILOT } from '../pilot/config'

const KINDS = ['Something broke', 'Confusing', 'Wrong answer', 'Idea', 'Other']

//a small pill that opens the feedback page from any screen, remembering where it was pressed
export function FeedbackPill({ onDark, question }: { onDark?: boolean; question?: string }) {
  const nav = useNavigate()
  const loc = useLocation()
  const q = question ? `&question=${encodeURIComponent(question)}` : ''
  return (
    <button type="button" className="cap" onClick={() => nav(`/feedback?from=${encodeURIComponent(loc.pathname)}${q}`)}
      style={{ height: 32, padding: '0 12px', borderRadius: 999, background: onDark ? 'rgba(255,255,255,0.14)' : 'var(--cream-2)', color: onDark ? 'var(--cream)' : 'var(--ink)', whiteSpace: 'nowrap', flex: 'none' }}>
      Send feedback
    </button>
  )
}

//feedback goes to the same private Google Sheet as pilot answers, in its own tab; no name or email is sent
export function FeedbackScreen() {
  const nav = useNavigate()
  const params = new URLSearchParams(useLocation().search)
  const from = params.get('from') ?? ''
  const question = params.get('question') ?? ''
  const [kind, setKind] = useState<string | null>(question ? 'Wrong answer' : null)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const ready = Boolean(kind && text.trim())

  if (sent) {
    return (
      <Page title="Thank you" subtitle="Your feedback is on its way." back={from || -1}
        bottom={<Btn onClick={() => (from ? nav(from) : nav(-1))}>Back to the app</Btn>}>
        <p className="body">I read every message, and it shapes what changes next in Recall.</p>
        <p className="small muted">If you are offline, it waits on your device and sends the next time you connect.</p>
      </Page>
    )
  }

  return (
    <Page title="Send feedback" subtitle="Anything that broke, confused you or could be better." back={from || -1}
      bottom={<Btn off={!ready} onClick={() => {
        if (!ready) return
        logEvent('feedback', { kind: kind!, text: text.trim().slice(0, 2000), screen: from, question, app: PILOT ? APP_VERSION : 'main' })
        setSent(true)
      }}>Send</Btn>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="small-b" id="kind-label">What is it about?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-labelledby="kind-label">
          {KINDS.map(k => <Opt key={k} selected={kind === k} style={{ padding: '0 16px' }} onClick={() => setKind(k)}>{k}</Opt>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="fb" className="small-b">Your message</label>
        <div className="field">
          <textarea id="fb" className="body" rows={6} style={{ width: '100%', resize: 'vertical', cursor: 'text' }} value={text} maxLength={2000}
            onChange={e => setText(e.target.value)} placeholder={question ? 'What is wrong with this question?' : 'Tell me what happened or what you would change.'} />
        </div>
      </div>
      <p className="small muted">This sends your message, its type and the screen you came from. It never includes your name or email.{question ? ' The question you were on is attached.' : ''}</p>
    </Page>
  )
}
