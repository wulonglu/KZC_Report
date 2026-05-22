import { useState } from 'react'
import { DailyReport, StoreData } from '../types'
import { loadDateRange } from '../lib/github'
import { getToday, getDateRange, formatMoney, formatNumber } from '../lib/utils'

const RANGE_PRESETS = ['今日', '昨日', '本周', '上周', '本月', '上月']

interface Props { onViewDate: (date: string) => void }

export default function HistoryQuery({ onViewDate }: Props) {
  const [start, setStart] = useState(getToday())
  const [end, setEnd] = useState(getToday())
  const [results, setResults] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(false)

  const query = async () => {
    setLoading(true)
    try { setResults(await loadDateRange(start, end)) } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="card-glass">
      <h2 className="card-title">历史数据清单</h2>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', marginBottom: 12 }}>（点击日期快速查看）</div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.4)', marginBottom: 8 }}>查询范围：</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {RANGE_PRESETS.map(l => (
            <button key={l} className="btn-glass btn-outline" onClick={() => {
              const r = getDateRange(l); setStart(r[0]); setEnd(r[1])
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input-dark" />
          <span style={{ color: 'rgba(255,255,255,.3)' }}>至</span>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-dark" />
          <button className="btn-glass btn-primary" onClick={query} disabled={loading}>
            {loading ? '查询中...' : '查询'}
          </button>
          <button className="btn-glass btn-outline" onClick={() => {
            if (!results.length) return
            let csv = '\uFEFF日期,店铺,平台,目标GMV,支付金额,退款金额,去年同期,访客数,买家数,销售件数\n'
            results.forEach(r => {
              r.stores.forEach((s: StoreData) => {
                csv += `${r.date},${s.name},${s.platform},${s.targetGmv},${s.paymentAmount},${s.refundAmount},${s.lastYearSame},${s.visitors},${s.buyers},${s.salesCount}\n`
              })
            })
            const b = new Blob([csv], { type: 'application/vnd.ms-excel' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `历史_${start}_${end}.xls`; a.click()
          }}>导出Excel</button>
        </div>
      </div>

      {results.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>日期</th><th>店铺</th><th style={{ textAlign: 'right' }}>目标GMV</th><th style={{ textAlign: 'right' }}>支付金额</th>
                <th style={{ textAlign: 'right' }}>退款金额</th><th style={{ textAlign: 'right' }}>去退GMV</th>
                <th style={{ textAlign: 'right' }}>访客数</th><th style={{ textAlign: 'right' }}>买家数</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {results.reduce((arr: any[], r) => {
                return arr.concat(r.stores.map((s: StoreData, si: number) => {
                  const rowSpan = si === 0 ? r.stores.length : 0
                  return (
                    <tr key={r.date + '-' + s.name}>
                      {si === 0 && (
                        <td rowSpan={r.stores.length} style={{ fontWeight: 600, color: '#60a5fa', cursor: 'pointer', verticalAlign: 'top' }}
                          onClick={() => onViewDate(r.date)}>{r.date}</td>
                      )}
                      <td style={{ color: '#fff' }}>
                        <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 11 }}>[{s.platform}]</span> {s.name}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.targetGmv)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.paymentAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.refundAmount)}</td>
                      <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(s.paymentAmount - s.refundAmount)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(s.visitors)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(s.buyers)}</td>
                      {si === 0 && (
                        <td style={{ verticalAlign: 'top' }}>
                          <button className="btn-glass btn-outline" style={{ fontSize: 11 }}
                            onClick={() => onViewDate(r.date)}>查看详情</button>
                        </td>
                      )}
                    </tr>
                  )
                }))
              }, [] as any[])}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">选择时间范围后点击"查询"</div>
      )}
    </div>
  )
}
