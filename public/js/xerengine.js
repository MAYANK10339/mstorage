/**
 * ===================================================================
 * XERENGINE TURBO UPLOAD ENGINE (v5.0 Ultra-Stream)
 * Developer & Lead Architect: Mayank Mandrai
 * Theme: High-Throughput Parallel Chunk Streaming & Instant Deduplication
 * Capable of handling files from 10MB to 100GB+ with zero memory bloat
 * ===================================================================
 */

(function (window) {
  'use strict';

  // Fast Tri-Zone Cryptographic Fingerprinting (0.01s - 0.05s)
  async function computeFingerprint(file) {
    const SAMPLE_SIZE = 262144; // 256 KB
    const fileSize = file.size;

    let buffers = [];

    if (fileSize <= SAMPLE_SIZE * 3) {
      // Small file: read entirely
      const buf = await file.arrayBuffer();
      buffers.push(buf);
    } else {
      // Large file: Tri-Zone Sampling (Start + Middle + End)
      const startSlice = file.slice(0, SAMPLE_SIZE);
      const midPoint = Math.floor(fileSize / 2) - Math.floor(SAMPLE_SIZE / 2);
      const midSlice = file.slice(midPoint, midPoint + SAMPLE_SIZE);
      const endSlice = file.slice(fileSize - SAMPLE_SIZE, fileSize);

      const [startBuf, midBuf, endBuf] = await Promise.all([
        startSlice.arrayBuffer(),
        midSlice.arrayBuffer(),
        endSlice.arrayBuffer()
      ]);

      buffers.push(startBuf, midBuf, endBuf);
    }

    // Append 8-byte BigInt file size to guarantee size differentiation
    const sizeBuffer = new ArrayBuffer(8);
    new DataView(sizeBuffer).setBigUint64(0, BigInt(fileSize));
    buffers.push(sizeBuffer);

    // Merge into single continuous buffer for hashing
    const totalBytes = buffers.reduce((acc, b) => acc + b.byteLength, 0);
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const b of buffers) {
      combined.set(new Uint8Array(b), offset);
      offset += b.byteLength;
    }

    // SHA-256 via native browser Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `xer_fp_${hex.substring(0, 32)}_${fileSize}`;
  }

  // Determine dynamic chunk size and concurrency based on file volume
  function getEngineConfig(fileSize) {
    if (fileSize < 10 * 1024 * 1024) {
      // < 10 MB
      return { chunkSize: 2 * 1024 * 1024, concurrency: 4 };
    } else if (fileSize < 100 * 1024 * 1024) {
      // 10 MB - 100 MB
      return { chunkSize: 4 * 1024 * 1024, concurrency: 6 };
    } else if (fileSize < 1024 * 1024 * 1024) {
      // 100 MB - 1 GB
      return { chunkSize: 8 * 1024 * 1024, concurrency: 6 };
    } else {
      // 1 GB - 100 GB+
      return { chunkSize: 16 * 1024 * 1024, concurrency: 8 };
    }
  }

  class XerEngineUpload {
    constructor(file, options = {}) {
      this.file = file;
      this.options = Object.assign({
        token: '',
        timerSeconds: 0,
        retentionDays: 0,
        onProgress: null,
        onSpeed: null,
        onChunkDone: null,
        onInstantHit: null,
        onComplete: null,
        onError: null,
        onStateChange: null
      }, options);

      const config = getEngineConfig(file.size);
      this.chunkSize = config.chunkSize;
      this.concurrency = config.concurrency;

      this.totalChunks = Math.ceil(file.size / this.chunkSize) || 1;
      this.uploadId = null;
      this.fingerprint = null;

      this.state = 'idle'; // 'idle' | 'fingerprinting' | 'instant' | 'uploading' | 'paused' | 'assembling' | 'completed' | 'cancelled' | 'error'
      this.completedChunks = new Set();
      this.activeControllers = new Map();

      this.bytesLoaded = 0;
      this.startTime = null;
      this.lastTime = null;
      this.lastLoaded = 0;
      this.rollingSpeed = 0;
      this.speedInterval = null;
    }

    setState(newState, data = {}) {
      this.state = newState;
      if (typeof this.options.onStateChange === 'function') {
        this.options.onStateChange(newState, data);
      }
    }

    async start() {
      if (this.state === 'uploading' || this.state === 'completed') return;

      this.setState('fingerprinting');
      this.startTime = Date.now();
      this.lastTime = this.startTime;
      this.lastLoaded = 0;

      try {
        // 1. Calculate ultra-fast cryptographic fingerprint
        this.fingerprint = await computeFingerprint(this.file);

        // 2. Handshake for Instant Deduplication
        const handshakeRes = await fetch('/api/xerengine/handshake', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.token}`
          },
          body: JSON.stringify({
            fingerprint: this.fingerprint,
            name: this.file.name,
            size: this.file.size,
            mimeType: this.file.type,
            timerSeconds: this.options.timerSeconds,
            retentionDays: this.options.retentionDays
          })
        });

        if (handshakeRes.ok) {
          const handshakeData = await handshakeRes.json();
          if (handshakeData.instant && handshakeData.file) {
            // INSTANT HIT! (0.05s Upload)
            this.setState('instant');
            if (typeof this.options.onInstantHit === 'function') {
              this.options.onInstantHit(handshakeData.file);
            }
            if (typeof this.options.onProgress === 'function') {
              this.options.onProgress(100, this.file.size, this.file.size);
            }
            if (typeof this.options.onComplete === 'function') {
              this.options.onComplete(handshakeData.file);
            }
            this.setState('completed');
            return;
          }
        }

        // 3. Initialize Multi-Chunk Upload Session
        this.setState('uploading');
        const initRes = await fetch('/api/xerengine/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.options.token}`
          },
          body: JSON.stringify({
            fileName: this.file.name,
            fileSize: this.file.size,
            totalChunks: this.totalChunks,
            chunkSize: this.chunkSize,
            fingerprint: this.fingerprint,
            timerSeconds: this.options.timerSeconds,
            retentionDays: this.options.retentionDays,
            existingUploadId: this.uploadId || undefined
          })
        });

        if (!initRes.ok) {
          throw new Error('Failed to initialize XerEngine streaming session');
        }

        const initData = await initRes.json();
        this.uploadId = initData.uploadId;

        // Resume support: populate already uploaded chunks
        if (Array.isArray(initData.existingChunks)) {
          initData.existingChunks.forEach(idx => {
            this.completedChunks.add(idx);
          });
        }

        // Setup speed monitoring loop
        this.startSpeedLoop();

        // 4. Start concurrent worker pipelines
        await this.runWorkerPool();

        // 5. Finalize assembly once all chunks land
        if (this.completedChunks.size === this.totalChunks && this.state !== 'cancelled' && this.state !== 'paused') {
          this.setState('assembling');
          this.stopSpeedLoop();

          const finalizeRes = await fetch('/api/xerengine/finalize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.options.token}`
            },
            body: JSON.stringify({
              uploadId: this.uploadId
            })
          });

          if (!finalizeRes.ok) {
            const errData = await finalizeRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to assemble file chunks');
          }

          const finalizeData = await finalizeRes.json();
          this.setState('completed');
          if (typeof this.options.onProgress === 'function') {
            this.options.onProgress(100, this.file.size, this.file.size);
          }
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete(finalizeData.file);
          }
        }
      } catch (err) {
        this.stopSpeedLoop();
        if (this.state !== 'cancelled' && this.state !== 'paused') {
          this.setState('error');
          console.error('[XerEngine Error]:', err);
          if (typeof this.options.onError === 'function') {
            this.options.onError(err);
          }
        }
      }
    }

    async runWorkerPool() {
      // Generate queue of pending chunks
      const queue = [];
      for (let i = 0; i < this.totalChunks; i++) {
        if (!this.completedChunks.has(i)) {
          queue.push(i);
        }
      }

      // Calculate initial bytes loaded for resumed sessions
      this.bytesLoaded = 0;
      this.completedChunks.forEach(idx => {
        const start = idx * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        this.bytesLoaded += (end - start);
      });

      this.updateProgress();

      const workerCount = Math.min(this.concurrency, queue.length || 1);
      const workerPromises = [];

      for (let w = 0; w < workerCount; w++) {
        workerPromises.push(this.createWorker(queue));
      }

      await Promise.all(workerPromises);
    }

    async createWorker(queue) {
      while (queue.length > 0 && this.state === 'uploading') {
        const chunkIndex = queue.shift();
        if (chunkIndex === undefined) break;

        let retries = 0;
        const maxRetries = 4;
        let success = false;

        while (retries <= maxRetries && !success && this.state === 'uploading') {
          try {
            await this.uploadChunk(chunkIndex);
            success = true;
          } catch (err) {
            retries++;
            if (retries > maxRetries) {
              queue.unshift(chunkIndex);
              throw new Error(`Chunk ${chunkIndex} failed after ${maxRetries} retries: ${err.message}`);
            }
            await new Promise(r => setTimeout(r, retries * 250));
          }
        }
      }
    }

    uploadChunk(chunkIndex) {
      return new Promise((resolve, reject) => {
        if (this.state !== 'uploading') {
          return reject(new Error('Upload paused or cancelled'));
        }

        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        const chunkBlob = this.file.slice(start, end);

        const xhr = new XMLHttpRequest();
        this.activeControllers.set(chunkIndex, xhr);

        let previousLoaded = 0;

        xhr.upload.addEventListener('progress', (e) => {
          if (this.state !== 'uploading') return;
          if (e.lengthComputable) {
            const delta = e.loaded - previousLoaded;
            previousLoaded = e.loaded;
            this.bytesLoaded = Math.min(this.bytesLoaded + delta, this.file.size);
            this.updateProgress();
          }
        });

        xhr.addEventListener('load', () => {
          this.activeControllers.delete(chunkIndex);
          if (xhr.status === 200 || xhr.status === 201) {
            this.completedChunks.add(chunkIndex);
            if (typeof this.options.onChunkDone === 'function') {
              this.options.onChunkDone(chunkIndex, this.totalChunks, this.completedChunks.size);
            }
            resolve();
          } else {
            this.bytesLoaded = Math.max(0, this.bytesLoaded - previousLoaded);
            this.updateProgress();
            reject(new Error(`Server responded with ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          this.activeControllers.delete(chunkIndex);
          this.bytesLoaded = Math.max(0, this.bytesLoaded - previousLoaded);
          this.updateProgress();
          reject(new Error('Network error uploading chunk'));
        });

        xhr.addEventListener('abort', () => {
          this.activeControllers.delete(chunkIndex);
          reject(new Error('Chunk upload aborted'));
        });

        const url = `/api/xerengine/chunk?uploadId=${encodeURIComponent(this.uploadId)}&chunkIndex=${chunkIndex}&totalChunks=${this.totalChunks}`;
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.setRequestHeader('Authorization', `Bearer ${this.options.token}`);
        xhr.send(chunkBlob);
      });
    }

    startSpeedLoop() {
      this.stopSpeedLoop();
      this.speedInterval = setInterval(() => {
        if (this.state !== 'uploading') return;

        const now = Date.now();
        const timeDiff = (now - this.lastTime) / 1000;

        if (timeDiff >= 0.25) {
          const bytesDiff = this.bytesLoaded - this.lastLoaded;
          const currentSpeed = Math.max(0, bytesDiff / timeDiff);

          this.rollingSpeed = this.rollingSpeed === 0 
            ? currentSpeed 
            : (this.rollingSpeed * 0.35 + currentSpeed * 0.65);

          this.lastTime = now;
          this.lastLoaded = this.bytesLoaded;

          if (typeof this.options.onSpeed === 'function') {
            const remainingBytes = Math.max(0, this.file.size - this.bytesLoaded);
            const etaSeconds = this.rollingSpeed > 0 ? Math.ceil(remainingBytes / this.rollingSpeed) : 0;
            this.options.onSpeed(this.rollingSpeed, etaSeconds, this.concurrency);
          }
        }
      }, 250);
    }

    stopSpeedLoop() {
      if (this.speedInterval) {
        clearInterval(this.speedInterval);
        this.speedInterval = null;
      }
    }

    updateProgress() {
      if (typeof this.options.onProgress === 'function') {
        const percent = this.file.size > 0 
          ? Math.min(100, Math.round((this.bytesLoaded / this.file.size) * 100)) 
          : 0;
        this.options.onProgress(percent, this.bytesLoaded, this.file.size);
      }
    }

    pause() {
      if (this.state !== 'uploading') return;
      this.setState('paused');
      this.stopSpeedLoop();

      this.activeControllers.forEach(xhr => {
        try { xhr.abort(); } catch (e) {}
      });
      this.activeControllers.clear();
    }

    async resume() {
      if (this.state !== 'paused') return;
      this.setState('uploading');
      this.lastTime = Date.now();
      this.lastLoaded = this.bytesLoaded;
      this.startSpeedLoop();

      try {
        await this.runWorkerPool();
        if (this.completedChunks.size === this.totalChunks && this.state !== 'cancelled' && this.state !== 'paused') {
          this.setState('assembling');
          this.stopSpeedLoop();

          const finalizeRes = await fetch('/api/xerengine/finalize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.options.token}`
            },
            body: JSON.stringify({ uploadId: this.uploadId })
          });

          if (!finalizeRes.ok) throw new Error('Failed to assemble file chunks');
          const finalizeData = await finalizeRes.json();
          this.setState('completed');
          if (typeof this.options.onProgress === 'function') {
            this.options.onProgress(100, this.file.size, this.file.size);
          }
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete(finalizeData.file);
          }
        }
      } catch (err) {
        this.stopSpeedLoop();
        if (this.state !== 'cancelled' && this.state !== 'paused') {
          this.setState('error');
          if (typeof this.options.onError === 'function') {
            this.options.onError(err);
          }
        }
      }
    }

    cancel() {
      this.setState('cancelled');
      this.stopSpeedLoop();

      this.activeControllers.forEach(xhr => {
        try { xhr.abort(); } catch (e) {}
      });
      this.activeControllers.clear();

      if (this.uploadId && this.options.token) {
        fetch(`/api/xerengine/abort/${encodeURIComponent(this.uploadId)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${this.options.token}` }
        }).catch(() => {});
      }
    }
  }

  // Export globally
  window.XerEngine = {
    Upload: XerEngineUpload,
    computeFingerprint: computeFingerprint,
    getEngineConfig: getEngineConfig
  };

})(typeof window !== 'undefined' ? window : this);
