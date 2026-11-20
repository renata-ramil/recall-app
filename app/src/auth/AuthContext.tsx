import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { currentAccount, type Account } from './account'

interface Auth { account: Account | null; refresh: () => void }
const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(currentAccount)
  const refresh = useCallback(() => setAccount(currentAccount()), [])
  const value = useMemo(() => ({ account, refresh }), [account, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): Auth {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth outside AuthProvider')
  return a
}
