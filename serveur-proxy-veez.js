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

// Middleware pour parser le JSON
app.use(express.json());

// Logs pour debug
app.use((req, res, next) => {
    console.log(`🚀 Proxying ${req.method} ${req.path} -> https://app.veez.ai${req.path}`);
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
    timeout: 30000,
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req) => {
        // S'assurer que les headers sont bien transmis
        if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
        }
        proxyReq.setHeader('Content-Type', 'application/json');
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Response ${proxyRes.statusCode} for ${req.path}`);
    },
    onError: (err, req, res) => {
        console.error('❌ Proxy Error:', err.message);
        res.status(500).json({
            error: 'Erreur du serveur proxy',
            message: err.message
        });
    }
};

// Proxy middleware pour toutes les routes /api/*
app.use('/api', createProxyMiddleware(proxyOptions));

// Route de test
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai fonctionnel',
        timestamp: new Date().toISOString(),
        endpoints: {
            products: '/api/product/',
            templates: '/api/template/',
            predictions: '/api/prediction/'
        }
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
                pre { background: #374151; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1>🚀 Serveur Proxy Veez.ai</h1>
            <p class="status">Le serveur proxy est opérationnel sur le port 3001</p>
            
            <h2>Endpoints disponibles :</h2>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/product/</div>
            <div class="endpoint"><strong>GET</strong> ${baseUrl}/api/template/</div>
            <div class="endpoint"><strong>POST</strong> ${baseUrl}/api/product/</div>
            <div class="endpoint"><strong>POST</strong> ${baseUrl}/api/prediction/</div>
            
            <h2>Test :</h2>
            <div class="endpoint"><strong>GET</strong> <a href="${baseUrl}/test">${baseUrl}/test</a></div>
            
            <h2>Exemple d'utilisation :</h2>
            <pre>curl -H "Authorization: Bearer YOUR_TOKEN" ${baseUrl}/api/product/</pre>
            
            <h2>Instructions :</h2>
            <ol>
                <li>Modifiez votre page web pour utiliser <code>${baseUrl}/api/</code> au lieu de <code>https://app.veez.ai/api/</code></li>
                <li>Gardez ce serveur en marche pendant que vous utilisez votre landing page</li>
                <li>Vos requêtes passeront maintenant par ce proxy sans problème CORS</li>
            </ol>
            
            <h2>Status :</h2>
            <div class="status">✅ Express server running</div>
            <div class="status">✅ CORS enabled</div>
            <div class="status">✅ Proxy routes configured</div>
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
    console.log(`📝 Test: ${baseUrl}/test`);
    console.log('');
    console.log('💡 Pour utiliser avec votre landing page, changez l\'URL de l\'API de :');
    console.log('   https://app.veez.ai/api/product/');
    console.log('   vers :');
    console.log(`   ${baseUrl}/api/product/`);
    console.log('');
    console.log('📋 Test rapide :');
    console.log(`   curl ${baseUrl}/test`);
    console.log('');
});
