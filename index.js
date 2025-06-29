const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VEEZ_TOKEN = process.env.VEEZ_TOKEN || '1e303a3204e2fe743513ddca0c4f31bc';

app.get('/', (req, res) => {
  res.json({ 
    status: 'Proxy Veez.ai OK', 
    time: new Date().toISOString(),
    tokenConfigured: !!VEEZ_TOKEN && VEEZ_TOKEN !== 'REMPLACEZ_PAR_VOTRE_TOKEN'
  });
});

app.all('/api/*', async (req, res) => {
  const veezUrl = `https://app.veez.ai${req.originalUrl}`;
  
  console.log(`${req.method} ${veezUrl}`);
  console.log('Body:', req.body);
  
  try {
    let body = null;
    let headers = {
      'Authorization': `Bearer ${VEEZ_TOKEN}`,
      'User-Agent': 'VeezProxy/1.0'
    };

    if (req.method === 'POST' && req.body) {
      const params = new URLSearchParams();
      Object.keys(req.body).forEach(key => {
        params.append(key, req.body[key]);
      });
      body = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await fetch(veezUrl, {
      method: req.method,
      headers: headers,
      body: body
    });

    const data = await response.text();
    
    try {
      const jsonData = JSON.parse(data);
      res.status(response.status).json(jsonData);
    } catch {
      res.status(response.status).send(data);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: error.message,
      url: veezUrl,
      method: req.method
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Proxy Veez.ai sur port ${PORT}`);
  console.log(`📝 Token: ${VEEZ_TOKEN ? 'Configuré' : 'MANQUANT'}`);
});
