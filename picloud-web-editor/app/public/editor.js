let currentFile = null;
let originalContent = '';

// Load file list
async function loadFileList() {
    const response = await fetch('/api/notes');
    const files = await response.json();
    
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.innerHTML = '<div style="opacity: 0.5; padding: 1rem;">No notes yet</div>';
        return;
    }
    
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.textContent = file;
        item.onclick = () => loadNote(file);
        fileList.appendChild(item);
    });
}

// Load specific note
async function loadNote(filename) {
    const response = await fetch(`/api/notes/${filename}`);
    const data = await response.json();
    
    currentFile = filename;
    originalContent = data.content;
    
    document.getElementById('editor').value = data.content;
    document.getElementById('current-file').textContent = filename;
    document.getElementById('save-btn').disabled = false;
    
    updatePreview();
    
    // Update active state
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.toggle('active', item.textContent === filename);
    });
}

// Update preview
function updatePreview() {
    const content = document.getElementById('editor').value;
    const preview = document.getElementById('preview');
    preview.innerHTML = marked.parse(content);
}

// Save note
async function saveNote() {
    if (!currentFile) return;
    
    const content = document.getElementById('editor').value;
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`/api/notes/${currentFile}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        const result = await response.json();
        
        originalContent = content;
        saveBtn.textContent = 'Saved ✓';
        
        // Update sync status after save
        setTimeout(updateSyncStatus, 1000);
        
        setTimeout(() => {
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
        }, 2000);
    } catch (error) {
        saveBtn.textContent = 'Error!';
        alert('Failed to save: ' + error.message);
        saveBtn.disabled = false;
    }
}

// Download entire vault
async function downloadVault() {
    const downloadBtn = document.getElementById('download-btn');
    const originalText = downloadBtn.textContent;
    
    try {
        downloadBtn.textContent = '⏳';
        downloadBtn.disabled = true;
        
        const response = await fetch('/api/download/vault');
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `obsidian-backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        downloadBtn.textContent = '✓';
        setTimeout(() => {
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }, 2000);
    } catch (error) {
        alert('Download failed: ' + error.message);
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    }
}

// Update sync status
async function updateSyncStatus() {
    try {
        const response = await fetch('/api/sync/status');
        const status = await response.json();
        
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const syncBtn = document.getElementById('sync-btn');
        
        indicator.className = 'status-indicator';
        
        if (status.laptopOnline) {
            indicator.classList.add('online');
            statusText.textContent = status.lastSyncTime 
                ? `Laptop online • Last sync: ${new Date(status.lastSyncTime).toLocaleTimeString()}`
                : 'Laptop online';
            syncBtn.disabled = false;
        } else {
            indicator.classList.add('offline');
            statusText.textContent = 'Laptop offline';
            syncBtn.disabled = true;
        }
    } catch (error) {
        const indicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        
        indicator.className = 'status-indicator checking';
        statusText.textContent = 'Status unknown';
    }
}

// Manual sync
async function manualSync() {
    const syncBtn = document.getElementById('sync-btn');
    const originalText = syncBtn.textContent;
    
    syncBtn.textContent = 'Syncing...';
    syncBtn.disabled = true;
    
    try {
        const response = await fetch('/api/sync/trigger', { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
            syncBtn.textContent = 'Synced ✓';
            updateSyncStatus();
        } else {
            syncBtn.textContent = 'Failed';
            alert(result.message);
        }
        
        setTimeout(() => {
            syncBtn.textContent = originalText;
            updateSyncStatus();
        }, 2000);
    } catch (error) {
        syncBtn.textContent = 'Error';
        alert('Sync failed: ' + error.message);
        setTimeout(() => {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }, 2000);
    }
}

// Event listeners
document.getElementById('editor').addEventListener('input', updatePreview);
document.getElementById('save-btn').addEventListener('click', saveNote);
document.getElementById('download-btn').addEventListener('click', downloadVault);
document.getElementById('sync-btn').addEventListener('click', manualSync);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNote();
    }
});

// Initial load
loadFileList();
updateSyncStatus();

// Update sync status every 30 seconds
setInterval(updateSyncStatus, 30000);
