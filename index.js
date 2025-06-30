const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS permissif
app.use(cors());

// Parser JSON avec debug
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Body:', req.body);
  console.log('[DEBUG] Body keys:', Object.keys(req.body));
  next();
});

const VEEZ_TOKEN = process.env.VEEZ_TOKEN || '1e303a3204e2fe743513ddca0c4f31bc';

// Test du proxy
app.get('/', (req, res) => {
  res.json({ 
    status: 'Proxy Veez.ai FINAL - JSON FORMAT', 
    time: new Date().toISOString(),
    tokenConfigured: !!VEEZ_TOKEN
  });
});

// Proxy pour Veez.ai - SOLUTION FINALE
app.all('/api/*', async (req, res) => {
  const veezUrl = `https://app.veez.ai${req.originalUrl}`;
  
  console.log(`[PROXY] ${req.method} ${veezUrl}`);
  console.log('[PROXY] Body received:', req.body);
  
  try {
    let body = null;
    let headers = {
      'Authorization': `Bearer ${VEEZ_TOKEN}`,
      'User-Agent': 'VeezProxy/1.0'
    };

    // SOLUTION: Envoyer en JSON au lieu de form-urlencoded
    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      console.log('[PROXY] Processing POST with JSON body');
      
      // ✅ CORRECTION: JSON au lieu de URLSearchParams
      body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
      
      console.log('[PROXY] Sending JSON body:', body);
    } else if (req.method === 'POST') {
      console.log('[PROXY] POST without valid body');
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    console.log(`[PROXY] Veez response status: ${response.status}`);
    
    const data = await response.text();
    console.log(`[PROXY] Veez response: ${data.substring(0, 300)}...`);
    
    try {
      const jsonData = JSON.parse(data);
      res.status(response.status).json(jsonData);
    } catch {
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('[PROXY] Error:', error);
    res.status(500).json({ 
      error: error.message,
      url: veezUrl,
      method: req.method
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Veez.ai FINAL JSON sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
});
