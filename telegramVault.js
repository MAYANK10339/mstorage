/**
 * XerVault - Unlimited High-Speed Cloud Storage Engine
 * Developer & Architect: Mayank Mandrai
 * 
 * Provides:
 * 1. Truly unlimited storage using Telegram Cloud Vault
 * 2. Instant Render disk unlinking (0 MB stored on Render server)
 * 3. Transparent multi-part chunk streaming for files > 45MB (bypasses 50MB Bot API limit)
 * 4. Cold-boot atomic database backup & auto-recovery (prevents Render sleep data loss)
 * 5. Dual-mode fallback: seamless switch to local disk if Vault credentials are not configured.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Single file upload threshold before auto-chunking (Telegram Bot API has 50MB limit)
const CHUNK_THRESHOLD = 45 * 1024 * 1024; // 45 MB
const VAULT_CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB slices for large files

class TelegramVault {
  constructor() {
    this.botToken = BOT_TOKEN;
    this.chatId = CHAT_ID;
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
    this.fileBase = `https://api.telegram.org/file/bot${this.botToken}`;
    this.backupDebounceTimer = null;
  }

  isConfigured() {
    return Boolean(this.botToken && this.chatId && this.botToken.length > 10);
  }

  reloadConfig() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
    this.fileBase = `https://api.telegram.org/file/bot${this.botToken}`;
  }

  /**
   * Helper: call Telegram Bot API
   */
  async callApi(method, body, isFormData = false) {
    if (!this.isConfigured()) {
      throw new Error('Telegram Vault is not configured');
    }

    const url = `${this.apiBase}/${method}`;
    const options = {
      method: 'POST'
    };

    if (isFormData) {
      options.body = body;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.description || `Telegram API error on ${method}`);
    }
    return json.result;
  }

  /**
   * Uploads a single Buffer or Blob to Telegram as a document
   */
  async uploadPart(buffer, filename, caption = '') {
    const formData = new FormData();
    formData.append('chat_id', this.chatId);
    const blob = new Blob([buffer]);
    formData.append('document', blob, filename);
    if (caption) {
      formData.append('caption', caption.slice(0, 1000));
    }

    const result = await this.callApi('sendDocument', formData, true);
    return {
      fileId: result.document ? result.document.file_id : null,
      messageId: result.message_id,
      size: result.document ? result.document.file_size : buffer.length
    };
  }

  /**
   * Main Upload Function:
   * Accepts a local file path, uploads to Telegram Vault (auto-chunking if > 45MB),
   * and optionally unlinks the local file so Render storage stays 0 MB.
   */
  async uploadFileToVault(filePath, originalName, mimeType, unlinkLocal = true) {
    if (!this.isConfigured()) {
      return null;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found for vault upload: ${filePath}`);
    }

    const stat = fs.statSync(filePath);
    const totalSize = stat.size;

    console.log(`[XerVault] Archiving to Cloud Vault: "${originalName}" (${(totalSize / (1024 * 1024)).toFixed(2)} MB)...`);

    let vaultData = null;

    if (totalSize <= CHUNK_THRESHOLD) {
      // 1. Single Part Upload
      const fileBuffer = fs.readFileSync(filePath);
      const part = await this.uploadPart(fileBuffer, originalName, `#MSTORAGE_FILE# ${originalName}`);
      vaultData = {
        isVault: true,
        isChunked: false,
        totalSize: totalSize,
        mimeType: mimeType || 'application/octet-stream',
        originalName: originalName,
        parts: [part]
      };
    } else {
      // 2. Multi-Part Chunk Upload (For files > 45MB)
      const totalChunks = Math.ceil(totalSize / VAULT_CHUNK_SIZE);
      const parts = [];
      const fd = fs.openSync(filePath, 'r');

      try {
        for (let i = 0; i < totalChunks; i++) {
          const start = i * VAULT_CHUNK_SIZE;
          const end = Math.min(start + VAULT_CHUNK_SIZE, totalSize);
          const chunkSize = end - start;
          const buffer = Buffer.alloc(chunkSize);

          fs.readSync(fd, buffer, 0, chunkSize, start);
          const chunkName = `${originalName}.part${i + 1}`;
          const caption = `#MSTORAGE_CHUNK# ${originalName} [Part ${i + 1}/${totalChunks}]`;

          const part = await this.uploadPart(buffer, chunkName, caption);
          parts.push({
            partIndex: i,
            fileId: part.fileId,
            messageId: part.messageId,
            size: chunkSize
          });
        }
      } finally {
        fs.closeSync(fd);
      }

      vaultData = {
        isVault: true,
        isChunked: true,
        totalSize: totalSize,
        totalChunks: totalChunks,
        mimeType: mimeType || 'application/octet-stream',
        originalName: originalName,
        parts: parts
      };
    }

    // Unlink local file from Render server disk immediately to keep Render disk at 0 MB!
    if (unlinkLocal) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[XerVault] Instant Cleanup: Wiped temporary file from Render disk (${originalName}). Render Disk = 0 MB!`);
      } catch (e) {
        console.warn(`[XerVault] Notice: Unlink failed: ${e.message}`);
      }
    }

    console.log(`[XerVault] Successfully vaulted "${originalName}" to Telegram Cloud Vault!`);
    return vaultData;
  }

  /**
   * Resolves a Telegram file_id to its direct CDN download URL
   */
  async getFileDirectUrl(fileId) {
    const result = await this.callApi('getFile', { file_id: fileId });
    if (!result || !result.file_path) {
      throw new Error('Telegram did not return a valid file_path');
    }
    return `${this.fileBase}/${result.file_path}`;
  }

  /**
   * Streams a vaulted file directly into Express `res`
   */
  async streamToResponse(vaultData, clientFileName, res) {
    if (!vaultData || !vaultData.parts || vaultData.parts.length === 0) {
      throw new Error('Invalid vault metadata');
    }

    const fileName = clientFileName || vaultData.originalName || 'download';
    const totalSize = vaultData.totalSize;

    res.setHeader('Content-Type', vaultData.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (totalSize) {
      res.setHeader('Content-Length', totalSize);
    }
    res.setHeader('Accept-Ranges', 'none');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (!vaultData.isChunked) {
      // Single Part Stream
      const fileId = vaultData.parts[0].fileId;
      const downloadUrl = await this.getFileDirectUrl(fileId);
      const fetchRes = await fetch(downloadUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch from Telegram CDN: ${fetchRes.statusText}`);
      }

      const nodeStream = Readable.fromWeb(fetchRes.body);
      nodeStream.pipe(res);
      return;
    }

    // Multi-Part Chunk Stream (Sequentially stream each part into `res`)
    for (let i = 0; i < vaultData.parts.length; i++) {
      const part = vaultData.parts[i];
      const downloadUrl = await this.getFileDirectUrl(part.fileId);
      const fetchRes = await fetch(downloadUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to stream chunk ${i} from Telegram CDN`);
      }

      const isLast = i === vaultData.parts.length - 1;
      await new Promise((resolve, reject) => {
        const nodeStream = Readable.fromWeb(fetchRes.body);
        nodeStream.pipe(res, { end: isLast });
        nodeStream.on('end', resolve);
        nodeStream.on('error', reject);
      });
    }
  }

  /**
   * Delete file / chunks from Telegram Channel
   */
  async deleteFromVault(vaultData) {
    if (!this.isConfigured() || !vaultData || !vaultData.parts) return;
    for (const part of vaultData.parts) {
      if (part.messageId) {
        try {
          await this.callApi('deleteMessage', {
            chat_id: this.chatId,
            message_id: part.messageId
          });
        } catch (e) {
          // Ignored if already removed
        }
      }
    }
  }

  /**
   * Database Persistence:
   * Debounced backup of mstorage_db.json to the private Telegram channel
   */
  scheduleDatabaseBackup(dbJsonPath) {
    if (!this.isConfigured() || !fs.existsSync(dbJsonPath)) return;

    if (this.backupDebounceTimer) {
      clearTimeout(this.backupDebounceTimer);
    }

    this.backupDebounceTimer = setTimeout(async () => {
      try {
        if (!fs.existsSync(dbJsonPath)) return;
        const dbContent = fs.readFileSync(dbJsonPath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `mstorage_db_backup_${timestamp}.json`;

        const formData = new FormData();
        formData.append('chat_id', this.chatId);
        const blob = new Blob([dbContent]);
        formData.append('document', blob, backupName);
        formData.append('caption', `#MSTORAGE_DB_BACKUP# ${new Date().toLocaleString()}`);

        const result = await this.callApi('sendDocument', formData, true);
        console.log(`[XerVault] Auto-Backup: mstorage_db.json safely saved to Telegram Cloud (msg_id: ${result.message_id})!`);
      } catch (err) {
        console.warn(`[XerVault] Backup warning: ${err.message}`);
      }
    }, 5000); // 5 second debounce
  }

  /**
   * Cold-boot Database Auto-Recovery:
   * If Render wakes up with wiped local database, check Telegram channel for latest backup
   */
  async restoreLatestDatabase(dbJsonPath) {
    if (!this.isConfigured()) return false;

    try {
      console.log('[XerVault] Checking Telegram Cloud Vault for existing database backup...');
      // Get chat details / pinned message or recent messages
      const chat = await this.callApi('getChat', { chat_id: this.chatId });
      if (chat && chat.pinned_message && chat.pinned_message.document) {
        const fileId = chat.pinned_message.document.file_id;
        const downloadUrl = await this.getFileDirectUrl(fileId);
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const content = await res.text();
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.users)) {
            fs.writeFileSync(dbJsonPath, JSON.stringify(parsed, null, 2), 'utf8');
            console.log('[XerVault] Successfully restored database from Pinned Telegram Backup!');
            return true;
          }
        }
      }
      return false;
    } catch (err) {
      console.warn('[XerVault] Auto-recovery notice:', err.message);
      return false;
    }
  }
}

module.exports = new TelegramVault();
