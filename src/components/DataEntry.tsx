import { useState, useEffect, useCallback } from 'react'
import { StoreData, DailyReport, STORES, emptyStore } from '../types'
import { saveReport, loadMonth } from '../lib/github'
import { getToday } from '../lib/utils'

function getToken() { return localStorage.getItem('gh_token') || '' }

export default function DataEntry() {
  const [locked, setLocked] = useState(true)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState(false)
  const [date, setDate] = useState(getToday())
  const [stores, setStores] = useState<StoreData[]>(
    STORES.map(s => emptyStore(s.name, s.platform))
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadingLastYear, setLoadingLastYear] = useState(false)

  // 选择日期后自动加载去年同期数据
  const autoFillLastYear = useCallback(async (d: string) => {
    const [y, rest] = [d.substring(0, 4), d.substring(4)]
    const lyDate = `${Number(y) - 1}${rest}`
    setLoadingLastYear(true)
    try {
      const lyData = await loadMonth(lyDate)
      const lyReport = lyData.find(r => r.date === lyDate)
      if (lyReport) {
        setStores(prev => prev.map(s => {
          const lyStore = lyReport.stores.find(ls => ls.name === s.name)
          const lyNet = lyStore ? (lyStore.paymentAmount || 0) - (lyStore.refundAmount || 0) : 0
          return { ...s, lastYearSame: lyNet }
        }))
        setMsg('去年同期数据已自动填充')
      }
    } catch { /* 加载失败不影响使用 */ }
    setLoadingLastYear(false)
  }, [])

  useEffect(() => {
    setMsg('')
    autoFillLastYear(date)
  }, [date, autoFillLastYear])

  const fields: (keyof StoreData)[] = ['targetGmv', 'paymentAmount', 'refundAmount', 'lastYearSame', 'visitors', 'buyers', 'salesCount']
  const labels: Record<string, string> = {
    targetGmv: '目标GMV', paymentAmount: '支付金额', refundAmount: '退款金额',
    lastYearSame: '去年同期', visitors: '访客数', buyers: '买家数', salesCount: '销售件数',
  }

  const unlock = () => {
    if (pwd === 'admin888' || pwd.length >= 20) {
      localStorage.setItem('gh_token', pwd)
      setLocked(false); setPwdErr(false)
    } else setPwdErr(true)
  }

  const update = (i: number, f: keyof StoreData, v: string) => {
    setStores(prev => { const n = [...prev]; n[i] = { ...n[i], [f]: v }; return n })
  }

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await saveReport({
        date,
        stores: stores.map(s => ({
          ...s,
          targetGmv: Number(s.targetGmv) || 0,
          paymentAmount: Number(s.paymentAmount) || 0,
          refundAmount: Number(s.refundAmount) || 0,
          lastYearSame: Number(s.lastYearSame) || 0,
          visitors: Number(s.visitors) || 0,
          buyers: Number(s.buyers) || 0,
          salesCount: Number(s.salesCount) || 0,
        })),
      })
      setMsg('保存成功！')
    } catch (e: any) { setMsg('保存失败：' + e.message) }
    setSaving(false)
  }

  return (
    <div>
      {locked && (
        <div className="lock-overlay">
          <div className="lock-box">
            <svg width="40" height="40" viewBox="0 0 100 100" style={{ margin: '0 auto 16px', display: 'block' }}>
              <circle cx="50" cy="50" r="48" fill="#0066cc"/>
              <circle cx="50" cy="50" r="48" fill="url(#lockGrad)"/>
              <defs>
                <clipPath id="lockClip"><circle cx="50" cy="50" r="46"/></clipPath>
                <linearGradient id="lockGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0066cc"/>
                  <stop offset="38%" stopColor="#0066cc"/>
                  <stop offset="42%" stopColor="white"/>
                  <stop offset="58%" stopColor="white"/>
                  <stop offset="62%" stopColor="#e32934"/>
                  <stop offset="100%" stopColor="#e32934"/>
                </linearGradient>
              </defs>
              <g clipPath="url(#lockClip)">
                <ellipse cx="45" cy="48" rx="55" ry="12" fill="white" transform="rotate(-5 50 50)"/>
              </g>
            </svg>
            <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 4, fontWeight: 600 }}>需要授权才能编辑</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 20 }}>输入 GitHub Token 解锁（仅需 repo 权限）</p>
            <input
              type="password" value={pwd}
              placeholder="ghp_xxxxxxxx (或 admin888)"
              onChange={e => { setPwd(e.target.value); setPwdErr(false) }}
              onKeyDown={e => e.key === 'Enter' && unlock()}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 10,
                background: 'rgba(255,255,255,.05)', color: '#fff', fontFamily: 'inherit',
              }}
            />
            {pwdErr && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>密码错误，请输入有效的 GitHub Token</div>}
            <button className="btn-glass btn-primary" onClick={unlock} style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
              解锁
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,.25)' }}>浏览数据无需输入，编辑需要授权</div>
          </div>
        </div>
      )}

      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>数据录入</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>选择日期：</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-dark" />
            <button className="btn-glass btn-primary" onClick={save} disabled={saving}>
              {saving ? '保存中...' : '保存数据'}
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th style={{ width: 180 }}>店铺</th>
                {fields.map(f => <th key={f} style={{ textAlign: 'right' }}>{labels[f]}</th>)}
              </tr>
            </thead>
            <tbody>
              {stores.map((s, i) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 11 }}>[{s.platform}]</span> {s.name}
                  </td>
                  {fields.map(f => (
                    <td key={f}>
                      <input
                        type="number"
                        value={(s as any)[f]}
                        onChange={e => update(i, f, e.target.value)}
                        className="input-cell"
                        placeholder={f === 'lastYearSame' ? '自动填充' : '0'}
                        style={f === 'lastYearSame' && (s as any)[f] ? {
                          background: 'rgba(0,102,204,.1)',
                          borderColor: 'rgba(0,102,204,.2)',
                        } : undefined}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {msg && (
          <div className={msg.includes('成功') ? 'msg msg-ok' : 'msg msg-err'} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, marginTop: 12 }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}
