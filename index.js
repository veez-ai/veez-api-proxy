const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');

const app = express();

// CORS complet
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin'
  ],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Headers CORS manuels
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// SOLUTION: Parser pour multipart/form-data
const upload = multer();

// Middleware conditionnel selon le Content-Type
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  console.log(`[PARSER] ${req.method} ${req.originalUrl}`);
  console.log('[PARSER] Content-Type:', contentType);
  
  if (contentType.includes('multipart/form-data')) {
    console.log('[PARSER] Using multer for multipart/form-data');
    upload.any()(req, res, next);
  } else if (contentType.includes('application/json')) {
    console.log('[PARSER] Using express.json()');
    express.json({ limit: '10mb' })(req, res, next);
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    console.log('[PARSER] Using express.urlencoded()');
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  } else {
    console.log('[PARSER] No specific parser, continuing...');
    next();
  }
});

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Content-Type:', req.headers['content-type']);
  console.log('[DEBUG] Body:', req.body);
  console.log('[DEBUG] Body keys:', Object.keys(req.body || {}));
  console.log('[DEBUG] Files:', req.files ? req.files.length : 0);
  next();
});

const VEEZ_TOKEN = process.env.VEEZ_TOKEN || '1e303a3204e2fe743513ddca0c4f31bc';

// Test du proxy
app.get('/', (req, res) => {
  res.json({ 
    status: 'Proxy Veez.ai MULTIPART SUPPORT', 
    time: new Date().toISOString(),
    tokenConfigured: !!VEEZ_TOKEN,
    supportedParsers: ['JSON', 'urlencoded', 'multipart/form-data']
  });
});

// Proxy pour Veez.ai avec support multipart
app.all('/api/*', async (req, res) => {
  const veezUrl = `https://app.veez.ai${req.originalUrl}`;
  
  console.log(`[PROXY] ${req.method} ${veezUrl}`);
  console.log('[PROXY] Body received:', req.body);
  console.log('[PROXY] Files received:', req.files ? req.files.length : 0);
  
  try {
    let body = null;
    let headers = {
      'Authorization': `Bearer ${VEEZ_TOKEN}`,
      'User-Agent': 'VeezProxy/1.0'
    };

    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('multipart/form-data') && req.body && Object.keys(req.body).length > 0) {
        console.log('[PROXY] Processing multipart/form-data as JSON');
        
        // Convertir les données multipart en JSON
        body = JSON.stringify(req.body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(body);
        
        console.log('[PROXY] Converted multipart to JSON:', body);
        
      } else if (req.body && Object.keys(req.body).length > 0) {
        console.log('[PROXY] Processing regular JSON body');
        
        body = JSON.stringify(req.body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(body);
        
        console.log('[PROXY] Sending JSON body:', body);
        
      } else {
        console.log('[PROXY] POST without valid body');
        console.log('[PROXY] Content-Type was:', contentType);
        console.log('[PROXY] req.body:', req.body);
        console.log('[PROXY] req.files:', req.files);
      }
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    console.log(`[PROXY] Veez response status: ${response.status}`);
    
    const data = await response.text();
    console.log(`[PROXY] Veez response: ${data.substring(0, 300)}...`);
    
    // Headers CORS sur la réponse
    res.header('Access-Control-Allow-Origin', '*');
    
    try {
      const jsonData = JSON.parse(data);
      res.status(response.status).json(jsonData);
    } catch {
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: error.message,
      url: veezUrl,
      method: req.method
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Veez.ai MULTIPART SUPPORT sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
  console.log(`📦 Parsers: JSON, urlencoded, multipart/form-data`);
});
