import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account credentials are not set in environment variables.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES
  });
  return google.sheets({ version: 'v4', auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const app = express();
app.use(express.json({ limit: '50mb' }));

// API Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    res.json({ success: true, user: { username: 'admin', role: 'Admin', nama_lengkap: 'Admin Pengurus Barang' } });
  } else if (username === 'viewer' && password === 'viewer123') {
    res.json({ success: true, user: { username: 'viewer', role: 'Viewer', nama_lengkap: 'Viewer' } });
  } else {
    res.json({ success: false, message: 'Username atau Password salah!' });
  }
});

app.get('/api/debug-env', (req, res) => {
  res.json({
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    hasSpreadsheetId: !!process.env.GOOGLE_SPREADSHEET_ID,
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || 'NOT_SET',
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'NOT_SET',
  });
});

app.get('/api/barang', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:D',
    });
    const rows = response.data.values || [];
    const barang = rows.map(row => ({
      kode_barang: row[0],
      nama_barang: row[1],
      jumlah_stok: parseInt(row[2]) || 0,
      deskripsi: row[3] || '',
    }));
    res.json(barang);
  } catch (error: any) {
    console.error('Error fetching barang:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil data barang' });
  }
});

app.post('/api/barang', async (req, res) => {
  const { kode, nama, stok, deskripsi } = req.body;
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[kode, nama, stok, deskripsi]],
      },
    });
    res.json({ success: true, message: 'Barang berhasil ditambahkan!' });
  } catch (e: any) {
    console.error('Error adding barang:', e);
    res.json({ success: false, message: `Error dari server: ${e.message || 'Unknown error'}` });
  }
});

app.delete('/api/barang/:kode', async (req, res) => {
  try {
    const { kode } = req.params;
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:D',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === kode);
    
    if (index !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Barang!A${index + 2}:D${index + 2}`,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting barang:', error);
    res.status(500).json({ success: false, message: `Gagal menghapus barang: ${error.message}` });
  }
});

app.post('/api/peminjaman', async (req, res) => {
  const { lokasi, nama, kontak, barang, jumlah, fotoPeminjam, fotoBarang, gpsLocation } = req.body;
  
  try {
    const sheets = getSheetsClient();

    // 1. Check stock
    const barangRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:D',
    });
    const barangRows = barangRes.data.values || [];
    const barangIndex = barangRows.findIndex(row => row[1] === barang);
    if (barangIndex === -1) {
      return res.json({ success: false, message: 'Barang tidak ditemukan' });
    }
    const currentStok = parseInt(barangRows[barangIndex][2]) || 0;
    if (currentStok < jumlah) {
      return res.json({ success: false, message: `Stok tidak cukup! Sisa stok ${barang} hanya ${currentStok}.` });
    }

    // 2. Generate Tiket
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const peminjamanRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A2:A',
    });
    const peminjamanRows = peminjamanRes.data.values || [];
    const todayTikets = peminjamanRows.filter(row => row[0]?.startsWith(dateStr));
    const count = todayTikets.length + 1;
    const noTiket = dateStr + String(count).padStart(5, '0');
    const waktuFormat = new Date().toLocaleString('id-ID');

    // 3. Update Stock
    const newStok = currentStok - jumlah;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Barang!C${barangIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newStok]] },
    });

    // 4. Insert Peminjaman
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          noTiket, waktuFormat, lokasi, nama, kontak, barang, jumlah,
          fotoPeminjam ? 'Terlampir' : '', fotoBarang ? 'Terlampir' : '',
          'Dipinjam', '', '', '', '', gpsLocation || ''
        ]],
      },
    });

    res.json({ success: true, tiket: noTiket });
  } catch (error: any) {
    console.error('Error creating peminjaman:', error);
    res.status(500).json({ success: false, message: `Gagal membuat peminjaman: ${error.message}` });
  }
});

app.get('/api/peminjaman/tiket/:tiket', async (req, res) => {
  try {
    const { tiket } = req.params;
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A2:O',
    });
    const rows = response.data.values || [];
    const row = rows.find(r => r[0] === tiket && r[9] === 'Dipinjam');

    if (row) {
      res.json({
        success: true,
        data: {
          no_tiket: row[0],
          waktu_peminjaman: row[1],
          lokasi: row[2],
          nama_peminjam: row[3],
          no_kontak: row[4],
          barang_dipinjam: row[5],
          jumlah: parseInt(row[6]) || 0,
          status: row[9],
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Tiket tidak valid atau barang sudah dikembalikan.' });
    }
  } catch (error: any) {
    console.error('Error fetching tiket:', error);
    res.status(500).json({ success: false, message: `Gagal mencari tiket: ${error.message}` });
  }
});

app.post('/api/pengembalian', async (req, res) => {
  const { tiket, nama, kontak, kondisi } = req.body;
  
  try {
    const sheets = getSheetsClient();

    // 1. Find Peminjaman
    const peminjamanRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A2:O',
    });
    const peminjamanRows = peminjamanRes.data.values || [];
    const peminjamanIndex = peminjamanRows.findIndex(r => r[0] === tiket && r[9] === 'Dipinjam');
    
    if (peminjamanIndex === -1) {
      return res.json({ success: false, message: 'Tiket tidak valid atau barang sudah dikembalikan.' });
    }

    const row = peminjamanRows[peminjamanIndex];
    const barang = row[5];
    const jumlah = parseInt(row[6]) || 0;
    const waktuPengembalian = new Date().toLocaleString('id-ID');

    // 2. Update Peminjaman
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Peminjaman!J${peminjamanIndex + 2}:N${peminjamanIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'Dikembalikan', waktuPengembalian, nama, kontak, kondisi
        ]],
      },
    });

    // 3. Update Stock if condition is Baik
    if (kondisi === 'Baik') {
      const barangRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Barang!A2:D',
      });
      const barangRows = barangRes.data.values || [];
      const barangIndex = barangRows.findIndex(r => r[1] === barang);
      if (barangIndex !== -1) {
        const currentStok = parseInt(barangRows[barangIndex][2]) || 0;
        const newStok = currentStok + jumlah;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Barang!C${barangIndex + 2}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[newStok]] },
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error submitting pengembalian:', error);
    res.status(500).json({ success: false, message: `Gagal memproses pengembalian: ${error.message}` });
  }
});

app.get('/api/riwayat', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A2:O',
    });
    const rows = response.data.values || [];
    const riwayat = rows.map(row => ({
      no_tiket: row[0],
      waktu_peminjaman: row[1],
      nama_peminjam: row[3],
      no_kontak: row[4],
      barang_dipinjam: row[5],
      jumlah: parseInt(row[6]) || 0,
      status: row[9],
    })).reverse();
    res.json(riwayat);
  } catch (error: any) {
    console.error('Error fetching riwayat:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengambil riwayat' });
  }
});

export default app;
