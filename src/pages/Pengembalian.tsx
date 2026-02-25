import React, { useState } from 'react';
import { Search, User, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Pengembalian() {
  const [tiket, setTiket] = useState('');
  const [dataPinjam, setDataPinjam] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    nama: '',
    kontak: '',
    kondisi: 'Baik',
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDataPinjam(null);

    try {
      const res = await fetch(`/api/peminjaman/tiket/${tiket}`);
      const data = await res.json();
      
      if (data.success) {
        setDataPinjam(data.data);
        setFormData({
          nama: data.data.nama_peminjam,
          kontak: data.data.no_kontak,
          kondisi: 'Baik',
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/pengembalian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiket,
          ...formData
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('Barang berhasil dikembalikan!');
        setDataPinjam(null);
        setTiket('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Form Pengembalian</h2>
        <p className="mt-1 text-sm text-slate-500">Cari tiket peminjaman untuk mengembalikan barang.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={tiket}
                onChange={e => setTiket(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                placeholder="Masukkan No Tiket (contoh: 2023102500001)"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex-shrink-0 px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
            >
              Cari Tiket
            </button>
          </form>
        </div>

        {error && (
          <div className="p-6 sm:px-8">
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="h-2 w-2 bg-red-600 rounded-full" />
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="p-6 sm:px-8">
            <div className="bg-emerald-50 text-emerald-700 text-sm p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        {dataPinjam && (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-slate-50/50">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Data Peminjaman Ditemukan
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Barang</dt>
                  <dd className="font-medium text-slate-900 mt-1">{dataPinjam.barang_dipinjam}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jumlah</dt>
                  <dd className="font-medium text-slate-900 mt-1">{dataPinjam.jumlah} unit</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Waktu Pinjam</dt>
                  <dd className="font-medium text-slate-900 mt-1">{dataPinjam.waktu_peminjaman}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Lokasi</dt>
                  <dd className="font-medium text-slate-900 mt-1">{dataPinjam.lokasi}</dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Pengembali</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.nama}
                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">No Kontak (WA)</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.kontak}
                    onChange={e => setFormData({ ...formData, kontak: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-3">Kondisi Barang</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {['Baik', 'Rusak', 'Hilang'].map((kondisi) => (
                    <label
                      key={kondisi}
                      className={`
                        relative flex cursor-pointer rounded-xl border p-4 focus:outline-none
                        ${formData.kondisi === kondisi 
                          ? kondisi === 'Baik' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="kondisi"
                        value={kondisi}
                        className="sr-only"
                        checked={formData.kondisi === kondisi}
                        onChange={e => setFormData({ ...formData, kondisi: e.target.value })}
                      />
                      <span className="flex flex-1">
                        <span className="flex flex-col">
                          <span className={`block text-sm font-medium ${
                            formData.kondisi === kondisi 
                              ? kondisi === 'Baik' ? 'text-emerald-900' : 'text-red-900'
                              : 'text-slate-900'
                          }`}>
                            {kondisi}
                          </span>
                        </span>
                      </span>
                      <CheckCircle2
                        className={`h-5 w-5 ${
                          formData.kondisi === kondisi 
                            ? kondisi === 'Baik' ? 'text-emerald-600' : 'text-red-600'
                            : 'invisible'
                        }`}
                      />
                    </label>
                  ))}
                </div>
                {formData.kondisi !== 'Baik' && (
                  <div className="mt-4 bg-amber-50 text-amber-800 text-sm p-4 rounded-xl border border-amber-200 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Barang yang dilaporkan rusak atau hilang akan mengurangi stok secara permanen dan admin akan menerima notifikasi.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Memproses...' : 'Konfirmasi Pengembalian'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
