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

// ⚠️ IMPORTANT: NE PAS utiliser express.json() pour les requêtes avec FormData
// app.use(express.json()); // ❌ Supprimé car ça casse les FormData

// Logs pour debug
app.use((req, res, next) => {
    console.log(`🚀 Proxying ${req.method} ${req.path} -> https://app.veez.ai${req.path}`);
    console.log(`   Content-Type: ${req.headers['content-type'] || 'non défini'}`);
    if (req.headers.authorization) {
        console.log(`   Authorization: Bearer ${req.headers.authorization.substring(0, 20)}...`);
    }
    next();
});

// Configuration du proxy pour toutes les routes API
const proxyOptions = {
    target: 'https://app.veez.ai',
    changeOrigin: true,
    secure: true,
    timeout: 60000,
    proxyTimeout: 60000,
    followRedirects: true,
    onProxyReq: (proxyReq, req) => {
        console.log(`📤 Proxying to: https://app.veez.ai${req.url}`);
        
        // Transmettre les headers d'autorisation
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        
        // Pour les requêtes POST avec FormData, ne pas modifier le Content-Type
        // Le navigateur définit automatiquement le boundary pour multipart/form-data
        if (req.headers['content-type']) {
            proxyReq.setHeader('Content-Type', req.headers['content-type']);
        }
        
        // Nettoyer les headers problématiques
        proxyReq.removeHeader('host');
        proxyReq.removeHeader('origin');
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
        console.log(`   Response Content-Type: ${proxyRes.headers['content-type']}`);
        
        // Ajouter les headers CORS à la réponse
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    },
    onError: (err, req, res) => {
        console.error('❌ Proxy Error:', err.message);
        console.error('   Request:', req.method, req.path);
        console.error('   Headers:', req.headers);
        
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Erreur du serveur proxy',
                message: err.message,
                request: {
                    method: req.method,
                    path: req.path
                }
            });
        }
    }
};

// Proxy middleware pour toutes les routes /api/*
app.use('/api', createProxyMiddleware(proxyOptions));

// Route de test pour vérifier les endpoints
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai fonctionnel',
        timestamp: new Date().toISOString(),
        endpoints: {
            products: '/api/product/',
            templates: '/api/template/',
            predictions: '/api/prediction/ (POST avec FormData supporté)'
        },
        cors: 'Activé pour toutes les origines',
        formdata_support: 'Activé pour /api/prediction/'
    });
});

// Route de test spécifique pour l'endpoint prediction
app.get('/test-prediction', (req, res) => {
    res.json({
        endpoint: '/api/prediction/',
        method: 'POST',
        content_type: 'multipart/form-data',
        required_fields: {
            product_id: 'string (required)',
            prompt: 'string (required)', 
            aspect_ratio: 'string (required) - ex: 1:1, 16:9, etc.'
        },
        headers: {
            Authorization: 'Bearer YOUR_API_TOKEN'
        },
        curl_example: `curl -X POST ${req.get('host').includes('localhost') ? 'http' : 'https'}://${req.get('host')}/api/prediction/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "product_id=YOUR_PRODUCT_ID" \\
  -F "prompt=Une canette dans un bar" \\
  -F "aspect_ratio=1:1"`
    });
});

// Route pour afficher des informations sur le serveur
app.get('/', (req, res) => {
    const baseUrl = req.get('host').includes('localhost') 
        ? `http://${req.get('host')}`
        : `https://${req.get('host')}`;
    
    res.send(`
        <html>
        <head>
            <title>🚀 Serveur Proxy Veez.ai</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                h1 { color: #2563eb; }
                .endpoint { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 5px; }
                .status { color: #059669; }
                .warning { color: #dc2626; background: #fef2f2; padding: 10px; border-radius: 5px; margin: 10px 0; }
                pre { background: #374151; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1>🚀 Serveur Proxy Veez.ai</h1>
            <p class="status">✅ Le serveur proxy est opérationnel</p>
            
            <h2>Endpoints disponibles :</h2>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/product/ - Lister les produits</div>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/product/{id} - Détails d'un produit</div>
            <div class="endpoint"><strong>POST</strong> ${baseUrl}/api/prediction/ - <strong>Génération IA ✨</strong></div>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/prediction/ - Lister les prédictions</div>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/prediction/{id} - Détails d'une prédiction</div>
            
            <h2>Tests :</h2>
            <div class="endpoint"><strong>GET</strong> <a href="${baseUrl}/test">${baseUrl}/test</a> - Test général</div>
            <div class="endpoint"><strong>GET</strong> <a href="${baseUrl}/test-prediction">${baseUrl}/test-prediction</a> - Test endpoint prediction</div>
            
            <div class="warning">
                <strong>🎯 Configuration FormData :</strong><br>
                Ce serveur proxy est maintenant configuré pour supporter les requêtes POST avec FormData vers /api/prediction/.<br>
                ✅ express.json() désactivé<br>
                ✅ Headers FormData préservés<br>
                ✅ CORS configuré pour toutes origines
            </div>
            
            <h2>Exemple de test avec curl :</h2>
            <pre>curl -X POST ${baseUrl}/api/prediction/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "product_id=213104dcf..." \\
  -F "prompt=Une canette dans un bar" \\
  -F "aspect_ratio=1:1"</pre>
            
            <h2>Pour votre dashboard :</h2>
            <ol>
                <li>✅ Cochez "Utiliser le serveur proxy Render"</li>
                <li>✅ Cliquez sur "Tester l'API réelle" dans le générateur IA</li>
                <li>🎯 L'endpoint /api/prediction/ devrait maintenant fonctionner !</li>
            </ol>
            
            <h2>Status :</h2>
            <div class="status">✅ Express server running</div>
            <div class="status">✅ CORS enabled for all origins</div>
            <div class="status">✅ FormData support enabled</div>
            <div class="status">✅ All API routes proxied</div>
        </body>
        </html>
    `);
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log('🚀 Serveur Proxy Veez.ai démarré !');
    console.log(`📍 URL: ${baseUrl}`);
    console.log(`🔗 API Proxy: ${baseUrl}/api/`);
    console.log(`🎨 Génération IA: ${baseUrl}/api/prediction/`);
    console.log(`📝 Test: ${baseUrl}/test`);
    console.log('');
    console.log('🎯 Changements importants :');
    console.log('   ✅ Support FormData pour /api/prediction/');
    console.log('   ✅ express.json() désactivé');
    console.log('   ✅ Headers FormData préservés');
    console.log('   ✅ Timeouts augmentés (60s)');
    console.log('');
    console.log('📋 Test de l\'endpoint de génération IA :');
    console.log(`   curl -X POST ${baseUrl}/api/prediction/ \\`);
    console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('     -F "product_id=YOUR_PRODUCT_ID" \\');
    console.log('     -F "prompt=Une canette dans un bar" \\');
    console.log('     -F "aspect_ratio=1:1"');
    console.log('');
});
