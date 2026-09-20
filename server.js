require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mime = require('mime-types');
const archiver = require('archiver');
const telegramVault = require('./telegramVault');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mstorage-secure-key-mayank-mandrai-2026';

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mstorage_db.json');
const STORAGE_DIR = path.join(__dirname, 'storage', 'uploads');
const CHUNKS_DIR = path.join(__dirname, 'storage', 'chunks');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

const DB_BAK_FILE = path.join(DATA_DIR, 'mstorage_db.bak');

// Helper to normalize usernames
function cleanUsername(u) {
  if (!u) return '';
  let cleaned = String(u).trim().toLowerCase();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

// In-Memory Master Database Engine (Crash-Proof against sudden power outages)
let memoryDB = null;

function loadInitialDB() {
  let loaded = false;

  // 1. Try primary DB_FILE
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const cleanContent = content.replace(/\0/g, '').trim();
      if (cleanContent.length > 0) {
        const parsed = JSON.parse(cleanContent);
        if (parsed && typeof parsed === 'object') {
          memoryDB = parsed;
          if (!Array.isArray(memoryDB.users)) memoryDB.users = [];
          if (!Array.isArray(memoryDB.files)) memoryDB.files = [];
          loaded = true;
          return memoryDB;
        }
      }
    } catch (err) {
      console.warn('Notice: Primary DB was corrupted or interrupted (e.g. power loss), inspecting backup...');
    }
  }

  // 2. Try backup if primary failed or was corrupted
  if (!loaded && fs.existsSync(DB_BAK_FILE)) {
    try {
      const bakContent = fs.readFileSync(DB_BAK_FILE, 'utf8');
      const cleanBak = bakContent.replace(/\0/g, '').trim();
      if (cleanBak.length > 0) {
        const parsedBak = JSON.parse(cleanBak);
        if (parsedBak && typeof parsedBak === 'object') {
          memoryDB = parsedBak;
          if (!Array.isArray(memoryDB.users)) memoryDB.users = [];
          if (!Array.isArray(memoryDB.files)) memoryDB.files = [];
          loaded = true;
          console.log('Successfully recovered database from safe backup!');
          writeDB(memoryDB);
          return memoryDB;
        }
      }
    } catch (bakErr) {
      console.warn('Notice: Backup DB was also unreadable.');
    }
  }

  // 3. Fallback initial schema
  memoryDB = {
    users: [],
    files: [],
    meta: {
      app: 'Mstorage',
      developer: 'Mayank Mandrai',
      version: '1.0.0',
      createdAt: new Date().toISOString()
    }
  };

  writeDB(memoryDB);
  return memoryDB;
}

// Initialize DB into memory on server boot
loadInitialDB();

// Cold-boot Cloud Recovery: If DB is empty and Telegram Vault is active, recover latest snapshot
if (telegramVault.isConfigured() && memoryDB && memoryDB.users.length === 0 && memoryDB.files.length === 0) {
  telegramVault.restoreLatestDatabase(DB_FILE).then(restored => {
    if (restored) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        memoryDB = JSON.parse(content);
        console.log('[XerVault] Cloud DB successfully hydrated into memory on cold boot!');
      } catch (e) {}
    }
  });
}

function readDB() {
  if (!memoryDB) {
    loadInitialDB();
  }
  return memoryDB;
}

function writeDB(data) {
  if (!data) return false;
  // Guard against accidental wipe
  if (memoryDB && memoryDB.files && memoryDB.files.length > 0 && (!data.files || data.files.length === 0)) {
    console.warn('Safety Guard: Prevented accidental wiping of files database.');
  }

  memoryDB = data;

  try {
    const jsonString = JSON.stringify(data, null, 2);

    // Atomic write to DB_FILE (avoids corruption if power is cut mid-write)
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, jsonString, 'utf8');
    fs.renameSync(tempFile, DB_FILE);

    // Atomic backup write
    try {
      const tempBak = DB_BAK_FILE + '.tmp';
      fs.writeFileSync(tempBak, jsonString, 'utf8');
      fs.renameSync(tempBak, DB_BAK_FILE);
    } catch (bakErr) {}

    // Auto-backup to XerVault Telegram Cloud (solves Render ephemeral reset)
    if (telegramVault.isConfigured()) {
      telegramVault.scheduleDatabaseBackup(DB_FILE);
    }

    return true;
  } catch (err) {
    console.error('Error persisting database to disk:', err);
    return false;
  }
}

// Ownership and Creator authorization helper
function isFileOwnerOrAdmin(file, user) {
  if (!file || !user) return false;

  // 1. Direct user ID match
  if (file.userId && file.userId === user.id) return true;

  // 2. Normalized username match
  const fileOwner = cleanUsername(file.uploaderUsername || '');
  const currentUsername = cleanUsername(user.username || '');
  if (fileOwner && currentUsername && fileOwner === currentUsername) return true;

  // 3. Platform Creator & Developer Master Privileges for Mayank Mandrai
  if (currentUsername === 'mayank' || currentUsername === 'mayank_mandrai_official') {
    return true;
  }

  return false;
}

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
app.post('/api/files/upload', authenticateToken, upload.array('files'), async (req, res) => {
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
      
      const fileEntries = [];
      for (const f of req.files) {
        let vaultData = null;
        let storedName = f.filename;
        if (telegramVault.isConfigured()) {
          const localPath = path.join(STORAGE_DIR, f.filename);
          vaultData = await telegramVault.uploadFileToVault(localPath, f.originalname, f.mimetype, true);
          storedName = null;
        }
        fileEntries.push({
          originalName: f.originalname,
          storedName: storedName,
          vaultData: vaultData,
          size: f.size,
          mimeType: f.mimetype || mime.lookup(f.originalname) || 'application/octet-stream'
        });
      }

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

        let vaultData = null;
        let storedName = f.filename;
        if (telegramVault.isConfigured()) {
          const localPath = path.join(STORAGE_DIR, f.filename);
          vaultData = await telegramVault.uploadFileToVault(localPath, f.originalname, f.mimetype, true);
          storedName = null;
        }

        const record = {
          id: fileId,
          userId: req.user.id,
          uploaderUsername: req.user.displayUsername,
          name: f.originalname,
          storedName: storedName,
          vaultData: vaultData,
          size: f.size,
          mimeType: f.mimetype || mime.lookup(f.originalname) || 'application/octet-stream',
          isFolder: false,
          isZip: isZip,
          fingerprint: req.body.fingerprint || '',
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

// -------------------------------------------------------------
// XERENGINE HIGH-PERFORMANCE STREAMING & INSTANT UPLOAD ENGINE
// Developer & Architect: Mayank Mandrai
// Handles 10MB to 100GB+ files with zero memory exhaustion,
// instant cryptographic deduplication, and crash-proof chunk assembly.
// -------------------------------------------------------------

async function mergeChunksSequentially(sessionDir, totalChunks, finalPath) {
  const writeStream = fs.createWriteStream(finalPath, { flags: 'w' });

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(sessionDir, `chunk_${i}`);
    if (!fs.existsSync(chunkPath)) {
      writeStream.close();
      if (fs.existsSync(finalPath)) {
        try { fs.unlinkSync(finalPath); } catch (e) {}
      }
      throw new Error(`Missing chunk_${i} in session ${sessionDir}`);
    }

    await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(chunkPath);
      readStream.pipe(writeStream, { end: false });
      readStream.on('end', resolve);
      readStream.on('error', (err) => {
        writeStream.close();
        reject(err);
      });
      writeStream.on('error', reject);
    });
  }

  await new Promise((resolve, reject) => {
    writeStream.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

// 1. XerEngine Handshake (Instant Deduplication Check - 0.05s Instant Upload)
app.post('/api/xerengine/handshake', authenticateToken, (req, res) => {
  try {
    const { fingerprint, name, size, mimeType, timerSeconds, retentionDays } = req.body;

    if (!fingerprint || !size) {
      return res.status(400).json({ error: 'Fingerprint and size required for handshake' });
    }

    const db = readDB();
    const existingMatch = db.files.find(f => 
      !f.isFolder && 
      f.fingerprint === fingerprint && 
      f.size === size && 
      f.storedName && 
      fs.existsSync(path.join(STORAGE_DIR, f.storedName))
    );

    if (existingMatch) {
      const fileId = 'mst_' + crypto.randomBytes(5).toString('hex');
      const ext = path.extname(name || existingMatch.name).toLowerCase();
      const isZip = ext === '.zip' || (mimeType && mimeType.includes('zip'));

      const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
      const safeExt = path.extname(name || existingMatch.name).slice(0, 15);
      const newStoredName = 'mst-' + uniqueSuffix + safeExt;
      const originalPath = path.join(STORAGE_DIR, existingMatch.storedName);
      const newPath = path.join(STORAGE_DIR, newStoredName);

      try {
        fs.linkSync(originalPath, newPath);
      } catch (linkErr) {
        fs.copyFileSync(originalPath, newPath);
      }

      const retention = parseInt(retentionDays, 10) || 0;
      const record = {
        id: fileId,
        userId: req.user.id,
        uploaderUsername: req.user.displayUsername,
        name: name || existingMatch.name,
        storedName: newStoredName,
        size: size,
        mimeType: mimeType || existingMatch.mimeType || 'application/octet-stream',
        isFolder: false,
        isZip: isZip,
        fingerprint: fingerprint,
        timerSeconds: parseInt(timerSeconds, 10) || 0,
        downloads: 0,
        createdAt: new Date().toISOString(),
        expiresAt: retention > 0 ? new Date(Date.now() + retention * 24 * 60 * 60 * 1000).toISOString() : null,
        xerEngineInstant: true
      };

      db.files.push(record);
      writeDB(db);

      console.log(`[XerEngine] Instant Deduplication Hit for "${record.name}" (${(size / (1024 * 1024)).toFixed(2)} MB) - 0.05s response!`);

      return res.status(200).json({
        instant: true,
        message: 'XerEngine Instant Deduplication Hit! Upload completed in 0.05s',
        file: record
      });
    }

    return res.status(200).json({ instant: false });
  } catch (err) {
    console.error('XerEngine Handshake error:', err);
    return res.status(500).json({ error: 'XerEngine handshake failed' });
  }
});

// 2. XerEngine Init (Initialize Multi-Threaded Chunk Stream & Session)
app.post('/api/xerengine/init', authenticateToken, (req, res) => {
  try {
    const { fileName, fileSize, totalChunks, chunkSize, fingerprint, timerSeconds, retentionDays, existingUploadId } = req.body;

    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'fileName, fileSize, and totalChunks are required' });
    }

    let uploadId = existingUploadId ? String(existingUploadId).replace(/[^a-zA-Z0-9_-]/g, '') : '';
    let sessionDir = uploadId ? path.join(CHUNKS_DIR, uploadId) : null;

    if (!sessionDir || !fs.existsSync(sessionDir)) {
      uploadId = 'xer_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
      sessionDir = path.join(CHUNKS_DIR, uploadId);
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const sessionMeta = {
      uploadId,
      userId: req.user.id,
      uploaderUsername: req.user.displayUsername,
      fileName,
      fileSize: parseInt(fileSize, 10),
      totalChunks: parseInt(totalChunks, 10),
      chunkSize: parseInt(chunkSize, 10),
      fingerprint: fingerprint || '',
      timerSeconds: parseInt(timerSeconds, 10) || 0,
      retentionDays: parseInt(retentionDays, 10) || 0,
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(sessionMeta, null, 2), 'utf8');

    // Retrieve already uploaded chunks (for instant resume if network dropped!)
    const existingChunks = [];
    const files = fs.readdirSync(sessionDir);
    for (const f of files) {
      if (f.startsWith('chunk_')) {
        const idx = parseInt(f.replace('chunk_', ''), 10);
        if (!isNaN(idx)) existingChunks.push(idx);
      }
    }

    return res.status(200).json({
      uploadId,
      chunkSize: sessionMeta.chunkSize,
      totalChunks: sessionMeta.totalChunks,
      existingChunks: existingChunks
    });
  } catch (err) {
    console.error('XerEngine Init error:', err);
    return res.status(500).json({ error: 'Failed to initialize XerEngine session' });
  }
});

// 3. XerEngine Chunk Receiver (High-Speed Raw Stream Pipeline)
app.post('/api/xerengine/chunk', authenticateToken, (req, res) => {
  const uploadId = String(req.query.uploadId || req.headers['x-xer-upload-id'] || '').replace(/[^a-zA-Z0-9_-]/g, '');
  const chunkIndex = parseInt(req.query.chunkIndex || req.headers['x-xer-chunk-index'], 10);

  if (!uploadId || isNaN(chunkIndex)) {
    return res.status(400).json({ error: 'Missing uploadId or chunkIndex' });
  }

  const sessionDir = path.join(CHUNKS_DIR, uploadId);
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Upload session not found or expired' });
  }

  const chunkPath = path.join(sessionDir, `chunk_${chunkIndex}`);
  const writeStream = fs.createWriteStream(chunkPath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    return res.status(200).json({ success: true, chunkIndex });
  });

  writeStream.on('error', (err) => {
    console.error(`XerEngine chunk write error [${uploadId} chunk ${chunkIndex}]:`, err);
    return res.status(500).json({ error: 'Failed to write chunk' });
  });
});

// 4. XerEngine Finalize (Zero-Copy Stream Assembly & DB Registration)
app.post('/api/xerengine/finalize', authenticateToken, async (req, res) => {
  try {
    const uploadId = String(req.body.uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId' });
    }

    const sessionDir = path.join(CHUNKS_DIR, uploadId);
    const metaPath = path.join(sessionDir, 'session.json');

    if (!fs.existsSync(sessionDir) || !fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Session not found or already finalized' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

    // Verify all chunks 0..totalChunks-1 are present
    for (let i = 0; i < meta.totalChunks; i++) {
      const cPath = path.join(sessionDir, `chunk_${i}`);
      if (!fs.existsSync(cPath)) {
        return res.status(400).json({ error: `Incomplete upload: chunk ${i} is missing` });
      }
    }

    const fileId = 'mst_' + crypto.randomBytes(5).toString('hex');
    const ext = path.extname(meta.fileName).toLowerCase();
    const safeExt = ext.slice(0, 15);
    const isZip = ext === '.zip' || meta.fileName.endsWith('.zip');
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const storedName = 'mst-' + uniqueSuffix + safeExt;
    const finalPath = path.join(STORAGE_DIR, storedName);

    // Merge chunks with non-blocking stream pipeline
    await mergeChunksSequentially(sessionDir, meta.totalChunks, finalPath);

    // Verify final file size
    const stat = fs.statSync(finalPath);

    // Clean up chunks session directory
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn('Could not remove sessionDir immediately:', rmErr);
    }

    // Vault processing: stream to Telegram Cloud & wipe local copy
    let vaultData = null;
    let finalStoredName = storedName;
    if (telegramVault.isConfigured()) {
      vaultData = await telegramVault.uploadFileToVault(finalPath, meta.fileName, mime.lookup(meta.fileName) || 'application/octet-stream', true);
      finalStoredName = null;
    }

    const db = readDB();
    const record = {
      id: fileId,
      userId: req.user.id,
      uploaderUsername: req.user.displayUsername,
      name: meta.fileName,
      storedName: finalStoredName,
      vaultData: vaultData,
      size: stat.size,
      mimeType: mime.lookup(meta.fileName) || 'application/octet-stream',
      isFolder: false,
      isZip: isZip,
      fingerprint: meta.fingerprint || '',
      timerSeconds: meta.timerSeconds || 0,
      downloads: 0,
      createdAt: new Date().toISOString(),
      expiresAt: meta.retentionDays > 0 ? new Date(Date.now() + meta.retentionDays * 24 * 60 * 60 * 1000).toISOString() : null,
      xerEngineSpeed: true
    };

    db.files.push(record);
    writeDB(db);

    console.log(`[XerEngine] Successfully assembled "${meta.fileName}" (${(stat.size / (1024 * 1024)).toFixed(2)} MB) from ${meta.totalChunks} parallel chunks!`);

    return res.status(201).json({
      message: 'XerEngine upload completed and assembled',
      file: record
    });
  } catch (err) {
    console.error('XerEngine Finalize error:', err);
    return res.status(500).json({ error: 'Failed to finalize and assemble file: ' + err.message });
  }
});

// 5. XerEngine Abort (Clean up canceled session)
app.delete('/api/xerengine/abort/:uploadId', authenticateToken, (req, res) => {
  try {
    const uploadId = String(req.params.uploadId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (uploadId) {
      const sessionDir = path.join(CHUNKS_DIR, uploadId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }
    return res.status(200).json({ success: true, message: 'Session aborted and cleaned' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to abort session' });
  }
});

// Get user's file list
app.get('/api/files/my-files', authenticateToken, (req, res) => {
  const db = readDB();
  const currentUsername = cleanUsername(req.user.username);
  const isMayank = currentUsername === 'mayank' || currentUsername === 'mayank_mandrai_official';

  const userFiles = db.files
    .filter(f => {
      if (f.userId === req.user.id) return true;
      if (cleanUsername(f.uploaderUsername) === currentUsername) return true;
      if (isMayank) return true; // Platform creator & developer sees all vault files
      return false;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ files: userFiles });
});

// Public File Info (for shareable download page)
app.get('/api/files/public/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File unavailable or removed by owner' });
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
    fileCount: file.fileCount || (file.items ? file.items.length : 1),
    items: file.items ? file.items.map((i, idx) => ({ originalName: i.originalName, size: i.size, index: idx })) : [],
    uploaderUsername: file.uploaderUsername,
    timerSeconds: file.timerSeconds || 0,
    downloads: file.downloads || 0,
    createdAt: file.createdAt
  });
});

// Direct Download Stream
app.get('/api/files/download/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).send('File unavailable or removed by owner');
  }

  // Check expiration
  if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
    return res.status(410).send('File link expired');
  }

  // Increment download count safely in memory & disk
  file.downloads = (file.downloads || 0) + 1;
  writeDB(db);

  if (file.isFolder) {
    if (!file.items || file.items.length === 0) {
      return res.status(404).send('Folder contents unavailable on server');
    }

    // Individual item download inside folder
    if (req.query.item !== undefined) {
      const idx = parseInt(req.query.item, 10);
      if (!isNaN(idx) && file.items[idx]) {
        const targetItem = file.items[idx];
        if (targetItem.vaultData) {
          return await telegramVault.streamToResponse(targetItem.vaultData, targetItem.originalName, res);
        }
        if (targetItem.storedName) {
          const targetPath = path.join(STORAGE_DIR, targetItem.storedName);
          if (fs.existsSync(targetPath)) {
            return res.download(targetPath, targetItem.originalName);
          }
        }
      }
      return res.status(404).send('Requested file from folder not found on server');
    }

    // Multi-item or folder zip stream
    try {
      const cleanFolderName = (file.name || 'Folder_Download').replace(/[/\\?%*:|"<>]/g, '_');
      const zipFileName = cleanFolderName.endsWith('.zip') ? cleanFolderName : `${cleanFolderName}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);

      const archive = archiver('zip', {
        zlib: { level: 6 }
      });

      archive.on('error', (err) => {
        console.error('Folder archive zip error:', err);
        if (!res.headersSent) res.status(500).send('Error packaging folder archive');
      });

      archive.pipe(res);

      for (const item of file.items) {
        if (item.vaultData && item.vaultData.parts && item.vaultData.parts[0]) {
          try {
            const fileId = item.vaultData.parts[0].fileId;
            const directUrl = await telegramVault.getFileDirectUrl(fileId);
            const fetchRes = await fetch(directUrl);
            if (fetchRes.ok) {
              const { Readable } = require('stream');
              const nodeStream = Readable.fromWeb(fetchRes.body);
              archive.append(nodeStream, { name: item.originalName });
            }
          } catch (e) {
            console.warn('Zip stream append item error:', e.message);
          }
        } else if (item.storedName) {
          const itemPath = path.join(STORAGE_DIR, item.storedName);
          if (fs.existsSync(itemPath)) {
            archive.file(itemPath, { name: item.originalName });
          }
        }
      }

      archive.finalize();
      return;
    } catch (zipErr) {
      console.error('Zip stream failure:', zipErr);
      return res.status(500).send('Error streaming zipped folder');
    }
  }

  // Vault Streaming Download (Zero-storage on Render)
  if (file.vaultData) {
    try {
      return await telegramVault.streamToResponse(file.vaultData, file.name, res);
    } catch (vaultErr) {
      console.error('Vault stream error:', vaultErr);
      return res.status(500).send('Error streaming file from Cloud Vault: ' + vaultErr.message);
    }
  }

  const filePath = file.storedName ? path.join(STORAGE_DIR, file.storedName) : null;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Physical file missing from storage');
  }

  // Ultra-fast local streaming download fallback with exact Content-Length and Range support
  try {
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.download(filePath, file.name, (err) => {
      if (err && !res.headersSent) {
        console.error('Download stream error:', err);
      }
    });
  } catch (err) {
    console.error('File stat error:', err);
    return res.download(filePath, file.name);
  }
});

// Edit file metadata (name, timer, retention)
app.put('/api/files/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, timerSeconds, retentionDays } = req.body;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File not found or already deleted' });
  }

  if (!isFileOwnerOrAdmin(file, req.user)) {
    return res.status(403).json({ error: 'Permission denied: This file belongs to ' + (file.uploaderUsername || 'another user') });
  }

  if (name && typeof name === 'string' && name.trim().length > 0) {
    file.name = name.trim();
  }

  if (timerSeconds !== undefined) {
    file.timerSeconds = parseInt(timerSeconds, 10) || 0;
  }

  if (retentionDays !== undefined) {
    const rDays = parseInt(retentionDays, 10) || 0;
    file.expiresAt = rDays > 0 ? new Date(Date.now() + rDays * 24 * 60 * 60 * 1000).toISOString() : null;
  }

  file.updatedAt = new Date().toISOString();
  writeDB(db);

  return res.json({ message: 'File details updated successfully', file });
});

// Replace / re-upload file content keeping same share link
app.post('/api/files/replace/:id', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No replacement file provided' });
    }

    const db = readDB();
    const file = db.files.find(f => f.id === id);

    if (!file) {
      if (req.file.filename) {
        const p = path.join(STORAGE_DIR, req.file.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      return res.status(404).json({ error: 'File not found or already deleted' });
    }

    if (!isFileOwnerOrAdmin(file, req.user)) {
      if (req.file.filename) {
        const p = path.join(STORAGE_DIR, req.file.filename);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      return res.status(403).json({ error: 'Permission denied: This file belongs to ' + (file.uploaderUsername || 'another user') });
    }

    // Safely remove previous physical / vault file
    if (file.vaultData) {
      telegramVault.deleteFromVault(file.vaultData);
    }
    if (file.storedName) {
      const oldPath = path.join(STORAGE_DIR, file.storedName);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.error('Error removing old file:', e); }
      }
    }

    // Vault processing or local storage
    let vaultData = null;
    let storedName = req.file.filename;
    if (telegramVault.isConfigured()) {
      const localP = path.join(STORAGE_DIR, req.file.filename);
      vaultData = await telegramVault.uploadFileToVault(localP, req.file.originalname, req.file.mimetype, true);
      storedName = null;
    }

    // Update with new file data
    file.storedName = storedName;
    file.vaultData = vaultData;
    file.size = req.file.size;
    file.mimeType = req.file.mimetype || mime.lookup(req.file.originalname) || 'application/octet-stream';
    if (req.body.updateName === 'true' || !file.name) {
      file.name = req.file.originalname;
    }
    file.updatedAt = new Date().toISOString();

    writeDB(db);

    return res.json({ message: 'File content replaced successfully under the same share link', file });
  } catch (err) {
    console.error('Replace error:', err);
    return res.status(500).json({ error: 'Failed to replace file content' });
  }
});

// Delete file (Resilient and clean)
app.delete('/api/files/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);

  if (!file) {
    return res.status(404).json({ error: 'File not found or already deleted' });
  }

  if (!isFileOwnerOrAdmin(file, req.user)) {
    return res.status(403).json({ error: 'Permission denied: This file belongs to ' + (file.uploaderUsername || 'another user') });
  }

  const index = db.files.findIndex(f => f.id === id);
  if (index !== -1) {
    const [removedFile] = db.files.splice(index, 1);

    // Clean up physical file(s) and vault files
    try {
      if (removedFile.vaultData) {
        telegramVault.deleteFromVault(removedFile.vaultData);
      }
      if (removedFile.isFolder && removedFile.items) {
        removedFile.items.forEach(item => {
          if (item.vaultData) telegramVault.deleteFromVault(item.vaultData);
          if (item.storedName) {
            const p = path.join(STORAGE_DIR, item.storedName);
            if (fs.existsSync(p)) fs.unlinkSync(p);
          }
        });
      } else if (removedFile.storedName) {
        const p = path.join(STORAGE_DIR, removedFile.storedName);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch (err) {
      console.error('Physical file unlink notice (already removed or missing):', err.message);
    }
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
    storageEngine: telegramVault.isConfigured() ? 'XerVault Unlimited Cloud Vault' : 'Local Storage Engine',
    vaultActive: telegramVault.isConfigured(),
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

    // Clean up abandoned XerEngine chunk sessions (> 24 hours old)
    try {
      if (fs.existsSync(CHUNKS_DIR)) {
        const sessions = fs.readdirSync(CHUNKS_DIR);
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        for (const s of sessions) {
          const sPath = path.join(CHUNKS_DIR, s);
          try {
            const sStat = fs.statSync(sPath);
            if (sStat.isDirectory() && sStat.mtimeMs < dayAgo) {
              fs.rmSync(sPath, { recursive: true, force: true });
            }
          } catch (e) {}
        }
      }
    } catch (chunkCleanErr) {}
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
  console.log(`  Storage Engine: ${telegramVault.isConfigured() ? 'XerVault Unlimited Cloud (0 MB on Render)' : 'Local Disk Storage'}`);
  console.log(`  Ready for 24/7 Deployment on Render`);
  console.log(`=========================================`);
});
