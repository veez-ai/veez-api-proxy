const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Configuration CORS permissive
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));

// Logs simples
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path}`);
    next();
});

// ✅ Middleware pour parser le body JSON seulement pour POST /api/prediction
app.use('/api/prediction', express.json());

// ✅ SOLUTION CORRIGÉE : Gestion manuelle POST /api/prediction
app.post('/api/prediction', async (req, res) => {
    try {
        console.log(`→ Manual POST proxy to https://app.veez.ai/api/prediction`);
        
        // ✅ Le body est déjà parsé par express.json()
        const body = JSON.stringify(req.body);
        console.log(`📤 POST body: ${body}`);
        
        // Préparer les headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            'User-Agent': 'Veez-Proxy/1.0'
        };
        
        // Ajouter l'authorization
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
            console.log(`🔐 Auth forwarded`);
        }
        
        // Faire la requête vers Veez
        const response = await fetch('https://app.veez.ai/api/prediction', {
            method: 'POST',
            headers: headers,
            body: body
        });
        
        console.log(`← ${response.status} from Veez API`);
        
        // ✅ CORRECTION : Lire la réponse correctement
        const responseText = await response.text();
        console.log(`📥 Response body: ${responseText}`);
        console.log(`📥 Response length: ${responseText.length}`);
        
        // Headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        // Content-type de la réponse
        res.setHeader('Content-Type', 'application/json');
        
        // ✅ Envoyer la réponse avec le bon status et le body complet
        res.status(response.status).send(responseText);
        
    } catch (error) {
        console.error(`❌ Manual POST proxy error: ${error.message}`);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

// ✅ Proxy automatique pour TOUT LE RESTE (auth, GET, etc.)
const autoProxy = createProxyMiddleware({
    target: 'https://app.veez.ai',
    changeOrigin: true,
    secure: true,
    timeout: 120000,
    proxyTimeout: 120000,
    
    onProxyReq: (proxyReq, req) => {
        console.log(`→ Auto proxy ${req.method} https://app.veez.ai${req.url}`);
        
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
    },
    
    onProxyRes: (proxyRes, req) => {
        console.log(`← ${proxyRes.statusCode} for ${req.method} ${req.url}`);
        
        // Headers CORS
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With';
    },
    
    onError: (err, req, res) => {
        console.error(`❌ Auto proxy error: ${err.message}`);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy error', message: err.message });
        }
    }
});

// ✅ Routes utilitaires AVANT le proxy automatique
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Proxy Veez.ai HYBRIDE - Version qui marche !',
        timestamp: new Date().toISOString(),
        config: {
            manual: 'POST /api/prediction',
            auto: 'Tout le reste (auth, GET, etc.)'
        }
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Proxy Veez.ai HYBRIDE</h1>
        <p>✅ POST /api/prediction: Manuel (body complet)</p>
        <p>✅ Tout le reste: Proxy automatique (auth, GET, etc.)</p>
        <p>🔗 <a href="/test">Test JSON</a></p>
        <hr>
        <h3>📊 Status:</h3>
        <p>✅ Proxy hybride fonctionnel</p>
        <p>✅ Auth préservée</p>
        <p>✅ Body POST géré manuellement</p>
    `);
});

// Appliquer le proxy automatique SEULEMENT aux routes /api/* (pas à la racine)
app.use('/api', autoProxy);

// Démarrage
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Proxy Veez.ai HYBRIDE démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log('✅ POST /api/prediction: Manuel (body complet)');
    console.log('✅ Tout le reste: Proxy automatique (auth, GET, etc.)');
});
