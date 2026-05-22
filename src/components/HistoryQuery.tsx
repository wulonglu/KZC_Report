import { useState } from 'react'
import { Search, Download } from 'lucide-react'
import { DailyReport } from '../types'
import { loadDateRange } from '../lib/github'
import { getToday, getDateRange, formatMoney, formatNumber } from '../lib/utils'

const RANGE_PRESETS = ['今日', '昨日', '本周', '上周', '本月', '上月']

interface Props {
  onViewDate: (date: string) => void
}

export default function HistoryQuery({ onViewDate }: Props) {
  const [startDate, setStartDate] = useState(getToday())
  const [endDate, setEndDate] = useState(getToday())
  const [results, setResults] = useState<DailyReport[]>([])
  const [loading, setLoading] = useState(false)

  const handlePreset = (label: string) => {
    const [s, e] = getDateRange(label)
    setStartDate(s)
    setEndDate(e)
  }

  const handleQuery = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const data = await loadDateRange(startDate, endDate)
      setResults(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const exportCSV = () => {
    if (results.length === 0) return
    const headers = '\uFEFF日期,店铺,平台,目标GMV,支付金额,退款金额,去年同期,访客数,买家数,销售件数'
    const rows: string[] = []
    results.forEach(r => {
      r.stores.forEach(s => {
        rows.push(`${r.date},${s.name},${s.platform},${s.targetGmv},${s.paymentAmount},${s.refundAmount},${s.lastYearSame},${s.visitors},${s.buyers},${s.salesCount}`)
      })
    })
    const csv = headers + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `历史数据_${startDate}_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">历史数据清单</h2>
        <p className="text-sm text-gray-500 mb-4">（点击日期快速查看）</p>

        {/* 查询范围 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 block mb-2">查询范围：</label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {RANGE_PRESETS.map(label => (
              <button
                key={label}
                onClick={() => handlePreset(label)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">至</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleQuery}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Search size={14} />
              {loading ? '查询中...' : '查询'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-4 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> 导出CSV
            </button>
          </div>
        </div>

        {/* 结果列表 */}
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">日期</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700">店铺</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">目标GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">支付金额</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">退款金额</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去退GMV</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">访客数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">买家数</th>
                  <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap(r =>
                  r.stores.map((s, si) => (
                    <tr key={`${r.date}-${s.name}`} className="hover:bg-blue-50/30">
                      {si === 0 && (
                        <td
                          className="px-3 py-2 border border-gray-200 font-medium text-blue-600 cursor-pointer hover:underline align-top"
                          rowSpan={r.stores.length}
                          onClick={() => onViewDate(r.date)}
                        >
                          {r.date}
                        </td>
                      )}
                      <td className="px-3 py-2 border border-gray-200">
                        <span className="text-xs text-gray-400">[{s.platform}]</span> {s.name}
                      </td>
                      <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(s.targetGmv)}</td>
                      <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(s.paymentAmount)}</td>
                      <td className="text-right px-3 py-2 border border-gray-200">{formatMoney(s.refundAmount)}</td>
                      <td className="text-right px-3 py-2 border border-gray-200 font-medium text-blue-600">{formatMoney(s.paymentAmount - s.refundAmount)}</td>
                      <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(s.visitors)}</td>
                      <td className="text-right px-3 py-2 border border-gray-200">{formatNumber(s.buyers)}</td>
                      {si === 0 && (
                        <td className="px-3 py-2 border border-gray-200 align-top" rowSpan={r.stores.length}>
                          <button
                            onClick={() => onViewDate(r.date)}
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                          >
                            查看详情
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            <p>选择时间范围后点击"查询"</p>
          </div>
        )}
      </div>
    </div>
  )
}
