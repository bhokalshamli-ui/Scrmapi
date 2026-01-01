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

app.post('/api/scan/nikto', (req, res) => {
  const { target } = req.body;
  
  if (!target) {
    return res.status(400).json({ error: 'Target required' });
  }

  const scanId = Date.now();
  let output = '';

  const nikto = spawn('nikto', ['-h', target, '-Tuning', '1234567890']);
  
  nikto.stdout.on('data', (data) => {
    output += data.toString();
    io.emit('nikto-output', { scanId, data: data.toString() });
  });

  nikto.on('close', (code) => {
    io.emit('nikto-complete', { scanId, code, output });
  });

  res.json({ status: 'starting', scanId });
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
