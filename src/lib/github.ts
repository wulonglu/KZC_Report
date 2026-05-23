import { MonthlyData, DailyReport, monthKey } from '../types'

interface GitHubFile {
  sha: string
  content?: string
}

const DEFAULT_REPO = 'wulonglu/KZC_Report'

// UTF-8 安全 Base64 编解码
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const bin = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(bin)
}
function base64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function getConfig() {
  const token = localStorage.getItem('gh_token') || ''
  const repo = localStorage.getItem('gh_repo') || DEFAULT_REPO
  return { token, repo }
}

function apiUrl(path: string): string {
  const { repo } = getConfig()
  return `https://api.github.com/repos/${repo}/contents/${path}`
}

function headers(): Record<string, string> {
  const { token } = getConfig()
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
  }
}

export function isConfigured(): boolean {
  const { repo } = getConfig()
  return !!repo  // repo is built-in, token is optional for reading
}

// 带超时的 fetch
function fetchWithTimeout(url: string, opts?: RequestInit, ms = 5000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

// 公开读取：优先 raw CDN（最新），其次同源（快），最后 API
async function fetchPublic(path: string): Promise<Response> {
  const { repo } = getConfig()
  // 1. Try raw CDN (always has latest repo data)
  const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${path}?t=${Date.now()}`
  try {
    const r = await fetchWithTimeout(rawUrl, undefined, 5000)
    if (r.ok) return r
  } catch {}
  // 2. Try same-origin (data/ is copied to dist/, fast fallback)
  try {
    const r = await fetchWithTimeout('./' + path, undefined, 3000)
    if (r.ok) return r
  } catch {}
  // 3. Fallback to API
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`
  const { token } = getConfig()
  return fetchWithTimeout(apiUrl, { headers: token ? headers() : { Accept: 'application/vnd.github.v3+json' } }, 8000)
}

export function saveConfig(token: string, repo: string) {
  localStorage.setItem('gh_token', token)
  localStorage.setItem('gh_repo', repo)
}

export function clearConfig() {
  localStorage.removeItem('gh_token')
  localStorage.removeItem('gh_repo')
}

// 读取某月数据
export async function loadMonth(dateStr: string): Promise<DailyReport[]> {
  const key = monthKey(dateStr)
  const resp = await fetchPublic(`data/${key}.json`)
  if (resp.status === 404) return []
  if (!resp.ok) throw new Error(`加载失败: ${resp.status}`)

  // 判断数据来源：raw CDN / 同源 → 直接JSON；API → base64解码
  const isRaw = resp.url.includes('raw.githubusercontent.com') || resp.url.includes(window.location.origin)
  let data: MonthlyData
  
  if (isRaw) {
    data = await resp.json()
  } else {
    const file: GitHubFile = await resp.json()
    if (!file.content) return []
    data = JSON.parse(base64ToUtf8(file.content))
  }
  
  return data.reports || []
}

// 保存某日数据
export async function saveReport(report: DailyReport): Promise<void> {
  const key = monthKey(report.date)
  const path = `data/${key}.json`
  const url = apiUrl(path)

  // 先尝试获取现有文件
  let existing: DailyReport[] = []
  let sha = ''

  try {
    const resp = await fetch(url, { headers: headers() })
    if (resp.ok) {
      const file: GitHubFile = await resp.json()
      sha = file.sha
      if (file.content) {
        const data: MonthlyData = JSON.parse(base64ToUtf8(file.content))
        existing = data.reports || []
      }
    }
  } catch {
    // 文件不存在，新建
  }

  // 更新或新增
  const idx = existing.findIndex(r => r.date === report.date)
  if (idx >= 0) {
    existing[idx] = report
  } else {
    existing.push(report)
  }
  existing.sort((a, b) => a.date.localeCompare(b.date))

  const content = utf8ToBase64(JSON.stringify({ reports: existing }, null, 2))

  const body: Record<string, string> = {
    message: `update ${report.date}`,
    content,
  }
  if (sha) body.sha = sha

  const resp = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error((err as any).message || `保存失败: ${resp.status}`)
  }
}

// 获取所有有数据的日期列表
export async function getAllDates(): Promise<string[]> {
  const url = apiUrl('data/')
  const resp = await fetch(url, { headers: headers() })
  if (!resp.ok) return []

  const files: { name: string }[] = await resp.json()
  const dates: string[] = []

  for (const file of files) {
    try {
      const contentsUrl = apiUrl(`data/${file.name}`)
      const r = await fetch(contentsUrl, { headers: headers() })
      if (!r.ok) continue
      const f: GitHubFile = await r.json()
      if (!f.content) continue
      const data: MonthlyData = JSON.parse(base64ToUtf8(f.content))
      data.reports?.forEach(r => dates.push(r.date))
    } catch {
      // skip
    }
  }

  return dates.sort()
}

// 批量加载多日数据（用于历史查询、趋势图）
export async function loadDateRange(start: string, end: string): Promise<DailyReport[]> {
  const startM = monthKey(start)
  const endM = monthKey(end)

  const months: string[] = []
  let cur = new Date(startM + '-01')
  const endD = new Date(endM + '-01')
  while (cur <= endD) {
    months.push(cur.toISOString().substring(0, 7))
    cur.setMonth(cur.getMonth() + 1)
  }

  const allReports: DailyReport[] = []
  for (const m of months) {
    const reports = await loadMonth(m + '-01')
    allReports.push(...reports)
  }

  return allReports.filter(r => r.date >= start && r.date <= end)
}
