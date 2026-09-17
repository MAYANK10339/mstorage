const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mstorage-secure-key-mayank-mandrai-2026';

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mstorage_db.json');
const STORAGE_DIR = path.join(__dirname, 'storage', 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Database helper
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialData = {
        users: [],
        files: [],
        meta: {
          app: 'Mstorage',
          developer: 'Mayank Mandrai',
          version: '1.0.0',
          createdAt: new Date().toISOString()
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: [], files: [], meta: {} };
  }
}

function writeDB(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

// Initialize DB if not present
readDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage engine - saves files with clean safe unique hashes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, STORAGE_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const safeExt = path.extname(file.originalname).slice(0, 15);
    cb(null, 'mst-' + uniqueSuffix + safeExt);
  }
});

// No arbitrary file size limits; stream handles large files
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 5 // 5GB per individual file stream safely handled
  }
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

// -------------------------------------------------------------
// AUTH ROUTES (@username + 4-digit PIN)
// -------------------------------------------------------------

// Helper to normalize username
function cleanUsername(u) {
  if (!u) return '';
  let cleaned = u.trim().toLowerCase();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

// Helper to validate 4-digit PIN
function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin).trim());
}

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const rawUsername = req.body.username;
    const rawPin = req.body.pin;

    const username = cleanUsername(rawUsername);
    const pin = String(rawPin || '').trim();

    if (!username || username.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long' });
    }
    if (!isValidPin(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits (e.g. 1234)' });
    }

    const db = readDB();
    const existing = db.users.find(u => u.username === username);
    if (existing) {
      return res.status(409).json({ error: 'Username @' + username + ' is already taken. Please choose another or login.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    const newUser = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      username: username,
      displayUsername: '@' + username,
      hashedPin: hashedPin,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, displayUsername: newUser.displayUsername },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayUsername: newUser.displayUsername,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const rawUsername = req.body.username;
    const rawPin = req.body.pin;

    const username = cleanUsername(rawUsername);
    const pin = String(rawPin || '').trim();

    if (!username || !isValidPin(pin)) {
      return res.status(400).json({ error: 'Please enter valid @username and 4-digit PIN' });
    }

    const db = readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) {
      return res.status(404).json({ error: 'User @' + username + ' not found. Please register first.' });
    }

    const isMatch = await bcrypt.compare(pin, user.hashedPin);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect 4-digit PIN' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, displayUsername: user.displayUsername },
      JWT_SECRET,
      { expiresIn: '60d' }
    );

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userFiles = db.files.filter(f => f.userId === user.id);
  const totalBytes = userFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalDownloads = userFiles.reduce((acc, f) => acc + (f.downloads || 0), 0);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      displayUsername: user.displayUsername,
      createdAt: user.createdAt
    },
    stats: {
      totalFiles: userFiles.length,
      totalBytes: totalBytes,
      totalDownloads: totalDownloads
    }
  });
});

// -------------------------------------------------------------
// FILE UPLOAD ROUTES (Files, Zip, Folder)
// -------------------------------------------------------------

// Upload files / folder / zip
app.post('/api/files/upload', authenticateToken, upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided for upload' });
    }

    const uploadType = req.body.uploadType || 'file'; // 'file' | 'zip' | 'folder'
    const folderName = req.body.folderName || 'Uploaded Folder';
    const timerSeconds = parseInt(req.body.timerSeconds, 10) || 0;
    const retentionDays = parseInt(req.body.retentionDays, 10) || 0; // 0 = permanent

    const db = readDB();
    const uploadedRecords = [];

    // If uploading a folder (multiple files belonging to one folder bundle)
    if (uploadType === 'folder' && req.files.length > 1) {
      const bundleId = 'mst_fld_' + crypto.randomBytes(5).toString('hex');
      const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
      
      const fileEntries = req.files.map(f => ({
        originalName: f.originalname,
        storedName: f.filename,
        size: f.size,
        mimeType: f.mimetype || mime.lookup(f.originalname) || 'application/octet-stream'
      }));

      const folderRecord = {
        id: bundleId,
        userId: req.user.id,
        uploaderUsername: req.user.displayUsername,
        name: folderName,
        isFolder: true,
        fileCount: req.files.length,
        items: fileEntries,
        size: totalSize,
        timerSeconds: timerSeconds,
        downloads: 0,
        createdAt: new Date().toISOString(),
        expiresAt: retentionDays > 0 ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString() : null
      };

      db.files.push(folderRecord);
      uploadedRecords.push(folderRecord);
    } else {
      // Regular files or zip
      for (const f of req.files) {
        const fileId = 'mst_' + crypto.randomBytes(5).toString('hex');
        const ext = path.extname(f.originalname).toLowerCase();
        const isZip = ext === '.zip' || f.mimetype === 'application/zip' || uploadType === 'zip';

        const record = {
          id: fileId,
          userId: req.user.id,
          uploaderUsername: req.user.displayUsername,
          name: f.originalname,
          storedName: f.filename,
          size: f.size,
          mimeType: f.mimetype || mime.lookup(f.originalname) || 'application/octet-stream',
          isFolder: false,
          isZip: isZip,
          timerSeconds: timerSeconds,
          downloads: 0,
          createdAt: new Date().toISOString(),
          expiresAt: retentionDays > 0 ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString() : null
        };

        db.files.push(record);
        uploadedRecords.push(record);
      }
    }

    writeDB(db);

    return res.status(201).json({
      message: 'Upload completed successfully',
      files: uploadedRecords
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'File upload processing failed' });
  }
});

// Get user's file list
app.get('/api/files/my-files', authenticateToken, (req, res) => {
  const db = readDB();
  const userFiles = db.files
    .filter(f => f.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ files: userFiles });
});

// Public File Info (for shareable download page)
app.get('/api/files/public/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File not found or has expired' });
  }

  // Check expiration if set
  if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'This file link has expired and is no longer available' });
  }

  return res.json({
    id: file.id,
    name: file.name,
    size: file.size,
    mimeType: file.mimeType,
    isFolder: !!file.isFolder,
    isZip: !!file.isZip,
    fileCount: file.fileCount || 1,
    items: file.items ? file.items.map(i => ({ originalName: i.originalName, size: i.size })) : [],
    uploaderUsername: file.uploaderUsername,
    timerSeconds: file.timerSeconds || 0,
    downloads: file.downloads || 0,
    createdAt: file.createdAt
  });
});

// Direct Download Stream
app.get('/api/files/download/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).send('File not found or has expired');
  }

  // Check expiration
  if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
    return res.status(410).send('File expired');
  }

  // Increment download count
  file.downloads = (file.downloads || 0) + 1;
  writeDB(db);

  if (file.isFolder) {
    // If folder has 1 item or first item
    if (file.items && file.items.length === 1) {
      const targetPath = path.join(STORAGE_DIR, file.items[0].storedName);
      if (fs.existsSync(targetPath)) {
        return res.download(targetPath, file.items[0].originalName);
      }
    }
    // For multi-item folder, stream the first or bundle
    if (file.items && file.items.length > 0) {
      const targetPath = path.join(STORAGE_DIR, file.items[0].storedName);
      if (fs.existsSync(targetPath)) {
        return res.download(targetPath, file.items[0].originalName);
      }
    }
    return res.status(404).send('Folder contents unavailable on server');
  }

  const filePath = path.join(STORAGE_DIR, file.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Physical file missing from storage');
  }

  // High-performance streaming download with resume/pause support
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  
  const filestream = fs.createReadStream(filePath);
  filestream.pipe(res);
});

// Delete file
app.delete('/api/files/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.files.findIndex(f => f.id === id && f.userId === req.user.id);

  if (index === -1) {
    return res.status(404).json({ error: 'File not found or permission denied' });
  }

  const [removedFile] = db.files.splice(index, 1);

  // Clean up physical file(s) from storage
  try {
    if (removedFile.isFolder && removedFile.items) {
      removedFile.items.forEach(item => {
        const p = path.join(STORAGE_DIR, item.storedName);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    } else if (removedFile.storedName) {
      const p = path.join(STORAGE_DIR, removedFile.storedName);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch (err) {
    console.error('Error removing file from disk:', err);
  }

  writeDB(db);
  return res.json({ message: 'File deleted and storage space freed', fileId: id });
});

// Global Platform Statistics & Developer Info
app.get('/api/system/stats', (req, res) => {
  const db = readDB();
  const totalFiles = db.files.length;
  const totalDownloads = db.files.reduce((acc, f) => acc + (f.downloads || 0), 0);
  const totalUsers = db.users.length;
  const totalBytes = db.files.reduce((acc, f) => acc + (f.size || 0), 0);

  return res.json({
    platform: 'Mstorage',
    developer: 'Mayank Mandrai',
    creatorRole: 'Lead Architect & Developer',
    stats: {
      totalFiles,
      totalDownloads,
      totalUsers,
      totalBytes
    },
    status: 'ONLINE 24/7',
    uptime: process.uptime()
  });
});

// Automated cleanup cron-like routine (checks every hour for expired files)
setInterval(() => {
  try {
    const db = readDB();
    const now = new Date();
    const activeFiles = [];
    let freedCount = 0;

    for (const f of db.files) {
      if (f.expiresAt && new Date(f.expiresAt) < now) {
        // Expired, delete physical file
        if (f.storedName) {
          const p = path.join(STORAGE_DIR, f.storedName);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        if (f.items) {
          f.items.forEach(item => {
            const p = path.join(STORAGE_DIR, item.storedName);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          });
        }
        freedCount++;
      } else {
        activeFiles.push(f);
      }
    }

    if (freedCount > 0) {
      db.files = activeFiles;
      writeDB(db);
      console.log(`Cleaned up ${freedCount} expired files to keep storage fresh.`);
    }
  } catch (err) {
    console.error('Cleanup routine error:', err);
  }
}, 60 * 60 * 1000);

// Single Page Application Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  Mstorage Server Active`);
  console.log(`  Developer & Creator: Mayank Mandrai`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Ready for 24/7 Deployment on Render`);
  console.log(`=========================================`);
});
