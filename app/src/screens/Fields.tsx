import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Btn, Check, Cross } from '../components/ui'
import { Page } from '../components/Page'
import { FIELDS, fieldById, type Field } from '../content/fields'
import { updateAccount } from '../auth/account'
import { useAuth } from '../auth/AuthContext'

function FieldCard({ f, current, onStart, onTry }: { f: Field; current: boolean; onStart?: () => void; onTry: () => void }) {
  return (
    <div style={{ background: current ? 'var(--mist)' : 'var(--paper-2)', borderRadius: 24, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 className="title">{f.name}</h2>
        <span className="cap" style={{ background: f.status === 'full' ? 'var(--mint)' : 'var(--sand)', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>
          {f.status === 'full' ? 'Full module' : 'Starter set'}
        </span>
      </div>
      <p className="small muted">{f.blurb}</p>
      <p className="small">{f.skills.join(' · ')}</p>
      <p className="cap muted">For {f.roles.join(', ')}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {f.status === 'full' && onStart && <Btn style={{ height: 44 }} onClick={onStart}>{current ? 'Your field' : 'Choose this field'}</Btn>}
        {f.status === 'starter' && <Btn className="btn-soft" style={{ height: 44 }} onClick={onTry}>Try 5 sample questions</Btn>}
      </div>
    </div>
  )
}

//onboarding: choose a field before the setup questions
export function FieldPicker() {
  const nav = useNavigate()
  const { account, refresh } = useAuth()
  const choose = (f: Field) => { if (account) { updateAccount(account.id, { field: f.id }); refresh() } nav('/setup/survey') }
  return (
    <Page title="Choose your field" subtitle={account ? `Welcome, ${account.name}. Pick what you studied.` : 'Pick what you studied.'} back="/">
      {FIELDS.map(f => <FieldCard key={f.id} f={f} current={account?.field === f.id} onStart={() => choose(f)} onTry={() => nav(`/fields/${f.id}`)} />)}
      <p className="small muted">Starter fields get a full module once enough people sign up for them.</p>
    </Page>
  )
}

//Profile, Fields: the same list, with the person's field marked
export function FieldsScreen() {
  const nav = useNavigate()
  const { account, refresh } = useAuth()
  return (
    <Page title="Fields" subtitle="What Recall covers today.">
      {FIELDS.map(f => <FieldCard key={f.id} f={f} current={account?.field === f.id}
        onStart={() => { if (account) { updateAccount(account.id, { field: f.id }); refresh() } }} onTry={() => nav(`/fields/${f.id}`)} />)}
    </Page>
  )
}

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

//five sample questions for a starter field, with feedback after each
export function FieldPreview() {
  const nav = useNavigate()
  const { id } = useParams()
  const f = fieldById(id)
  const orders = useMemo(() => (f ? f.samples.map(q => shuffled(Object.keys(q.options))) : []), [f])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [right, setRight] = useState(0)
  if (!f || !f.samples.length) return <Page title="Field not found"><Btn onClick={() => nav('/fields')}>See all fields</Btn></Page>
  const done = i >= f.samples.length
  if (done) {
    return (
      <Page title={f.name} subtitle="Sample finished." back="/fields"
        bottom={<Btn onClick={() => nav('/fields')}>Back to fields</Btn>}>
        <div style={{ background: 'var(--navy)', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="num-l on-dark">{right} of {f.samples.length}</div>
          <p className="body on-dark">answered right</p>
        </div>
        <p className="body">The full {f.name.toLowerCase()} module will cover {f.skills.length} skills: {f.skills.join(', ').toLowerCase()}.</p>
      </Page>
    )
  }
  const q = f.samples[i]
  const letters = ['A', 'B', 'C', 'D']
  return (
    <Page title={f.name} subtitle={`Sample question ${i + 1} of ${f.samples.length} · ${q.skill}`} back="/fields"
      bottom={checked
        ? <Btn onClick={() => { setI(i + 1); setPicked(null); setChecked(false) }}>{i + 1 < f.samples.length ? 'Next question' : 'See result'}</Btn>
        : <Btn off={!picked} onClick={() => { if (!picked) return; setChecked(true); if (picked === q.key) setRight(right + 1) }}>Check answer</Btn>}>
      <p className="title">{q.stem}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} role="group" aria-label="Answers">
        {orders[i].map((k, n) => {
          const cls = !checked ? (picked === k ? 'ans sel' : 'ans') : k === q.key ? 'ans good' : k === picked ? 'ans bad' : 'ans dim'
          return (
            <button key={k} type="button" className={cls} aria-pressed={picked === k} onClick={() => !checked && setPicked(k)}>
              <span className="ltr">{letters[n]}</span><span className="body" style={{ flex: 1 }}>{q.options[k]}</span>
              {checked && k === q.key && <Check label="Right answer" />}
              {checked && k === picked && k !== q.key && <Cross size={16} label="Your answer" />}
            </button>
          )
        })}
      </div>
      {checked && <p className="small" style={{ background: 'var(--paper-2)', borderRadius: 16, padding: '12px 16px' }}>{picked === q.key ? 'Right. ' : 'Not quite. '}{q.why}</p>}
    </Page>
  )
}
