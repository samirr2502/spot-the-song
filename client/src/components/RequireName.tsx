import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getPlayerName } from '../lib/session'

type RequireNameProps = {
  children: ReactNode
}

export function RequireName({ children }: RequireNameProps) {
  const location = useLocation()
  const name = getPlayerName()

  if (!name) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
