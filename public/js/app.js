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
    timerSelector: document.getElementById('timer-selector'),
    selectRetention: document.getElementById('select-retention'),

    // Progress
    uploadProgressPanel: document.getElementById('upload-progress-panel'),
    progressFileName: document.getElementById('progress-file-name'),
    progressPercentageText: document.getElementById('progress-percentage-text'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressStatusSpeed: document.getElementById('progress-status-speed'),
    progressStatusSize: document.getElementById('progress-status-size'),

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
      return;
    }

    // Normal Home / Dashboard view
    if (el.mainNavLinks) el.mainNavLinks.classList.remove('hidden');
    if (el.guestDownloadBadge) el.guestDownloadBadge.classList.add('hidden');
    if (el.authStateContainer) el.authStateContainer.classList.remove('hidden');

    if (state.token && state.user) {
      el.authStateContainer.innerHTML = `
        <div class="user-profile-pill">
          <div class="user-avatar-circle">${escapeHtml(state.user.username.charAt(0).toUpperCase())}</div>
          <span class="user-handle">${escapeHtml(state.user.displayUsername)}</span>
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
  function setupUploadHandlers() {
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
        uploadFileList(e.target.files, 'folder', folderName);
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

  function uploadFileList(files, uploadType = 'file', folderName = '') {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    formData.append('uploadType', uploadType);
    formData.append('folderName', folderName || files[0].name);
    formData.append('timerSeconds', state.currentTimer);
    formData.append('retentionDays', state.currentRetention);

    // Show progress panel
    el.uploadProgressPanel.classList.remove('hidden');
    el.progressFileName.textContent = uploadType === 'folder' 
      ? `Uploading folder: ${folderName} (${files.length} items)`
      : `Uploading ${files.length} item(s)...`;
    el.progressBarFill.style.width = '0%';
    el.progressPercentageText.textContent = '0%';
    el.progressStatusSpeed.textContent = 'Streaming directly to storage...';

    const startTime = Date.now();
    let lastTime = startTime;
    let lastLoaded = 0;
    let rollingSpeed = 0;
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        el.progressBarFill.style.width = `${percent}%`;
        el.progressPercentageText.textContent = `${percent}%`;

        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;

        // Update real-time rolling speed every 250ms
        if (timeDiff >= 0.25) {
          const bytesDiff = e.loaded - lastLoaded;
          const currentSpeed = bytesDiff / timeDiff;
          rollingSpeed = rollingSpeed === 0 ? currentSpeed : (rollingSpeed * 0.4 + currentSpeed * 0.6);
          lastTime = now;
          lastLoaded = e.loaded;
        }

        const effectiveSpeed = rollingSpeed > 0 ? rollingSpeed : (e.loaded / ((now - startTime) / 1000 || 1));
        const mbps = ((effectiveSpeed * 8) / (1024 * 1024)).toFixed(1);
        el.progressStatusSpeed.textContent = `${formatBytes(effectiveSpeed)}/s (${mbps} Mbps)`;
        el.progressStatusSize.textContent = `${formatBytes(e.loaded)} / ${formatBytes(e.total)}`;
      }
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.responseText);
            showToast('Upload completed successfully!', 'success');
            setTimeout(() => {
              el.uploadProgressPanel.classList.add('hidden');
            }, 800);

            if (data.files && data.files.length > 0) {
              openShareModal(data.files[0]);
            }
            loadUserFiles();
          } catch (e) {
            showToast('Upload completed', 'info');
          }
        } else {
          showToast('Upload failed. Please check connection and try again.', 'error');
          el.uploadProgressPanel.classList.add('hidden');
        }

        // Reset inputs
        el.inputFiles.value = '';
        el.inputZip.value = '';
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

      // Countdown Timer Logic
      const timerSeconds = parseInt(file.timerSeconds, 10) || 0;
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

    // If user is logged in and not on public download route, load files
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('d') && state.token) {
      loadUserFiles();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
