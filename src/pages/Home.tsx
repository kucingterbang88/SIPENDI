import React, { useState, useEffect } from 'react';
import { Package, MapPin, User, Phone, Hash, Camera, CheckCircle2, Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<'pinjam' | 'kembali'>('pinjam');
  const [gpsLocation, setGpsLocation] = useState('');
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    // Auto logout if user visits public page
    if (localStorage.getItem('sipendi_user')) {
      if (onLogout) {
        onLogout();
      } else {
        localStorage.removeItem('sipendi_user');
      }
    }

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <img src="/logo-tamalate.png" alt="Logo Tamalate" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <Package className="h-6 w-6 text-blue-400" />
          <span>SIPENDI</span>
        </div>
        <Link to="/login" className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <ShieldCheck className="h-4 w-4" />
          Login Admin
        </Link>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Layanan Peminjaman Barang</h1>
          <p className="text-slate-600">Kecamatan Tamalate</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === 'pinjam' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('pinjam')}
            >
              Form Peminjaman
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === 'kembali' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('kembali')}
            >
              Form Pengembalian
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'pinjam' ? (
              <FormPeminjaman gpsLocation={gpsLocation} locationError={locationError} />
            ) : (
              <FormPengembalian />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FormPeminjaman({ gpsLocation, locationError }: { gpsLocation: string, locationError: string }) {
  const [barangList, setBarangList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    lokasi: '',
    nama: '',
    kontak: '',
    barang: '',
    jumlah: '' as number | '',
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

  const selectedBarang = barangList.find(b => b.nama_barang === formData.barang);
  const isStockInsufficient = selectedBarang && formData.jumlah !== '' && formData.jumlah > selectedBarang.jumlah_stok;

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
          jumlah: '',
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="h-2 w-2 bg-red-600 rounded-full" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-blue-50 text-blue-700 text-sm p-4 rounded-xl border border-blue-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
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
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors bg-white"
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
              <Hash className={`h-5 w-5 ${isStockInsufficient ? 'text-red-400' : 'text-slate-400'}`} />
            </div>
            <input
              type="number"
              min="1"
              required
              value={formData.jumlah}
              onChange={e => setFormData({ ...formData, jumlah: e.target.value ? parseInt(e.target.value) : '' })}
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-xl focus:ring-2 sm:text-sm transition-colors ${
                isStockInsufficient 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900' 
                  : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
          </div>
          {isStockInsufficient && (
            <p className="mt-2 text-sm text-red-600">jumlah barang yang akan dipinjam tidak cukup</p>
          )}
        </div>

        <div className="sm:col-span-2 border-t border-slate-100 pt-6 mt-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Dokumentasi</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Foto Peminjam</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 transition-colors bg-slate-50">
            <div className="space-y-1 text-center">
              {formData.fotoPeminjam ? (
                <img src={formData.fotoPeminjam} alt="Preview" className="mx-auto h-32 object-cover rounded-lg" />
              ) : (
                <Camera className="mx-auto h-12 w-12 text-slate-400" />
              )}
              <div className="flex text-sm text-slate-600 justify-center mt-4">
                <label className="relative cursor-pointer bg-white rounded-md font-bold text-black hover:text-slate-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload foto</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={e => handleFileChange(e, 'fotoPeminjam')} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Foto Barang</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 transition-colors bg-slate-50">
            <div className="space-y-1 text-center">
              {formData.fotoBarang ? (
                <img src={formData.fotoBarang} alt="Preview" className="mx-auto h-32 object-cover rounded-lg" />
              ) : (
                <Package className="mx-auto h-12 w-12 text-slate-400" />
              )}
              <div className="flex text-sm text-slate-600 justify-center mt-4">
                <label className="relative cursor-pointer bg-white rounded-md font-bold text-black hover:text-slate-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
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
          disabled={loading || !gpsLocation || isStockInsufficient || formData.jumlah === '' || formData.jumlah <= 0}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Menyimpan...' : 'Simpan Peminjaman'}
        </button>
      </div>
    </form>
  );
}

function FormPengembalian() {
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
          tiket: dataPinjam.no_tiket,
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
    <div className="space-y-6">
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
            className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Masukkan No Tiket atau No HP Peminjam"
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

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-3">
          <div className="h-2 w-2 bg-red-600 rounded-full" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-blue-50 text-blue-700 text-sm p-4 rounded-xl border border-blue-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {dataPinjam && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
                        ? kondisi === 'Baik' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
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
                            ? kondisi === 'Baik' ? 'text-blue-900' : 'text-red-900'
                            : 'text-slate-900'
                        }`}>
                          {kondisi}
                        </span>
                      </span>
                    </span>
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        formData.kondisi === kondisi 
                          ? kondisi === 'Baik' ? 'text-blue-600' : 'text-red-600'
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
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Mempblues...' : 'Konfirmasi Pengembalian'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
