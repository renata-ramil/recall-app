import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Btn({ cream, off, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { cream?: boolean; off?: boolean }) {
  const cls = ['btn', cream ? 'btn-cream' : '', off ? 'btn-off' : '', className].filter(Boolean).join(' ')
  return <button type="button" className={cls} disabled={off} aria-disabled={off || undefined} {...rest} />
}

export function Chevron() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  )
}

export function Check({ size = 16, width = 3.5, label }: { size?: number; width?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function Cross({ size = 20, width = 3, label }: { size?: number; width?: number; label?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconBtn({ mist, fill, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { mist?: boolean; fill?: string }) {
  return (
    <button type="button" className={`icon-btn${mist ? ' icon-btn-mist' : ''}`} style={fill ? { background: fill } : undefined} {...rest}>
      <Chevron />
    </button>
  )
}

export function Segments({ total, current, emptyFill }: { total: number; current: number; emptyFill?: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }} role="img" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const cls = n < current ? 'seg done' : n === current ? 'seg on' : 'seg'
        return <div key={n} className={cls} style={n > current && emptyFill ? { background: emptyFill } : undefined} />
      })}
    </div>
  )
}

export function Opt({ selected, paper, mist, className = '', children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; paper?: boolean; mist?: boolean; children: ReactNode }) {
  const cls = ['opt', paper ? 'opt-paper' : '', mist ? 'opt-mist' : '', selected ? 'sel' : '', className].filter(Boolean).join(' ')
  return <button type="button" className={cls} aria-pressed={selected} {...rest}>{children}</button>
}

export function StepHeader({ step, total, title, subtitle, onBack, nowrap }:
  { step: number; total: number; title: string; subtitle?: string; onBack?: () => void; nowrap?: boolean }) {
  return (
    <div className="safe-top" style={{ padding: '48px 24px 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }}>
        {onBack && <IconBtn aria-label="Back" onClick={onBack} />}
        <span className="small-b">Step {step} of {total}</span>
      </div>
      <div style={{ marginBottom: 8 }}><Segments total={total} current={step} /></div>
      <h1 className="h1" style={nowrap ? { whiteSpace: 'nowrap' } : undefined}>{title}</h1>
      {subtitle && <p className="small muted">{subtitle}</p>}
    </div>
  )
}

export function BottomBar({ children, top = 12 }: { children: ReactNode; top?: number }) {
  return <div className="safe-bottom sticky-bottom" style={{ padding: `${top}px 24px 24px 24px`, background: 'var(--cream)' }}>{children}</div>
}

export function Nav({ active, onGo }: { active: 'today' | 'skills' | 'profile'; onGo: (t: 'today' | 'skills' | 'profile') => void }) {
  const tabs: Array<['today' | 'skills' | 'profile', string]> = [['today', 'Today'], ['skills', 'Skills'], ['profile', 'Profile']]
  return (
    <nav className="nav" aria-label="Main">
      {tabs.map(([k, label]) => (
        <button key={k} type="button" className={active === k ? 'on' : undefined} aria-current={active === k ? 'page' : undefined} onClick={() => onGo(k)}>{label}</button>
      ))}
    </nav>
  )
}

export function Note({ children, margin }: { children: ReactNode; margin?: string }) {
  return <p className="small muted" style={{ margin, background: 'var(--paper-2)', borderRadius: 16, padding: '12px 16px' }}>{children}</p>
}
