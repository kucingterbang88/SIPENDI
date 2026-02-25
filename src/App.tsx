import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Peminjaman from './pages/Peminjaman';
import Pengembalian from './pages/Pengembalian';
import AdminBarang from './pages/AdminBarang';
import Riwayat from './pages/Riwayat';
import SettingUser from './pages/SettingUser';

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('sipendi_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('sipendi_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sipendi_user');
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home onLogout={handleLogout} />} />
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/peminjaman" element={<Peminjaman />} />
                  <Route path="/pengembalian" element={<Pengembalian />} />
                  <Route path="/riwayat" element={<Riwayat />} />
                  {user.role === 'Admin' && (
                    <>
                      <Route path="/barang" element={<AdminBarang />} />
                      <Route path="/users" element={<SettingUser />} />
                    </>
                  )}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

