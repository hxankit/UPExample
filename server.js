const path = require('path');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const mkdirp = require('mkdirp');
const archiver = require('archiver');
const extract = require('extract-zip');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from build folder first (production), then public (development)
app.use(express.static(path.join(__dirname, 'build')));
app.use(express.static(path.join(__dirname, 'public')));

// PIN storage file
const PINS_FILE = path.join(__dirname, 'pins.json');

// Helper function to load PINs
function loadPins() {
  try {
    if (fs.existsSync(PINS_FILE)) {
      return JSON.parse(fs.readFileSync(PINS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading PINs:', err);
  }
  return {};
}

// Helper function to save PINs
function savePins(pins) {
  try {
    fs.writeFileSync(PINS_FILE, JSON.stringify(pins, null, 2));
    return true;
  } catch (err) {
    console.error('Error saving PINs:', err);
    return false;
  }
}

// Helper function to hash PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Helper function to get user directory based on PIN
function getUserDir(pin) {
  const hashedPin = hashPin(pin);
  return path.join(__dirname, 'uploads', hashedPin);
}

// PIN API endpoints
app.post('/api/pin/create', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters' });
    }

    const pins = loadPins();
    const hashedPin = hashPin(pin);

    if (pins[hashedPin]) {
      return res.status(400).json({ error: 'PIN already exists' });
    }

    pins[hashedPin] = { createdAt: new Date().toISOString() };
    savePins(pins);

    // Create user directory
    const userDir = getUserDir(pin);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    return res.json({ ok: true, message: 'PIN created successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create PIN' });
  }
});

app.post('/api/pin/verify', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }

    const pins = loadPins();
    const hashedPin = hashPin(pin);

    if (!pins[hashedPin]) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Create user directory if it doesn't exist
    const userDir = getUserDir(pin);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    return res.json({ ok: true, message: 'PIN verified' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// multer memory storage so we can write files respecting their relative paths
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload', upload.any(), async (req, res) => {
  try {
    const pin = req.body.pin;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Verify PIN
    const pins = loadPins();
    const hashedPin = hashPin(pin);
    if (!pins[hashedPin]) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const baseDir = getUserDir(pin);
    
    for (const file of req.files) {
      // Save all files directly in the root directory (flat structure)
      // For ZIP files, save them as-is without extraction
      // For single files, save them directly with their filename
      const fileName = file.originalname.replace(/^\/+/, '').split('/').pop(); // Get just the filename
      const destPath = path.join(baseDir, fileName);
      
      // If file already exists, add a timestamp to make it unique
      let finalPath = destPath;
      if (fs.existsSync(finalPath)) {
        const ext = path.extname(fileName);
        const name = path.basename(fileName, ext);
        finalPath = path.join(baseDir, `${name}-${Date.now()}${ext}`);
      }
      
      fs.writeFileSync(finalPath, file.buffer);
    }

    return res.json({ ok: true, files: req.files.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});


// Helper to list only files in the root directory (flat structure, no subdirectories)
function listFiles(dir, baseDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    // Only include files, skip directories
    if (it.isFile()) {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      results.push(rel);
    }
  }
  return results;
}

// Return JSON list of uploaded files with URLs
app.get('/api/files', (req, res) => {
  try {
    const pin = req.query.pin;
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Verify PIN
    const pins = loadPins();
    const hashedPin = hashPin(pin);
    if (!pins[hashedPin]) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const baseDir = getUserDir(pin);
    const files = listFiles(baseDir, baseDir);
    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.protocol || 'http';
    const items = files.map(p => ({ path: p, url: `${protocol}://${host}/api/uploads/${hashedPin}/${encodeURI(p)}` }));
    res.json({ ok: true, files: items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Secure download endpoint: ?path=relative/path/to/file&pin=xxx
app.get('/api/download', (req, res) => {
  try {
    const pin = req.query.pin;
    const rel = req.query.path;
    
    if (!pin) return res.status(400).send('PIN is required');
    if (!rel) return res.status(400).send('Missing path query');

    // Verify PIN
    const pins = loadPins();
    const hashedPin = hashPin(pin);
    if (!pins[hashedPin]) {
      return res.status(401).send('Invalid PIN');
    }

    // Prevent path traversal
    const safe = path.normalize(rel).replace(/^([\\/]+)|([\\/]+)$/g, '');
    const baseDir = getUserDir(pin);
    const full = path.join(baseDir, safe);
    
    if (!full.startsWith(baseDir)) return res.status(400).send('Invalid path');
    if (!fs.existsSync(full)) return res.status(404).send('Not found');

    // Since we only store files (flat structure), just download the file directly
    // If it's a directory (shouldn't happen, but keep for safety), create a zip
    if (fs.statSync(full).isDirectory()) {
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Set the filename to download
      res.attachment(`${path.basename(safe)}.zip`);
      
      // Pipe archive data to the response
      archive.pipe(res);
      
      // Add the folder content to the archive
      archive.directory(full, path.basename(safe));
      
      // Finalize the archive
      archive.finalize();
      
      return;
    }

    // Download the file directly
    res.download(full);
  } catch (err) {
    console.error(err);
    res.status(500).send('Download failed');
  }
});

// Delete endpoint for files and folders
app.delete('/api/delete', async (req, res) => {
  try {
    const pin = req.query.pin;
    const rel = req.query.path;
    
    if (!pin) return res.status(400).json({ error: 'PIN is required' });
    if (!rel) return res.status(400).json({ error: 'Missing path query' });

    // Verify PIN
    const pins = loadPins();
    const hashedPin = hashPin(pin);
    if (!pins[hashedPin]) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    // Prevent path traversal
    const safe = path.normalize(rel).replace(/^([\\/]+)|([\\/]+)$/g, '');
    const baseDir = getUserDir(pin);
    const full = path.join(baseDir, safe);
    
    if (!full.startsWith(baseDir)) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    
    if (!fs.existsSync(full)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (fs.statSync(full).isDirectory()) {
      // Remove directory and all contents
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      // Remove single file
      fs.unlinkSync(full);
    }

    res.json({ ok: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// Download all files as ZIP
app.get('/api/download-all', (req, res) => {
  try {
    const pin = req.query.pin;
    if (!pin) return res.status(400).send('PIN is required');

    // Verify PIN
    const pins = loadPins();
    const hashedPin = hashPin(pin);
    if (!pins[hashedPin]) {
      return res.status(401).send('Invalid PIN');
    }

    const baseDir = getUserDir(pin);
    
    if (!fs.existsSync(baseDir)) {
      return res.status(404).send('No files found');
    }

    // Check if directory is empty
    const files = listFiles(baseDir, baseDir);
    if (files.length === 0) {
      return res.status(404).send('No files to download');
    }

    // Create a zip file with all files
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Set the filename to download
    res.attachment('all-files.zip');
    
    // Pipe archive data to the response
    archive.pipe(res);
    
    // Add all files and directories to the archive
    archive.directory(baseDir, false);
    
    // Finalize the archive
    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).send('Download failed');
  }
});

// Serve uploaded files (protected by PIN hash in path)
app.get('/api/uploads/:hashedPin/*', (req, res) => {
  try {
    const hashedPin = req.params.hashedPin;
    const filePath = req.params[0];
    
    // Find the PIN that matches this hash
    const pins = loadPins();
    const pinEntry = Object.keys(pins).find(p => p === hashedPin);
    
    if (!pinEntry) {
      return res.status(404).send('File not found');
    }

    const baseDir = path.join(__dirname, 'uploads', hashedPin);
    const fullPath = path.join(baseDir, filePath);
    
    if (!fullPath.startsWith(baseDir)) {
      return res.status(400).send('Invalid path');
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('File not found');
    }

    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error serving file');
  }
});

// Serve React app for all other routes (after API routes and static files)
// Express static middleware handles /static/* files, so this only matches unmatched routes
app.get('*', (req, res) => {
  // Try to serve from build folder first (production), fallback to public (development)
  const buildPath = path.join(__dirname, 'build', 'index.html');
  const publicPath = path.join(__dirname, 'public', 'index.html');
  
  if (fs.existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else if (fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
  } else {
    res.status(404).send('React app not found. Please run "npm run build" first.');
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  
  // Check if build folder exists
  const buildPath = path.join(__dirname, 'build');
  if (fs.existsSync(buildPath)) {
    console.log('✓ Serving React app from build folder');
  } else {
    console.log('⚠ Build folder not found. Run "npm run build" to create it.');
    console.log('⚠ Falling back to public folder (development mode)');
  }
});
