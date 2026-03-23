import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Package, ArrowLeft } from 'lucide-react';

export default function Success() {
  const [searchParams] = useSearchParams();
  const tiket = searchParams.get('tiket');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tiket) {
      fetch(`/api/peminjaman/tiket/${tiket}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            setData(resData.data);
          } else {
            setError(resData.message || 'Data tidak ditemukan');
          }
        })
        .catch(err => {
          setError('Gagal mengambil data tiket');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setError('Nomor tiket tidak ditemukan');
      setLoading(false);
    }
  }, [tiket]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Memuat data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="text-red-500 mb-4 text-xl font-bold">Error</div>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-lg border border-slate-100 text-center max-w-lg w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle2 className="h-20 w-20 text-green-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Peminjaman Sukses!</h1>
        <p className="text-slate-600 mb-8">Terima kasih, permintaan peminjaman Anda telah dicatat.</p>
        
        <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
          <div className="mb-4">
            <p className="text-sm text-slate-500 mb-1">Nomor Tiket</p>
            <p className="text-2xl font-mono font-bold text-blue-600">{tiket}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-slate-500 mb-1">Nama Peminjam</p>
              <p className="font-medium text-slate-900">{data?.nama_peminjam}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">No Kontak</p>
              <p className="font-medium text-slate-900">{data?.no_kontak}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-slate-500 mb-3">Barang yang Dipinjam</p>
            <div className="space-y-3">
              {data?.items?.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.barang_dipinjam}</p>
                    <p className="text-sm text-slate-500">Jumlah: {item.jumlah}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <Link 
          to="/" 
          className="inline-flex w-full justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
