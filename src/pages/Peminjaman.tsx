import React, { useState, useEffect } from 'react';
import { Package, MapPin, User, Phone, Hash, Camera, CheckCircle2 } from 'lucide-react';

export default function Peminjaman() {
  const [barangList, setBarangList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [gpsLocation, setGpsLocation] = useState('');
  const [locationError, setLocationError] = useState('');

  const [formData, setFormData] = useState({
    lokasi: '',
    nama: '',
    kontak: '',
    barang: '',
    jumlah: 1,
    fotoPeminjam: '',
    fotoBarang: '',
  });

  useEffect(() => {
    fetch('/api/barang')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBarangList(data);
        } else {
          console.error('Expected array of barang, got:', data);
          setBarangList([]);
        }
      })
      .catch(err => {
        console.error('Error fetching barang:', err);
        setBarangList([]);
      });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          setLocationError('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan.');
        }
      );
    } else {
      setLocationError('Geolocation tidak didukung di browser ini.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/peminjaman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, gpsLocation }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(`Peminjaman berhasil! No Tiket: ${data.tiket}`);
        setFormData({
          lokasi: '',
          nama: '',
          kontak: '',
          barang: '',
          jumlah: 1,
          fotoPeminjam: '',
          fotoBarang: '',
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

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Form Peminjaman</h2>
        <p className="mt-1 text-sm text-slate-500">Isi data peminjaman barang dengan lengkap dan benar.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="h-2 w-2 bg-red-600 rounded-full" />
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-sm p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Nama Peminjam</label>
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
                  placeholder="Nama lengkap"
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
                  placeholder="0812..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Lokasi Penggunaan</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.lokasi}
                  onChange={e => setFormData({ ...formData, lokasi: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                  placeholder="Ruang Rapat..."
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Lokasi GPS (Otomatis)</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  disabled
                  value={gpsLocation || locationError || 'Mendeteksi lokasi...'}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl bg-slate-100 text-slate-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-slate-100 pt-6 mt-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Detail Barang</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Pilih Barang</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  required
                  value={formData.barang}
                  onChange={e => setFormData({ ...formData, barang: e.target.value })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors bg-white"
                >
                  <option value="">-- Pilih Barang --</option>
                  {barangList.map(b => (
                    <option key={b.kode_barang} value={b.nama_barang}>
                      {b.nama_barang} (Stok: {b.jumlah_stok})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Jumlah</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.jumlah}
                  onChange={e => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 1 })}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-slate-100 pt-6 mt-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Dokumentasi</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Foto Peminjam</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-emerald-500 transition-colors bg-slate-50">
                <div className="space-y-1 text-center">
                  {formData.fotoPeminjam ? (
                    <img src={formData.fotoPeminjam} alt="Preview" className="mx-auto h-32 object-cover rounded-lg" />
                  ) : (
                    <Camera className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-600 justify-center mt-4">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                      <span>Upload foto</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={e => handleFileChange(e, 'fotoPeminjam')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Foto Barang</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-emerald-500 transition-colors bg-slate-50">
                <div className="space-y-1 text-center">
                  {formData.fotoBarang ? (
                    <img src={formData.fotoBarang} alt="Preview" className="mx-auto h-32 object-cover rounded-lg" />
                  ) : (
                    <Package className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-600 justify-center mt-4">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                      <span>Upload foto</span>
                      <input type="file" accept="image/*" className="sr-only" onChange={e => handleFileChange(e, 'fotoBarang')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading || !gpsLocation}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan Peminjaman'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
