import { useState, useEffect } from 'react';
import { Search, Filter, Download, FileText, Table } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Riwayat() {
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');

  useEffect(() => {
    fetch('/api/riwayat')
      .then(res => res.json())
      .then(data => {
        setRiwayat(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredRiwayat = riwayat.filter(item => {
    const matchSearch = item.no_tiket.toLowerCase().includes(search.toLowerCase()) || 
                        item.nama_peminjam.toLowerCase().includes(search.toLowerCase()) ||
                        item.barang_dipinjam.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Laporan Riwayat Peminjaman', 14, 15);
    
    const tableColumn = ["No Tiket", "Waktu Pinjam", "Peminjam", "Barang", "Jumlah", "Status"];
    const tableRows = filteredRiwayat.map(item => [
      item.no_tiket,
      item.waktu_peminjaman,
      item.nama_peminjam,
      item.barang_dipinjam,
      item.jumlah,
      item.status
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save('laporan_peminjaman.pdf');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredRiwayat.map(item => ({
      'No Tiket': item.no_tiket,
      'Waktu Pinjam': item.waktu_peminjaman,
      'Peminjam': item.nama_peminjam,
      'Kontak': item.no_kontak,
      'Barang': item.barang_dipinjam,
      'Jumlah': item.jumlah,
      'Status': item.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat");
    XLSX.writeFile(workbook, "laporan_peminjaman.xlsx");
  };

  const exportToHTML = () => {
    const htmlContent = `
      <html>
        <head>
          <title>Laporan Riwayat Peminjaman</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>Laporan Riwayat Peminjaman</h2>
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>No Tiket</th>
                <th>Waktu Pinjam</th>
                <th>Peminjam</th>
                <th>Kontak</th>
                <th>Barang</th>
                <th>Jumlah</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRiwayat.map(item => `
                <tr>
                  <td>${item.no_tiket}</td>
                  <td>${item.waktu_peminjaman}</td>
                  <td>${item.nama_peminjam}</td>
                  <td>${item.no_kontak}</td>
                  <td>${item.barang_dipinjam}</td>
                  <td>${item.jumlah}</td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'laporan_peminjaman.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat Peminjaman</h2>
          <p className="mt-1 text-sm text-slate-500">Daftar seluruh aktivitas peminjaman dan pengembalian barang.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportToPDF}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <Table className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={exportToHTML}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Download className="h-4 w-4" />
            HTML
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
              placeholder="Cari tiket, nama, atau barang..."
            />
          </div>
          <div className="sm:w-48 relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors bg-white"
            >
              <option value="Semua">Semua Status</option>
              <option value="Dipinjam">Dipinjam</option>
              <option value="Dikembalikan">Dikembalikan</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">No Tiket</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Peminjam</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Barang</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Waktu</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredRiwayat.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    Tidak ada riwayat ditemukan.
                  </td>
                </tr>
              ) : (
                filteredRiwayat.map((item) => (
                  <tr key={item.no_tiket} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.no_tiket}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{item.nama_peminjam}</div>
                      <div className="text-sm text-slate-500">{item.no_kontak}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{item.barang_dipinjam}</div>
                      <div className="text-sm text-slate-500">{item.jumlah} unit</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {item.waktu_peminjaman}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Dikembalikan' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
