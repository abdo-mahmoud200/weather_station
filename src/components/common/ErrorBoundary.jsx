import { Component } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Application error boundary caught an error:', error, info)
  }

  handleReset = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
        <div className="w-full max-w-xl rounded-2xl border border-accent-danger/25 bg-bg-surface p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent-danger/30 bg-accent-dangerSoft text-accent-danger">
              <AlertTriangle size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold text-text-primary">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                The page hit an unexpected runtime error. Use one of the actions below to recover.
              </p>
              <div className="mt-4 rounded-lg border border-bg-border bg-bg-base/60 p-3 font-mono text-xs text-text-muted">
                {this.state.error?.message || 'Unknown application error'}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400"
                >
                  <Home size={15} />
                  Back to dashboard
                </button>
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center gap-2 rounded-md border border-bg-border bg-bg-elevated px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-surface"
                >
                  <RefreshCw size={15} />
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
