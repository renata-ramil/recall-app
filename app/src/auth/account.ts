//accounts for the main app. This version has no server: accounts live in this browser only,
//and passwords are stored as a salted PBKDF2 hash, never as plain text.

export const TERMS_VERSION = '2026-11-20'

export interface Account {
  id: string
  name: string
  email: string
  salt: string
  hash: string
  createdAt: string
  termsVersion: string
  termsAcceptedAt: string
  field: string | null
  lastLoginAt: string | null
  logins: string[]
}

const ACCOUNTS = 'recall.accounts'
//each account keeps its own app state, so two people on one device do not share progress
export const appKey = (id: string | null | undefined) => (id ? `recall.v2.${id}` : 'recall.v2')
const CURRENT = 'recall.current'
const ITERATIONS = 150000

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

const hex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => new Uint8Array(s.match(/.{2}/g)!.map(h => parseInt(h, 16)))

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' }, key, 256)
  return hex(bits)
}

export const normalEmail = (e: string) => e.trim().toLowerCase()
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

//at least 8 characters with a letter and a number
export function passwordProblems(p: string): string[] {
  const out: string[] = []
  if (p.length < 8) out.push('at least 8 characters')
  if (!/[A-Za-z]/.test(p)) out.push('a letter')
  if (!/[0-9]/.test(p)) out.push('a number')
  return out
}

export function accounts(): Account[] { return read<Account[]>(ACCOUNTS, []) }
function saveAccounts(list: Account[]) { write(ACCOUNTS, list) }

export function currentAccount(): Account | null {
  const id = read<string | null>(CURRENT, null)
  return accounts().find(a => a.id === id) ?? null
}

export async function signUp(name: string, email: string, password: string): Promise<Account> {
  const e = normalEmail(email)
  if (accounts().some(a => a.email === e)) throw new Error('An account with this email already exists on this device. Log in instead.')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const now = new Date().toISOString()
  const acc: Account = {
    id: hex(crypto.getRandomValues(new Uint8Array(8))), name: name.trim(), email: e, salt, hash: await hashPassword(password, salt),
    createdAt: now, termsVersion: TERMS_VERSION, termsAcceptedAt: now, field: null, lastLoginAt: now, logins: [now],
  }
  saveAccounts([...accounts(), acc])
  write(CURRENT, acc.id)
  return acc
}

export async function logIn(email: string, password: string): Promise<Account> {
  const acc = accounts().find(a => a.email === normalEmail(email))
  //the same message for a wrong email and a wrong password, so the form does not reveal which accounts exist
  if (!acc || (await hashPassword(password, acc.salt)) !== acc.hash) throw new Error('That email and password do not match.')
  const now = new Date().toISOString()
  updateAccount(acc.id, { lastLoginAt: now, logins: [now, ...acc.logins].slice(0, 10) })
  write(CURRENT, acc.id)
  return { ...acc, lastLoginAt: now }
}

export function logOut() { write(CURRENT, null) }

export function updateAccount(id: string, patch: Partial<Account>) {
  saveAccounts(accounts().map(a => (a.id === id ? { ...a, ...patch } : a)))
}

export async function changePassword(id: string, oldPw: string, newPw: string) {
  const acc = accounts().find(a => a.id === id)
  if (!acc || (await hashPassword(oldPw, acc.salt)) !== acc.hash) throw new Error('Your current password is not right.')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  updateAccount(id, { salt, hash: await hashPassword(newPw, salt) })
}

export function deleteAccount(id: string) {
  saveAccounts(accounts().filter(a => a.id !== id))
  try { localStorage.removeItem(appKey(id)) } catch { /* ignore */ }
  logOut()
}

//everything this device holds for the account, without the password hash
export function exportData(acc: Account): string {
  const { salt: _s, hash: _h, ...profile } = acc
  let app: unknown = null
  try { app = JSON.parse(localStorage.getItem(appKey(acc.id)) ?? 'null') } catch { /* ignore */ }
  return JSON.stringify({ exportedAt: new Date().toISOString(), account: profile, app }, null, 2)
}
