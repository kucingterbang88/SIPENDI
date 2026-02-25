import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Readable } from 'stream';
dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

function getGoogleClient() {
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
  return auth;
}

function getSheetsClient() {
  const auth = getGoogleClient();
  return google.sheets({ version: 'v4', auth });
}

function getDriveClient() {
  const auth = getGoogleClient();
  return google.drive({ version: 'v3', auth });
}

async function uploadToDrive(base64Data: string, filename: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image')) return '';
  
  try {
    const drive = getDriveClient();
    const mimeType = base64Data.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
    const base64String = base64Data.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');
    
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = { name: filename };
    const media = { mimeType, body: stream };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    if (file.data.id) {
      // Make the file publicly viewable
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      return file.data.webViewLink || 'Terlampir';
    }
    return 'Terlampir';
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    return 'Gagal Upload';
  }
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const app = express();
app.use(express.json({ limit: '50mb' }));

// API Routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:D',
    });
    
    const rows = response.data.values || [];
    const user = rows.find(r => r[0] === username && r[1] === password);
    
    if (user) {
      res.json({ success: true, user: { username: user[0], role: user[2], nama_lengkap: user[3] } });
    } else {
      // Fallback to default admin if Users sheet is empty or doesn't exist
      if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, user: { username: 'admin', role: 'Admin', nama_lengkap: 'Admin Pengurus Barang' } });
      } else {
        res.json({ success: false, message: 'Username atau Password salah!' });
      }
    }
  } catch (error: any) {
    // If Users sheet doesn't exist, fallback to default
    if (username === 'admin' && password === 'admin123') {
      res.json({ success: true, user: { username: 'admin', role: 'Admin', nama_lengkap: 'Admin Pengurus Barang' } });
    } else {
      res.json({ success: false, message: 'Username atau Password salah! (Atau tab Users belum dibuat)' });
    }
  }
});

// Users CRUD
app.get('/api/users', async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:D',
    });
    const rows = response.data.values || [];
    const users = rows.map(row => ({
      username: row[0],
      password: row[1],
      role: row[2],
      nama_lengkap: row[3],
    }));
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user. Pastikan tab "Users" sudah dibuat di Google Sheets.' });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, role, nama_lengkap } = req.body;
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[username, password, role, nama_lengkap]] },
    });
    res.json({ success: true, message: 'User berhasil ditambahkan!' });
  } catch (e: any) {
    res.json({ success: false, message: `Gagal menambah user: ${e.message}` });
  }
});

app.put('/api/users/:original_username', async (req, res) => {
  const { original_username } = req.params;
  const { username, password, role, nama_lengkap } = req.body;
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:D',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === original_username);
    
    if (index !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!A${index + 2}:D${index + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[username, password, role, nama_lengkap]] },
      });
    }
    res.json({ success: true, message: 'User berhasil diupdate!' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Gagal mengupdate user: ${error.message}` });
  }
});

app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:D',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === username);
    
    if (index !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!A${index + 2}:D${index + 2}`,
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Gagal menghapus user: ${error.message}` });
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

    // 4. Upload Photos to Drive
    let linkFotoPeminjam = '';
    let linkFotoBarang = '';
    
    if (fotoPeminjam) {
      linkFotoPeminjam = await uploadToDrive(fotoPeminjam, `Peminjam_${noTiket}.jpg`);
    }
    if (fotoBarang) {
      linkFotoBarang = await uploadToDrive(fotoBarang, `Barang_${noTiket}.jpg`);
    }

    // 5. Insert Peminjaman
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          noTiket, waktuFormat, lokasi, nama, kontak, barang, jumlah,
          linkFotoPeminjam, linkFotoBarang,
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
    
    // Search by tiket OR phone number (kontak is in column E / index 4)
    const row = rows.find(r => (r[0] === tiket || r[4] === tiket) && r[9] === 'Dipinjam');

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
      res.status(404).json({ success: false, message: 'Tiket/No HP tidak valid atau barang sudah dikembalikan.' });
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
