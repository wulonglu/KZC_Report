// 店铺定义
export interface StoreData {
  name: string
  platform: '天猫' | 'C店' | '拼多多'
  targetGmv: number
  paymentAmount: number
  refundAmount: number
  lastYearSame: number
  visitors: number
  buyers: number
  salesCount: number
}

export interface DailyReport {
  date: string // YYYY-MM-DD
  stores: StoreData[]
}

export interface MonthlyData {
  reports: DailyReport[]
}

// 计算字段
export interface StoreMetrics extends StoreData {
  netGmv: number // 去退GMV = paymentAmount - refundAmount
  yoyGrowth: number // 同比增长 = (netGmv - lastYearSame) / lastYearSame * 100
  achievementRate: number // 达成率 = netGmv / targetGmv * 100
  avgOrderValue: number // 客单价 = paymentAmount / buyers
  conversionRate: number // 转化率 = buyers / visitors * 100
}

export const STORES = [
  { name: '百事天猫旗舰店', platform: '天猫' as const },
  { name: '佳得乐天猫旗舰店', platform: '天猫' as const },
  { name: 'C店-康智', platform: 'C店' as const },
  { name: 'C店-特好买', platform: 'C店' as const },
  { name: '拼多多-水饮专卖店', platform: '拼多多' as const },
  { name: '拼多多-劲爽专卖店', platform: '拼多多' as const },
]

export function emptyStore(name: string, platform: StoreData['platform']): StoreData {
  return {
    name,
    platform,
    targetGmv: 0,
    paymentAmount: 0,
    refundAmount: 0,
    lastYearSame: 0,
    visitors: 0,
    buyers: 0,
    salesCount: 0,
  }
}

export function computeMetrics(store: StoreData): StoreMetrics {
  const netGmv = store.paymentAmount - store.refundAmount
  const lastYearVal = (store as any)._lastYearNet ?? store.lastYearSame
  const yoyGrowth = lastYearVal > 0 ? ((netGmv - lastYearVal) / lastYearVal) * 100 : 0
  const achievementRate = store.targetGmv > 0 ? (netGmv / store.targetGmv) * 100 : 0
  const avgOrderValue = store.buyers > 0 ? store.paymentAmount / store.buyers : 0
  const conversionRate = store.visitors > 0 ? (store.buyers / store.visitors) * 100 : 0

  return { ...store, netGmv, yoyGrowth, achievementRate, avgOrderValue, conversionRate }
}

export function monthKey(date: string): string {
  return date.substring(0, 7) // "2026-05"
}
