import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn, Note } from '../components/ui'
import { useStore } from '../state/store'
import { giveConsent, resetPilot } from './engine'
import { CONTACT, PRIVACY, TERMS, type Section } from './legal'

//pilot entry: study code, the plain notice, and the privacy and terms boxes; nothing is sent before this is accepted
export function Consent() {
  const nav = useNavigate()
  const { resetAll } = useStore()
  const fromLink = new URLSearchParams(window.location.search).get('code') ?? ''
  const [code, setCode] = useState(fromLink)
  const [agreeNotice, setAgreeNotice] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const ok = /^[A-Za-z0-9-]{2,12}$/.test(code.trim()) && agreeNotice && agreeTerms
  return (
    <div className="screen">
      <div className="safe-top" style={{ background: 'var(--navy)', padding: '48px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="h2 on-dark">Recall pilot</div>
        <p className="body on-dark">Two weeks, about five minutes a day.</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <p className="body">Recall is my capstone project at Minerva University. In this pilot I am testing whether the app works and what to change. The results are lessons about Recall only.</p>
        <p className="body">Each day you answer a few practice questions on data science skills and sometimes one short work scenario. On days 15 and 16 there is a short final check.</p>
        <p className="body">The app splits your skills into two groups. One group comes back when my forgetting estimate says it is fading. The other group comes back on a fixed schedule. Both groups get the same kind of questions.</p>
        <Note>I only see your study code and your answers in the app. I never ask for your name, email or grades here. You can stop at any time, and I will delete your answers if you ask.</Note>
        <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label htmlFor="code" className="small-b">Your study code</label>
          <input id="code" className="body" value={code} onChange={e => setCode(e.target.value)} placeholder="For example R07" autoCapitalize="characters" style={{ width: '100%' }} />
        </div>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} className="small">
          <input type="checkbox" checked={agreeNotice} onChange={e => setAgreeNotice(e.target.checked)} style={{ width: 24, height: 24, flexShrink: 0 }} />
          <span>I am 18 or older, I read this notice and the <Link to="/privacy">privacy notice</Link>, and I want to take part.</span>
        </label>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }} className="small">
          <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ width: 24, height: 24, flexShrink: 0 }} />
          <span>I agree to the <Link to="/terms">terms of use</Link>.</span>
        </label>
        <p className="small muted">Questions or a delete request: {CONTACT}.</p>
      </div>
      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Btn off={!ok} onClick={() => { if (!ok) return; resetAll(); resetPilot(); giveConsent(code); nav('/setup/survey') }}>Agree and start setup</Btn>
      </div>
    </div>
  )
}

function LegalPage({ title, sections }: { title: string; sections: Section[] }) {
  const nav = useNavigate()
  return (
    <div className="screen">
      <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="h1">{title}</h1>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '12px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        {sections.map(s => (
          <section key={s.h} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 className="body-b">{s.h}</h2>
            {s.p.map((t, i) => <p key={i} className="small">{t}</p>)}
          </section>
        ))}
      </div>
      <div className="safe-bottom" style={{ padding: '16px 24px 24px 24px' }}>
        <Btn onClick={() => nav(-1)}>Back</Btn>
      </div>
    </div>
  )
}
export const PrivacyScreen = () => <LegalPage title="Privacy notice" sections={PRIVACY} />
export const TermsScreen = () => <LegalPage title="Terms of use" sections={TERMS} />
