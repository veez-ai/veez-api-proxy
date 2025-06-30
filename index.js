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

// ✅ GET générique avec routes dynamiques (ex: /api/product/xxx/)
app.get('/api/:endpoint(*)', async (req, res) => {
  const endpoint = req.params.endpoint;
  const response = await fetch(`${VEEZ_API_URL}/${endpoint}/`, {
    headers: forwardHeaders(),
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    res.status(response.status).json(data);
  } else {
    const text = await response.text();
    res.status(response.status).send(text);
  }
});

// ✅ POST générique (ex: /api/prediction)
app.post('/api/:endpoint(*)', upload.any(), async (req, res) => {
  const endpoint = req.params.endpoint;
  const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

  let body;
  let headers;

  if (isMultipart) {
    // Recréation d'un FormData si fichier(s)
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
    const response = await fetch(`${VEEZ_API_URL}/${endpoint}/`, {
      method: 'POST',
      body,
      headers,
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('[ERROR]', error);
    res.status(500).json({ error: 'Erreur lors de l’appel à l’API Veez' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy Veez en ligne sur http://localhost:${PORT}`);
});
