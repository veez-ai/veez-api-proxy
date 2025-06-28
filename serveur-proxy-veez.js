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

// ✅ SOLUTION : Proxy manuel pour gérer correctement les réponses
app.use('/api', async (req, res) => {
    try {
        console.log(`→ Proxying ${req.method} https://app.veez.ai${req.url}`);
        
        // Préparer les headers pour la requête vers Veez
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'Veez-Proxy/1.0'
        };
        
        // Ajouter l'authorization si présent
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
            console.log(`🔐 Auth forwarded`);
        }
        
        // Configuration de la requête
        const requestOptions = {
            method: req.method,
            headers: headers
        };
        
        // Pour POST, ajouter le body
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            await new Promise(resolve => {
                req.on('end', resolve);
            });
            
            console.log(`📤 POST body: ${body}`);
            requestOptions.body = body;
            headers['Content-Type'] = 'application/json';
            headers['Content-Length'] = Buffer.byteLength(body).toString();
        }
        
        // Faire la requête vers Veez (fetch natif Node.js 18+)
        const response = await fetch(`https://app.veez.ai${req.url}`, requestOptions);
        
        console.log(`← ${response.status} from Veez API`);
        
        // Lire la réponse complète
        const responseText = await response.text();
        console.log(`📥 Response body: ${responseText}`);
        console.log(`📥 Response length: ${responseText.length}`);
        
        // Définir les headers CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        
        // Définir le content-type
        if (response.headers.get('content-type')) {
            res.setHeader('Content-Type', response.headers.get('content-type'));
        }
        
        // Envoyer la réponse avec le bon status et le body complet
        res.status(response.status).send(responseText);
        
    } catch (error) {
        console.error(`❌ Proxy error: ${error.message}`);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

// Routes utilitaires
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Proxy Veez.ai MANUEL - Gestion complète du body',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send(`
        <h1>🚀 Proxy Veez.ai MANUEL</h1>
        <p>✅ Gestion manuelle du body des réponses</p>
        <p>🔗 <a href="/test">Test</a></p>
    `);
});

// Démarrage
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 Proxy Veez.ai MANUEL démarré !');
    console.log(`📍 Port: ${PORT}`);
    console.log('✅ Gestion manuelle du body appliquée');
});
