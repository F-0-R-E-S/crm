import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import clsx from 'clsx'

interface Template {
  id: string
  name: string
  description: string
  category: string
  steps: string[]
  default_config: { estimated_minutes?: number }
}

interface Step {
  id: string
  label: string
  description: string
  completed: boolean
  current: boolean
}

interface OnboardingState {
  state: {
    id: string
    current_step: string
    completed_steps: string[]
    template_id: string
    completed_at: string | null
  }
  steps: Step[]
  progress_pct: number
  status: string
}

const STEP_TIPS: Record<string, { tip: string; cta: string; href: string }> = {
  company_setup: { tip: 'Configure your company name, plan, and basic settings.', cta: 'Go to Settings', href: '/settings' },
  team_setup: { tip: 'Invite your team members and assign roles.', cta: 'Go to Users', href: '/users' },
  first_broker: { tip: 'Connect your first broker integration.', cta: 'Go to Brokers', href: '/brokers' },
  broker_templates: { tip: 'Select from 200+ pre-built broker templates.', cta: 'Go to Brokers', href: '/brokers' },
  first_affiliate: { tip: 'Create your first affiliate with API key.', cta: 'Go to Affiliates', href: '/affiliates' },
  affiliate_setup: { tip: 'Configure affiliates, postbacks, and caps.', cta: 'Go to Affiliates', href: '/affiliates' },
  affiliate_hierarchy: { tip: 'Set up affiliate levels and sub-accounts.', cta: 'Go to Affiliates', href: '/affiliates' },
  first_rule: { tip: 'Create your first lead distribution rule.', cta: 'Go to Routing', href: '/routing' },
  routing_rules: { tip: 'Configure lead distribution rules.', cta: 'Go to Routing', href: '/routing' },
  fraud_config: { tip: 'Set up anti-fraud checks and thresholds.', cta: 'Go to Settings', href: '/settings' },
  cap_setup: { tip: 'Set daily and total caps for affiliates and brokers.', cta: 'Go to Affiliates', href: '/affiliates' },
  notifications: { tip: 'Set up Telegram, email, and webhook alerts.', cta: 'Configure Notifications', href: '/settings/notifications' },
  telegram_bot: { tip: 'Connect your Telegram bot for real-time alerts.', cta: 'Configure Notifications', href: '/settings/notifications' },
  api_keys: { tip: 'Generate API keys for affiliate access.', cta: 'Go to Settings', href: '/settings' },
  test_lead: { tip: 'Send a test lead to verify the flow end-to-end.', cta: 'Go to Leads', href: '/leads' },
  complete: { tip: 'Your setup is complete! Start distributing leads.', cta: 'Go to Dashboard', href: '/dashboard' },
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'loading' | 'template_select' | 'wizard'>('loading')
  const [templates, setTemplates] = useState<Template[]>([])
  const [state, setState] = useState<OnboardingState | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    loadState()
  }, [])

  async function loadState() {
    try {
      const res = await api.get<OnboardingState | { status: string }>('/onboarding')
      if ('state' in res && res.state) {
        setState(res as OnboardingState)
        setPhase('wizard')
      } else {
        const tpl = await api.get<{ templates: Template[] }>('/onboarding/templates')
        setTemplates(tpl.templates || [])
        setPhase('template_select')
      }
    } catch {
      const tpl = await api.get<{ templates: Template[] }>('/onboarding/templates')
      setTemplates(tpl.templates || [])
      setPhase('template_select')
    }
  }

  async function startWizard(templateId: string) {
    try {
      await api.post('/onboarding/start', { template_id: templateId })
      await loadState()
    } catch { /* ignore */ }
  }

  async function completeStep(stepId: string) {
    setCompleting(true)
    try {
      await api.put(`/onboarding/step/${stepId}/data`, {
        touched_at: new Date().toISOString(),
        source: 'web_ui',
      })
      await api.post(`/onboarding/step/${stepId}/complete`, {})
      await loadState()
    } catch { /* ignore */ }
    setCompleting(false)
  }

  if (phase === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (phase === 'template_select') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to GambChamp CRM</h2>
          <p className="text-gray-500">Choose a setup template to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <button key={tpl.id} onClick={() => startWizard(tpl.id)}
              className="text-left bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-brand-400 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{tpl.category}</span>
                {tpl.default_config.estimated_minutes && (
                  <span className="text-xs text-gray-400">~{tpl.default_config.estimated_minutes} min</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{tpl.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{tpl.description}</p>
              <div className="text-xs text-gray-400">{tpl.steps.length} steps</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!state) return null
  const { steps, progress_pct, status } = state

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Setup Wizard</h2>
          <span className="text-sm font-medium text-gray-500">{progress_pct}% complete</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${progress_pct}%` }} />
        </div>
        {status === 'completed' && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-medium">Setup complete! Your CRM is ready.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {(steps || []).map((step, idx) => {
          const tip = STEP_TIPS[step.id]
          return (
            <div key={step.id}
              className={clsx(
                'bg-white rounded-xl border p-4 transition-all',
                step.current ? 'border-brand-400 shadow-md' : step.completed ? 'border-green-200' : 'border-gray-200'
              )}>
              <div className="flex items-center gap-4">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  step.completed ? 'bg-green-100 text-green-700' : step.current ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'
                )}>
                  {step.completed ? '\u2713' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{step.label}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {step.current && !step.completed && (
                  <div className="flex gap-2">
                    {tip?.href && (
                      <button onClick={() => navigate(tip.href)}
                        className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs hover:bg-gray-50">
                        {tip.cta}
                      </button>
                    )}
                    <button onClick={() => completeStep(step.id)} disabled={completing}
                      className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs hover:bg-brand-700 disabled:opacity-50">
                      {completing ? '...' : 'Mark Complete'}
                    </button>
                  </div>
                )}
                {step.completed && (
                  <span className="text-xs text-green-600 font-medium">Done</span>
                )}
              </div>
              {step.current && tip && (
                <div className="mt-3 pl-12 text-xs text-gray-500">{tip.tip}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
