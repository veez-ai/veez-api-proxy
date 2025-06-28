const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

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
    if (req.headers.authorization) {
        console.log(`🔐 Auth: Bearer ...${req.headers.authorization.slice(-10)}`);
    }
    next();
});

// Configuration proxy SIMPLE
const proxy = createProxyMiddleware({
    target: 'https://app.veez.ai',
    changeOrigin: true,
    secure: true,
    timeout: 120000,
    proxyTimeout: 120000,
    
    onProxyReq: (proxyReq, req) => {
        console.log(`→ ${req.method} https://app.veez.ai${req.url}`);
        
        // Transmission de l'autorisation
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
    },
    
    onProxyRes: (proxyRes, req) => {
        console.log(`← ${proxyRes.statusCode} for ${req.method} ${req.url}`);
        
        // Headers CORS obligatoires
        proxyRes.headers['access-control-allow-origin'] = '*';
        proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With';
    },
    
    onError: (err, req, res) => {
        console.error(`❌ ${req.method} ${req.url}: ${err.message}`);
        if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy error', message: err.message });
        }
    }
});

// Routes avec proxy
app.use('/api', proxy);

// Routes utilitaires
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Proxy Veez.ai SIMPLE - Version qui marche',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Proxy Veez.ai SIMPLE</h1>
        <p>✅ Configuration minimale qui fonctionne</p>
        <p>🔗 <a href="/test">Test</a></p>
    `);
});

// Démarrage
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Proxy Veez.ai SIMPLE démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log('✅ Configuration minimale appliquée');
});
