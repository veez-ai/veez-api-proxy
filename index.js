const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const upload = multer();

const VEEZ_API_URL = 'https://app.veez.ai/api';
const VEEZ_TOKEN = process.env.VEEZ_TOKEN;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de debug
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Headers communs avec token sécurisé
function forwardHeaders() {
  return {
    Authorization: `Bearer ${VEEZ_TOKEN}`,
  };
}

// ✅ Fonction pour déterminer si un endpoint doit avoir un slash final
function shouldHaveTrailingSlash(endpoint) {
  // Endpoints qui DOIVENT avoir un slash final (collections)
  const trailingSlashEndpoints = [
    'product',
    'template', 
    'prediction'
  ];
  
  // Si l'endpoint est exactement un de ces mots (pas d'ID après)
  return trailingSlashEndpoints.includes(endpoint.split('/')[0]) && 
         endpoint.split('/').length === 1;
}

// ✅ Fonction helper pour parser JSON en sécurité
async function safeJsonParse(response) {
  const text = await response.text();
  
  if (!text || text.trim() === '') {
    console.warn('⚠️ Empty response from Veez.ai API');
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error('❌ Failed to parse JSON response:', parseError);
    console.log('Raw response:', text.substring(0, 200));
    throw new Error(`Invalid JSON response: ${parseError.message}`);
  }
}

// ✅ GET générique avec gestion intelligente du slash final
app.get('/api/:endpoint(*)', async (req, res) => {
  const endpoint = req.params.endpoint;
  
  // ✅ Construire l'URL correcte selon le type d'endpoint
  const hasTrailingSlash = shouldHaveTrailingSlash(endpoint);
  const veezUrl = `${VEEZ_API_URL}/${endpoint}${hasTrailingSlash ? '/' : ''}`;
  
  console.log(`📡 GET ${endpoint} -> ${veezUrl}`);
  
  try {
    const response = await fetch(veezUrl, {
      headers: forwardHeaders(),
    });

    console.log(`📊 Response status: ${response.status}`);

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await safeJsonParse(response);
        
        if (data === null) {
          return res.status(404).json({ 
            error: 'Resource not found or empty response',
            endpoint: endpoint,
            url: veezUrl
          });
        }
        
        res.status(response.status).json(data);
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        res.status(502).json({ 
          error: 'Invalid response format from upstream API',
          details: jsonError.message,
          url: veezUrl 
        });
      }
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (networkError) {
    console.error('❌ Network error:', networkError);
    res.status(500).json({ 
      error: 'Failed to contact upstream API',
      message: networkError.message,
      url: veezUrl 
    });
  }
});

// ✅ POST générique avec gestion du slash final
app.post('/api/:endpoint(*)', upload.any(), async (req, res) => {
  const endpoint = req.params.endpoint;
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  // ✅ Construire l'URL correcte (POST endpoints ont généralement un slash)
  const veezUrl = `${VEEZ_API_URL}/${endpoint}/`;
  console.log(`📡 POST ${endpoint} -> ${veezUrl}`);

  let body;
  let headers;

  if (isMultipart) {
    const form = new FormData();
    for (const key in req.body) form.append(key, req.body[key]);
    for (const file of req.files) {
      form.append(file.fieldname, file.buffer, file.originalname);
    }

    body = form;
    headers = {
      ...forwardHeaders(),
      ...form.getHeaders(),
    };
  } else {
    body = JSON.stringify(req.body);
    headers = {
      ...forwardHeaders(),
      'Content-Type': 'application/json',
    };
  }

  try {
    const response = await fetch(veezUrl, {
      method: 'POST',
      body,
      headers,
    });

    console.log(`📊 Response status: ${response.status}`);

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await safeJsonParse(response);
        
        if (data === null) {
          return res.status(502).json({ 
            error: 'Empty response from upstream API',
            endpoint: endpoint,
            url: veezUrl 
          });
        }
        
        res.status(response.status).json(data);
      } catch (jsonError) {
        console.error('JSON parsing failed:', jsonError);
        res.status(502).json({ 
          error: 'Invalid response format from upstream API',
          details: jsonError.message,
          url: veezUrl 
        });
      }
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('❌ POST Error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message,
      url: veezUrl 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy Veez en ligne sur http://localhost:${PORT}`);
  console.log(`🔑 Token configuré: ${VEEZ_TOKEN ? 'OUI' : 'NON'}`);
});
