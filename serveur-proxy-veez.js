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

// ✅ Debug middleware détaillé
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`🔍 [${timestamp}] ${req.method} ${req.path}`);
    console.log(`🔍 Headers:`, {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
        'authorization': req.headers.authorization ? `Bearer ${req.headers.authorization.substring(7, 27)}...` : 'None'
    });
    
    if (req.method === 'POST') {
        console.log(`📦 POST request detected`);
        console.log(`📦 Content-Length: ${req.headers['content-length']} bytes`);
        console.log(`📦 Content-Type: ${req.headers['content-type']}`);
    }
    
    next();
});

// Configuration du proxy corrigée pour gérer les réponses vides
const createProxy = (additionalOptions = {}) => {
    return createProxyMiddleware({
        target: 'https://app.veez.ai',
        changeOrigin: true,
        secure: true,
        timeout: 180000,        // 3 minutes
        proxyTimeout: 180000,   // 3 minutes
        
        // ✅ Configuration pour les buffers de réponse
        buffer: true,
        
        onProxyReq: (proxyReq, req, res) => {
            console.log(`📤 Proxying ${req.method} to: https://app.veez.ai${req.path}`);
            
            // Transmission des headers d'autorisation
            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
                console.log(`🔐 Authorization header transmitted`);
            }
            
            // Headers additionnels pour assurer la transmission
            proxyReq.setHeader('User-Agent', 'Veez-Proxy/1.0');
            proxyReq.setHeader('Accept', 'application/json');
            
            if (req.method === 'POST') {
                console.log(`📤 POST body being transmitted...`);
                if (req.headers['content-type']) {
                    proxyReq.setHeader('Content-Type', req.headers['content-type']);
                }
                if (req.headers['content-length']) {
                    proxyReq.setHeader('Content-Length', req.headers['content-length']);
                }
            }
        },
        
        onProxyRes: (proxyRes, req, res) => {
            const timestamp = new Date().toISOString();
            console.log(`✅ [${timestamp}] Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
            console.log(`📥 Response headers:`, {
                'content-type': proxyRes.headers['content-type'],
                'content-length': proxyRes.headers['content-length'],
                'cache-control': proxyRes.headers['cache-control']
            });
            
            // ✅ CORRECTION : S'assurer que les headers CORS sont bien définis
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
            
            // ✅ DEBUG pour POST : Logger le contenu de la réponse
            if (req.method === 'POST') {
                let responseBody = '';
                
                proxyRes.on('data', (chunk) => {
                    responseBody += chunk.toString();
                });
                
                proxyRes.on('end', () => {
                    console.log(`📥 Complete response body for POST:`, responseBody);
                    console.log(`📥 Response body length: ${responseBody.length}`);
                });
            }
        },
        
        onError: (err, req, res) => {
            const timestamp = new Date().toISOString();
            console.error(`❌ [${timestamp}] Proxy Error:`, {
                message: err.message,
                code: err.code,
                method: req.method,
                path: req.path
            });
            
            // Éviter les double responses
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Erreur du serveur proxy',
                    message: err.message,
                    code: err.code,
                    timestamp: timestamp
                });
            }
        },
        
        // ✅ Configuration pour gérer les réponses de différents types
        pathRewrite: {
            // Pas de réécriture, on garde les paths tels quels
        },
        
        ...additionalOptions
    });
};

// ========== ROUTES AVEC PROXY ==========
// IMPORTANT : Ne pas utiliser express.json() avant le proxy !

// Route pour les prédictions
app.use('/api/prediction', createProxy());

// Route pour les produits  
app.use('/api/product', createProxy());

// Route pour les templates
app.use('/api/template', createProxy());

// Route générique pour autres endpoints API
app.use('/api', createProxy());

// ========== ROUTES UTILITAIRES ==========
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai - VERSION FINALE CORRIGÉE',
        timestamp: new Date().toISOString(),
        version: '3.0',
        fixes: [
            '✅ Suppression complète du double parsing JSON',
            '✅ Configuration buffer optimisée pour réponses',
            '✅ Headers CORS explicitement définis',
            '✅ Debug détaillé des réponses POST',
            '✅ Timeout augmenté à 3 minutes',
            '✅ Gestion d\'erreur améliorée'
        ],
        endpoints: [
            '/api/prediction - Gestion des prédictions IA',
            '/api/product - Gestion des produits',
            '/api/template - Gestion des templates',
            '/test - Test de fonctionnement'
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        version: '3.0'
    });
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Veez.ai Proxy Server</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .status { color: #28a745; font-weight: bold; }
                .endpoint { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #007bff; }
                .fix { color: #28a745; margin: 5px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Serveur Proxy Veez.ai</h1>
                <p class="status">✅ VERSION FINALE CORRIGÉE - Fonctionnel</p>
                
                <h3>🔧 Corrections appliquées :</h3>
                <div class="fix">✅ Suppression du double parsing JSON</div>
                <div class="fix">✅ Configuration buffer optimisée</div>
                <div class="fix">✅ Headers CORS explicites</div>
                <div class="fix">✅ Debug complet des POST</div>
                <div class="fix">✅ Timeout 3 minutes</div>
                
                <h3>🌐 Endpoints disponibles :</h3>
                <div class="endpoint"><strong>/api/prediction</strong> - Création et gestion des prédictions IA</div>
                <div class="endpoint"><strong>/api/product</strong> - Gestion des produits 3D</div>
                <div class="endpoint"><strong>/api/template</strong> - Gestion des templates</div>
                <div class="endpoint"><strong>/test</strong> - Test de fonctionnement JSON</div>
                <div class="endpoint"><strong>/health</strong> - Status du serveur</div>
                
                <p><small>Version 3.0 - ${new Date().toISOString()}</small></p>
            </div>
        </body>
        </html>
    `);
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
    console.log(`❌ Route non trouvée: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Route non trouvée',
        method: req.method,
        path: req.originalUrl,
        availableEndpoints: [
            '/api/prediction',
            '/api/product', 
            '/api/template',
            '/test',
            '/health'
        ]
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    if (!res.headersSent) {
        res.status(500).json({
            error: 'Erreur interne du serveur',
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log('🚀 Serveur Proxy Veez.ai VERSION FINALE démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log('✅ Toutes les corrections appliquées');
    console.log('✅ Prêt pour les requêtes POST et GET');
    console.log('==========================================');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM reçu, arrêt propre du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT reçu, arrêt propre du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});
