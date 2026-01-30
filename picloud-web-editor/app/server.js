const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');
const util = require('util');
const archiver = require('archiver');

const execPromise = util.promisify(exec);
const app = express();
const PORT = 3000;
const NOTES_DIR = process.env.NOTES_DIR || '/data/notes';

app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString(),
        notesDir: NOTES_DIR
    });
});

// List all markdown files
app.get('/api/notes', async (req, res) => {
    try {
        const files = await getMarkdownFiles(NOTES_DIR);
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific note content
app.get('/api/notes/*', async (req, res) => {
    try {
        const notePath = path.join(NOTES_DIR, req.params[0]);
        const content = await fs.readFile(notePath, 'utf-8');
        const stats = await fs.stat(notePath);
        res.json({ 
            content, 
            path: req.params[0],
            modified: stats.mtime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save note
app.post('/api/notes/*', async (req, res) => {
    try {
        const notePath = path.join(NOTES_DIR, req.params[0]);
        await fs.writeFile(notePath, req.body.content, 'utf-8');
        
        // Trigger smart sync (non-blocking)
        syncToLaptopSmart().catch(err => 
            console.log('Background sync failed (laptop may be offline):', err.message)
        );
        
        res.json({ 
            success: true, 
            message: 'Note saved',
            syncAttempted: true
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download entire vault as ZIP
app.get('/api/download/vault', async (req, res) => {
    try {
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Set headers for download
        res.attachment('obsidian-vault-backup.zip');
        archive.pipe(res);

        // Add all files from notes directory
        archive.directory(NOTES_DIR, false);

        await archive.finalize();
        
        console.log('Vault downloaded:', archive.pointer() + ' bytes');
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get sync status
app.get('/api/sync/status', async (req, res) => {
    const laptopAvailable = await checkLaptopAvailable();
    const lastSync = await getLastSyncTime();
    
    res.json({
        laptopOnline: laptopAvailable,
        lastSyncTime: lastSync,
        syncEnabled: !!process.env.LAPTOP_HOST
    });
});

// Manual sync trigger
app.post('/api/sync/trigger', async (req, res) => {
    try {
        const available = await checkLaptopAvailable();
        
        if (!available) {
            return res.json({
                success: false,
                message: 'Laptop is not available'
            });
        }
        
        await syncToLaptop();
        await setLastSyncTime();
        
        res.json({
            success: true,
            message: 'Synced to laptop successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Recursive function to get all markdown files
async function getMarkdownFiles(dir, fileList = [], baseDir = dir) {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
        const filePath = path.join(dir, file.name);
        
        if (file.isDirectory() && !file.name.startsWith('.')) {
            await getMarkdownFiles(filePath, fileList, baseDir);
        } else if (file.name.endsWith('.md')) {
            const relativePath = path.relative(baseDir, filePath);
            fileList.push(relativePath);
        }
    }
    
    return fileList.sort();
}

// Check if laptop is reachable
async function checkLaptopAvailable() {
    const laptopHost = process.env.LAPTOP_HOST;
    
    if (!laptopHost) {
        return false;
    }
    
    try {
        // Try SSH connection with 5 second timeout
        const cmd = `timeout 5 ssh -o ConnectTimeout=3 -o BatchMode=yes ${process.env.LAPTOP_USER}@${laptopHost} exit`;
        await execPromise(cmd);
        return true;
    } catch (error) {
        return false;
    }
}

// Smart sync - only sync if laptop is available
async function syncToLaptopSmart() {
    const available = await checkLaptopAvailable();
    
    if (!available) {
        console.log('Laptop not available, skipping sync');
        return false;
    }
    
    await syncToLaptop();
    await setLastSyncTime();
    return true;
}

// Sync notes to laptop
async function syncToLaptop() {
    const laptopUser = process.env.LAPTOP_USER;
    const laptopHost = process.env.LAPTOP_HOST;
    const laptopPath = process.env.LAPTOP_PATH;
    
    if (!laptopUser || !laptopHost || !laptopPath) {
        throw new Error('Laptop sync not configured');
    }
    
    const cmd = `rsync -avz --timeout=30 --delete ${NOTES_DIR}/ ${laptopUser}@${laptopHost}:${laptopPath}/`;
    const { stdout } = await execPromise(cmd);
    console.log('Synced to laptop:', stdout.trim());
}

// Track last sync time
const SYNC_TIME_FILE = '/tmp/last-sync-time.txt';

async function setLastSyncTime() {
    await fs.writeFile(SYNC_TIME_FILE, new Date().toISOString());
}

async function getLastSyncTime() {
    try {
        const time = await fs.readFile(SYNC_TIME_FILE, 'utf-8');
        return time.trim();
    } catch {
        return null;
    }
}

// Watch for file changes and auto-sync
const watcher = chokidar.watch(NOTES_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true
});

let syncTimeout;
watcher.on('all', (event, filepath) => {
    console.log(`File ${event}: ${filepath}`);
    
    // Debounce syncs (wait 10 seconds after last change)
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToLaptopSmart().catch(err => 
            console.log('Auto-sync skipped:', err.message)
        );
    }, 10000);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Obsidian Web Editor running on port ${PORT}`);
    console.log(`Notes directory: ${NOTES_DIR}`);
    console.log(`Access from any Tailscale device: http://100.x.x.x:${PORT}`);
});
