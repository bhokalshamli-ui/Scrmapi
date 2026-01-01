require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Serve static files
app.use(express.static('public'));

// API Routes
app.post('/api/scan/nmap', (req, res) => {
  const { target, options = '-sV -sC' } = req.body;
  
  if (!target) {
    return res.status(400).json({ error: 'Target required' });
  }

  res.json({ status: 'starting', scanId: Date.now() });

  const scan = spawn('nmap', [options, target]);
  let output = '';

  scan.stdout.on('data', (data) => {
    output += data.toString();
    io.emit('scan-output', { scanId: Date.now(), data: data.toString() });
  });

  scan.stderr.on('data', (data) => {
    io.emit('scan-error', { scanId: Date.now(), data: data.toString() });
  });

  scan.on('close', (code) => {
    io.emit('scan-complete', { scanId: Date.now(), code, output });
    res.json({ status: 'complete', output });
  });
});

// Replace the Nikto endpoint with Node.js web scanner
app.post('/api/scan/web', async (req, res) => {
  const { target } = req.body;
  
  if (!target.startsWith('http')) {
    return res.status(400).json({ error: 'URL must start with http:// or https://' });
  }

  res.json({ status: 'starting', scanId: Date.now() });

  try {
    const axios = require('axios');
    const response = await axios.get(target, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Pentest-Dashboard)'
      }
    });
    
    const scanResult = {
      status: 200,
      server: response.headers.server || 'Unknown',
      title: response.data.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'No title',
      vulnerabilities: [
        response.headers.server?.includes('nginx/1.14') && 'Outdated nginx detected',
        !response.headers['x-frame-options'] && 'Missing X-Frame-Options'
      ].filter(Boolean)
    };
    
    io.emit('web-scan-complete', scanResult);
    res.json(scanResult);
  } catch (error) {
    io.emit('web-scan-error', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'Nmap', description: 'Port scanner & service detection' },
      { name: 'Nikto', description: 'Web server scanner' },
      { name: 'Nuclei', description: 'Template-based vulnerability scanner' },
      { name: 'Dirsearch', description: 'Web path brute forcer' }
    ]
  });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve React-like SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Pentest Dashboard running on port ${PORT}`);
});
```__
