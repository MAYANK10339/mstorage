/**
 * MSTORAGE - ULTRA-SMOOTH CLIENT APPLICATION
 * Developer & Creator: Mayank Mandrai
 * 100% Native Architecture - Zero Browser Alerts - Pure Direct Link Sharing - Isolated Download Mode
 */

(function () {
  'use strict';

  // State Management
  const state = {
    token: localStorage.getItem('mst_token') || null,
    user: JSON.parse(localStorage.getItem('mst_user') || 'null'),
    currentTimer: 0,
    currentRetention: 0,
    uploadMode: 'turbo', // 'turbo' | 'direct'
    files: [],
    activeDownloadFile: null,
    pendingDeleteId: null,
    editingFileId: null,
    editSelectedTimer: 0,
    replacementFile: null
  };

  // DOM Elements
  const el = {
    // Header & Navigation
    mainNavLinks: document.getElementById('main-nav-links'),
    guestDownloadBadge: document.getElementById('guest-download-badge'),
    authStateContainer: document.getElementById('auth-state-container'),

    // Auth
    btnOpenAuth: document.getElementById('btn-open-auth'),
    authModal: document.getElementById('auth-modal'),
    btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
    authForm: document.getElementById('auth-form'),
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    inputUsername: document.getElementById('input-username'),
    inputPin: document.getElementById('input-pin'),
    authModalTitle: document.getElementById('auth-modal-title'),
    authModalSubtitle: document.getElementById('auth-modal-subtitle'),
    btnAuthText: document.getElementById('btn-auth-text'),

    // Views
    mainView: document.getElementById('main-view'),
    downloadView: document.getElementById('download-view'),

    // Upload & Dropzone
    dropzone: document.getElementById('main-dropzone'),
    btnSelectFiles: document.getElementById('btn-select-files'),
    btnSelectZip: document.getElementById('btn-select-zip'),
    btnSelectFolder: document.getElementById('btn-select-folder'),
    inputFiles: document.getElementById('input-files'),
    inputZip: document.getElementById('input-zip'),
    inputFolder: document.getElementById('input-folder'),
    uploadModeSelector: document.getElementById('upload-mode-selector'),
    timerSelector: document.getElementById('timer-selector'),
    selectRetention: document.getElementById('select-retention'),

    // Progress & XerEngine HUD
    uploadProgressPanel: document.getElementById('upload-progress-panel'),
    progressFileName: document.getElementById('progress-file-name'),
    progressPercentageText: document.getElementById('progress-percentage-text'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressStatusSpeed: document.getElementById('progress-status-speed'),
    progressStatusSize: document.getElementById('progress-status-size'),
    xerEngineThreads: document.getElementById('xer-engine-threads'),
    xerEtaChip: document.getElementById('xer-eta-chip'),
    xerInstantBanner: document.getElementById('xer-instant-banner'),
    xerMatrixWrap: document.getElementById('xer-matrix-wrap'),
    xerChunksCount: document.getElementById('xer-chunks-count'),
    xerChunkMatrix: document.getElementById('xer-chunk-matrix'),
    btnXerPause: document.getElementById('btn-xer-pause'),
    btnXerPauseText: document.getElementById('btn-xer-pause-text'),
    btnXerCancel: document.getElementById('btn-xer-cancel'),

    // Vault
    vaultFilesGrid: document.getElementById('vault-files-grid'),
    emptyVaultState: document.getElementById('empty-vault-state'),
    vaultSearchInput: document.getElementById('vault-search-input'),
    vaultStorageText: document.getElementById('vault-storage-text'),

    // Public Download Page
    dlFileName: document.getElementById('dl-file-name'),
    dlFileSize: document.getElementById('dl-file-size'),
    dlUploader: document.getElementById('dl-uploader'),
    dlDownloadsCount: document.getElementById('dl-downloads-count'),
    dlTimerContainer: document.getElementById('dl-timer-container'),
    dlTimerBar: document.getElementById('dl-timer-bar'),
    dlTimerSeconds: document.getElementById('dl-timer-seconds'),
    btnTriggerDownload: document.getElementById('btn-trigger-download'),
    btnDlLabel: document.getElementById('btn-dl-label'),
    btnCopyPublicLink: document.getElementById('btn-copy-public-link'),
    btnPublicCopyText: document.getElementById('btn-public-copy-text'),
    dlFileIcon: document.getElementById('dl-file-icon'),
    dlFolderContents: document.getElementById('dl-folder-contents'),
    dlFolderCountBadge: document.getElementById('dl-folder-count-badge'),
    dlFolderItemsList: document.getElementById('dl-folder-items-list'),
    mobileBottomNav: document.getElementById('mobile-bottom-nav'),

    // 3-Dots Mobile Menu Drawer
    btnMobileMore: document.getElementById('btn-mobile-more'),
    mobileMenuDrawer: document.getElementById('mobile-menu-drawer'),
    btnCloseMobileDrawer: document.getElementById('btn-close-mobile-drawer'),
    drawerAuthSection: document.getElementById('drawer-auth-section'),

    // Share Modal (Pure Direct Link Sharing)
    shareModal: document.getElementById('share-modal'),
    btnCloseShareModal: document.getElementById('btn-close-share-modal'),
    shareLinkInput: document.getElementById('share-link-input'),
    btnCopyShareUrl: document.getElementById('btn-copy-share-url'),
    btnCopyLabel: document.getElementById('btn-copy-label'),
    shareOpenLinkBtn: document.getElementById('share-open-link-btn'),

    // Edit & Replace Modal
    editModal: document.getElementById('edit-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),
    editForm: document.getElementById('edit-form'),
    editFileName: document.getElementById('edit-file-name'),
    editTimerSelector: document.getElementById('edit-timer-selector'),
    editSelectRetention: document.getElementById('edit-select-retention'),
    btnTriggerFileReplace: document.getElementById('btn-trigger-file-replace'),
    inputReplaceFile: document.getElementById('input-replace-file'),
    replaceFilePreview: document.getElementById('replace-file-preview'),
    replaceFileNameText: document.getElementById('replace-file-name-text'),
    btnSaveEdit: document.getElementById('btn-save-edit'),

    // In-App Confirm Modal (Zero native alerts)
    confirmModal: document.getElementById('confirm-modal'),
    btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  let authMode = 'login'; // 'login' | 'register'

  // -----------------------------------------------------------------
  // UTILITY HELPERS
  // -----------------------------------------------------------------
  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Smooth floating toast notification (Zero native alerts)
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '#icon-check';
    if (type === 'error') icon = '#icon-cross';
    else if (type === 'link') icon = '#icon-link';

    toast.innerHTML = `
      <svg class="svg-icon svg-sm"><use href="${icon}"/></svg>
      <span>${escapeHtml(message)}</span>
    `;

    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.18s ease-out';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 1.5s Sliding Window + Exponential Moving Average (EMA) Speed Tracker
   * Prevents artificial speed dropouts to 0 KB/s during browser TCP packet bursts
   */
  function createSpeedMeter(windowSec = 1.5) {
    const samples = [];
    let emaSpeed = 0;
    const alpha = 0.25;

    return {
      record(loaded) {
        const now = Date.now();
        samples.push({ time: now, loaded });
        const cutoff = now - (windowSec * 1000);
        while (samples.length > 2 && samples[0].time < cutoff) {
          samples.shift();
        }

        if (samples.length < 2) return emaSpeed;
        const oldest = samples[0];
        const newest = samples[samples.length - 1];
        const timeDiffSec = (newest.time - oldest.time) / 1000;
        if (timeDiffSec <= 0.05) return emaSpeed;

        const bytesDiff = Math.max(0, newest.loaded - oldest.loaded);
        const windowSpeed = bytesDiff / timeDiffSec;

        if (emaSpeed === 0) {
          emaSpeed = windowSpeed;
        } else {
          emaSpeed = (alpha * windowSpeed) + ((1 - alpha) * emaSpeed);
        }
        return emaSpeed;
      }
    };
  }

  // -----------------------------------------------------------------
  // AUTHENTICATION & SESSION
  // -----------------------------------------------------------------
  function updateAuthUI() {
    const urlParams = new URLSearchParams(window.location.search);
    const isPublicDownload = !!urlParams.get('d');

    // If viewing a public download link, enforce isolated guest mode
    if (isPublicDownload) {
      if (el.mainNavLinks) el.mainNavLinks.classList.add('hidden');
      if (el.guestDownloadBadge) el.guestDownloadBadge.classList.remove('hidden');
      if (el.authStateContainer) el.authStateContainer.classList.add('hidden');
      if (el.mobileBottomNav) el.mobileBottomNav.classList.add('hidden');
      return;
    }

    // Normal Home / Dashboard view
    if (el.mainNavLinks) el.mainNavLinks.classList.remove('hidden');
    if (el.guestDownloadBadge) el.guestDownloadBadge.classList.add('hidden');
    if (el.authStateContainer) el.authStateContainer.classList.remove('hidden');
    if (el.mobileBottomNav) el.mobileBottomNav.classList.remove('hidden');

    if (state.token && state.user) {
      const uName = (state.user.username || '').toLowerCase();
      const isAdmin = uName === 'mayankxer' || state.user.role === 'admin';
      const badgeHtml = isAdmin 
        ? `<span class="user-role-badge-admin" style="font-size: 0.65rem; font-weight: 800; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; padding: 2px 6px; border-radius: 4px; margin-left: 4px; letter-spacing: 0.5px;">ADMIN</span>`
        : `<span class="user-role-badge-free" style="font-size: 0.65rem; font-weight: 700; background: rgba(59, 130, 246, 0.15); color: #60a5fa; padding: 2px 6px; border-radius: 4px; margin-left: 4px; border: 1px solid rgba(59, 130, 246, 0.3);">FREE</span>`;

      el.authStateContainer.innerHTML = `
        <div class="user-profile-pill">
          <div class="user-avatar-circle">${escapeHtml(state.user.username.charAt(0).toUpperCase())}</div>
          <span class="user-handle">${escapeHtml(state.user.displayUsername)}</span>
          ${badgeHtml}
          <button id="btn-logout" class="btn-logout-icon" title="Logout">
            <svg class="svg-icon svg-sm"><use href="#icon-cross"/></svg>
          </button>
        </div>
      `;

      const btnLogout = document.getElementById('btn-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
      }
    } else {
      el.authStateContainer.innerHTML = `
        <button id="btn-open-auth" class="btn btn-primary btn-sm">
          <svg class="svg-icon svg-sm"><use href="#icon-lock"/></svg>
          <span>Login / Register</span>
        </button>
      `;
      const btnOpen = document.getElementById('btn-open-auth');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => openAuthModal('login'));
      }
    }

    updateDrawerAuth();
  }

  function updateDrawerAuth() {
    if (!el.drawerAuthSection) return;
    if (state.token && state.user) {
      const uName = (state.user.username || '').toLowerCase();
      const isAdmin = uName === 'mayankxer' || state.user.role === 'admin';
      const roleText = isAdmin ? 'Master Creator • Admin Active' : 'Free Member • Unlimited Vault';

      el.drawerAuthSection.innerHTML = `
        <div class="drawer-user-card">
          <div class="drawer-user-info">
            <div class="user-avatar-circle" style="width: 36px; height: 36px; font-size: 0.95rem;">
              ${escapeHtml(state.user.username.charAt(0).toUpperCase())}
            </div>
            <div>
              <div class="drawer-user-name">${escapeHtml(state.user.displayUsername)}</div>
              <span class="drawer-user-badge" style="${isAdmin ? 'color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);' : ''}">${roleText}</span>
            </div>
          </div>
          <button id="btn-drawer-logout" class="btn btn-outline btn-sm btn-block" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.35); justify-content: center; margin-top: 10px;">
            <svg class="svg-icon svg-sm"><use href="#icon-cross"/></svg>
            <span>Sign Out</span>
          </button>
        </div>
      `;
      const btnLogout = document.getElementById('btn-drawer-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          closeMobileDrawer();
          handleLogout();
        });
      }
    } else {
      el.drawerAuthSection.innerHTML = `
        <div class="drawer-guest-card">
          <div class="drawer-guest-text">
            <strong>Welcome to Mstorage</strong>
            <span>Login or register with your @username &amp; 4-digit PIN.</span>
          </div>
          <button id="btn-drawer-login" class="btn btn-primary btn-sm btn-block" style="justify-content: center; margin-top: 10px;">
            <svg class="svg-icon svg-sm"><use href="#icon-lock"/></svg>
            <span>Login / Register</span>
          </button>
        </div>
      `;
      const btnLogin = document.getElementById('btn-drawer-login');
      if (btnLogin) {
        btnLogin.addEventListener('click', () => {
          closeMobileDrawer();
          openAuthModal('login');
        });
      }
    }
  }

  function openMobileDrawer() {
    updateDrawerAuth();
    if (el.mobileMenuDrawer) {
      el.mobileMenuDrawer.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeMobileDrawer() {
    if (el.mobileMenuDrawer) {
      el.mobileMenuDrawer.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  function openAuthModal(mode = 'login') {
    authMode = mode;
    setAuthTab(mode);
    el.inputUsername.value = '';
    el.inputPin.value = '';
    el.authModal.classList.remove('hidden');
    el.inputUsername.focus();
  }

  function closeAuthModal() {
    el.authModal.classList.add('hidden');
  }

  function setAuthTab(mode) {
    authMode = mode;
    if (mode === 'login') {
      el.tabLogin.classList.add('active');
      el.tabRegister.classList.remove('active');
      el.authModalTitle.textContent = 'Welcome Back';
      el.authModalSubtitle.textContent = 'Enter your @username and 4-digit PIN to access your vault.';
      el.btnAuthText.textContent = 'Sign In';
    } else {
      el.tabRegister.classList.add('active');
      el.tabLogin.classList.remove('active');
      el.authModalTitle.textContent = 'Create New Account';
      el.authModalSubtitle.textContent = 'Choose your @username and set a secret 4-digit PIN.';
      el.btnAuthText.textContent = 'Create Account';
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = el.inputUsername.value.trim();
    const pin = el.inputPin.value.trim();

    if (!username) {
      showToast('Please enter your username', 'error');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      showToast('PIN must be exactly 4 digits (e.g. 1234)', 'error');
      return;
    }

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Authentication failed', 'error');
        return;
      }

      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('mst_token', data.token);
      localStorage.setItem('mst_user', JSON.stringify(data.user));

      closeAuthModal();
      updateAuthUI();
      showToast(authMode === 'register' ? 'Account created! Welcome to Mstorage.' : 'Logged in successfully!', 'success');
      loadUserFiles();
    } catch (err) {
      console.error('Auth request error:', err);
      showToast('Network error during authentication', 'error');
    }
  }

  function handleLogout() {
    state.token = null;
    state.user = null;
    state.files = [];
    localStorage.removeItem('mst_token');
    localStorage.removeItem('mst_user');
    updateAuthUI();
    renderFiles();
    showToast('Logged out of Mstorage', 'info');
  }

  // -----------------------------------------------------------------
  // FILE UPLOADS (Files, Zip, Folder)
  // -----------------------------------------------------------------
  function setUploadMode(mode) {
    state.uploadMode = mode === 'direct' ? 'direct' : 'turbo';

    // Synchronize mode card buttons
    const btnTurbo = document.getElementById('btn-mode-turbo');
    const btnDirect = document.getElementById('btn-mode-direct');
    if (btnTurbo) btnTurbo.classList.toggle('active', state.uploadMode === 'turbo');
    if (btnDirect) btnDirect.classList.toggle('active', state.uploadMode === 'direct');

    // Synchronize options bar pills
    if (el.uploadModeSelector) {
      el.uploadModeSelector.querySelectorAll('.pill-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-mode') === state.uploadMode);
      });
    }

    showToast(state.uploadMode === 'turbo' 
      ? '⚡ Parallel Upload (Chunks me) Active — High-speed parallel streams' 
      : '🛡️ Full Upload (Ek hi file me) Active — Consistent steady wire speed', 'info');
  }

  function setupUploadHandlers() {
    // Mode Switcher Buttons (Parallel Chunks vs Full Direct Upload)
    const btnTurbo = document.getElementById('btn-mode-turbo');
    const btnDirect = document.getElementById('btn-mode-direct');
    if (btnTurbo) {
      btnTurbo.addEventListener('click', () => setUploadMode('turbo'));
    }
    if (btnDirect) {
      btnDirect.addEventListener('click', () => setUploadMode('direct'));
    }

    // Upload Engine Mode Selector in options bar
    if (el.uploadModeSelector) {
      el.uploadModeSelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill-btn');
        if (!btn) return;
        setUploadMode(btn.getAttribute('data-mode') || 'turbo');
      });
    }

    el.btnSelectFiles.addEventListener('click', () => {
      if (ensureAuth()) el.inputFiles.click();
    });

    el.btnSelectZip.addEventListener('click', () => {
      if (ensureAuth()) el.inputZip.click();
    });

    el.btnSelectFolder.addEventListener('click', () => {
      if (ensureAuth()) el.inputFolder.click();
    });

    el.inputFiles.addEventListener('change', (e) => {
      if (e.target.files.length) uploadFileList(e.target.files, 'file');
    });

    el.inputZip.addEventListener('change', (e) => {
      if (e.target.files.length) uploadFileList(e.target.files, 'zip');
    });

    el.inputFolder.addEventListener('change', (e) => {
      if (e.target.files.length) {
        const folderName = getFolderNameFromFiles(e.target.files);
        uploadFolderBundle(e.target.files, folderName);
      }
    });

    // Drag & Drop
    el.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.dropzone.classList.add('drag-active');
    });

    el.dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('drag-active');
    });

    el.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.dropzone.classList.remove('drag-active');
      if (!ensureAuth()) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFileList(e.dataTransfer.files, 'file');
      }
    });

    // Timer Preset Buttons
    el.timerSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      el.timerSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTimer = parseInt(btn.getAttribute('data-timer'), 10) || 0;
    });

    // Retention Selection
    el.selectRetention.addEventListener('change', (e) => {
      state.currentRetention = parseInt(e.target.value, 10) || 0;
    });
  }

  function getFolderNameFromFiles(files) {
    if (!files || files.length === 0) return 'Uploaded Folder';
    const firstPath = files[0].webkitRelativePath;
    if (firstPath && firstPath.includes('/')) {
      return firstPath.split('/')[0];
    }
    return 'Directory_' + Date.now();
  }

  function ensureAuth() {
    if (!state.token || !state.user) {
      openAuthModal('login');
      showToast('Please sign in or create an account with 4-digit PIN first', 'info');
      return false;
    }
    return true;
  }

  let currentXerUpload = null;

  function formatEta(seconds) {
    if (!seconds || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  async function uploadFileList(files, uploadType = 'file', folderName = '') {
    if (!files || files.length === 0) return;
    if (!ensureAuth()) return;

    // Folder upload with multi-file directory bundle
    if (uploadType === 'folder') {
      uploadFolderBundle(files, folderName);
      return;
    }

    // Direct Single-Stream Mode (Normal / Raw)
    if (state.uploadMode === 'direct') {
      await uploadWithDirectStream(Array.from(files));
      return;
    }

    // Turbo Parallel Chunks Mode (XerEngine Ultra-Stream)
    await uploadWithXerEngine(Array.from(files));
  }

  async function uploadWithDirectStream(filesList) {
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const isMulti = filesList.length > 1;

      el.uploadProgressPanel.classList.remove('hidden');
      if (el.xerMatrixWrap) el.xerMatrixWrap.classList.add('hidden');
      if (el.xerInstantBanner) el.xerInstantBanner.classList.add('hidden');
      if (el.btnXerPauseText) el.btnXerPauseText.textContent = 'Streaming';
      if (el.xerEngineThreads) el.xerEngineThreads.textContent = 'Direct Stream (Normal)';

      el.progressBarFill.style.width = '0%';
      el.progressPercentageText.textContent = '0%';
      el.progressFileName.textContent = isMulti ? `[${i + 1}/${filesList.length}] ${file.name}` : file.name;
      el.progressStatusSpeed.textContent = 'Initiating direct stream...';
      el.progressStatusSize.textContent = `0 MB / ${formatBytes(file.size)}`;
      if (el.xerEtaChip) el.xerEtaChip.textContent = 'ETA: --';

      await new Promise((resolve) => {
        const formData = new FormData();
        formData.append('files', file);
        const isZip = file.name.toLowerCase().endsWith('.zip');
        formData.append('uploadType', isZip ? 'zip' : 'file');
        formData.append('timerSeconds', state.currentTimer);
        formData.append('retentionDays', state.currentRetention);

        const speedMeter = createSpeedMeter(1.5);
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
            el.progressBarFill.style.width = `${percent}%`;
            el.progressPercentageText.textContent = `${percent}%`;
            el.progressStatusSize.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;

            const instantSpeed = speedMeter.record(e.loaded);
            const now = Date.now();
            const effectiveSpeed = instantSpeed > 0 
              ? instantSpeed 
              : (e.loaded / ((now - startTime) / 1000 || 1));

            const mbps = ((effectiveSpeed * 8) / (1024 * 1024)).toFixed(1);
            el.progressStatusSpeed.textContent = `${formatBytes(effectiveSpeed)}/s (${mbps} Mbps)`;
            const remaining = Math.max(0, e.total - e.loaded);
            const eta = effectiveSpeed > 0 ? Math.ceil(remaining / effectiveSpeed) : 0;
            if (el.xerEtaChip) el.xerEtaChip.textContent = `ETA: ${formatEta(eta)}`;
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const data = JSON.parse(xhr.responseText);
              showToast('Direct stream upload completed!', 'success');
              setTimeout(() => {
                el.uploadProgressPanel.classList.add('hidden');
              }, 900);
              if (data.files && data.files.length > 0) {
                openShareModal(data.files[0]);
              }
              loadUserFiles();
            } catch (e) {
              showToast('Upload finished', 'info');
            }
          } else {
            showToast(`Direct upload failed: ${xhr.statusText || xhr.status}`, 'error');
            el.uploadProgressPanel.classList.add('hidden');
          }
          resolve();
        });

        xhr.addEventListener('error', () => {
          showToast('Network error during upload', 'error');
          el.uploadProgressPanel.classList.add('hidden');
          resolve();
        });

        xhr.open('POST', '/api/files/upload', true);
        xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
        xhr.send(formData);
      });
    }

    el.inputFiles.value = '';
    el.inputZip.value = '';
    el.inputFolder.value = '';
  }

  async function uploadWithXerEngine(filesList) {
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const isMulti = filesList.length > 1;

      // Show panel & reset UI
      el.uploadProgressPanel.classList.remove('hidden');
      if (el.xerInstantBanner) el.xerInstantBanner.classList.add('hidden');
      if (el.btnXerPauseText) el.btnXerPauseText.textContent = 'Pause';
      const pauseIcon = el.btnXerPause ? el.btnXerPause.querySelector('use') : null;
      if (pauseIcon) pauseIcon.setAttribute('href', '#icon-pause');

      el.progressBarFill.style.width = '0%';
      el.progressPercentageText.textContent = '0%';
      el.progressFileName.textContent = isMulti ? `[${i + 1}/${filesList.length}] ${file.name}` : file.name;
      el.progressStatusSpeed.textContent = 'Initializing XerEngine...';
      el.progressStatusSize.textContent = `0 MB / ${formatBytes(file.size)}`;
      if (el.xerEtaChip) el.xerEtaChip.textContent = 'ETA: --';
      if (el.xerEngineThreads) el.xerEngineThreads.textContent = 'Multi-Stream Ready';

      // Setup Chunk Matrix if file is chunked (> 5MB)
      const config = window.XerEngine ? window.XerEngine.getEngineConfig(file.size) : { chunkSize: 4 * 1024 * 1024, concurrency: 6 };
      const totalChunks = Math.ceil(file.size / config.chunkSize) || 1;

      if (totalChunks > 1 && el.xerMatrixWrap && el.xerChunkMatrix) {
        el.xerMatrixWrap.classList.remove('hidden');
        el.xerChunksCount.textContent = `0 / ${totalChunks} Chunks`;
        el.xerChunkMatrix.innerHTML = '';
        const maxBoxes = Math.min(totalChunks, 150);
        for (let c = 0; c < maxBoxes; c++) {
          const box = document.createElement('div');
          box.className = 'xer-chunk-box';
          box.id = `xer-box-${c}`;
          el.xerChunkMatrix.appendChild(box);
        }
      } else if (el.xerMatrixWrap) {
        el.xerMatrixWrap.classList.add('hidden');
      }

      await new Promise((resolve) => {
        const uploader = new window.XerEngine.Upload(file, {
          token: state.token,
          timerSeconds: state.currentTimer,
          retentionDays: state.currentRetention,
          onProgress: (percent, loaded, total) => {
            el.progressBarFill.style.width = `${percent}%`;
            el.progressPercentageText.textContent = `${percent}%`;
            el.progressStatusSize.textContent = `${formatBytes(loaded)} / ${formatBytes(total)}`;
          },
          onSpeed: (speed, etaSeconds, concurrency) => {
            const mbps = ((speed * 8) / (1024 * 1024)).toFixed(1);
            el.progressStatusSpeed.textContent = `${formatBytes(speed)}/s (${mbps} Mbps)`;
            if (el.xerEtaChip) el.xerEtaChip.textContent = `ETA: ${formatEta(etaSeconds)}`;
            if (el.xerEngineThreads) el.xerEngineThreads.textContent = `${concurrency}x Parallel Pipelines`;
          },
          onChunkDone: (chunkIdx, total, completed) => {
            if (el.xerChunksCount) {
              el.xerChunksCount.textContent = `${completed} / ${total} Chunks`;
            }
            const box = document.getElementById(`xer-box-${chunkIdx}`);
            if (box) {
              box.classList.add('done');
            }
          },
          onInstantHit: (record) => {
            if (el.xerInstantBanner) el.xerInstantBanner.classList.remove('hidden');
            showToast('⚡ XerEngine Instant Hit: Uploaded in 0.05s!', 'success');
          },
          onStateChange: (newState) => {
            if (newState === 'fingerprinting') {
              el.progressStatusSpeed.textContent = 'Calculating XerEngine Fingerprint...';
            } else if (newState === 'assembling') {
              el.progressStatusSpeed.textContent = 'Assembling parallel chunks stream...';
            } else if (newState === 'paused') {
              el.progressStatusSpeed.textContent = 'Upload Paused';
            }
          },
          onComplete: (record) => {
            showToast('Upload completed successfully!', 'success');
            setTimeout(() => {
              el.uploadProgressPanel.classList.add('hidden');
              if (el.xerInstantBanner) el.xerInstantBanner.classList.add('hidden');
            }, 1200);

            if (record) {
              openShareModal(record);
            }
            loadUserFiles();
            currentXerUpload = null;
            resolve();
          },
          onError: (err) => {
            showToast(`Upload failed: ${err.message}`, 'error');
            el.uploadProgressPanel.classList.add('hidden');
            currentXerUpload = null;
            resolve();
          }
        });

        currentXerUpload = uploader;
        uploader.start();
      });
    }

    // Reset inputs
    el.inputFiles.value = '';
    el.inputZip.value = '';
    el.inputFolder.value = '';
  }

  function uploadFolderBundle(files, folderName) {
    if (!ensureAuth()) return;
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const detectedFolderName = folderName || getFolderNameFromFiles(fileList);
    const formData = new FormData();
    const relativePaths = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const relPath = f.webkitRelativePath || f.name;
      relativePaths.push(relPath);
      formData.append('files', f, relPath);
    }

    formData.append('uploadType', 'folder');
    formData.append('folderName', detectedFolderName);
    formData.append('relativePaths', JSON.stringify(relativePaths));
    formData.append('timerSeconds', state.currentTimer);
    formData.append('retentionDays', state.currentRetention);

    el.uploadProgressPanel.classList.remove('hidden');
    if (el.xerMatrixWrap) el.xerMatrixWrap.classList.add('hidden');
    if (el.xerInstantBanner) el.xerInstantBanner.classList.add('hidden');
    el.progressFileName.textContent = `Uploading folder: ${detectedFolderName} (${fileList.length} items)`;
    el.progressBarFill.style.width = '0%';
    el.progressPercentageText.textContent = '0%';
    el.progressStatusSpeed.textContent = 'Streaming multi-file folder archive...';
    if (el.xerEngineThreads) el.xerEngineThreads.textContent = `Folder Bundle (${fileList.length} items)`;

    const speedMeter = createSpeedMeter(1.5);
    const startTime = Date.now();
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        el.progressBarFill.style.width = `${percent}%`;
        el.progressPercentageText.textContent = `${percent}%`;

        const instantSpeed = speedMeter.record(e.loaded);
        const now = Date.now();
        const effectiveSpeed = instantSpeed > 0 
          ? instantSpeed 
          : (e.loaded / ((now - startTime) / 1000 || 1));

        const mbps = ((effectiveSpeed * 8) / (1024 * 1024)).toFixed(1);
        el.progressStatusSpeed.textContent = `${formatBytes(effectiveSpeed)}/s (${mbps} Mbps)`;
        el.progressStatusSize.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;
        const remaining = Math.max(0, e.total - e.loaded);
        const eta = effectiveSpeed > 0 ? Math.ceil(remaining / effectiveSpeed) : 0;
        if (el.xerEtaChip) el.xerEtaChip.textContent = `ETA: ${formatEta(eta)}`;
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.responseText);
            showToast(`Folder "${detectedFolderName}" uploaded successfully!`, 'success');
            setTimeout(() => {
              el.uploadProgressPanel.classList.add('hidden');
            }, 800);
            if (data.files && data.files.length > 0) {
              openShareModal(data.files[0]);
            }
            loadUserFiles();
          } catch (e) {
            showToast('Folder uploaded', 'info');
          }
        } else {
          showToast('Folder upload failed. Please try again.', 'error');
          el.uploadProgressPanel.classList.add('hidden');
        }
        el.inputFolder.value = '';
      }
    };

    xhr.open('POST', '/api/files/upload', true);
    xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
    xhr.send(formData);
  }

  // -----------------------------------------------------------------
  // USER FILES VAULT
  // -----------------------------------------------------------------
  async function loadUserFiles() {
    if (!state.token) {
      state.files = [];
      renderFiles();
      return;
    }

    try {
      const res = await fetch('/api/files/my-files', {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        state.files = data.files || [];
        renderFiles();
      }
    } catch (err) {
      console.error('Failed to load user files:', err);
    }
  }

  function renderFiles() {
    const query = (el.vaultSearchInput.value || '').toLowerCase().trim();
    const filtered = state.files.filter(f => f.name.toLowerCase().includes(query));

    el.vaultStorageText.textContent = `${state.files.length} Item(s)`;

    if (filtered.length === 0) {
      el.vaultFilesGrid.innerHTML = `
        <div class="empty-vault-state">
          <svg class="svg-icon svg-xl"><use href="#icon-folder"/></svg>
          <h3>${query ? 'No matching files found' : 'No Files Uploaded Yet'}</h3>
          <p>${query ? 'Try a different search term' : 'Upload a file, zip, or whole folder above to generate your instant share link.'}</p>
        </div>
      `;
      return;
    }

    el.vaultFilesGrid.innerHTML = filtered.map(f => {
      let icon = '#icon-file';
      let iconClass = '';
      if (f.isFolder) {
        icon = '#icon-folder';
        iconClass = 'is-folder';
      } else if (f.isZip) {
        icon = '#icon-zip';
        iconClass = 'is-zip';
      }

      const timerLabel = f.timerSeconds > 0 ? `${f.timerSeconds}s wait` : 'Instant';

      return `
        <div class="file-item-card" data-id="${escapeHtml(f.id)}">
          <div class="file-header">
            <div class="file-type-icon ${iconClass}">
              <svg class="svg-icon svg-lg"><use href="${icon}"/></svg>
            </div>
            <div class="file-meta-main">
              <h4 class="file-title" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</h4>
              <div class="file-details">
                <span>${formatBytes(f.size)}</span>
                <span>•</span>
                <span>${formatDate(f.createdAt)}</span>
                <span>•</span>
                <span>${f.downloads || 0} dl</span>
              </div>
            </div>
          </div>

          <div class="file-card-actions">
            <div class="file-timer-tag">
              <svg class="svg-icon svg-sm"><use href="#icon-timer"/></svg>
              <span>${timerLabel}</span>
            </div>

            <div class="action-icon-buttons">
              <!-- Edit & Replace Button -->
              <button class="icon-btn btn-edit-item" title="Edit Settings &amp; Replace File" data-id="${escapeHtml(f.id)}">
                <svg class="svg-icon svg-sm"><use href="#icon-edit"/></svg>
              </button>
              <!-- Direct Share Link Button -->
              <button class="icon-btn btn-share-item" title="Copy Direct Share Link" data-id="${escapeHtml(f.id)}">
                <svg class="svg-icon svg-sm"><use href="#icon-link"/></svg>
              </button>
              <!-- Download Button -->
              <button class="icon-btn btn-download-direct" title="Direct Download" data-id="${escapeHtml(f.id)}">
                <svg class="svg-icon svg-sm"><use href="#icon-download"/></svg>
              </button>
              <!-- Delete Button -->
              <button class="icon-btn btn-delete" title="Delete File &amp; Free Storage" data-id="${escapeHtml(f.id)}">
                <svg class="svg-icon svg-sm"><use href="#icon-trash"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card event listeners
    el.vaultFilesGrid.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const file = state.files.find(f => f.id === id);
        if (file) openEditModal(file);
      });
    });

    el.vaultFilesGrid.querySelectorAll('.btn-share-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const file = state.files.find(f => f.id === id);
        if (file) {
          const shareUrl = `${window.location.origin}/?d=${file.id}`;
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Direct share link copied to clipboard!', 'link');
          }).catch(() => {});
          openShareModal(file);
        }
      });
    });

    el.vaultFilesGrid.querySelectorAll('.btn-download-direct').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const file = state.files.find(f => f.id === id);
        triggerDirectDownload(`/api/files/download/${id}`, file ? file.name : '');
        showToast('Starting instant download...', 'info');
      });
    });

    el.vaultFilesGrid.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        promptDeleteFile(id);
      });
    });
  }

  // -----------------------------------------------------------------
  // EDIT & REPLACE FILE MODAL
  // -----------------------------------------------------------------
  function openEditModal(file) {
    state.editingFileId = file.id;
    state.editSelectedTimer = file.timerSeconds || 0;
    state.replacementFile = null;

    el.editFileName.value = file.name;
    el.replaceFilePreview.classList.add('hidden');
    el.inputReplaceFile.value = '';

    // Set timer pills
    el.editTimerSelector.querySelectorAll('.pill-btn').forEach(b => {
      const t = parseInt(b.getAttribute('data-timer'), 10);
      if (t === state.editSelectedTimer) b.classList.add('active');
      else b.classList.remove('active');
    });

    el.editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    state.editingFileId = null;
    state.replacementFile = null;
    el.editModal.classList.add('hidden');
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = state.editingFileId;
    if (!id) return;

    const newName = el.editFileName.value.trim();
    const newTimer = state.editSelectedTimer;
    const newRetention = parseInt(el.editSelectRetention.value, 10) || 0;

    // 1. If replacement file chosen, upload replacement
    if (state.replacementFile) {
      showToast('Uploading replacement file under same link...', 'info');
      const replaceData = new FormData();
      replaceData.append('file', state.replacementFile);
      replaceData.append('updateName', 'false');

      try {
        const repRes = await fetch(`/api/files/replace/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${state.token}` },
          body: replaceData
        });
        if (!repRes.ok) {
          showToast('Failed to replace file content', 'error');
          return;
        }
      } catch (err) {
        showToast('Network error replacing file', 'error');
        return;
      }
    }

    // 2. Update metadata (name, timer, retention)
    try {
      const updateRes = await fetch(`/api/files/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newName,
          timerSeconds: newTimer,
          retentionDays: newRetention
        })
      });

      if (updateRes.ok) {
        showToast('File details updated successfully!', 'success');
        closeEditModal();
        loadUserFiles();
      } else {
        showToast('Failed to update file settings', 'error');
      }
    } catch (err) {
      showToast('Network error updating file', 'error');
    }
  }

  // -----------------------------------------------------------------
  // DELETE FILE CONFIRMATION (Zero native alerts)
  // -----------------------------------------------------------------
  function promptDeleteFile(id) {
    state.pendingDeleteId = id;
    el.confirmModal.classList.remove('hidden');
  }

  function closeConfirmModal() {
    state.pendingDeleteId = null;
    el.confirmModal.classList.add('hidden');
  }

  async function executePendingDelete() {
    const id = state.pendingDeleteId;
    if (!id) return;

    closeConfirmModal();

    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showToast('File deleted and storage space freed', 'success');
        state.files = state.files.filter(f => f.id !== id);
        renderFiles();
      } else {
        if (res.status === 401 || res.status === 403) {
          showToast(data.error || 'Session expired. Please sign in again.', 'error');
          openAuthModal('login');
        } else if (res.status === 404) {
          showToast('File already removed from storage', 'info');
          state.files = state.files.filter(f => f.id !== id);
          renderFiles();
        } else {
          showToast(data.error || 'Failed to delete file', 'error');
        }
      }
    } catch (err) {
      showToast('Network error while deleting file', 'error');
    }
  }

  // -----------------------------------------------------------------
  // PURE DIRECT LINK SHARING
  // -----------------------------------------------------------------
  function openShareModal(file) {
    const shareUrl = `${window.location.origin}/?d=${file.id}`;
    el.shareLinkInput.value = shareUrl;
    el.btnCopyLabel.textContent = 'Copy Link';
    el.shareOpenLinkBtn.href = shareUrl;

    el.shareModal.classList.remove('hidden');
  }

  function closeShareModal() {
    el.shareModal.classList.add('hidden');
  }

  // -----------------------------------------------------------------
  // PUBLIC DOWNLOAD LANDING PAGE & COUNTDOWN TIMER
  // -----------------------------------------------------------------
  async function checkPublicDownloadRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('d');

    if (!fileId) {
      updateAuthUI();
      return;
    }

    // Switch view to public download page
    el.mainView.classList.add('hidden');
    el.downloadView.classList.remove('hidden');
    updateAuthUI(); // enforces guest mode

    try {
      const res = await fetch(`/api/files/public/${fileId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 410) {
          el.dlFileName.textContent = errData.error || 'This file link has expired';
          el.btnDlLabel.textContent = 'Link Expired';
        } else {
          el.dlFileName.textContent = errData.error || 'File Unavailable or Removed';
          el.btnDlLabel.textContent = 'File Unavailable';
        }
        el.btnTriggerDownload.disabled = true;
        return;
      }

      const file = await res.json();
      state.activeDownloadFile = file;

      // Populate file details
      el.dlFileName.textContent = file.name;
      el.dlFileSize.textContent = formatBytes(file.size);
      el.dlUploader.textContent = file.uploaderUsername || '@mstorage_user';
      el.dlDownloadsCount.textContent = file.downloads || 0;

      // File icon
      let icon = '#icon-file';
      if (file.isFolder) icon = '#icon-folder';
      else if (file.isZip) icon = '#icon-zip';
      el.dlFileIcon.innerHTML = `<svg class="svg-icon svg-lg"><use href="${icon}"/></svg>`;

      // Render folder contents listing if this is a folder bundle
      if (file.isFolder && file.items && file.items.length > 0 && el.dlFolderContents) {
        el.dlFolderContents.classList.remove('hidden');
        if (el.dlFolderCountBadge) {
          el.dlFolderCountBadge.textContent = `${file.items.length} file(s) in this folder bundle`;
        }
        if (el.dlFolderItemsList) {
          el.dlFolderItemsList.innerHTML = file.items.map(item => `
            <div class="folder-item-row">
              <div class="folder-item-left">
                <svg class="svg-icon svg-sm" style="color: var(--cyan); flex-shrink: 0;"><use href="#icon-file"/></svg>
                <span class="folder-item-name" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</span>
              </div>
              <div class="folder-item-right">
                <span class="folder-item-size">${formatBytes(item.size)}</span>
                <button type="button" class="btn-item-dl" title="Download ${escapeHtml(item.originalName)}" data-index="${item.index}">
                  <svg class="svg-icon svg-sm"><use href="#icon-download"/></svg>
                </button>
              </div>
            </div>
          `).join('');

          el.dlFolderItemsList.querySelectorAll('.btn-item-dl').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const idx = btn.getAttribute('data-index');
              const item = file.items[idx];
              triggerDirectDownload(`/api/files/download/${file.id}?item=${idx}`, item ? item.originalName : '');
              showToast(`Downloading ${item ? item.originalName : 'file'}...`, 'info');
            });
          });
        }
      } else if (el.dlFolderContents) {
        el.dlFolderContents.classList.add('hidden');
      }

      // Countdown Timer Logic (Creator Master bypasses all timers automatically)
      const currentUsername = (state.user && state.user.username) ? String(state.user.username).toLowerCase() : '';
      const isCreatorOrAdmin = currentUsername === 'mayank' || currentUsername === 'mayankxer' || currentUsername === 'mayank_mandrai_official' || (state.user && state.user.role === 'admin');

      const timerSeconds = isCreatorOrAdmin ? 0 : (parseInt(file.timerSeconds, 10) || 0);
      if (timerSeconds > 0) {
        runDownloadTimer(timerSeconds, file.id);
      } else {
        unlockDownloadButton(file.id);
      }

      // Public Copy Direct Link button
      el.btnCopyPublicLink.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        el.btnPublicCopyText.textContent = 'Link Copied!';
        showToast('Direct download link copied to clipboard!', 'link');
        setTimeout(() => {
          el.btnPublicCopyText.textContent = 'Copy Direct Link';
        }, 2200);
      });

    } catch (err) {
      console.error('Public download error:', err);
      el.dlFileName.textContent = 'Unable to load file';
    }
  }

  function runDownloadTimer(seconds, fileId) {
    el.dlTimerContainer.classList.remove('hidden');
    el.btnTriggerDownload.disabled = true;
    el.btnDlLabel.textContent = `Wait for Timer (${seconds}s)...`;

    let remaining = seconds;
    const totalCircumference = 283;

    el.dlTimerSeconds.textContent = remaining;
    el.dlTimerBar.style.strokeDashoffset = '0';

    const interval = setInterval(() => {
      remaining--;
      el.dlTimerSeconds.textContent = remaining;

      const progress = (seconds - remaining) / seconds;
      el.dlTimerBar.style.strokeDashoffset = `${progress * totalCircumference}`;
      el.btnDlLabel.textContent = `Preparing Stream (${remaining}s)...`;

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeout(() => {
          el.dlTimerContainer.classList.add('hidden');
          unlockDownloadButton(fileId);
        }, 300);
      }
    }, 1000);
  }

  function triggerDirectDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1500);
  }

  function unlockDownloadButton(fileId) {
    el.btnTriggerDownload.disabled = false;
    const isFolder = state.activeDownloadFile && state.activeDownloadFile.isFolder;
    el.btnDlLabel.textContent = isFolder ? 'Download Entire Folder (.ZIP)' : 'Download Now';

    el.btnTriggerDownload.onclick = () => {
      let fileName = state.activeDownloadFile ? state.activeDownloadFile.name : '';
      if (isFolder && !fileName.toLowerCase().endsWith('.zip')) {
        fileName = `${fileName}.zip`;
      }
      triggerDirectDownload(`/api/files/download/${fileId}`, fileName);
      showToast(isFolder ? 'Packaging & starting folder zip download...' : 'Starting instant direct download...', 'info');
      const currentDl = parseInt(el.dlDownloadsCount.textContent, 10) || 0;
      el.dlDownloadsCount.textContent = currentDl + 1;
    };
  }

  // -----------------------------------------------------------------
  // INITIALIZATION & EVENT LISTENERS
  // -----------------------------------------------------------------
  function init() {
    setupUploadHandlers();

    // Tab buttons in auth modal
    el.tabLogin.addEventListener('click', () => setAuthTab('login'));
    el.tabRegister.addEventListener('click', () => setAuthTab('register'));
    el.btnCloseAuthModal.addEventListener('click', closeAuthModal);
    el.authForm.addEventListener('submit', handleAuthSubmit);

    // Modal backdrop clicks
    el.authModal.addEventListener('click', (e) => {
      if (e.target === el.authModal) closeAuthModal();
    });
    el.shareModal.addEventListener('click', (e) => {
      if (e.target === el.shareModal) closeShareModal();
    });
    el.btnCloseShareModal.addEventListener('click', closeShareModal);

    // Edit modal events
    el.btnCloseEditModal.addEventListener('click', closeEditModal);
    el.btnCancelEdit.addEventListener('click', closeEditModal);
    el.editModal.addEventListener('click', (e) => {
      if (e.target === el.editModal) closeEditModal();
    });
    el.editForm.addEventListener('submit', handleEditSubmit);

    // Edit timer selector pills
    el.editTimerSelector.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      el.editTimerSelector.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editSelectedTimer = parseInt(btn.getAttribute('data-timer'), 10) || 0;
    });

    // File replace trigger
    el.btnTriggerFileReplace.addEventListener('click', () => {
      el.inputReplaceFile.click();
    });
    el.inputReplaceFile.addEventListener('change', (e) => {
      if (e.target.files.length) {
        state.replacementFile = e.target.files[0];
        el.replaceFileNameText.textContent = `Replace with: ${state.replacementFile.name} (${formatBytes(state.replacementFile.size)})`;
        el.replaceFilePreview.classList.remove('hidden');
      }
    });

    // In-App Confirm modal buttons
    el.btnConfirmCancel.addEventListener('click', closeConfirmModal);
    el.btnConfirmDelete.addEventListener('click', executePendingDelete);
    el.confirmModal.addEventListener('click', (e) => {
      if (e.target === el.confirmModal) closeConfirmModal();
    });

    // Copy direct share link button
    el.btnCopyShareUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(el.shareLinkInput.value);
      el.btnCopyLabel.textContent = 'Copied!';
      showToast('Share link copied to clipboard!', 'link');
      setTimeout(() => {
        el.btnCopyLabel.textContent = 'Copy Link';
      }, 2000);
    });

    // Vault search input
    el.vaultSearchInput.addEventListener('input', () => {
      renderFiles();
    });

    // Check route (public download vs dashboard)
    checkPublicDownloadRoute();

    // Mobile Bottom Nav items smooth scroll & active tracking
    if (el.mobileBottomNav) {
      const navItems = el.mobileBottomNav.querySelectorAll('.mobile-nav-item');
      navItems.forEach(item => {
        item.addEventListener('click', () => {
          navItems.forEach(n => n.classList.remove('active'));
          item.classList.add('active');
        });
      });

      // Scroll Spy for mobile bottom nav
      const targetIds = ['upload-section', 'vault-section', 'comparison-section', 'about-section'];
      const sections = targetIds.map(id => document.getElementById(id)).filter(Boolean);

      if ('IntersectionObserver' in window && sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              navItems.forEach(item => {
                if (item.getAttribute('href') === `#${id}`) {
                  item.classList.add('active');
                } else {
                  item.classList.remove('active');
                }
              });
            }
          });
        }, { threshold: 0.25 });

        sections.forEach(s => observer.observe(s));
      }
    }

    // 3-Dots Mobile Menu Drawer Trigger & Close
    if (el.btnMobileMore) {
      el.btnMobileMore.addEventListener('click', openMobileDrawer);
    }
    if (el.btnCloseMobileDrawer) {
      el.btnCloseMobileDrawer.addEventListener('click', closeMobileDrawer);
    }
    if (el.mobileMenuDrawer) {
      el.mobileMenuDrawer.addEventListener('click', (e) => {
        if (e.target === el.mobileMenuDrawer) closeMobileDrawer();
      });
      el.mobileMenuDrawer.querySelectorAll('.drawer-nav-link').forEach(link => {
        link.addEventListener('click', () => {
          closeMobileDrawer();
        });
      });
    }

    // XerEngine Controls (Pause / Resume / Cancel)
    if (el.btnXerPause) {
      el.btnXerPause.addEventListener('click', () => {
        if (!currentXerUpload) return;
        if (currentXerUpload.state === 'uploading') {
          currentXerUpload.pause();
          if (el.btnXerPauseText) el.btnXerPauseText.textContent = 'Resume';
          const icon = el.btnXerPause.querySelector('use');
          if (icon) icon.setAttribute('href', '#icon-play');
        } else if (currentXerUpload.state === 'paused') {
          currentXerUpload.resume();
          if (el.btnXerPauseText) el.btnXerPauseText.textContent = 'Pause';
          const icon = el.btnXerPause.querySelector('use');
          if (icon) icon.setAttribute('href', '#icon-pause');
        }
      });
    }

    if (el.btnXerCancel) {
      el.btnXerCancel.addEventListener('click', () => {
        if (currentXerUpload) {
          currentXerUpload.cancel();
          currentXerUpload = null;
        }
        el.uploadProgressPanel.classList.add('hidden');
        showToast('Upload cancelled by user', 'info');
      });
    }

    // If user is logged in and not on public download route, load files
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('d') && state.token) {
      loadUserFiles();
    }

    fetchSystemStats();
  }

  async function fetchSystemStats() {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        const drawerStatusEl = document.getElementById('drawer-storage-status');
        if (drawerStatusEl) {
          if (data.vaultActive) {
            drawerStatusEl.textContent = 'XerVault Unlimited Cloud Active • 0 Delay';
          } else {
            drawerStatusEl.textContent = 'Cloud Storage 24/7 Active • 0 Delay';
          }
        }
      }
    } catch (e) {
      // Non-blocking
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
