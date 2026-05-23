// 导出美化Excel（HTML格式，Excel可直接打开保留样式）

export function exportExcel(sections: { title: string; headers: string[]; rows: string[][] }[], filename: string) {
  const styles = `
    <style>
      body { font-family: "Microsoft YaHei", Arial; background:#0a1628; color:#e2e8f0; padding:20px; }
      h2 { color:#93c5fd; font-size:14px; margin:20px 0 10px; border-bottom:2px solid #0066cc; padding-bottom:6px; }
      table { width:100%; border-collapse:collapse; margin-bottom:24px; font-size:11px; }
      th { background:#0066cc; color:#fff; padding:8px 10px; text-align:left; font-weight:600; white-space:nowrap; }
      td { padding:6px 10px; border-bottom:1px solid rgba(255,255,255,.08); }
      tr:nth-child(even) td { background:rgba(255,255,255,.03); }
      .num { text-align:right; }
      .blue { color:#93c5fd; font-weight:600; }
      .green { color:#4ade80; }
      .red { color:#f87171; }
      .footer td { font-weight:700; color:#fff; border-top:2px solid #0066cc; background:rgba(0,102,204,.15) !important; }
    </style>`
  let html = `<html><head><meta charset="UTF-8">${styles}</head><body>`
  for (const section of sections) {
    html += `<h2>${section.title}</h2><table>`
    html += `<thead><tr>${section.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`
    section.rows.forEach(row => {
      const cls = row[0] === '全店合计' ? ' class="footer"' : ''
      html += `<tr${cls}>${row.map((c, i) => `<td class="${i > 0 ? 'num' : ''}">${c}</td>`).join('')}</tr>`
    })
    html += '</tbody></table>'
  }
  html += '</body></html>'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// 截取页面为JPG并下载
export async function exportJPG() {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const container = document.querySelector('main') || document.body
    const canvas = await html2canvas(container as HTMLElement, {
      backgroundColor: '#020d1f',
      scale: 2,
      useCORS: true,
      logging: false,
    } as any)
    canvas.toBlob(blob => {
      if (!blob) return
      const a = document.createElement('a')
      a.download = `截图_${new Date().toISOString().slice(0,10)}.jpg`
      a.href = URL.createObjectURL(blob)
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/jpeg', 0.92)
  } catch (e) {
    alert('截图失败，请手动截图')
  }
}
