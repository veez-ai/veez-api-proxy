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

// Logs pour debug
app.use((req, res, next) => {
    console.log(`🚀 Proxying ${req.method} ${req.path} -> https://app.veez.ai${req.path}`);
    if (req.headers.authorization) {
        console.log(`   Authorization: Bearer ${req.headers.authorization.substring(0, 20)}...`);
    }
    next();
});

// Configuration du proxy corrigée
const createProxy = (additionalOptions = {}) => {
    return createProxyMiddleware({
        target: 'https://app.veez.ai',
        changeOrigin: true,
        secure: true,
        timeout: 60000,
        proxyTimeout: 60000,
        // ✅ CORRECTION : Laisser http-proxy-middleware gérer le body automatiquement
        onProxyReq: (proxyReq, req) => {
            // S'assurer que les headers sont bien transmis
            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // ❌ ENLEVER le proxyReq.write() qui corrompait les réponses
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
            
            // Debug pour les POST
            if (req.method === 'POST') {
                console.log(`   Content-Length: ${proxyRes.headers['content-length']}`);
                console.log(`   Content-Type: ${proxyRes.headers['content-type']}`);
            }
        },
        onError: (err, req, res) => {
            console.error('❌ Proxy Error:', err.message);
            res.status(500).json({
                error: 'Erreur du serveur proxy',
                message: err.message
            });
        },
        ...additionalOptions
    });
};

// Middleware pour parser le JSON SEULEMENT pour certaines routes
app.use('/api/prediction', express.json());
app.use('/api/product', express.json());

// ========== ROUTES PREDICTIONS ==========
app.use('/api/prediction', createProxy());

// ========== ROUTES PRODUCTS ==========
app.use('/api/product', createProxy());

// ========== ROUTES TEMPLATES ==========
app.use('/api/template', createProxy());

// ========== ROUTES GÉNÉRIQUES ==========
app.use('/api', createProxy());

// ========== ROUTES UTILITAIRES ==========
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai fonctionnel - VERSION CORRIGÉE',
        timestamp: new Date().toISOString(),
        fixes: [
            '✅ Suppression du proxyReq.write() qui corrompait les POST',
            '✅ Gestion automatique du body par http-proxy-middleware',
            '✅ Debug amélioré pour les réponses POST'
        ]
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Serveur Proxy Veez.ai - VERSION CORRIGÉE</h1>
        <p>✅ Le bug des requêtes POST a été corrigé</p>
        <p>🔗 Test: <a href="/test">/test</a></p>
    `);
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Serveur Proxy Veez.ai CORRIGÉ démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log('✅ Bug POST corrigé - suppression de proxyReq.write()');
});
