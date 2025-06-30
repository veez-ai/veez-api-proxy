const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS permissif
app.use(cors());

// Parser JSON et form-urlencoded avec taille augmentée
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de debug
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
    status: 'Proxy Veez.ai OK FIXED', 
    time: new Date().toISOString(),
    tokenConfigured: !!VEEZ_TOKEN && VEEZ_TOKEN !== 'REMPLACEZ_PAR_VOTRE_TOKEN'
  });
});

// Proxy pour Veez.ai
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

    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      console.log('[PROXY] Processing POST with body');
      
      // Conversion en form-urlencoded
      const params = new URLSearchParams();
      Object.keys(req.body).forEach(key => {
        console.log(`[PROXY] Adding: ${key} = ${req.body[key]}`);
        params.append(key, req.body[key]);
      });
      
      body = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      
      console.log('[PROXY] Sending body:', body);
    } else if (req.method === 'POST') {
      console.log('[PROXY] POST without valid body');
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    console.log(`[PROXY] Response status: ${response.status}`);
    
    const data = await response.text();
    console.log(`[PROXY] Response preview: ${data.substring(0, 200)}...`);
    
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
  console.log(`🚀 Proxy Veez.ai FIXED sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
});
