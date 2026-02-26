import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Search } from 'lucide-react';

export default function AdminBarang() {
  const [barang, setBarang] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    stok: 1,
    deskripsi: '',
  });

  const fetchBarang = async () => {
    try {
      const res = await fetch('/api/barang');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBarang(data);
      } else if (data.message) {
        console.error('Error fetching barang:', data.message);
        alert(`Gagal memuat data barang: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarang();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        fetchBarang();
        setShowForm(false);
        setFormData({ kode: '', nama: '', stok: 1, deskripsi: '' });
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  const handleDelete = async (kode: string) => {
    if (!confirm('Yakin ingin menghapus barang ini?')) return;
    try {
      const res = await fetch(`/api/barang/${kode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchBarang();
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  const filteredBarang = barang.filter(item => 
    item.nama_barang.toLowerCase().includes(search.toLowerCase()) || 
    item.kode_barang.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kelola Barang</h2>
          <p className="mt-1 text-sm text-slate-500">Daftar inventaris barang Kecamatan Tamalate.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Batal Tambah' : 'Tambah Barang'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Tambah Barang Baru</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Kode Barang</label>
              <input
                type="text"
                required
                value={formData.kode}
                onChange={e => setFormData({ ...formData, kode: e.target.value })}
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="BRG001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
              <input
                type="text"
                required
                value={formData.nama}
                onChange={e => setFormData({ ...formData, nama: e.target.value })}
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="Nama Barang"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Jumlah Stok</label>
              <input
                type="number"
                min="1"
                required
                value={formData.stok}
                onChange={e => setFormData({ ...formData, stok: parseInt(e.target.value) || 1 })}
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                rows={3}
                value={formData.deskripsi}
                onChange={e => setFormData({ ...formData, deskripsi: e.target.value })}
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="Deskripsi barang..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Simpan Barang
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="max-w-md relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Cari nama atau kode barang..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Kode</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Barang</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stok</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filteredBarang.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                    Tidak ada barang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredBarang.map((item) => (
                  <tr key={item.kode_barang} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {item.kode_barang}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">{item.nama_barang}</div>
                          <div className="text-sm text-slate-500">{item.deskripsi}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.jumlah_stok > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.jumlah_stok} unit
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(item.kode_barang)}
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                        title="Hapus Barang"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
