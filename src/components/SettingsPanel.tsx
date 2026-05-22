import { useState } from 'react'
import { saveConfig } from '../lib/github'

interface Props {
  onConfigured: () => void
}

export default function SettingsPanel({ onConfigured }: Props) {
  const [token, setToken] = useState(localStorage.getItem('gh_token') || '')
  const [repo, setRepo] = useState(localStorage.getItem('gh_repo') || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async () => {
    if (!token || !repo) {
      setMsg('请填写 Token 和仓库地址')
      return
    }
    setSaving(true)
    setMsg('')

    // 验证连接
    try {
      const resp = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        setMsg('连接失败，请检查 Token 和仓库地址')
        setSaving(false)
        return
      }
    } catch {
      setMsg('网络错误，无法连接 GitHub')
      setSaving(false)
      return
    }

    saveConfig(token, repo)
    setSaving(false)
    setMsg('配置成功！')
    onConfigured()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">GitHub 配置</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              需要 <code className="bg-gray-100 px-1 rounded">repo</code> 权限。
              <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" className="text-blue-500 ml-1 hover:underline">去创建 Token</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              仓库地址
            </label>
            <input
              type="text"
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="username/repo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              格式：用户名/仓库名，如 <code className="bg-gray-100 px-1 rounded">zhangsan/daily-data</code>
            </p>
          </div>

          {msg && (
            <div className={`text-sm px-3 py-2 rounded-lg ${
              msg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {msg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? '验证中...' : '保存配置'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-1">使用说明</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>在 GitHub 创建一个仓库（公开或私有）</li>
            <li>创建一个 Personal Access Token（需要 repo 权限）</li>
            <li>在此填入 Token 和仓库地址</li>
            <li>数据将自动保存在仓库的 <code className="bg-blue-100 px-1 rounded">data/</code> 目录下</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
