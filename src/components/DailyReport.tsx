import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Download, ChevronDown } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { computeMetrics, StoreMetrics, DailyReport, STORES } from '../types'
import { loadMonth, loadDateRange } from '../lib/github'
import { formatMoney, formatPercent, formatNumber, getToday } from '../lib/utils'

export default function DailyReportView() {
  const [viewDate, setViewDate] = useState(getToday())
  const [reports, setReports] = useState<DailyReport[]>([])
  const [allDates, setAllDates] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [trendData, setTrendData] = useState<any[]>([])

  // 监听从历史页跳转
  useEffect(() => {
    const handler = () => {
      const d = localStorage.getItem('view_date')
      if (d) {
        setViewDate(d)
        localStorage.removeItem('view_date')
      }
    }
    window.addEventListener('view_date_change', handler)
    return () => window.removeEventListener('view_date_change', handler)
  }, [])

  // 加载日报数据
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await loadMonth(viewDate)
      setReports(data)
      // 收集所有有数据的日期
      const dates = data.map(r => r.date).sort()
      setAllDates(dates)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  // 加载趋势数据（近30天）
  useEffect(() => {
    loadData()
  }, [viewDate])

  useEffect(() => {
    const loadTrend = async () => {
      const end = getToday()
      const start = new Date()
      start.setDate(start.getDate() - 29)
      const startStr = start.toISOString().substring(0, 10)
      try {
        const data = await loadDateRange(startStr, end)
        const trend = data.map(d => {
          const totalNetGmv = d.stores.reduce((sum, s) => sum + (s.paymentAmount - s.refundAmount), 0)
          const totalTarget = d.stores.reduce((sum, s) => sum + s.targetGmv, 0)
          return { date: d.date.substring(5), netGmv: totalNetGmv, targetGmv: totalTarget }
        })
        setTrendData(trend)
      } catch {
        // ignore
      }
    }
    loadTrend()
  }, [])

  // 当前查看日的报告
  const currentReport = useMemo(() => reports.find(r => r.date === viewDate), [reports, viewDate])
  const currentMetrics: StoreMetrics[] = useMemo(() =>
    currentReport ? currentReport.stores.map(computeMetrics) : [],
    [currentReport]
  )

  // 汇总
  const totals = useMemo(() => {
    if (currentMetrics.length === 0) return null
    return {
      targetGmv: currentMetrics.reduce((s, m) => s + m.targetGmv, 0),
      netGmv: currentMetrics.reduce((s, m) => s + m.netGmv, 0),
      paymentAmount: currentMetrics.reduce((s, m) => s + m.paymentAmount, 0),
      refundAmount: currentMetrics.reduce((s, m) => s + m.refundAmount, 0),
      visitors: currentMetrics.reduce((s, m) => s + m.visitors, 0),
      buyers: currentMetrics.reduce((s, m) => s + m.buyers, 0),
      salesCount: currentMetrics.reduce((s, m) => s + m.salesCount, 0),
      avgOrderValue: currentMetrics.reduce((s, m) => s + m.avgOrderValue, 0) / currentMetrics.length,
      conversionRate: currentMetrics.length > 0
        ? (currentMetrics.reduce((s, m) => s + m.buyers, 0) / currentMetrics.reduce((s, m) => s + m.visitors, 0)) * 100
        : 0,
    }
  }, [currentMetrics])

  // 导出CSV
  const exportCSV = () => {
    if (currentMetrics.length === 0) return
    const headers = '店铺,平台,目标GMV,支付金额,退款金额,去退GMV,去年同期,同比增长,达成率,访客数,买家数,销售件数,客单价,转化率'
    const rows = currentMetrics.map(m =>
      `${m.name},${m.platform},${m.targetGmv},${m.paymentAmount},${m.refundAmount},${m.netGmv},${m.lastYearSame},${m.yoyGrowth.toFixed(2)}%,${m.achievementRate.toFixed(2)}%,${m.visitors},${m.buyers},${m.salesCount},${m.avgOrderValue.toFixed(2)},${m.conversionRate.toFixed(2)}%`
    )
    const csv = '\uFEFF' + headers + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `日报_${viewDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* 指标卡片 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">指标</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">查看日期：</label>
            <input
              type="date"
              value={viewDate}
              onChange={e => setViewDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={loadData}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <RefreshCw size={14} /> 刷新报表
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> 导出CSV
            </button>
            <div className="relative">
              <select
                onChange={e => e.target.value && setViewDate(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="">-- 选择有数据的日期 --</option>
                {allDates.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              刷新列表
            </button>
          </div>
        </div>

        {totals ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <MetricCard label="目标GMV" value={formatMoney(totals.targetGmv)} />
            <MetricCard label="去退GMV" value={formatMoney(totals.netGmv)} />
            <MetricCard label="支付金额" value={formatMoney(totals.paymentAmount)} />
            <MetricCard label="退款金额" value={formatMoney(totals.refundAmount)} />
            <MetricCard label="访客数" value={formatNumber(totals.visitors)} />
            <MetricCard label="买家数" value={formatNumber(totals.buyers)} />
            <MetricCard label="客单价" value={formatMoney(totals.avgOrderValue)} />
            <MetricCard label="转化率" value={formatPercent(totals.conversionRate)} />
            <MetricCard label="销售件数" value={formatNumber(totals.salesCount)} />
            <MetricCard label="月累计去退GMV" value={formatMoney(totals.netGmv)} subtitle="本月至今" />
            <MetricCard label="年累计去退GMV" value={formatMoney(totals.netGmv)} subtitle="今年至今" />
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <p>请选择日期并点击"刷新报表"</p>
          </div>
        )}
      </div>

      {/* GMV 近30天趋势 */}
      {trendData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">GMV 近30天趋势（全店合计）</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v)} />
              <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
              <Legend />
              <Line type="monotone" dataKey="netGmv" name="去退GMV" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="targetGmv" name="目标GMV" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 店铺对比图表 */}
      {currentMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 去退GMV: 实际 vs 目标 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-md font-bold text-gray-700 mb-4">去退GMV：实际 vs 目标</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentMetrics.map(m => ({ name: m.name.replace(/^(.{4}).*/, '$1...'), netGmv: m.netGmv, targetGmv: m.targetGmv }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v)} />
                <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
                <Legend />
                <Bar dataKey="netGmv" name="去退GMV" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="targetGmv" name="目标GMV" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* GMV同期对比 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-md font-bold text-gray-700 mb-4">GMV同期对比：当日 vs 去年同期</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentMetrics.map(m => ({ name: m.name.replace(/^(.{4}).*/, '$1...'), netGmv: m.netGmv, lastYear: m.lastYearSame }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v)} />
                <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
                <Legend />
                <Bar dataKey="netGmv" name="当日GMV" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="lastYear" name="去年同期" fill="#94a3b8" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 访客数 & 买家数 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-md font-bold text-gray-700 mb-4">访客数 & 买家数</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentMetrics.map(m => ({ name: m.name.replace(/^(.{4}).*/, '$1...'), visitors: m.visitors, buyers: m.buyers }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                <Tooltip formatter={(v: number) => [formatNumber(v), '']} />
                <Legend />
                <Bar dataKey="visitors" name="访客数" fill="#8b5cf6" radius={[4,4,0,0]} />
                <Bar dataKey="buyers" name="买家数" fill="#06b6d4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 月累计 GMV 趋势 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-md font-bold text-gray-700 mb-4">月累计 / 年累计 GMV 趋势</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentMetrics.map(m => ({ name: m.name.replace(/^(.{4}).*/, '$1...'), netGmv: m.netGmv }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v)} />
                <Tooltip formatter={(v: number) => [formatMoney(v), '']} />
                <Bar dataKey="netGmv" name="去退GMV" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 店铺明细日报表 */}
      {currentMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">店铺明细日报表</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">店铺</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">目标GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">支付金额</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">退款金额</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去退GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去年同期</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">同比增长</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">达成率</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">访客数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">买家数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">销售件数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">客单价</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">转化率</th>
                </tr>
              </thead>
              <tbody>
                {currentMetrics.map((m, idx) => (
                  <tr key={m.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2 border border-gray-200 font-medium">
                      <span className="text-xs text-gray-400">[{m.platform}]</span> {m.name}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.targetGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.paymentAmount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.refundAmount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-medium text-blue-600">{formatMoney(m.netGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.lastYearSame)}</td>
                    <td className={`text-right px-3 py-2 border border-gray-200 ${m.yoyGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatPercent(m.yoyGrowth)}</td>
                    <td className={`text-right px-3 py-2 border border-gray-200 ${m.achievementRate >= 100 ? 'text-green-600' : 'text-red-500'}`}>{formatPercent(m.achievementRate)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.visitors)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.buyers)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.salesCount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.avgOrderValue)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatPercent(m.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="bg-blue-50 font-medium">
                    <td className="px-3 py-2 border border-gray-200">合计</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(totals.targetGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(totals.paymentAmount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(totals.refundAmount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200 text-blue-600">{formatMoney(totals.netGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">-</td>
                    <td className="text-right px-3 py-2 border border-gray-200">-</td>
                    <td className="text-right px-3 py-2 border border-gray-200">-</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(totals.visitors)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(totals.buyers)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(totals.salesCount)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(totals.avgOrderValue)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatPercent(totals.conversionRate)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 月累计汇总 */}
      {currentMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">月累计汇总</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">店铺</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">目标GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去退GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">访客数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">买家数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">客单价</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">转化率</th>
                </tr>
              </thead>
              <tbody>
                {currentMetrics.map((m, idx) => (
                  <tr key={m.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2 border border-gray-200 font-medium">{m.name}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.targetGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-medium text-blue-600">{formatMoney(m.netGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.visitors)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.buyers)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.avgOrderValue)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatPercent(m.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 年累计汇总 */}
      {currentMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">年累计汇总</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">店铺</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">目标GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去退GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">访客数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">买家数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">客单价</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">转化率</th>
                </tr>
              </thead>
              <tbody>
                {currentMetrics.map((m, idx) => (
                  <tr key={m.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2 border border-gray-200 font-medium">{m.name}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.targetGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-medium text-blue-600">{formatMoney(m.netGmv)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.visitors)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(m.buyers)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(m.avgOrderValue)}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">{formatPercent(m.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-md transition-shadow">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}
