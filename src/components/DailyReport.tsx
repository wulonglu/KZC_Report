import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { computeMetrics, StoreMetrics, StoreData, STORES } from '../types'
import { loadMonth, loadDateRange } from '../lib/github'
import { formatMoney, formatPercent, formatNumber, getToday } from '../lib/utils'

const chartGrid = { stroke: 'rgba(255,255,255,.04)', strokeDasharray: '3 3' }
const chartAxis = {
  tick: { fontSize: 11, fill: 'rgba(255,255,255,.55)', fontWeight: 500 },
  axisLine: { stroke: 'rgba(255,255,255,.1)' },
  tickLine: false,
}
const chartXAxis = { ...chartAxis, interval: 0, angle: -45, height: 90, tickMargin: 8 }
const chartLegend = { wrapperStyle: { fontSize: 12, color: 'rgba(255,255,255,.6)', paddingTop: 8 }, iconType: 'rect' as const }
const chartTooltip = {
  contentStyle: { background: 'rgba(4,24,50,.98)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 },
  labelStyle: { color: 'rgba(255,255,255,.7)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#e2e8f0' },
}

export default function DailyReport() {
  const [viewDate, setViewDate] = useState(getToday())
  const [report, setReport] = useState<any>(null)
  const [trend, setTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = () => {
      const d = localStorage.getItem('view_date')
      if (d) { setViewDate(d); localStorage.removeItem('view_date') }
    }
    window.addEventListener('view_date_change', handler)
    return () => window.removeEventListener('view_date_change', handler)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await loadMonth(viewDate)
      const r = data.find(rr => rr.date === viewDate) || null
      if (r) {
        setReport(r)
        const end = getToday()
        const s = new Date(); s.setDate(s.getDate() - 29)
        const td = await loadDateRange(s.toISOString().substring(0, 10), end)
        setTrend(td.map(d => ({
          date: d.date,
          label: d.date.substring(5),
          net: d.stores.reduce((a: number, ss: StoreData) => a + ss.paymentAmount - ss.refundAmount, 0),
        })))
      } else if (data.length > 0) {
        // 选择的日期没数据，自动跳到最近有数据的日期
        const sorted = data.sort((a, b) => b.date.localeCompare(a.date))
        setViewDate(sorted[0].date)
        setReport(sorted[0])
        const end = getToday()
        const s = new Date(); s.setDate(s.getDate() - 29)
        const td = await loadDateRange(s.toISOString().substring(0, 10), end)
        setTrend(td.map(d => ({
          date: d.date,
          label: d.date.substring(5),
          net: d.stores.reduce((a: number, ss: StoreData) => a + ss.paymentAmount - ss.refundAmount, 0),
        })))
      } else {
        setReport(null)
        setTrend([])
      }
    } catch (e) { setReport(null); setTrend([]) }
    setLoading(false)
  }
  useEffect(() => { load() }, [viewDate])

  const metrics: StoreMetrics[] = useMemo(() => report ? report.stores.map(computeMetrics) : [], [report])
  const totals = useMemo(() => {
    if (!metrics.length) return null
    const tv = metrics.reduce((a, m) => a + m.visitors, 0)
    const tb = metrics.reduce((a, m) => a + m.buyers, 0)
    const net = metrics.reduce((a, m) => a + m.netGmv, 0)
    const lastYear = metrics.reduce((a, m) => a + m.lastYearSame, 0)
    return {
      targetGmv: metrics.reduce((a, m) => a + m.targetGmv, 0),
      netGmv: net,
      pay: metrics.reduce((a, m) => a + m.paymentAmount, 0),
      refund: metrics.reduce((a, m) => a + m.refundAmount, 0),
      visitors: tv, buyers: tb,
      sales: metrics.reduce((a, m) => a + m.salesCount, 0),
      aov: metrics.length ? metrics.reduce((a, m) => a + m.avgOrderValue, 0) / metrics.length : 0,
      cvr: tv > 0 ? (tb / tv) * 100 : 0,
      lastYear,
      yoy: lastYear > 0 ? ((net - lastYear) / lastYear * 100) : 0,
    }
  }, [metrics])
  const hasData = metrics.length > 0

  const emptyChart = STORES.map(s => ({ name: s.name, netGmv: 0, targetGmv: 0, lastYear: 0, visitors: 0, buyers: 0 }))
  const chartData = hasData ? metrics.map(m => ({
    name: m.name, netGmv: m.netGmv, targetGmv: m.targetGmv, lastYear: m.lastYearSame, visitors: m.visitors, buyers: m.buyers,
  })) : emptyChart
  const cumChartData = hasData ? metrics.map(m => ({
    name: m.name,
    monthNet: m.netGmv,
    monthLast: m.lastYearSame,
    yearNet: m.netGmv * 12,
    yearLast: m.lastYearSame * 12,
  })) : STORES.map(s => ({ name: s.name, monthNet: 0, monthLast: 0, yearNet: 0, yearLast: 0 }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 指标卡片 */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>指标</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>查看日期：</span>
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="input-dark" />
            <button className="btn-glass btn-primary" onClick={load} disabled={loading}>
              {loading ? '加载中...' : '刷新报表'}
            </button>
            <button className="btn-glass btn-outline" onClick={() => {
              if (!hasData) return
              let csv = '\uFEFF店铺,平台,目标GMV,支付金额,退款金额,去退GMV,去年同期,同比增长,达成率,访客数,买家数,销售件数,客单价,转化率\n'
              metrics.forEach(m => {
                csv += `${m.name},${m.platform},${m.targetGmv},${m.paymentAmount},${m.refundAmount},${m.netGmv},${m.lastYearSame},${m.yoyGrowth.toFixed(2)},${m.achievementRate.toFixed(2)},${m.visitors},${m.buyers},${m.salesCount},${m.avgOrderValue.toFixed(2)},${m.conversionRate.toFixed(2)}\n`
              })
              const b = new Blob([csv], { type: 'application/vnd.ms-excel' })
              const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `日报_${viewDate}.xls`; a.click()
            }}>导出Excel</button>
          </div>
        </div>

        <div className="grid-cards">
          <MetricCard label="目标GMV" value={formatMoney(totals?.targetGmv || 0)} accent="blue" />
          <MetricCard label="去退GMV" value={formatMoney(totals?.netGmv || 0)} accent="blue" />
          <MetricCard label="支付金额" value={formatMoney(totals?.pay || 0)} />
          <MetricCard label="退款金额" value={formatMoney(totals?.refund || 0)} />
          <MetricCard label="访客数" value={formatNumber(totals?.visitors || 0)} accent="purple" />
          <MetricCard label="买家数" value={formatNumber(totals?.buyers || 0)} accent="orange" />
          <MetricCard label="客单价" value={formatMoney(totals?.aov || 0)} accent="cyan" />
          <MetricCard label="转化率" value={formatPercent(totals?.cvr || 0)} accent="pink" />
          <MetricCard label="销售件数" value={formatNumber(totals?.sales || 0)} />
        </div>
      </div>

      {/* 累计大卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <BigCard
          label="月累计去退GMV"
          value={formatMoney(totals?.netGmv || 0)}
          target="目标 4,000,000"
          pct={totals ? Math.min(100, (totals.netGmv / 4000000) * 100) : 0}
          barColor="#0066cc"
          detail={`达成率 ${totals ? (totals.netGmv / 4000000 * 100).toFixed(1) : 0}`}
          lastYear={totals?.lastYear}
          yoy={totals?.yoy}
        />
        <BigCard
          label="年累计去退GMV"
          value={formatMoney(totals?.netGmv || 0)}
          target="目标 30,000,000"
          pct={totals ? Math.min(100, (totals.netGmv / 30000000) * 100) : 0}
          barColor="#e32934"
          detail={`达成率 ${totals ? (totals.netGmv / 30000000 * 100).toFixed(1) : 0}`}
          lastYear={totals?.lastYear}
          yoy={totals?.yoy}
        />
      </div>

      {/* 四个对比图表 */}
      <div className="chart-row">
        <div className="card-glass">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>去退GMV：实际 vs 目标</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid {...chartGrid} /><XAxis dataKey="name" {...chartXAxis} />
              <YAxis {...chartAxis} tickFormatter={v => formatMoney(v)} /><Tooltip {...chartTooltip} /><Legend {...chartLegend} />
              <Bar dataKey="netGmv" name="去退GMV" fill="#0066cc" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetGmv" name="目标GMV" fill="rgba(255,255,255,.12)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-glass">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>GMV同期对比</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid {...chartGrid} /><XAxis dataKey="name" {...chartXAxis} />
              <YAxis {...chartAxis} tickFormatter={v => formatMoney(v)} /><Tooltip {...chartTooltip} /><Legend {...chartLegend} />
              <Bar dataKey="netGmv" name="当日GMV" fill="#e32934" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lastYear" name="去年同期" fill="rgba(255,255,255,.1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-glass">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>访客数 & 买家数</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid {...chartGrid} /><XAxis dataKey="name" {...chartXAxis} />
              <YAxis {...chartAxis} tickFormatter={v => formatNumber(v)} /><Tooltip {...chartTooltip} /><Legend {...chartLegend} />
              <Bar dataKey="visitors" name="访客数" fill="#0066cc" radius={[4, 4, 0, 0]} />
              <Bar dataKey="buyers" name="买家数" fill="#e32934" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card-glass">
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>月/年累计GMV vs 去年同期</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cumChartData}>
              <CartesianGrid {...chartGrid} /><XAxis dataKey="name" {...chartXAxis} />
              <YAxis {...chartAxis} tickFormatter={v => formatMoney(v)} /><Tooltip {...chartTooltip} /><Legend {...chartLegend} />
              <Bar dataKey="monthNet" name="月GMV" fill="#0066cc" radius={[3,3,0,0]} />
              <Bar dataKey="monthLast" name="月去年同期" fill="#60a5fa" radius={[3,3,0,0]} />
              <Bar dataKey="yearNet" name="年GMV" fill="#e32934" radius={[3,3,0,0]} />
              <Bar dataKey="yearLast" name="年去年同期" fill="#fca5a5" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GMV趋势 */}
      <div className="card-glass">
        <h2 className="card-title">GMV 近30天趋势（全店合计）</h2>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid {...chartGrid} />
              <XAxis dataKey="label" {...chartAxis} />
              <YAxis {...chartAxis} tickFormatter={v => formatMoney(v)} />
              <Tooltip
                contentStyle={{ background: 'rgba(4,24,50,.98)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#e2e8f0', fontSize: 13 }}
                labelStyle={{ color: 'rgba(255,255,255,.7)', fontWeight: 600, marginBottom: 4 }}
                labelFormatter={(v, p) => p?.[0]?.payload?.date || v}
                formatter={(v: number) => [formatMoney(v), '去退GMV']}
              />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">暂无趋势数据</div>
        )}
      </div>

      {/* 店铺明细表 */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>店铺明细日报表</h2>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.15)' }}>单位：元</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>店铺</th><th style={{ textAlign: 'right' }}>目标GMV</th><th style={{ textAlign: 'right' }}>支付金额</th>
                <th style={{ textAlign: 'right' }}>退款金额</th><th style={{ textAlign: 'right' }}>去退GMV</th>
                <th style={{ textAlign: 'right' }}>去年同期</th><th style={{ textAlign: 'right' }}>同比增长</th>
                <th style={{ textAlign: 'right' }}>达成率</th><th style={{ textAlign: 'right' }}>访客数</th>
                <th style={{ textAlign: 'right' }}>买家数</th><th style={{ textAlign: 'right' }}>销售件数</th>
                <th style={{ textAlign: 'right' }}>客单价</th><th style={{ textAlign: 'right' }}>转化率</th>
              </tr>
            </thead>
            <tbody>
              {hasData ? metrics.map((m, i) => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, marginRight: 8, background: i < 2 ? '#0066cc' : '#e32934', opacity: 1 - i * .3 }} />
                    <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 11 }}>[{m.platform}]</span> {m.name}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.targetGmv)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.paymentAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.refundAmount)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(m.netGmv)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.lastYearSame)}</td>
                  <td style={{ textAlign: 'right' }} className={m.yoyGrowth >= 0 ? 'td-green' : 'td-red'}>
                    {formatPercent(m.yoyGrowth)}
                  </td>
                  <td style={{ textAlign: 'right' }} className={m.achievementRate >= 100 ? 'td-green' : 'td-red'}>
                    {formatPercent(m.achievementRate)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(m.visitors)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(m.buyers)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(m.salesCount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.avgOrderValue)}</td>
                  <td style={{ textAlign: 'right' }}>{formatPercent(m.conversionRate)}</td>
                </tr>
              )) : STORES.map((s, i) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, marginRight: 8, background: i < 2 ? '#0066cc' : '#e32934', opacity: 1 - i * .3 }} />
                    <span style={{ color: 'rgba(255,255,255,.25)', fontSize: 11 }}>[{s.platform}]</span> {s.name}
                  </td>
                  {Array(12).fill(null).map((_, j) => (
                    <td key={j} style={{ textAlign: 'right', color: 'rgba(255,255,255,.08)' }}>-</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasData && totals && (
              <tfoot>
                <tr className="footer-row">
                  <td>全店合计</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.targetGmv)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.pay)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.refund)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(totals.netGmv)}</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>-</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(totals.visitors)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(totals.buyers)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(totals.sales)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.aov)}</td>
                  <td style={{ textAlign: 'right' }}>{formatPercent(totals.cvr)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 月累计汇总 */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>月累计汇总</h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', fontWeight: 400 }}>
            {new Date(viewDate).getFullYear()}年{String(new Date(viewDate).getMonth() + 1).padStart(2, '0')}月
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>店铺</th><th style={{ textAlign: 'right' }}>月累计支付</th><th style={{ textAlign: 'right' }}>月累计退款</th>
                <th style={{ textAlign: 'right' }}>月累计去退GMV</th><th style={{ textAlign: 'right' }}>去年同期</th>
                <th style={{ textAlign: 'right' }}>月累计同比</th>
              </tr>
            </thead>
            <tbody>
              {hasData ? metrics.map((m, i) => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span className={i < 2 ? 'td-blue' : 'td-red'} style={{ fontSize: 10 }}>[{m.platform}]</span> {m.name}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.paymentAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.refundAmount)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(m.netGmv)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.lastYearSame)}</td>
                  <td style={{ textAlign: 'right' }} className={m.yoyGrowth >= 0 ? 'td-green' : 'td-red'}>
                    {formatPercent(m.yoyGrowth)}
                  </td>
                </tr>
              )) : STORES.map((s, i) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span className={i < 2 ? 'td-blue' : 'td-red'} style={{ fontSize: 10 }}>[{s.platform}]</span> {s.name}
                  </td>
                  {Array(5).fill(null).map((_, j) => (
                    <td key={j} style={{ textAlign: 'right', color: 'rgba(255,255,255,.08)' }}>-</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasData && totals && (
              <tfoot>
                <tr className="footer-row">
                  <td>全店合计</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.pay)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.refund)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(totals.netGmv)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.lastYear)}</td>
                  <td style={{ textAlign: 'right' }} className={totals.yoy >= 0 ? 'td-green' : 'td-red'}>
                    {formatPercent(totals.yoy)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 年累计汇总 */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>年累计汇总</h2>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', fontWeight: 400 }}>
            {new Date(viewDate).getFullYear()}年
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-glass">
            <thead>
              <tr>
                <th>店铺</th><th style={{ textAlign: 'right' }}>年累计支付</th><th style={{ textAlign: 'right' }}>年累计退款</th>
                <th style={{ textAlign: 'right' }}>年累计去退GMV</th><th style={{ textAlign: 'right' }}>去年同期</th>
                <th style={{ textAlign: 'right' }}>年累计同比</th>
              </tr>
            </thead>
            <tbody>
              {hasData ? metrics.map((m, i) => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span className={i < 2 ? 'td-blue' : 'td-red'} style={{ fontSize: 10 }}>[{m.platform}]</span> {m.name}
                  </td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.paymentAmount * 12)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.refundAmount * 12)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(m.netGmv * 12)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(m.lastYearSame * 12)}</td>
                  <td style={{ textAlign: 'right' }} className={m.yoyGrowth >= 0 ? 'td-green' : 'td-red'}>
                    {formatPercent(m.yoyGrowth)}
                  </td>
                </tr>
              )) : STORES.map((s, i) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 500, color: '#fff' }}>
                    <span className={i < 2 ? 'td-blue' : 'td-red'} style={{ fontSize: 10 }}>[{s.platform}]</span> {s.name}
                  </td>
                  {Array(5).fill(null).map((_, j) => (
                    <td key={j} style={{ textAlign: 'right', color: 'rgba(255,255,255,.08)' }}>-</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {hasData && totals && (
              <tfoot>
                <tr className="footer-row">
                  <td>全店合计</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.pay * 12)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.refund * 12)}</td>
                  <td style={{ textAlign: 'right' }} className="td-blue">{formatMoney(totals.netGmv * 12)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(totals.lastYear * 12)}</td>
                  <td style={{ textAlign: 'right' }} className={totals.yoy >= 0 ? 'td-green' : 'td-red'}>
                    {formatPercent(totals.yoy)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
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

function MetricCard({ label, value, accent, sub }: { label: string; value: string; accent?: Accent; sub?: string }) {
  const a = accent ? accentColors[accent] : null
  return (
    <div className="metric-card" style={a ? { background: a.bg, borderColor: a.border } : undefined}>
      <div className="metric-card-label" style={a ? { color: a.label } : undefined}>{label}</div>
      <div className="metric-card-value" style={a ? { color: a.value } : undefined}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.15)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function BigCard({ label, value, target, pct, barColor, detail, lastYear, yoy }: {
  label: string; value: string; target: string; pct: number; barColor: string; detail: string;
  lastYear?: number; yoy?: number;
}) {
  const yoyStr = yoy !== undefined && yoy !== 0 ? `${yoy >= 0 ? '+' : ''}${yoy.toFixed(2)}` : ''
  const lastYearStr = lastYear && lastYear > 0 ? `去年同期 ${formatMoney(lastYear)}` : ''
  return (
    <div className="card-glass" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-.5px', lineHeight: 1 }}>{value}</div>
          {lastYearStr && (
            <div style={{ fontSize: 12, color: yoy && yoy >= 0 ? '#4ade80' : '#f87171', marginTop: 4 }}>
              {yoyStr} {lastYearStr}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.15)' }}>{target}</div>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ height: 4, borderRadius: 2, width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`, boxShadow: `0 0 8px ${barColor}44`, transition: 'width .6s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9 }}>
        <span style={{ color: 'rgba(255,255,255,.3)' }}>{detail}</span>
        <span style={{ color: 'rgba(255,255,255,.15)' }}>{target}</span>
      </div>
    </div>
  )
}
