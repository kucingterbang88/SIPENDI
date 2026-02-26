import { useEffect, useState } from 'react';
import { Package, ArrowRightLeft, History, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBarang: 0,
    totalPeminjaman: 0,
    sedangDipinjam: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [barangRes, riwayatRes] = await Promise.all([
          fetch('/api/barang'),
          fetch('/api/riwayat')
        ]);
        const barang = await barangRes.json();
        const riwayat = await riwayatRes.json();

        setStats({
          totalBarang: Array.isArray(barang) ? barang.length : 0,
          totalPeminjaman: Array.isArray(riwayat) ? riwayat.length : 0,
          sedangDipinjam: Array.isArray(riwayat) ? riwayat.filter((r: any) => r.status === 'Dipinjam').length : 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { name: 'Total Barang', value: stats.totalBarang, icon: Package, color: 'bg-blue-500' },
    { name: 'Total Peminjaman', value: stats.totalPeminjaman, icon: History, color: 'bg-blue-500' },
    { name: 'Sedang Dipinjam', value: stats.sedangDipinjam, icon: ArrowRightLeft, color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ringkasan Sistem</h2>
        <p className="mt-1 text-sm text-slate-500">Statistik penggunaan SIPENDI Kecamatan Tamalate</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${card.color} p-3 rounded-xl shadow-sm`}>
                    <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">{card.name}</dt>
                    <dd>
                      <div className="text-3xl font-bold text-slate-900 mt-1">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/peminjaman" className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100/50">
              <ArrowRightLeft className="h-8 w-8 text-blue-600 mb-3" />
              <span className="text-sm font-medium text-blue-900">Peminjaman Baru</span>
            </Link>
            <Link to="/pengembalian" className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100/50">
              <History className="h-8 w-8 text-blue-600 mb-3" />
              <span className="text-sm font-medium text-blue-900">Pengembalian</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
