const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS TRÈS EXPLICITE pour résoudre "Failed to fetch"
app.use(cors({
  origin: '*', // Autoriser TOUS les domaines
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  credentials: false,
  optionsSuccessStatus: 200
}));

// Headers CORS manuels en plus (double sécurité)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin');
  
  // Répondre aux requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Parser JSON avec debug
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Origin:', req.headers.origin);
  console.log('[DEBUG] Content-Type:', req.headers['content-type']);
  console.log('[DEBUG] Body:', req.body);
  console.log('[DEBUG] Body keys:', Object.keys(req.body));
  next();
});

const VEEZ_TOKEN = process.env.VEEZ_TOKEN || '1e303a3204e2fe743513ddca0c4f31bc';

// Test du proxy avec headers CORS explicites
app.get('/', (req, res) => {
  res.json({ 
    status: 'Proxy Veez.ai CORS FIXED', 
    time: new Date().toISOString(),
    tokenConfigured: !!VEEZ_TOKEN,
    corsEnabled: true,
    origin: req.headers.origin || 'no-origin'
  });
});

// Proxy pour Veez.ai avec CORS
app.all('/api/*', async (req, res) => {
  const veezUrl = `https://app.veez.ai${req.originalUrl}`;
  
  console.log(`[PROXY] ${req.method} ${veezUrl}`);
  console.log('[PROXY] Body received:', req.body);
  console.log('[PROXY] Origin:', req.headers.origin);
  
  try {
    let body = null;
    let headers = {
      'Authorization': `Bearer ${VEEZ_TOKEN}`,
      'User-Agent': 'VeezProxy/1.0'
    };

    // Envoyer en JSON (solution validée)
    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      console.log('[PROXY] Processing POST with JSON body');
      
      body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
      
      console.log('[PROXY] Sending JSON body:', body);
    } else if (req.method === 'POST') {
      console.log('[PROXY] POST without valid body - this should not happen');
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    console.log(`[PROXY] Veez response status: ${response.status}`);
    
    const data = await response.text();
    console.log(`[PROXY] Veez response: ${data.substring(0, 300)}...`);
    
    // Ajouter headers CORS à la réponse
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    try {
      const jsonData = JSON.parse(data);
      res.status(response.status).json(jsonData);
    } catch {
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[PROXY] Error:', error);
    
    // Headers CORS même en cas d'erreur
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    
    res.status(500).json({ 
      error: error.message,
      url: veezUrl,
      method: req.method,
      cors: 'enabled'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Veez.ai CORS FIXED sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
  console.log(`🔓 CORS: Complètement ouvert pour debug`);
});
