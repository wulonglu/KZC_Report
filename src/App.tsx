import { useState, useEffect } from 'react'
import { Lock, Eye, History } from 'lucide-react'
import DataEntry from './components/DataEntry'
import DailyReport from './components/DailyReport'
import HistoryQuery from './components/HistoryQuery'

type Tab = 'entry' | 'report' | 'history'

export default function App() {
  const [tab, setTab] = useState<Tab>('report')

  const tabs = [
    { key: 'entry' as Tab, label: '数据录入', icon: Lock },
    { key: 'report' as Tab, label: '日报查看', icon: Eye },
    { key: 'history' as Tab, label: '历史查询', icon: History },
  ]

  // 百事可乐 Logo
  const PepsiLogo = () => (
    <img
      src="data:image/png;base64,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"
      alt="百事可乐"
      style={{ width: 32, height: 23, flexShrink: 0 }}
    />
  )

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 20% 0%, #0a2a5e 0%, #041832 50%, #020d1f 100%)',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(4,24,50,.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PepsiLogo />
              <div>
                <h1 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.3px', margin: 0 }}>百事可乐日报系统</h1>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.5px' }}>开发：吴龙录</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 2, marginBottom: -1 }}>
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '7px 18px', fontSize: 11, fontWeight: 500, border: 'none',
                    background: active ? 'rgba(255,255,255,.15)' : 'none',
                    cursor: 'pointer', borderRadius: 8,
                    color: active ? '#fff' : 'rgba(255,255,255,.45)',
                    transition: 'all .2s', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4" style={{ padding: '24px 20px' }}>
        {tab === 'entry' && <DataEntry />}
        {tab === 'report' && <DailyReport />}
        {tab === 'history' && <HistoryQuery onViewDate={(d) => { setTab('report'); localStorage.setItem('view_date', d); window.dispatchEvent(new Event('view_date_change')) }} />}
      </main>
    </div>
  )
}
