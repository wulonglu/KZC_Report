import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DailyReport, StoreData, computeMetrics, STORES, StoreMetrics } from '../types'
import { loadDateRange } from '../lib/github'
import { getToday, getDateRange, formatMoney, formatPercent, formatNumber } from '../lib/utils'

const RANGE_PRESETS = ['今日', '昨日', '本周', '上周', '本月', '上月']
const chartGrid = { stroke: 'rgba(255,255,255,.04)', strokeDasharray: '3 3' }
const chartAxis = { tick: { fontSize: 11, fill: 'rgba(255,255,255,.55)', fontWeight: 500 }, axisLine: { stroke: 'rgba(255,255,255,.1)' }, tickLine: false }

interface Props { onViewDate: (date: string) => void }

export default function HistoryQuery({ onViewDate }: Props) {
  const [start, setStart] = useState(getToday())
  const [end, setEnd] = useState(getToday())
  const [results, setResults] = useState<DailyReport[]>([])
  const [lyResults, setLyResults] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(false)

  const query = async () => {
    setLoading(true)
    try {
      const data = await loadDateRange(start, end)
      setResults(data)
      // 去年同期
      const [y] = start.split('-')
      const lyStart = `${Number(y)-1}-${start.substring(5)}`
      const lyEnd = `${Number(y)-1}-${end.substring(5)}`
      const lyData = await loadDateRange(lyStart, lyEnd)
      setLyResults(lyData)
    } catch (e) { setResults([]); setLyResults([]) }
    setLoading(false)
  }

  // 汇总所有店铺数据
  const summary = useMemo(() => {
    if (!results.length) return null
    const storeMap: Record<string, { name: string; platform: string; pay: number; refund: number; target: number; lastYear: number; visitors: number; buyers: number }> = {}
    results.forEach(r => {
      r.stores.forEach(s => {
        if (!storeMap[s.name]) storeMap[s.name] = { name: s.name, platform: s.platform, pay: 0, refund: 0, target: 0, lastYear: 0, visitors: 0, buyers: 0 }
        storeMap[s.name].pay += s.paymentAmount
        storeMap[s.name].refund += s.refundAmount
        storeMap[s.name].target += s.targetGmv
        storeMap[s.name].visitors += s.visitors
        storeMap[s.name].buyers += s.buyers
      })
    })
    // 去年同期
    lyResults.forEach(r => {
      r.stores.forEach(s => {
        const net = s.paymentAmount - s.refundAmount
        if (!storeMap[s.name]) storeMap[s.name] = { name: s.name, platform: s.platform, pay: 0, refund: 0, target: 0, lastYear: 0, visitors: 0, buyers: 0 }
        storeMap[s.name].lastYear += net
      })
    })
    const stores = Object.values(storeMap).map(s => {
      const net = s.pay - s.refund
      return {
        name: s.name, platform: s.platform,
        pay: s.pay, refund: s.refund, netGmv: net, target: s.target, lastYear: s.lastYear,
        visitors: s.visitors, buyers: s.buyers,
        yoy: s.lastYear > 0 ? ((net - s.lastYear) / s.lastYear * 100) : 0,
        rate: s.target > 0 ? (net / s.target * 100) : 0,
      }
    })
    const totalNet = stores.reduce((a, s) => a + s.netGmv, 0)
    const totalLastYear = stores.reduce((a, s) => a + s.lastYear, 0)
    const totalTarget = stores.reduce((a, s) => a + s.target, 0)
    const totalPay = stores.reduce((a, s) => a + s.pay, 0)
    const totalRefund = stores.reduce((a, s) => a + s.refund, 0)
    const totalVisitors = stores.reduce((a, s) => a + s.visitors, 0)
    const totalBuyers = stores.reduce((a, s) => a + s.buyers, 0)
    return {
      days: results.length,
      stores,
      totals: {
        netGmv: totalNet, target: totalTarget, pay: totalPay, refund: totalRefund,
        lastYear: totalLastYear, visitors: totalVisitors, buyers: totalBuyers,
        yoy: totalLastYear > 0 ? ((totalNet - totalLastYear) / totalLastYear * 100) : 0,
        rate: totalTarget > 0 ? (totalNet / totalTarget * 100) : 0,
      },
    }
  }, [results])

  // 每日趋势
  const dailyTrend = useMemo(() => {
    return results.map(r => ({
      date: r.date.substring(5),
      fullDate: r.date,
      net: r.stores.reduce((a, s) => a + s.paymentAmount - s.refundAmount, 0),
    }))
  }, [results])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 查询条件 */}
      <div className="card-glass">
        <h2 className="card-title">历史数据查询</h2>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', marginBottom: 12 }}>选择日期范围查看区间汇总数据</div>
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

      {summary && (
        <>
          {/* 指标卡片 */}
          <div className="card-glass">
            <h2 className="card-title">区间汇总指标 <span style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', fontWeight: 400 }}>
              {start} ~ {end} · 有效 {summary.days} 天
            </span></h2>
            <div className="grid-cards">
              <MetricCard label="有效天数" value={String(summary.days) + ' 天'} accent="blue" />
              <MetricCard label="去退GMV" value={formatMoney(summary.totals.netGmv)} accent="blue" />
              <MetricCard label="支付金额" value={formatMoney(summary.totals.pay)} />
              <MetricCard label="退款金额" value={formatMoney(summary.totals.refund)} />
              <MetricCard label="目标GMV" value={formatMoney(summary.totals.target)} />
              <MetricCard label="达成率" value={formatPercent(summary.totals.rate)} accent={summary.totals.rate >= 100 ? 'blue' : 'pink'} />
              <MetricCard label="同比增长" value={formatPercent(summary.totals.yoy)} accent={summary.totals.yoy >= 0 ? 'blue' : 'pink'} />
              <MetricCard label="访客数" value={formatNumber(summary.totals.visitors)} accent="purple" />
              <MetricCard label="买家数" value={formatNumber(summary.totals.buyers)} accent="orange" />
            </div>
          </div>

          {/* 店铺汇总表 */}
          <div className="card-glass">
            <h2 className="card-title">店铺区间汇总</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-glass">
                <thead>
                  <tr>
                    <th>店铺</th><th style={{ textAlign: 'right' }}>支付金额</th><th style={{ textAlign: 'right' }}>退款金额</th>
                    <th style={{ textAlign: 'right' }}>去退GMV</th><th style={{ textAlign: 'right' }}>目标GMV</th>
                    <th style={{ textAlign: 'right' }}>达成率</th><th style={{ textAlign: 'right' }}>去年同期</th>
                    <th style={{ textAlign: 'right' }}>同比增长</th><th style={{ textAlign: 'right' }}>访客数</th>
                    <th style={{ textAlign: 'right' }}>买家数</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.stores.map((s, i) => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 500, color: '#fff' }}>
                        <span className={i < 2 ? 'td-blue' : 'td-red'} style={{ fontSize: 10 }}>[{s.platform}]</span> {s.name}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.pay)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.refund)}</td>
                      <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(s.netGmv)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.target)}</td>
                      <td style={{ textAlign: 'right' }} className={s.rate >= 100 ? 'td-green' : 'td-red'}>{formatPercent(s.rate)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(s.lastYear)}</td>
                      <td style={{ textAlign: 'right' }} className={s.yoy >= 0 ? 'td-green' : 'td-red'}>
                        {formatPercent(s.yoy)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(s.visitors)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(s.buyers)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="footer-row">
                    <td>全店合计</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(summary.totals.pay)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(summary.totals.refund)}</td>
                    <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(summary.totals.netGmv)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(summary.totals.target)}</td>
                    <td style={{ textAlign: 'right' }} className={summary.totals.rate >= 100 ? 'td-green' : 'td-red'}>{formatPercent(summary.totals.rate)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMoney(summary.totals.lastYear)}</td>
                    <td style={{ textAlign: 'right' }} className={summary.totals.yoy >= 0 ? 'td-green' : 'td-red'}>
                      {formatPercent(summary.totals.yoy)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(summary.totals.visitors)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(summary.totals.buyers)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 每日趋势 */}
          <div className="card-glass">
            <h2 className="card-title">每日去退GMV趋势</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyTrend}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="date" {...chartAxis} />
                <YAxis {...chartAxis} tickFormatter={v => formatMoney(v)} />
                <Tooltip
                  contentStyle={{ background: 'rgba(4,24,50,.98)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                  labelFormatter={(v, p) => p?.[0]?.payload?.fullDate || v}
                  formatter={(v: number) => [formatMoney(v), '去退GMV']}
                />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {!summary && !loading && (
        <div className="card-glass">
          <div className="empty-state">选择时间范围后点击"查询"</div>
        </div>
      )}
    </div>
  )
}

type Accent = 'blue' | 'purple' | 'orange' | 'cyan' | 'pink'
const accentColors: Record<Accent, { bg: string; border: string; label: string; value: string }> = {
  blue:   { bg: 'rgba(0,102,204,.1)', border: 'rgba(0,102,204,.2)', label: 'rgba(100,180,255,.6)', value: '#93c5fd' },
  purple: { bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.2)', label: 'rgba(167,139,250,.6)', value: '#c4b5fd' },
  orange: { bg: 'rgba(249,115,22,.1)', border: 'rgba(249,115,22,.2)', label: 'rgba(251,146,60,.6)', value: '#fdba74' },
  cyan:   { bg: 'rgba(6,182,212,.1)', border: 'rgba(6,182,212,.2)', label: 'rgba(34,211,238,.6)', value: '#67e8f9' },
  pink:   { bg: 'rgba(236,72,153,.1)', border: 'rgba(236,72,153,.2)', label: 'rgba(244,114,182,.6)', value: '#f9a8d4' },
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: Accent }) {
  const a = accent ? accentColors[accent] : null
  return (
    <div className="metric-card" style={a ? { background: a.bg, borderColor: a.border } : undefined}>
      <div className="metric-card-label" style={a ? { color: a.label } : undefined}>{label}</div>
      <div className="metric-card-value" style={a ? { color: a.value } : undefined}>{value}</div>
    </div>
  )
}
