import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBtn } from './ui'
import type { Section } from '../pilot/legal'

//a plain subpage: back button, title, scrolling body and an optional bottom area
export function Page({ title, subtitle, back = -1, children, bottom }: { title: string; subtitle?: string; back?: string | -1; children: ReactNode; bottom?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="screen">
      <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'center' }}>
          <IconBtn aria-label="Back" onClick={() => (back === -1 ? nav(-1) : nav(back))} />
        </div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="small muted">{subtitle}</p>}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>{children}</div>
      {bottom && <div className="safe-bottom" style={{ padding: '0 24px 24px 24px' }}>{bottom}</div>}
    </div>
  )
}

export function Sections({ sections }: { sections: Section[] }) {
  return (
    <>
      {sections.map(s => (
        <section key={s.h} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 className="body-b">{s.h}</h2>
          {s.p.map((t, i) => <p key={i} className="small">{t}</p>)}
        </section>
      ))}
    </>
  )
}

export function TextField({ id, label, type = 'text', value, onChange, autoComplete, hint }:
  { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={id} className="small-b">{label}</label>
      <div className="field" style={{ height: 56, display: 'flex', alignItems: 'center' }}>
        <input id={id} type={type} className="body" style={{ width: '100%', cursor: 'text' }} value={value} autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)} />
      </div>
      {hint && <p className="cap muted">{hint}</p>}
    </div>
  )
}

//a tappable row that opens a subpage
export function LinkRow({ label, detail, onClick }: { label: string; detail?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ans ans-cream" style={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 56 }}>
      <span className="body-m">{label}</span>
      {detail && <span className="small muted">{detail}</span>}
    </button>
  )
}

export function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null
  return <p role="alert" className="small" style={{ background: 'var(--sand)', borderRadius: 16, padding: '12px 16px' }}>{text}</p>
}
