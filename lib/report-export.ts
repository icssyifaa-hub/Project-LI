type ReportCell = string | number | null | undefined

type ReportOptions = {
  title: string
  headers: string[]
  rows: ReportCell[][]
  filename: string
}

const cleanText = (value: ReportCell) =>
  String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const escapeHtml = (value: ReportCell) =>
  cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const escapePdfText = (value: ReportCell) =>
  cleanText(value)
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

const pdfTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.52

const getColumnWeights = (headers: string[]) =>
  headers.map(header => {
    const normalizedHeader = header.toLowerCase()

    if (normalizedHeader.includes('client')) return 1.5
    if (normalizedHeader.includes('task')) return 1.35
    if (normalizedHeader.includes('title')) return 1.35
    if (normalizedHeader.includes('support')) return 1.5
    if (normalizedHeader.includes('running')) return 1.05
    if (normalizedHeader.includes('final report')) return 1.05
    if (normalizedHeader.includes('job order')) return 1.05
    if (normalizedHeader.includes('date')) return 0.9
    if (normalizedHeader.includes('time')) return 0.8
    if (normalizedHeader.includes('status')) return 0.9
    if (normalizedHeader === 'pic') return 0.95

    return 1
  })

const wrapPdfText = (value: ReportCell, maxWidth: number, fontSize: number, maxLines = 4) => {
  const text = cleanText(value) || '-'
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  const pushLine = (line: string) => {
    if (lines.length < maxLines) lines.push(line)
  }

  words.forEach(word => {
    if (lines.length >= maxLines) return

    const chunks: string[] = []
    let chunk = word
    while (pdfTextWidth(chunk, fontSize) > maxWidth && chunk.length > 1) {
      let cut = chunk.length - 1
      while (cut > 1 && pdfTextWidth(chunk.slice(0, cut), fontSize) > maxWidth) cut -= 1
      chunks.push(chunk.slice(0, cut))
      chunk = chunk.slice(cut)
    }
    chunks.push(chunk)

    chunks.forEach(part => {
      if (lines.length >= maxLines) return

      const next = current ? `${current} ${part}` : part
      if (pdfTextWidth(next, fontSize) <= maxWidth) {
        current = next
        return
      }

      if (current) pushLine(current)
      current = part
    })
  })
  
  if (current && lines.length < maxLines) pushLine(current)

  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    const lastIndex = lines.length - 1
    let lastLine = lines[lastIndex]
    while (pdfTextWidth(`${lastLine}...`, fontSize) > maxWidth && lastLine.length > 1) {
      lastLine = lastLine.slice(0, -1)
    }
    lines[lastIndex] = `${lastLine}...`
  }

  return lines.length ? lines : ['-']
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const downloadExcelReport = ({ title, headers, rows, filename }: ReportOptions) => {
  const tableHeaders = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')
  const tableRows = rows
    .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th, td { border: 1px solid #111827; padding: 6px 8px; vertical-align: top; }
    th { background: #e5e7eb; font-weight: 700; }
    h1 { font-family: Arial, sans-serif; font-size: 18px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
</body>
</html>`

  downloadBlob(
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    `${filename}.xls`
  )
}

export const downloadPdfReport = ({ title, headers, rows, filename }: ReportOptions) => {
  const pageWidth = 842
  const pageHeight = 595
  const margin = 28
  const titleSize = 14
  const metaSize = 8
  const headerSize = 6.5
  const bodySize = 6.2
  const lineHeight = 8.6
  const cellPaddingX = 4
  const cellPaddingY = 5
  const tableWidth = pageWidth - margin * 2
  const columnWeights = getColumnWeights(headers)
  const totalWeight = columnWeights.reduce((total, weight) => total + weight, 0)
  const columnWidths = columnWeights.map(weight => tableWidth * (weight / totalWeight))
  const columnX = columnWidths.reduce<number[]>((positions, width, index) => {
    positions.push(index === 0 ? margin : positions[index - 1] + columnWidths[index - 1])
    return positions
  }, [])
  const headerLines = headers.map((header, index) =>
    wrapPdfText(header, columnWidths[index] - cellPaddingX * 2, headerSize, 3)
  )
  const headerHeight = Math.max(...headerLines.map(lines => lines.length)) * lineHeight + cellPaddingY * 2
  const pages: string[] = []
  let commands: string[] = []
  let y = pageHeight - margin

  const rgb = (hex: string) => {
    const value = hex.replace('#', '')
    return [
      parseInt(value.slice(0, 2), 16) / 255,
      parseInt(value.slice(2, 4), 16) / 255,
      parseInt(value.slice(4, 6), 16) / 255,
    ].map(channel => channel.toFixed(3)).join(' ')
  }

  const drawRect = (x: number, topY: number, width: number, height: number, fill?: string) => {
    if (fill) {
      commands.push(`q ${rgb(fill)} rg 0.820 0.851 0.902 RG ${x.toFixed(2)} ${(topY - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re B Q`)
    } else {
      commands.push(`q 0.820 0.851 0.902 RG ${x.toFixed(2)} ${(topY - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S Q`)
    }
  }

  const drawText = (text: ReportCell, x: number, baselineY: number, fontSize: number, color = '111827', bold = false) => {
    commands.push(`BT /${bold ? 'F2' : 'F1'} ${fontSize} Tf ${rgb(color)} rg ${x.toFixed(2)} ${baselineY.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`)
  }

  const drawTableHeader = () => {
    headers.forEach((header, index) => {
      const x = columnX[index]
      const width = columnWidths[index]
      drawRect(x, y, width, headerHeight, '#e5e7eb')
      headerLines[index].forEach((line, lineIndex) => {
        drawText(line, x + cellPaddingX, y - cellPaddingY - headerSize - lineIndex * lineHeight, headerSize, '111827', true)
      })
    })
    y -= headerHeight
  }

  const startPage = () => {
    commands = []
    y = pageHeight - margin
    drawText(title, margin, y - titleSize, titleSize, '111827', true)
    drawText(`Generated: ${new Date().toLocaleString()}   |   Total rows: ${rows.length}`, margin, y - titleSize - 14, metaSize, '4b5563')
    y -= 42
    drawTableHeader()
  }

  const finishPage = () => {
    pages.push(commands.join('\n'))
  }

  startPage()

  rows.forEach((row, rowIndex) => {
    const wrappedCells = headers.map((_, columnIndex) =>
      wrapPdfText(row[columnIndex], columnWidths[columnIndex] - cellPaddingX * 2, bodySize)
    )
    const rowHeight = Math.max(...wrappedCells.map(lines => lines.length)) * lineHeight + cellPaddingY * 2

    if (y - rowHeight < margin + 14) {
      finishPage()
      startPage()
    }

    const fill = rowIndex % 2 === 0 ? '#ffffff' : '#f9fafb'
    wrappedCells.forEach((lines, columnIndex) => {
      const x = columnX[columnIndex]
      const width = columnWidths[columnIndex]
      drawRect(x, y, width, rowHeight, fill)
      lines.forEach((line, lineIndex) => {
        drawText(line, x + cellPaddingX, y - cellPaddingY - bodySize - lineIndex * lineHeight, bodySize, '111827')
      })
    })
    y -= rowHeight
  })

  finishPage()

  pages.forEach((pageCommands, pageIndex) => {
    commands = pageCommands.split('\n')
    drawText(`Page ${pageIndex + 1} of ${pages.length}`, pageWidth - margin - 58, margin - 2, metaSize, '6b7280')
    pages[pageIndex] = commands.join('\n')
  })

  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`)

  pages.forEach((content, pageIndex) => {
    const pageObjectNumber = 3 + pageIndex * 2
    const contentObjectNumber = pageObjectNumber + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), `${filename}.pdf`)
}
