import { useState, useEffect } from 'react'
import { Lock, LockKeyhole, Save, FileText } from 'lucide-react'
import { STORES, StoreData, DailyReport, emptyStore, monthKey } from '../types'
import { saveReport } from '../lib/github'
import { getToday } from '../lib/utils'

export default function DataEntry() {
  const [unlocked, setUnlocked] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState(false)
  const [date, setDate] = useState(getToday())
  const [stores, setStores] = useState<StoreData[]>(
    STORES.map(s => emptyStore(s.name, s.platform))
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 解锁验证（简单密码：可以用 Token 作为密码，或者单独设一个）
  const handleUnlock = () => {
    const pass = localStorage.getItem('gh_token') || ''
    if (pwd === pass || pwd === 'admin888') {
      setUnlocked(true)
      setPwdError(false)
    } else {
      setPwdError(true)
    }
  }

  // 保存数据
  const handleSave = async () => {
    setSaving(true)
    setMsg('')

    const report: DailyReport = {
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
    }

    try {
      await saveReport(report)
      setMsg('保存成功！')
    } catch (e: any) {
      setMsg('保存失败：' + (e.message || '未知错误'))
    }
    setSaving(false)
  }

  // 填充示例数据
  const fillDemo = () => {
    setStores(STORES.map(s => {
      const base = Math.random() * 30000 + 20000
      return {
        ...emptyStore(s.name, s.platform),
        targetGmv: Math.round(base * 1.2),
        paymentAmount: Math.round(base * 1.05),
        refundAmount: Math.round(base * 0.03),
        lastYearSame: Math.round(base * 0.9),
        visitors: Math.round(Math.random() * 5000 + 3000),
        buyers: Math.round(Math.random() * 300 + 100),
        salesCount: Math.round(Math.random() * 500 + 200),
      }
    }))
  }

  const updateStore = (idx: number, field: keyof StoreData, value: string) => {
    setStores(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  return (
    <div>
      {!unlocked && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-96">
            <div className="text-center mb-6">
              <LockKeyhole size={48} className="mx-auto text-gray-400 mb-3" />
              <h2 className="text-xl font-bold text-gray-800">需要授权才能编辑</h2>
              <p className="text-sm text-gray-500 mt-1">数据浏览公开，编辑需要密码</p>
            </div>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setPwdError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="请输入密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              autoFocus
            />
            {pwdError && (
              <p className="text-sm text-red-500 mb-2">密码错误</p>
            )}
            <button
              onClick={handleUnlock}
              className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              解锁
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText size={20} /> 数据录入
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">选择日期：</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fillDemo}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              填充示例数据
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? '保存中...' : '保存数据'}
            </button>
          </div>
        </div>

        {/* 表单表格 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 border border-gray-200 font-medium text-gray-700 w-40">店铺</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">目标GMV</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">支付金额</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">退款金额</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">去年同期</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">访客数</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">买家数</th>
                <th className="text-right px-3 py-2 border border-gray-200 font-medium text-gray-700">销售件数</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store, idx) => (
                <tr key={store.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2 border border-gray-200 font-medium text-gray-700">
                    <span className="text-xs text-gray-400 mr-1">[{store.platform}]</span>
                    {store.name}
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.targetGmv || ''}
                      onChange={e => updateStore(idx, 'targetGmv', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.paymentAmount || ''}
                      onChange={e => updateStore(idx, 'paymentAmount', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.refundAmount || ''}
                      onChange={e => updateStore(idx, 'refundAmount', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.lastYearSame || ''}
                      onChange={e => updateStore(idx, 'lastYearSame', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.visitors || ''}
                      onChange={e => updateStore(idx, 'visitors', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.buyers || ''}
                      onChange={e => updateStore(idx, 'buyers', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1 border border-gray-200">
                    <input
                      type="number"
                      value={store.salesCount || ''}
                      onChange={e => updateStore(idx, 'salesCount', e.target.value)}
                      className="w-full text-right px-2 py-1.5 border border-transparent hover:border-gray-300 focus:border-blue-400 rounded text-sm focus:outline-none bg-transparent"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {msg && (
          <div className={`mt-4 text-sm px-3 py-2 rounded-lg ${
            msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}
