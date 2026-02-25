import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, History, LogOut, Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '../lib/utils';

export default function Layout({ children, user, onLogout }: { children: React.ReactNode, user: any, onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Peminjaman', href: '/peminjaman', icon: ArrowRightLeft },
    { name: 'Pengembalian', href: '/pengembalian', icon: ArrowRightLeft },
    { name: 'Riwayat', href: '/riwayat', icon: History },
    ...(user.role === 'Admin' ? [{ name: 'Kelola Barang', href: '/barang', icon: Package }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-emerald-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:block",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center justify-between px-6 bg-emerald-950">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Package className="h-6 w-6 text-emerald-400" />
            <span>SIPENDI</span>
          </div>
          <button className="lg:hidden text-emerald-200 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-4 py-6">
          <div className="mb-8 px-2">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Kecamatan Tamalate</p>
            <p className="mt-2 text-sm font-medium text-emerald-100">Halo, {user.nama_lengkap}</p>
            <p className="text-xs text-emerald-300">{user.role}</p>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-emerald-800 text-white" 
                      : "text-emerald-100 hover:bg-emerald-800/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-emerald-400" : "text-emerald-300 group-hover:text-emerald-400"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-800/50 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0 text-emerald-300" />
            Keluar
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-72 min-h-screen transition-all duration-300">
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-slate-900">
                {navigation.find(n => n.href === location.pathname)?.name || 'SIPENDI'}
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Link to="/" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                Ke Halaman Publik
              </Link>
            </div>
          </div>
        </div>

        <main className="flex-1">
          <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

