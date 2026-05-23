export function formatMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercent(n: number): string {
  return n.toFixed(2)
}

export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getToday(): string {
  const d = new Date()
  return d.toISOString().substring(0, 10)
}

export function getDateRange(label: string): [string, string] {
  const now = new Date()
  const today = getToday()
  const d = (date: Date) => date.toISOString().substring(0, 10)

  switch (label) {
    case '今日': return [today, today]
    case '昨日': {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      const ys = d(y)
      return [ys, ys]
    }
    case '本周': {
      const day = now.getDay() || 7
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
      return [d(mon), today]
    }
    case '上周': {
      const day = now.getDay() || 7
      const lastMon = new Date(now); lastMon.setDate(now.getDate() - day - 6)
      const lastSun = new Date(now); lastSun.setDate(now.getDate() - day)
      return [d(lastMon), d(lastSun)]
    }
    case '本月': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return [d(first), today]
    }
    case '上月': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return [d(first), d(last)]
    }
    default: return [today, today]
  }
}
