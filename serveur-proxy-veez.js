// serveur-proxy-veez.js
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const path = require('path');

const app = express();
const PORT = 3001;

// Configuration CORS pour permettre les requêtes depuis votre page web
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'file://', '*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// Middleware pour parser le JSON
app.use(express.json());

// Fonction proxy manuelle pour remplacer http-proxy-middleware
function proxyRequest(req, res, targetUrl) {
    const url = new URL(targetUrl + req.url.replace('/api', '/api'));
    
    console.log(`🚀 Proxying ${req.method} ${req.url} -> ${url.href}`);
    
    // Log des headers pour debug (masquer le token)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        console.log(`   Authorization: ${authHeader.substring(0, 20)}...`);
    }

    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: req.method,
        headers: {
            ...req.headers,
            host: url.hostname,
            origin: url.origin
        }
    };

    // Supprimer les headers qui peuvent causer des problèmes
    delete options.headers['host'];
    delete options.headers['connection'];

    const protocol = url.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.request(options, (proxyRes) => {
        console.log(`✅ Response ${proxyRes.statusCode} for ${req.url}`);
        
        // Transférer les headers de réponse
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });
        
        // Assurer que CORS est bien configuré
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        res.statusCode = proxyRes.statusCode;
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('❌ Proxy Error:', err.message);
        res.status(500).json({ 
            error: 'Erreur du proxy', 
            details: err.message,
            url: url.href
        });
    });

    // Transférer le body pour les requêtes POST/PUT
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body) {
            proxyReq.write(JSON.stringify(req.body));
        }
    }

    proxyReq.end();
}

// Route proxy pour tous les endpoints API
app.all('/api/*', (req, res) => {
    proxyRequest(req, res, 'https://app.veez.ai');
});

// Route de test
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Serveur proxy Veez.ai opérationnel!', 
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api/product/ - Liste des produits',
            'GET /api/template/ - Liste des templates',
            'POST /api/product/ - Créer un produit',
            'POST /api/prediction/ - Créer une prédiction'
        ]
    });
});

// Route d'information
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Serveur Proxy Veez.ai</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                .success { color: #27ae60; }
                .info { color: #3498db; }
                pre { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 5px; overflow-x: auto; }
            </style>
        </head>
        <body>
            <h1 class="success">🚀 Serveur Proxy Veez.ai</h1>
            <p class="info">Le serveur proxy est opérationnel sur le port ${PORT}</p>
            
            <h2>Endpoints disponibles :</h2>
            <div class="endpoint"><strong>GET</strong> http://localhost:${PORT}/api/product/</div>
            <div class="endpoint"><strong>GET</strong> http://localhost:${PORT}/api/template/</div>
            <div class="endpoint"><strong>POST</strong> http://localhost:${PORT}/api/product/</div>
            <div class="endpoint"><strong>POST</strong> http://localhost:${PORT}/api/prediction/</div>
            
            <h2>Test :</h2>
            <div class="endpoint"><strong>GET</strong> <a href="/test">http://localhost:${PORT}/test</a></div>
            
            <h2>Exemple d'utilisation :</h2>
            <pre>curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:${PORT}/api/product/</pre>
            
            <h2>Instructions :</h2>
            <ol>
                <li>Modifiez votre page web pour utiliser <code>http://localhost:${PORT}/api/</code> au lieu de <code>https://app.veez.ai/api/</code></li>
                <li>Gardez ce serveur en marche pendant que vous utilisez votre landing page</li>
                <li>Vos requêtes passeront maintenant par ce proxy sans problème CORS</li>
            </ol>
            
            <h2>Status :</h2>
            <p>✅ Express server running<br>
            ✅ CORS enabled<br>
            ✅ Proxy routes configured</p>
        </body>
        </html>
    `);
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`
🚀 Serveur Proxy Veez.ai démarré !
📍 URL: http://localhost:${PORT}
🔗 API Proxy: http://localhost:${PORT}/api/
📝 Test: http://localhost:${PORT}/test

💡 Pour utiliser avec votre landing page, changez l'URL de l'API de :
   https://app.veez.ai/api/product/
   vers :
   http://localhost:${PORT}/api/product/

📋 Test rapide :
   curl http://localhost:${PORT}/test
    `);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur proxy...');
    process.exit(0);
});
