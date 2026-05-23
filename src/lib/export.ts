// 导出美化CSV（Excel可打开）

export function exportCSV(sections: { title: string; headers: string[]; rows: string[][] }[], filename: string) {
  let csv = '\uFEFF' // BOM for Excel Chinese
  for (const section of sections) {
    csv += `\n${section.title}\n`
    csv += section.headers.join(',') + '\n'
    section.rows.forEach(row => {
      csv += row.join(',') + '\n'
    })
    csv += '\n'
  }
  const blob = new Blob([csv], { type: 'application/vnd.ms-excel' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// 截取页面为图片并下载
export async function exportScreenshot() {
  // 使用浏览器的打印功能保存为PDF
  setTimeout(() => window.print(), 500)
}
