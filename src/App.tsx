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
    <svg width="32" height="32" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2"/>
      <defs>
        <clipPath id="pepsiClip"><circle cx="50" cy="50" r="46"/></clipPath>
      </defs>
      <g clipPath="url(#pepsiClip)">
        <rect x="0" y="0" width="100" height="40" fill="#0066cc"/>
        <path d="M0,40 Q25,55 50,40 Q75,25 100,40 L100,52 Q75,37 50,52 Q25,67 0,52 Z" fill="#ffffff"/>
        <rect x="0" y="60" width="100" height="40" fill="#e32934"/>
      </g>
    </svg>
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
