const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS permissif
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

// CRUCIAL: Augmenter la taille limite et bien parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de debug pour voir ce qui arrive
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.originalUrl}`);
  console.log('[DEBUG] Headers:', req.headers);
  console.log('[DEBUG] Body:', req.body);
  console.log('[DEBUG] Body type:', typeof req.body);
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

// Proxy pour Veez.ai avec gestion améliorée du body
app.all('/api/*', async (req, res) => {
  const veezUrl = `https://app.veez.ai${req.originalUrl}`;
  
  console.log(`[PROXY] ${req.method} ${veezUrl}`);
  console.log('[PROXY] Received body:', req.body);
  
  try {
    let body = null;
    let headers = {
      'Authorization': `Bearer ${VEEZ_TOKEN}`,
      'User-Agent': 'VeezProxy/1.0'
    };

    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      console.log('[PROXY] Processing POST with body:', req.body);
      
      // Méthode 1: Essayer form-urlencoded d'abord
      const params = new URLSearchParams();
      Object.keys(req.body).forEach(key => {
        console.log(`[PROXY] Adding param: ${key} = ${req.body[key]}`);
        params.append(key, req.body[key]);
      });
      
      body = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      
      console.log('[PROXY] Sending body as form-urlencoded:', body);
    } else if (req.method === 'POST') {
      console.log('[PROXY] POST without body or empty body');
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    console.log(`[PROXY] Veez response status: ${response.status}`);
    
    const data = await response.text();
    console.log(`[PROXY] Veez response body: ${data.substring(0, 200)}...`);
    
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
      method: req.method,
      receivedBody: req.body
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Veez.ai FIXED sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
});

// ALTERNATIVE: Si le problème persiste, essayer cette version avec raw body
/*
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// Parser le body comme texte brut puis le convertir
app.use('/api/*', express.text({ type: '*/*' }), (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      console.log('Body is not JSON:', req.body);
    }
  }
  next();
});

// Le reste du code...
*/
