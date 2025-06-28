const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

// Configuration CORS permissive pour le développement
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));

// ✅ AJOUT : Debug middleware AVANT le parsing
app.use((req, res, next) => {
    console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`🔍 Headers:`, req.headers);
    console.log(`🔍 Content-Length:`, req.headers['content-length']);
    next();
});

// ❌ ENLEVER : Ne pas parser le JSON ici, laisser le proxy le faire
// app.use('/api/prediction', express.json());
// app.use('/api/product', express.json());

// Configuration du proxy corrigée
const createProxy = (additionalOptions = {}) => {
    return createProxyMiddleware({
        target: 'https://app.veez.ai',
        changeOrigin: true,
        secure: true,
        timeout: 120000,        // ✅ 2 minutes
        proxyTimeout: 120000,   // ✅ 2 minutes
        onProxyReq: (proxyReq, req) => {
            console.log(`📤 Proxying to: https://app.veez.ai${req.path}`);
            
            // S'assurer que les headers sont bien transmis
            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            
            // ✅ Debug pour POST
            if (req.method === 'POST') {
                console.log(`📦 POST body size: ${req.headers['content-length']} bytes`);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
            console.log(`📥 Response headers:`, proxyRes.headers);
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy Error:', err.message);
            console.error('❌ Error code:', err.code);
            res.status(500).json({
                error: 'Erreur du serveur proxy',
                message: err.message,
                code: err.code
            });
        },
        ...additionalOptions
    });
};

// ========== ROUTES DIRECTES (sans parsing JSON préalable) ==========
app.use('/api/prediction', createProxy());
app.use('/api/product', createProxy());
app.use('/api/template', createProxy());
app.use('/api', createProxy());

// ========== ROUTES UTILITAIRES ==========
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai - VERSION DEBUG',
        timestamp: new Date().toISOString(),
        fixes: [
            '✅ Suppression du double parsing JSON',
            '✅ Logs de debug détaillés',
            '✅ Timeout augmenté à 2 minutes'
        ]
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Serveur Proxy Veez.ai - VERSION DEBUG</h1>
        <p>✅ Double parsing JSON corrigé</p>
        <p>🔗 Test: <a href="/test">/test</a></p>
    `);
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Serveur Proxy Veez.ai DEBUG démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log('✅ Double parsing JSON corrigé');
});
