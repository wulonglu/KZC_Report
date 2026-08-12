import { useState, useEffect, useMemo, useRef } from 'react'
import { Package, BarChart3, TrendingDown, AlertTriangle } from 'lucide-react'
import { getToday } from '../lib/utils'
import { markSaved } from '../lib/github'

// ---- Types ----
interface InvProduct {
  brand: string
  name: string
  sku: string
  inventory: number
  sales14d: number
}
interface InvWarehouse {
  brand: string
  product: string
  warehouse: string
  inventory: number
}
interface InvReport {
  date: string
  products: InvProduct[]
  warehouses: InvWarehouse[]
}
interface InvData { reports: InvReport[] }

// ---- Constants ----
const DEFAULT_PRODUCTS: InvProduct[] = [
  { brand: 'Sting', name: '燃爆莓果味 PET350ml*12', sku: 'BSSTA61B0612PE', inventory: 2199, sales14d: 271 },
  { brand: '维动力', name: '柠檬黄瓜 PET450ml*15', sku: 'BSWDA62B0815PE', inventory: 762, sales14d: 79 },
  { brand: '维动力', name: '青柠葡萄柚 PET450ml*15', sku: 'BSWDA63B0815PE', inventory: 744, sales14d: 99 },
]
const DEFAULT_WAREHOUSES: InvWarehouse[] = [
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '关畅_济南', inventory: 721 },
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '越程_广州仓', inventory: 509 },
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '华铂_沈阳', inventory: 313 },
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '越程_长沙仓', inventory: 279 },
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '顶通_成都仓', inventory: 228 },
  { brand: 'Sting', product: '燃爆莓果味 PET350ml*12', warehouse: '顶通_西安仓', inventory: 149 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '越程_长沙仓', inventory: 193 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '关畅_济南', inventory: 161 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '越程_广州仓', inventory: 159 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '华铂_沈阳', inventory: 110 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '顶通_成都仓', inventory: 60 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '顶通_西安仓', inventory: 56 },
  { brand: '维动力', product: '柠檬黄瓜 PET450ml*15', warehouse: '顶通_重庆仓', inventory: 23 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '关畅_济南', inventory: 158 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '越程_广州仓', inventory: 155 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '顶通_成都仓', inventory: 122 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '华铂_沈阳', inventory: 118 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '越程_长沙仓', inventory: 102 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '顶通_西安仓', inventory: 71 },
  { brand: '维动力', product: '青柠葡萄柚 PET450ml*15', warehouse: '顶通_重庆仓', inventory: 18 },
]
const BRAND_COLORS: Record<string, string> = { Sting: '#f39c12', '维动力': '#3498db' }
const BRAND_BG: Record<string, string> = { Sting: 'rgba(243,156,18,.1)', '维动力': 'rgba(52,152,219,.1)' }
const GITHUB_REPO = 'wulonglu/KZC_Report'
const DATA_PATH = 'data/inventory-analysis.json'

// ---- Helpers ----
function getToken() { return localStorage.getItem('gh_token') || '' }
function getConfig() { return { token: getToken(), repo: GITHUB_REPO } }
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
}
function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
}
function fmtNum(n: number) { return n.toLocaleString() }

// ---- Dynamic Chart.js loader ----
let _chartJSPromise: Promise<any> | null = null
function loadChartJS(): Promise<any> {
  if ((window as any).Chart) return Promise.resolve((window as any).Chart)
  if (_chartJSPromise) return _chartJSPromise
  _chartJSPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
    script.onload = () => resolve((window as any).Chart)
    script.onerror = () => reject(new Error('Chart.js load failed'))
    document.head.appendChild(script)
  })
  return _chartJSPromise
}

// ---- Component ----
export default function InventoryAnalysis() {
  const [date, setDate] = useState(getToday())
  const [report, setReport] = useState<InvReport | null>(null)
  const [products, setProducts] = useState<InvProduct[]>(DEFAULT_PRODUCTS.map(p => ({ ...p })))
  const [warehouses] = useState<InvWarehouse[]>(DEFAULT_WAREHOUSES.map(w => ({ ...w })))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdErr, setPwdErr] = useState(false)
  const chartRef1 = useRef<HTMLCanvasElement>(null)
  const chartRef2 = useRef<HTMLCanvasElement>(null)
  const chartsInst = useRef<any[]>([])

  // ---- Load ----
  useEffect(() => {
    setLoading(true)
    const { repo } = getConfig()
    fetch(`https://raw.githubusercontent.com/${repo}/main/${DATA_PATH}?t=${Date.now()}`)
      .then(resp => {
        if (!resp.ok) throw new Error('not found')
        return resp.json()
      })
      .then((data: InvData) => {
        const r = data.reports?.find(r => r.date === date)
        if (r) {
          setReport(r)
          setProducts(r.products)
        } else {
          setReport(null)
          setProducts(DEFAULT_PRODUCTS.map(p => ({ ...p })))
        }
      })
      .catch(() => {
        setReport(null)
        setProducts(DEFAULT_PRODUCTS.map(p => ({ ...p })))
      })
      .finally(() => setLoading(false))
  }, [date])

  // ---- Charts ----
  useEffect(() => {
    chartsInst.current.forEach((c: any) => c?.destroy?.())
    chartsInst.current = []
    if (!report?.products?.length) return

    loadChartJS().then(Chart => {
      if (chartRef1.current) {
        chartsInst.current.push(new Chart(chartRef1.current, {
          type: 'bar',
          data: {
            labels: report.products.map(p => [p.brand, p.name.split(' ')[0]].join('\n')),
            datasets: [
              { label: '库存（箱）', data: report.products.map(p => p.inventory), backgroundColor: report.products.map(p => BRAND_COLORS[p.brand] || '#888'), borderRadius: 6, barThickness: 24 },
              { label: '近14天销量（箱）', data: report.products.map(p => p.sales14d), backgroundColor: 'rgba(255,255,255,.25)', borderRadius: 6, barThickness: 24 },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,.6)', usePointStyle: true, padding: 16, font: { size: 11 } } } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 10 } } },
              x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,.5)', font: { size: 10 } } },
            },
          },
        }))
      }
      if (chartRef2.current) {
        const days = report.products.map(p => {
          const da = p.sales14d / 14
          return da > 0 ? Math.round(p.inventory / da * 10) / 10 : 0
        })
        chartsInst.current.push(new Chart(chartRef2.current, {
          type: 'bar',
          data: {
            labels: report.products.map(p => [p.brand, p.name.split(' ')[0]].join('\n')),
            datasets: [{ label: '周转天数', data: days, backgroundColor: days.map(d => d > 60 ? '#e74c3c' : d > 30 ? '#f39c12' : '#27ae60'), borderRadius: 8, barThickness: 40 }],
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,.5)', font: { size: 10 } } },
              x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: 'rgba(255,255,255,.4)', callback: (v: any) => v + '天', font: { size: 10 } } },
            },
          },
        }))
      }
    })
    return () => { chartsInst.current.forEach((c: any) => c?.destroy?.()) }
  }, [report])

  // ---- Computed ----
  const brandSummary = useMemo(() => {
    if (!products.length) return []
    const brands = [...new Set(products.map(p => p.brand))]
    return brands.map(brand => {
      const items = products.filter(p => p.brand === brand)
      const totalInv = items.reduce((a, p) => a + p.inventory, 0)
      const totalSales14d = items.reduce((a, p) => a + p.sales14d, 0)
      const dailyAvg = totalSales14d / 14
      const turnoverDays = dailyAvg > 0 ? Math.round(totalInv / dailyAvg * 10) / 10 : 0
      return { brand, totalInv, totalSales14d, dailyAvg, turnoverDays, items }
    })
  }, [products])

  const warehouseByBrand = useMemo(() => {
    const grouped: Record<string, InvWarehouse[]> = {}
    for (const w of warehouses) {
      (grouped[w.brand] ??= []).push(w)
    }
    return grouped
  }, [warehouses])

  const conclusions = useMemo(() => {
    const lines: string[] = []
    for (const p of products) {
      const da = p.sales14d / 14
      const days = da > 0 ? Math.round(p.inventory / da * 10) / 10 : 0
      if (days > 60) lines.push(`${p.brand} ${p.name}：库存${p.inventory}箱，周转${days}天，严重偏高，建议加大促销力度。`)
      else if (days > 30) lines.push(`${p.brand} ${p.name}：库存${p.inventory}箱，周转${days}天，偏高，注意监控。`)
    }
    return lines
  }, [products])

  // ---- Save ----
  const save = async () => {
    if (!authed) return
    setSaving(true); setMsg('')
    try {
      const { repo, token } = getConfig()
      const url = `https://api.github.com/repos/${repo}/contents/${DATA_PATH}`
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
      let existing: InvReport[] = []; let sha = ''
      try {
        const resp = await fetch(url, { headers })
        if (resp.ok) {
          const file = await resp.json()
          sha = file.sha
          if (file.content) { const d: InvData = JSON.parse(base64ToUtf8(file.content)); existing = d.reports || [] }
        }
      } catch { /* new */ }
      const nr: InvReport = { date, products, warehouses }
      const idx = existing.findIndex(r => r.date === date)
      if (idx >= 0) existing[idx] = nr
      else existing.push(nr)
      existing.sort((a, b) => a.date.localeCompare(b.date))
      const body: Record<string, string> = { message: `update inventory ${date}`, content: utf8ToBase64(JSON.stringify({ reports: existing }, null, 2)) }
      if (sha) body.sha = sha
      const putResp = await fetch(url, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!putResp.ok) throw new Error((await putResp.json().catch(() => ({}))).message || '保存失败')
      setMsg('保存成功！'); markSaved(); setEditMode(false); setReport(nr)
      window.dispatchEvent(new Event('data_saved'))
    } catch (e: any) { setMsg('保存失败：' + e.message) }
    setSaving(false)
  }

  const unlock = () => {
    if (pwd === 'admin888' || pwd.length >= 20) { localStorage.setItem('gh_token', pwd); setAuthed(true); setShowUnlock(false); setPwdErr(false); setPwd(''); setEditMode(true) }
    else setPwdErr(true)
  }

  const handleEditClick = () => {
    if (authed) {
      setEditMode(!editMode)
    } else {
      setShowUnlock(true)
    }
  }

  const updateProduct = (i: number, field: 'inventory' | 'sales14d', val: string) => {
    setProducts(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: Number(val) || 0 }; return n })
  }

  // ---- Render ----
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Unlock modal - only shown when clicking 录入数据 */}
      {showUnlock && (
        <div onClick={() => setShowUnlock(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(2,13,31,.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(255,255,255,.08)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 20, padding: 36, width: 420, textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 4, fontWeight: 600 }}>🔒 需要授权才能编辑</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginBottom: 20 }}>输入 GitHub Token 或 admin888</p>
            <input type="password" value={pwd} placeholder="ghp_xxxxxxxx (或 admin888)" onChange={e => { setPwd(e.target.value); setPwdErr(false) }} onKeyDown={e => e.key === 'Enter' && unlock()} autoFocus
              style={{ width: '100%', padding: '10px 14px', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 10, background: 'rgba(255,255,255,.05)', color: '#fff', fontFamily: 'inherit' }} />
            {pwdErr && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>密码错误</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowUnlock(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>取消</button>
              <button onClick={unlock} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: 'rgba(0,102,204,.85)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>解锁</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={18} style={{ color: '#f39c12' }} />
            <h2 className="card-title" style={{ marginBottom: 0 }}>Sting & 维动力 库存销量分析</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>日期：</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-dark" />
            <button className="btn-glass btn-outline" onClick={() => setDate(getToday())} disabled={loading} style={{ padding: '6px 12px', fontSize: 12 }}>
              {loading ? '...' : '刷新'}
            </button>
            <button className="btn-glass btn-primary" onClick={handleEditClick} style={{ padding: '6px 14px', fontSize: 12 }}>
              {authed && editMode ? '取消编辑' : authed ? '录入数据' : '🔒 录入数据'}
            </button>
          </div>
        </div>
      </div>

      {/* Data entry form */}
      {editMode && (
        <div className="card-glass" style={{ borderColor: 'rgba(243,156,18,.3)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f39c12', marginBottom: 12 }}>📝 每日数据录入（库存 + 近14天销量）</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-glass" style={{ tableLayout: 'auto', width: 'auto', minWidth: '100%', whiteSpace: 'nowrap' }}>
              <thead><tr><th>品牌</th><th>产品</th><th style={{ textAlign: 'right' }}>库存（箱）</th><th style={{ textAlign: 'right' }}>近14天销量（箱）</th><th style={{ textAlign: 'right' }}>日均</th><th style={{ textAlign: 'right' }}>周转</th></tr></thead>
              <tbody>
                {products.map((p, i) => {
                  const da = p.sales14d / 14
                  const to = da > 0 ? Math.round(p.inventory / da * 10) / 10 : 0
                  return (
                    <tr key={p.sku}>
                      <td><span style={{ color: BRAND_COLORS[p.brand], fontWeight: 600 }}>{p.brand}</span></td>
                      <td style={{ color: '#fff', fontSize: 13 }}>{p.name}</td>
                      <td><input type="number" value={p.inventory || ''} onChange={e => updateProduct(i, 'inventory', e.target.value)} className="input-cell" /></td>
                      <td><input type="number" value={p.sales14d || ''} onChange={e => updateProduct(i, 'sales14d', e.target.value)} className="input-cell" /></td>
                      <td style={{ textAlign: 'right', color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{da.toFixed(1)}/天</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: to > 60 ? '#e74c3c' : to > 30 ? '#f39c12' : '#27ae60' }}>{to > 0 ? `${to}天` : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-glass btn-primary" onClick={save} disabled={saving} style={{ padding: '8px 20px' }}>{saving ? '保存中...' : '保存数据'}</button>
            {msg && <span style={{ fontSize: 13, color: msg.includes('成功') ? '#4ade80' : '#f87171' }}>{msg}</span>}
          </div>
        </div>
      )}

      {/* Brand Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {brandSummary.map(b => (
          <div key={b.brand} className="card-glass" style={{ borderLeft: `3px solid ${BRAND_COLORS[b.brand]}` }}>
            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, marginBottom: 8, background: BRAND_BG[b.brand], color: BRAND_COLORS[b.brand] }}>{b.brand}</span>
            <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>{b.items.map(p => p.name.replace(/PET\d+ml\*\d+/, '')).join(' / ')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>当前库存</div><div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmtNum(b.totalInv)}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>箱</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>近14天销量</div><div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmtNum(b.totalSales14d)}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>箱</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 4 }}>周转天数</div><div style={{ fontSize: 22, fontWeight: 700, color: b.turnoverDays > 60 ? '#e74c3c' : b.turnoverDays > 30 ? '#f39c12' : '#27ae60' }}>{b.turnoverDays.toFixed(1)}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>天</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card-glass" style={{ minHeight: 320 }}>
          <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}><BarChart3 size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />库存 vs 近14天销量</h3>
          <div style={{ height: 260 }}><canvas ref={chartRef1} /></div>
        </div>
        <div className="card-glass" style={{ minHeight: 320 }}>
          <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}><TrendingDown size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />周转天数</h3>
          <div style={{ height: 260 }}><canvas ref={chartRef2} /></div>
        </div>
      </div>

      {/* Warehouse Table */}
      <div className="card-glass">
        <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>分仓库存明细（基准日：8月12日）</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass" style={{ tableLayout: 'auto', width: 'auto', minWidth: '100%', whiteSpace: 'nowrap' }}>
            <thead><tr><th>品牌</th><th>产品</th><th>仓库</th><th style={{ textAlign: 'right' }}>库存（箱）</th><th style={{ textAlign: 'right' }}>占比</th></tr></thead>
            <tbody>
              {Object.entries(warehouseByBrand).map(([brand, whs]) => {
                const brandTotal = whs.reduce((a, w) => a + w.inventory, 0)
                return [
                  ...whs.map(w => {
                    const pct = brandTotal > 0 ? (w.inventory / brandTotal * 100) : 0
                    return (
                      <tr key={`${w.warehouse}-${w.product}`}>
                        <td><span style={{ color: BRAND_COLORS[brand], fontWeight: 600 }}>{brand}</span></td>
                        <td>{w.product}</td>
                        <td>{w.warehouse}</td>
                        <td style={{ textAlign: 'right' }}><span style={{ display: 'inline-block', height: 7, borderRadius: 3, marginRight: 6, verticalAlign: 'middle', background: BRAND_COLORS[brand], width: Math.max(3, Math.round(w.inventory / brandTotal * 120)) }} />{fmtNum(w.inventory)}</td>
                        <td style={{ textAlign: 'right' }}>{pct.toFixed(1)}%</td>
                      </tr>
                    )
                  }),
                  <tr key={`sub-${brand}`} style={{ background: 'rgba(255,255,255,.04)' }}>
                    <td colSpan={3} style={{ fontWeight: 700, color: '#fff' }}>{brand} 小计</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff' }}>{fmtNum(brandTotal)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff' }}>100%</td>
                  </tr>,
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conclusions */}
      {conclusions.length > 0 && (
        <div className="card-glass" style={{ borderLeft: '3px solid #e74c3c' }}>
          <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}><AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2, color: '#e74c3c' }} />分析结论与建议</h3>
          <ul style={{ paddingLeft: 20 }}>
            {conclusions.map((c, i) => (
              <li key={i} style={{ marginBottom: 8, fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.8 }}><span style={{ color: '#f87171', fontWeight: 600 }}>⚠ </span>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
