import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import nodemailer from 'nodemailer';
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

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendAdminNotification(subject: string, text: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email credentials not set. Skipping notification.');
    return;
  }

  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:E',
    });
    const rows = response.data.values || [];
    
    // Find all admins with an email
    const adminEmails = rows
      .filter(r => r[2] === 'Admin' && r[4])
      .map(r => r[4]);

    if (adminEmails.length > 0) {
      await transporter.sendMail({
        from: `"SIPENDI Notifikasi" <${process.env.EMAIL_USER}>`,
        to: adminEmails.join(','),
        subject: subject,
        text: text,
      });
      console.log('Notification email sent to admins.');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

let driveFolderId: string | null = null;

async function getOrCreateDriveFolder(drive: any): Promise<string> {
  if (driveFolderId) return driveFolderId;

  try {
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name='SIPENDI_Photos' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (res.data.files && res.data.files.length > 0) {
      driveFolderId = res.data.files[0].id;
      return driveFolderId;
    }

    const folderMetadata = {
      name: 'SIPENDI_Photos',
      mimeType: 'application/vnd.google-apps.folder'
    };
    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });
    
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    driveFolderId = folder.data.id;
    return driveFolderId;
  } catch (error) {
    console.error('Error creating folder:', error);
    return '';
  }
}

async function uploadToDrive(base64Data: string, filename: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image')) return '';
  
  try {
    const drive = getDriveClient();
    const folderId = await getOrCreateDriveFolder(drive);
    
    const mimeType = base64Data.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
    const base64String = base64Data.split(',')[1];
    const buffer = Buffer.from(base64String, 'base64');
    
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata: any = { name: filename };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }
    
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
      range: 'Users!A2:E',
    });
    const rows = response.data.values || [];
    const users = rows.map(row => ({
      username: row[0],
      password: row[1],
      role: row[2],
      nama_lengkap: row[3],
      email: row[4] || '',
    }));
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data user. Pastikan tab "Users" sudah dibuat di Google Sheets.' });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, role, nama_lengkap, email } = req.body;
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[username, password, role, nama_lengkap, email || '']] },
    });
    res.json({ success: true, message: 'User berhasil ditambahkan!' });
  } catch (e: any) {
    res.json({ success: false, message: `Gagal menambah user: ${e.message}` });
  }
});

app.put('/api/users/:original_username', async (req, res) => {
  const { original_username } = req.params;
  const { username, password, role, nama_lengkap, email } = req.body;
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:E',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === original_username);
    
    if (index !== -1) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!A${index + 2}:E${index + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[username, password, role, nama_lengkap, email || '']] },
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
      range: 'Users!A2:E',
    });
    const rows = response.data.values || [];
    const index = rows.findIndex(r => r[0] === username);
    
    if (index !== -1) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!A${index + 2}:E${index + 2}`,
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
    
    // Check for duplicate kode
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:A',
    });
    const rows = response.data.values || [];
    const isDuplicate = rows.some(row => row[0] === kode);
    
    if (isDuplicate) {
      return res.json({ success: false, message: 'Kode barang sudah ada. Gunakan kode yang berbeda.' });
    }

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

app.put('/api/barang/:original_kode', async (req, res) => {
  const { original_kode } = req.params;
  const { kode, nama, stok, deskripsi } = req.body;
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:D',
    });
    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => row[0] === original_kode);

    if (rowIndex === -1) {
      return res.json({ success: false, message: 'Barang tidak ditemukan' });
    }

    // Check for duplicate kode if kode is changed
    if (kode !== original_kode) {
      const isDuplicate = rows.some(row => row[0] === kode);
      if (isDuplicate) {
        return res.json({ success: false, message: 'Kode barang sudah ada. Gunakan kode yang berbeda.' });
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Barang!A${rowIndex + 2}:D${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[kode, nama, stok, deskripsi]],
      },
    });
    res.json({ success: true, message: 'Barang berhasil diperbarui!' });
  } catch (e: any) {
    console.error('Error updating barang:', e);
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
  const { lokasi, nama, kontak, items, gpsLocation } = req.body;
  
  try {
    const sheets = getSheetsClient();

    // 1. Check stock for all items
    const barangRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Barang!A2:D',
    });
    const barangRows = barangRes.data.values || [];
    
    const requestedQuantities: Record<string, number> = {};
    for (const item of items) {
      requestedQuantities[item.barang] = (requestedQuantities[item.barang] || 0) + (parseInt(item.jumlah) || 0);
    }

    for (const [barangName, reqQty] of Object.entries(requestedQuantities)) {
      const barangIndex = barangRows.findIndex(row => row[1] === barangName);
      if (barangIndex === -1) {
        return res.json({ success: false, message: `Barang ${barangName} tidak ditemukan` });
      }
      const currentStok = parseInt(barangRows[barangIndex][2]) || 0;
      if (currentStok < reqQty) {
        return res.json({ success: false, message: `Stok tidak cukup! Sisa stok ${barangName} hanya ${currentStok}.` });
      }
    }

    // 2. Generate Tiket
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const peminjamanRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A2:A',
    });
    const peminjamanRows = peminjamanRes.data.values || [];
    const todayTikets = peminjamanRows.filter(row => row[0]?.startsWith(dateStr));
    const count = new Set(todayTikets.map(r => r[0])).size + 1;
    const noTiket = dateStr + String(count).padStart(5, '0');
    const waktuFormat = new Date().toLocaleString('id-ID');

    // 3. Update Stock
    const barangDataToUpdate = [];
    for (const [barangName, reqQty] of Object.entries(requestedQuantities)) {
      const barangIndex = barangRows.findIndex(row => row[1] === barangName);
      const currentStok = parseInt(barangRows[barangIndex][2]) || 0;
      const newStok = currentStok - reqQty;
      barangDataToUpdate.push({
        range: `Barang!C${barangIndex + 2}`,
        values: [[newStok]]
      });
    }

    if (barangDataToUpdate.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: barangDataToUpdate
        }
      });
    }

    // 4. Upload Photos to Drive and prepare rows
    const rowsToInsert = await Promise.all(items.map(async (item: any, index: number) => {
      let linkFotoPeminjam = '';
      let linkFotoBarang = '';
      
      if (item.fotoPeminjam) {
        linkFotoPeminjam = await uploadToDrive(item.fotoPeminjam, `Peminjam_${noTiket}_${index + 1}.jpg`);
      }
      if (item.fotoBarang) {
        linkFotoBarang = await uploadToDrive(item.fotoBarang, `Barang_${noTiket}_${index + 1}.jpg`);
      }

      return [
        noTiket, waktuFormat, lokasi, nama, kontak, item.barang, item.jumlah,
        linkFotoPeminjam, linkFotoBarang,
        'Dipinjam', '', '', '', '', gpsLocation || ''
      ];
    }));

    // 5. Insert Peminjaman
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Peminjaman!A:O',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rowsToInsert,
      },
    });

    // Send Notification
    const itemsList = items.map((item: any) => `- ${item.barang} (${item.jumlah} unit)`).join('\n');
    await sendAdminNotification(
      `Notifikasi Peminjaman Baru - ${noTiket}`,
      `Telah terjadi transaksi peminjaman baru:\n\nNo Tiket: ${noTiket}\nWaktu: ${waktuFormat}\nNama Peminjam: ${nama}\nNo Kontak: ${kontak}\nLokasi: ${lokasi}\n\nBarang yang dipinjam:\n${itemsList}\n\nSilakan cek dashboard SIPENDI untuk detail lebih lanjut.`
    );

    res.json({ success: true, tiket: noTiket, data: { nama, items } });
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
    const matchingRows = rows.filter(r => (r[0] === tiket || r[4] === tiket) && r[9] === 'Dipinjam');

    if (matchingRows.length > 0) {
      const firstRow = matchingRows[0];
      res.json({
        success: true,
        data: {
          no_tiket: firstRow[0],
          waktu_peminjaman: firstRow[1],
          lokasi: firstRow[2],
          nama_peminjam: firstRow[3],
          no_kontak: firstRow[4],
          items: matchingRows.map(r => ({
            barang_dipinjam: r[5],
            jumlah: parseInt(r[6]) || 0,
          })),
          status: firstRow[9],
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
    
    const indexesToUpdate: number[] = [];
    peminjamanRows.forEach((r, idx) => {
      if (r[0] === tiket && r[9] === 'Dipinjam') {
        indexesToUpdate.push(idx);
      }
    });
    
    if (indexesToUpdate.length === 0) {
      return res.json({ success: false, message: 'Tiket tidak valid atau barang sudah dikembalikan.' });
    }

    const waktuPengembalian = new Date().toLocaleString('id-ID');

    // 2. Update Peminjaman
    const dataToUpdate = indexesToUpdate.map(idx => ({
      range: `Peminjaman!J${idx + 2}:N${idx + 2}`,
      values: [[ 'Dikembalikan', waktuPengembalian, nama, kontak, kondisi ]]
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: dataToUpdate
      }
    });

    // 3. Update Stock if condition is Baik
    if (kondisi === 'Baik') {
      const barangRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Barang!A2:D',
      });
      const barangRows = barangRes.data.values || [];
      
      const stockChanges: Record<string, number> = {};
      indexesToUpdate.forEach(idx => {
        const row = peminjamanRows[idx];
        const barang = row[5];
        const jumlah = parseInt(row[6]) || 0;
        stockChanges[barang] = (stockChanges[barang] || 0) + jumlah;
      });

      const barangDataToUpdate = [];
      for (const [barangName, jumlah] of Object.entries(stockChanges)) {
        const barangIndex = barangRows.findIndex(r => r[1] === barangName);
        if (barangIndex !== -1) {
          const currentStok = parseInt(barangRows[barangIndex][2]) || 0;
          const newStok = currentStok + jumlah;
          barangDataToUpdate.push({
            range: `Barang!C${barangIndex + 2}`,
            values: [[newStok]]
          });
        }
      }

      if (barangDataToUpdate.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: barangDataToUpdate
          }
        });
      }
    }

    // Send Notification
    await sendAdminNotification(
      `Notifikasi Pengembalian Barang - ${tiket}`,
      `Telah terjadi transaksi pengembalian barang:\n\nNo Tiket: ${tiket}\nWaktu: ${waktuPengembalian}\nNama Pengembali: ${nama}\nNo Kontak: ${kontak}\nKondisi: ${kondisi}\n\nSilakan cek dashboard SIPENDI untuk detail lebih lanjut.`
    );

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
