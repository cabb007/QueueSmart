import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const STATUS_STYLES = {
  served:   'bg-green-100 text-green-700',
  waiting:  'bg-blue-100 text-blue-700',
  canceled: 'bg-red-100 text-red-700',
}

const TIMEFRAMES = [
  { label: 'Today',      value: 'today'   },
  { label: 'Last 7 Days',value: '7days'   },
  { label: 'Last 30 Days',value: '30days' },
  { label: 'All Time',   value: 'all'     },
  { label: 'Custom',     value: 'custom'  },
]

export default function AdminReports() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [timeframe, setTimeframe] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [filtered,  setFiltered]  = useState(null)

  const [exportOptions, setExportOptions] = useState({
  summary:        true,
  pieChart:       true,
  barChart:       true,
  serviceTable:   true,
  patientHistory: true,
})
const [showExportMenu, setShowExportMenu] = useState(false)

const PIE_COLORS = ['#2B4ACB', '#2ECC71', '#E74C3C', '#F26522', '#9B59B6']
const BAR_COLORS = { served: '#2ECC71', canceled: '#E74C3C', waiting: '#2B4ACB' }

  function fetchData() {
    setLoading(true)
    fetch('http://localhost:3001/api/admin/reports')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load reports.'); setLoading(false) })
  }

  useEffect(() => { fetchData() }, [])

  // Filter data whenever timeframe or dates change
  useEffect(() => {
    if (!data) return

    const now   = new Date()
    let   start = null
    let   end   = new Date(now)
    end.setHours(23, 59, 59, 999)

    if (timeframe === 'today') {
      start = new Date(now)
      start.setHours(0, 0, 0, 0)
    } else if (timeframe === '7days') {
      start = new Date(now)
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
    } else if (timeframe === '30days') {
      start = new Date(now)
      start.setDate(now.getDate() - 30)
      start.setHours(0, 0, 0, 0)
    } else if (timeframe === 'custom') {
      start = startDate ? new Date(startDate) : null
      end   = endDate   ? new Date(endDate)   : end
      if (end) end.setHours(23, 59, 59, 999)
    }

    // Filter patient history
    const filteredHistory = data.patientHistory.filter(h => {
      if (!start) return true
      const date = new Date(h.joinedAt)
      return date >= start && date <= end
    })

    // Recalculate service usage from filtered history
    const usageMap = {}
    data.serviceUsage.forEach(s => {
      usageMap[s.serviceName] = { serviceName: s.serviceName, totalVisits: 0, served: 0, canceled: 0, waiting: 0 }
    })
    filteredHistory.forEach(h => {
      if (!usageMap[h.serviceName]) {
        usageMap[h.serviceName] = { serviceName: h.serviceName, totalVisits: 0, served: 0, canceled: 0, waiting: 0 }
      }
      usageMap[h.serviceName].totalVisits++
      if (h.status === 'served')   usageMap[h.serviceName].served++
      if (h.status === 'canceled') usageMap[h.serviceName].canceled++
      if (h.status === 'waiting')  usageMap[h.serviceName].waiting++
    })

    const filteredUsage = Object.values(usageMap)

    // Recalculate summary
    const servedToday = filteredHistory.filter(h => {
      const d = new Date(h.joinedAt)
      const today = new Date()
      return d.toDateString() === today.toDateString() && h.status === 'served'
    }).length

    setFiltered({
      summary: {
        servedToday,
        servedAllTime:  filteredHistory.filter(h => h.status === 'served').length,
        avgWaitMinutes: data.summary.avgWaitMinutes,
      },
      serviceUsage:   filteredUsage,
      patientHistory: filteredHistory,
    })
  }, [data, timeframe, startDate, endDate])

  const display = filtered || data

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  function getTimeframeLabel() {
    if (timeframe === 'custom' && startDate && endDate)
      return `${startDate} to ${endDate}`
    return TIMEFRAMES.find(t => t.value === timeframe)?.label || 'All Time'
  }

  function exportCSV() {
  if (!display) return
  const rows = []
  rows.push([`QueueSmart Report — ${getTimeframeLabel()}`])
  rows.push([`Generated: ${new Date().toLocaleString()}`])
  rows.push([])

  if (exportOptions.summary) {
    rows.push(['SUMMARY'])
    rows.push(['Served Today', 'Served in Period', 'Avg Wait Time (min)'])
    rows.push([display.summary.servedToday, display.summary.servedAllTime, display.summary.avgWaitMinutes])
    rows.push([])
  }

  if (exportOptions.serviceTable) {
    rows.push(['SERVICE USAGE'])
    rows.push(['Service Name', 'Total Visits', 'Served', 'Canceled', 'Waiting'])
    display.serviceUsage.forEach(s => rows.push([s.serviceName, s.totalVisits, s.served, s.canceled, s.waiting]))
    rows.push([])
  }

  if (exportOptions.patientHistory) {
    rows.push(['PATIENT VISIT HISTORY'])
    rows.push(['Patient Name', 'Service', 'Date & Time', 'Status'])
    display.patientHistory.forEach(h => rows.push([h.patientName, h.serviceName, formatDate(h.joinedAt), h.status]))
  }

  const csv  = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `queuesmart-report-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

  async function exportPDF() {
  if (!display) return

const { jsPDF }              = await import('jspdf')
const { default: autoTable } = await import('jspdf-autotable')

  const doc      = new jsPDF()
  let   currentY = 20

  // ── Title ──
  doc.setFontSize(20)
  doc.setTextColor(43, 74, 203)
  doc.text('QueueSmart Report', 14, currentY)
  currentY += 8

  doc.setFontSize(10)
  doc.setTextColor(107, 122, 141)
  doc.text(`Period: ${getTimeframeLabel()}`, 14, currentY)
  currentY += 6
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY)
  currentY += 6

  const included = []
  if (exportOptions.summary)        included.push('Summary')
  if (exportOptions.pieChart)       included.push('Pie Chart (see app)')
  if (exportOptions.barChart)       included.push('Bar Chart (see app)')
  if (exportOptions.serviceTable)   included.push('Service Usage')
  if (exportOptions.patientHistory) included.push('Patient History')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(`Includes: ${included.join(', ')}`, 14, currentY)
  currentY += 12

  // ── Summary ──
  if (exportOptions.summary) {
    doc.setFontSize(13)
    doc.setTextColor(13, 27, 75)
    doc.text('Summary', 14, currentY)
    currentY += 6

    const summaryItems = [
      { label: 'Served Today',     val: String(display.summary.servedToday)              },
      { label: 'Served in Period', val: String(display.summary.servedAllTime)             },
      { label: 'Avg Wait Time',    val: `${display.summary.avgWaitMinutes || 0} min`      },
    ]
    summaryItems.forEach((s, i) => {
      const x = 14 + i * 62
      doc.setFillColor(238, 241, 251)
      doc.roundedRect(x, currentY, 58, 22, 3, 3, 'F')
      doc.setFontSize(16)
      doc.setTextColor(43, 74, 203)
      doc.text(s.val, x + 29, currentY + 12, { align: 'center' })
      doc.setFontSize(8)
      doc.setTextColor(107, 122, 141)
      doc.text(s.label, x + 29, currentY + 18, { align: 'center' })
    })
    currentY += 30
  }

  // ── Pie chart note ──
if (exportOptions.pieChart) {
  doc.setFontSize(11)
  doc.setTextColor(13, 27, 75)
  doc.text('Visits by Service', 14, currentY)
  currentY += 4

  try {
    const { default: html2canvas } = await import('html2canvas')
    const pieContainer = document.querySelectorAll('.recharts-responsive-container')[0]
    if (pieContainer) {
      const canvas  = await html2canvas(pieContainer, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      doc.addImage(imgData, 'PNG', 14, currentY, 88, 55)
      currentY += 60
    }
  } catch {
    // fallback to legend
    const pieDisplay = display.serviceUsage.filter(s => Number(s.totalVisits) > 0)
    const colors = [[43,74,203],[46,204,113],[231,76,60],[242,101,34],[155,89,182]]
    pieDisplay.forEach((s, i) => {
      const color = colors[i % colors.length]
      doc.setFillColor(...color)
      doc.rect(14, currentY - 3, 8, 5, 'F')
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      doc.text(`${s.serviceName}: ${s.totalVisits} visits`, 26, currentY + 1)
      currentY += 8
    })
    currentY += 6
  }
}

  // ── Bar chart ──
if (exportOptions.barChart) {
  doc.setFontSize(11)
  doc.setTextColor(13, 27, 75)
  doc.text('Outcomes by Service', 110, currentY - 56)

  try {
    const { default: html2canvas } = await import('html2canvas')
    const barContainer = document.querySelectorAll('.recharts-responsive-container')[1]
    if (barContainer) {
      const canvas  = await html2canvas(barContainer, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      doc.addImage(imgData, 'PNG', 110, currentY - 60, 88, 55)
      currentY += 6
    }
  } catch {
    // fallback to text
    display.serviceUsage.forEach(s => {
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      doc.text(`${s.serviceName}:`, 14, currentY)
      doc.setTextColor(46, 125, 50)
      doc.text(`Served: ${s.served}`, 70, currentY)
      doc.setTextColor(198, 40, 40)
      doc.text(`Canceled: ${s.canceled}`, 110, currentY)
      doc.setTextColor(21, 101, 192)
      doc.text(`Waiting: ${s.waiting}`, 155, currentY)
      currentY += 7
    })
    currentY += 6
  }
}

  // ── Service usage table ──
  if (exportOptions.serviceTable) {
    doc.setFontSize(13)
    doc.setTextColor(13, 27, 75)
    doc.text('Service Usage Breakdown', 14, currentY)
    currentY += 4

    autoTable(doc, {
      startY: currentY,
      head:   [['Service', 'Total Visits', 'Served', 'Canceled', 'Waiting']],
      body:   display.serviceUsage.map(s => [
        s.serviceName, s.totalVisits, s.served, s.canceled, s.waiting
      ]),
      headStyles:         { fillColor: [43, 74, 203], textColor: 255, fontSize: 10 },
      bodyStyles:         { fontSize: 9 },
      alternateRowStyles: { fillColor: [238, 241, 251] },
      styles:             { cellPadding: 4 },
    })
    currentY = doc.lastAutoTable.finalY + 10
  }

  // ── Patient history table ──
  if (exportOptions.patientHistory) {
    doc.setFontSize(13)
    doc.setTextColor(13, 27, 75)
    doc.text('Patient Visit History', 14, currentY)
    currentY += 4

    autoTable(doc, {
      startY: currentY,
      head:   [['Patient', 'Service', 'Date & Time', 'Status']],
      body:   display.patientHistory.map(h => [
        h.patientName, h.serviceName, formatDate(h.joinedAt), h.status
      ]),
      headStyles:         { fillColor: [43, 74, 203], textColor: 255, fontSize: 10 },
      bodyStyles:         { fontSize: 9 },
      alternateRowStyles: { fillColor: [238, 241, 251] },
      styles:             { cellPadding: 4 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = String(data.cell.raw)
          if (status === 'served')   doc.setTextColor(46, 125, 50)
          if (status === 'canceled') doc.setTextColor(198, 40, 40)
          if (status === 'waiting')  doc.setTextColor(21, 101, 192)
        }
      },
    })
  }

  doc.save(`queuesmart-report-${timeframe}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 font-medium">Loading reports...</p>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500">{error}</p>
    </div>
  )

  const pieData = (display?.serviceUsage || [])
    .filter(s => Number(s.totalVisits) > 0)
    .map(s => ({ name: s.serviceName, value: Number(s.totalVisits) }))

  const barData = (display?.serviceUsage || []).map(s => ({
    name:     s.serviceName.length > 15 ? s.serviceName.substring(0, 15) + '...' : s.serviceName,
    served:   Number(s.served),
    canceled: Number(s.canceled),
    waiting:  Number(s.waiting),
  }))

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0D1B4B] tracking-tight">Reports</h1>
            <p className="text-gray-500 text-sm mt-1">Clinic usage statistics and patient history</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap relative">

  {/* Export menu toggle */}
  <div className="relative">
    <button
      onClick={() => setShowExportMenu(s => !s)}
      className="px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm
                 font-semibold rounded-lg transition-colors flex items-center gap-2"
    >
      ⚙ Export Options {showExportMenu ? '▲' : '▼'}
    </button>

    {/* Dropdown */}
    {showExportMenu && (
      <div className="absolute right-0 top-12 z-50 bg-white border border-gray-200
                      rounded-xl shadow-xl p-4 w-56">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Include in Export
        </p>
        {[
          { key: 'summary',        label: 'Summary Statistics' },
          { key: 'pieChart',       label: 'Pie Chart'          },
          { key: 'barChart',       label: 'Bar Chart'          },
          { key: 'serviceTable',   label: 'Service Usage Table'},
          { key: 'patientHistory', label: 'Patient History'    },
        ].map(opt => (
          <label key={opt.key}
            className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={exportOptions[opt.key]}
              onChange={e => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
              className="w-4 h-4 accent-[#2B4ACB] cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-[#2B4ACB] transition-colors">
              {opt.label}
            </span>
          </label>
        ))}

        <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-2">
          <button
            onClick={() => { exportCSV(); setShowExportMenu(false) }}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs
                       font-semibold rounded-lg transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => { exportPDF(); setShowExportMenu(false) }}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs
                       font-semibold rounded-lg transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>
    )}
  </div>

  <button onClick={fetchData}
    className="px-4 py-2.5 bg-[#2B4ACB] hover:bg-[#1f37a0] text-white text-sm
               font-semibold rounded-lg transition-colors">
    Refresh
  </button>
</div>
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-700 shrink-0">Time Frame:</span>

            {/* Timeframe buttons */}
            <div className="flex gap-2 flex-wrap">
              {TIMEFRAMES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTimeframe(t.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors
                              ${timeframe === t.value
                                ? 'bg-[#2B4ACB] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Custom date pickers */}
            {timeframe === 'custom' && (
              <div className="flex items-center gap-3 flex-wrap ml-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none
                               focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none
                               focus:border-[#2B4ACB] focus:ring-2 focus:ring-[#2B4ACB]/10"
                  />
                </div>
              </div>
            )}

            {/* Active filter label */}
            <span className="ml-auto text-xs text-gray-400 font-medium">
              Showing: <strong className="text-gray-600">{getTimeframeLabel()}</strong>
            </span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Served Today',       val: display?.summary.servedToday,                   icon: '✅', color: 'text-green-600'  },
            { label: 'Served in Period',   val: display?.summary.servedAllTime,                  icon: '📊', color: 'text-[#2B4ACB]' },
            { label: 'Avg. Wait Time',     val: `${display?.summary.avgWaitMinutes || 0} min`,   icon: '⏱',  color: 'text-amber-600'  },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</span>
                <span className="text-xl opacity-60">{s.icon}</span>
              </div>
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0D1B4B] mb-1">Visits by Service</h2>
            <p className="text-xs text-gray-400 mb-4">{getTimeframeLabel()}</p>
            {pieData.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => [`${val} visits`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-bold text-[#0D1B4B] mb-1">Outcomes by Service</h2>
            <p className="text-xs text-gray-400 mb-4">{getTimeframeLabel()}</p>
            {barData.every(d => d.served === 0 && d.canceled === 0 && d.waiting === 0) ? (
              <div className="text-center py-12 text-gray-400 text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="served"   name="Served"   fill={BAR_COLORS.served}   radius={[4,4,0,0]} />
                  <Bar dataKey="canceled" name="Canceled" fill={BAR_COLORS.canceled} radius={[4,4,0,0]} />
                  <Bar dataKey="waiting"  name="Waiting"  fill={BAR_COLORS.waiting}  radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Service usage table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-[#2B4ACB] px-6 py-5">
            <h2 className="!text-white text-lg font-bold">Service Usage Breakdown</h2>
            <p className="!text-white/70 text-sm mt-0.5">{getTimeframeLabel()}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Service', 'Total Visits', 'Served', 'Canceled', 'Waiting'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500
                                           uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display?.serviceUsage.map((s, i) => (
                  <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50
                                          ${i === display.serviceUsage.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4 font-semibold text-gray-800">{s.serviceName}</td>
                    <td className="px-5 py-4 text-gray-700">{s.totalVisits}</td>
                    <td className="px-5 py-4"><span className="text-green-700 font-semibold">{s.served}</span></td>
                    <td className="px-5 py-4"><span className="text-red-600 font-semibold">{s.canceled}</span></td>
                    <td className="px-5 py-4"><span className="text-blue-600 font-semibold">{s.waiting}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient history table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#2B4ACB] px-6 py-5">
            <h2 className="!text-white text-lg font-bold">Patient Visit History</h2>
            <p className="!text-white/70 text-sm mt-0.5">{getTimeframeLabel()} — {display?.patientHistory.length} records</p>
          </div>
          {display?.patientHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2 opacity-40">📋</div>
              <div className="font-semibold">No records for this period</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Patient', 'Service', 'Date & Time', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500
                                             uppercase tracking-wide px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {display?.patientHistory.map((h, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50
                                            ${i === display.patientHistory.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{h.patientName}</td>
                      <td className="px-5 py-3 text-gray-600">{h.serviceName}</td>
                      <td className="px-5 py-3 text-gray-500 text-sm">{formatDate(h.joinedAt)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
                                          ${STATUS_STYLES[h.status] || 'bg-gray-100 text-gray-600'}`}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}