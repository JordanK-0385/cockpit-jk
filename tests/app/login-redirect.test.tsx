import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState = { authorized: false, loading: false, user: null as unknown }

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/pages/Login', () => ({
  Login: () => <div data-testid="login-page">LOGIN</div>,
}))

vi.mock('@/pages/Cockpit', () => ({
  Cockpit: () => <div data-testid="cockpit-page">COCKPIT</div>,
}))

vi.mock('@/components/ambient/AmbientLayer', () => ({
  AmbientLayer: () => null,
}))

vi.mock('@/components/ui/Loader', () => ({
  Loader: ({ label }: { label?: string }) => <div data-testid="loader">{label}</div>,
}))

import App from '@/App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing — login gate', () => {
  beforeEach(() => {
    authState.authorized = false
    authState.loading = false
    authState.user = null
  })

  it('redirects an unauthenticated user from / to the login page', () => {
    renderAt('/')
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.queryByTestId('cockpit-page')).not.toBeInTheDocument()
  })

  it('renders the cockpit at / when the user is authorized', () => {
    authState.authorized = true
    authState.user = { email: 'jordan.koskas@gmail.com' }
    renderAt('/')
    expect(screen.getByTestId('cockpit-page')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('sends an authorized user away from /login back to /', () => {
    authState.authorized = true
    authState.user = { email: 'jordan.koskas@gmail.com' }
    renderAt('/login')
    expect(screen.getByTestId('cockpit-page')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })

  it('shows a loader while auth state is still loading', () => {
    authState.loading = true
    renderAt('/')
    expect(screen.getByTestId('loader')).toBeInTheDocument()
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cockpit-page')).not.toBeInTheDocument()
  })
})
