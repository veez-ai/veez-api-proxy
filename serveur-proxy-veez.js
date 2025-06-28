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
app.use(express.urlencoded({ extended: true }));

// Logs pour debug
app.use((req, res, next) => {
    console.log(`🚀 Proxying ${req.method} ${req.path} -> https://app.veez.ai${req.path}`);
    if (req.headers.authorization) {
        console.log(`   Authorization: Bearer ${req.headers.authorization.substring(0, 20)}...`);
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   Body:`, Object.keys(req.body));
    }
    next();
});

// Configuration du proxy de base
const createProxy = (additionalOptions = {}) => {
    return createProxyMiddleware({
        target: 'https://app.veez.ai',
        changeOrigin: true,
        secure: true,
        timeout: 60000,
        proxyTimeout: 60000,
        onProxyReq: (proxyReq, req) => {
            // S'assurer que les headers sont bien transmis
            if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            
            // Pour les requêtes avec contenu JSON
            if (req.body && req.headers['content-type']?.includes('application/json')) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
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

// ========== ROUTES TEMPLATES ==========

// Liste des templates
app.get('/api/template/', createProxy());

// Détail d'un template
app.get('/api/template/:templateId', createProxy());

// ========== ROUTES PRODUCTS ==========

// Liste des produits
app.get('/api/product/', createProxy());

// Détail d'un produit
app.get('/api/product/:productId', createProxy());

// Création d'un produit (ATTENTION: sans gestion des fichiers pour l'instant)
app.post('/api/product/', (req, res, next) => {
    console.log('📦 Création de produit (sans upload de fichiers)');
    console.log('   Body:', req.body);
    
    // IMPORTANT: Cette route ne gère PAS encore les uploads de fichiers
    // Pour les fichiers, vous devrez utiliser votre frontend pour envoyer
    // directement les FormData au proxy
    
    const uploadProxy = createProxy({
        timeout: 120000, // 2 minutes pour les uploads
        proxyTimeout: 120000,
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ Product creation response ${proxyRes.statusCode}`);
        }
    });
    
    uploadProxy(req, res, next);
});

// Génération de LoRA
app.post('/api/product/:productId/generate-lora', (req, res, next) => {
    console.log(`🎯 Génération LoRA pour le produit ${req.params.productId}`);
    
    const loraProxy = createProxy({
        timeout: 300000, // 5 minutes pour la génération LoRA
        proxyTimeout: 300000,
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ LoRA generation response ${proxyRes.statusCode} for product ${req.params.productId}`);
        }
    });
    
    loraProxy(req, res, next);
});

// ========== ROUTES PREDICTIONS ==========

// Liste des prédictions
app.get('/api/prediction/', createProxy());

// Détail d'une prédiction
app.get('/api/prediction/:predictionId', createProxy());

// Création d'une prédiction
app.post('/api/prediction/', (req, res, next) => {
    console.log(`🔮 Création de prédiction`);
    console.log('   Produit:', req.body.product_id);
    console.log('   Prompt:', req.body.prompt);
    console.log('   Aspect ratio:', req.body.aspect_ratio);
    
    const predictionProxy = createProxy({
        timeout: 180000, // 3 minutes pour les prédictions
        proxyTimeout: 180000,
        onProxyRes: (proxyRes, req, res) => {
            console.log(`✅ Prediction creation response ${proxyRes.statusCode}`);
        }
    });
    
    predictionProxy(req, res, next);
});

// ========== ROUTES GÉNÉRIQUES ==========

// Proxy pour toutes les autres routes API non spécifiées
app.use('/api', createProxy());

// ========== ROUTES UTILITAIRES ==========

// Route de test étendue
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Serveur proxy Veez.ai fonctionnel',
        timestamp: new Date().toISOString(),
        endpoints: {
            // Templates
            'list_templates': 'GET /api/template/',
            'get_template': 'GET /api/template/{template_id}',
            
            // Products  
            'list_products': 'GET /api/product/',
            'get_product': 'GET /api/product/{product_id}',
            'create_product': 'POST /api/product/ (⚠️ Upload files via FormData)',
            'generate_lora': 'POST /api/product/{product_id}/generate-lora',
            
            // Predictions
            'list_predictions': 'GET /api/prediction/',
            'get_prediction': 'GET /api/prediction/{prediction_id}',
            'create_prediction': 'POST /api/prediction/'
        },
        features: [
            '✅ Gestion complète des templates',
            '⚠️ Création de produits (upload files via FormData frontend)',
            '✅ Génération de LoRA',
            '✅ Création et gestion des prédictions',
            '✅ Timeouts adaptés par type d\'opération',
            '✅ Logging détaillé',
            '✅ Gestion d\'erreurs améliorée'
        ],
        notes: [
            'Pour les uploads de fichiers, utilisez FormData depuis votre frontend',
            'Le proxy transmettra automatiquement les fichiers à l\'API Veez.ai'
        ]
    });
});

// Test spécifique pour vérifier l'authentification
app.get('/test/auth', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            error: 'Token d\'authentification manquant',
            message: 'Ajoutez le header: Authorization: Bearer YOUR_TOKEN'
        });
    }
    
    try {
        // Test simple en appelant l'API templates
        const response = await fetch('https://app.veez.ai/api/template/', {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({
                status: 'Authentification OK',
                message: 'Token valide',
                templates_count: data.length,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(response.status).json({
                error: 'Authentification échouée',
                status: response.status,
                message: response.statusText
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Erreur lors du test d\'authentification',
            message: error.message
        });
    }
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
                body { font-family: Arial, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; }
                h1 { color: #2563eb; }
                h2 { color: #374151; margin-top: 30px; }
                .endpoint { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 5px; font-family: monospace; }
                .get { border-left: 4px solid #10b981; }
                .post { border-left: 4px solid #f59e0b; }
                .status { color: #059669; }
                .feature { color: #6366f1; }
                .warning { background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b; margin: 15px 0; }
                pre { background: #374151; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
                .section { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>🚀 Serveur Proxy Veez.ai</h1>
            <p class="status">Le serveur proxy est opérationnel sur le port ${PORT || 3001}</p>
            
            <div class="warning">
                <strong>⚠️ Upload de fichiers :</strong> Cette version ne gère pas encore l'upload via Multer. 
                Pour créer des produits avec des textures, utilisez FormData depuis votre frontend - 
                le proxy transmettra automatiquement les fichiers.
            </div>
            
            <div class="section">
                <h2>📋 Templates</h2>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/template/ - Liste des templates</div>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/template/{id} - Détail d'un template</div>
            </div>
            
            <div class="section">
                <h2>📦 Produits</h2>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/product/ - Liste des produits</div>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/product/{id} - Détail d'un produit</div>
                <div class="endpoint post"><strong>POST</strong> ${baseUrl}/api/product/ - Créer un produit</div>
                <div class="endpoint post"><strong>POST</strong> ${baseUrl}/api/product/{id}/generate-lora - Générer LoRA</div>
            </div>
            
            <div class="section">
                <h2>🔮 Prédictions</h2>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/prediction/ - Liste des prédictions</div>
                <div class="endpoint get"><strong>GET</strong> ${baseUrl}/api/prediction/{id} - Détail d'une prédiction</div>
                <div class="endpoint post"><strong>POST</strong> ${baseUrl}/api/prediction/ - Créer une prédiction</div>
            </div>
            
            <div class="section">
                <h2>🧪 Tests</h2>
                <div class="endpoint get"><strong>GET</strong> <a href="${baseUrl}/test">${baseUrl}/test</a> - Test général</div>
                <div class="endpoint get"><strong>GET</strong> <a href="${baseUrl}/test/auth">${baseUrl}/test/auth</a> - Test authentification</div>
            </div>
            
            <h2>📖 Exemples d'utilisation</h2>
            
            <h3>Lister les templates :</h3>
            <pre>curl -H "Authorization: Bearer YOUR_TOKEN" ${baseUrl}/api/template/</pre>
            
            <h3>Créer un produit (depuis JavaScript frontend) :</h3>
            <pre>const formData = new FormData();
formData.append('template_id', '362');
formData.append('name', 'Mon Produit');
formData.append('description', 'Description');
formData.append('texture[0]', fileInput.files[0]);
formData.append('texture[0][key]', 'TEX01');

fetch('${baseUrl}/api/product/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});</pre>
            
            <h3>Créer une prédiction :</h3>
            <pre>curl -X POST ${baseUrl}/api/prediction/ \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "product_id": "PRODUCT_ID",
    "prompt": "Un produit dans un environnement moderne",
    "aspect_ratio": "1:1"
  }'</pre>
            
            <h2>📊 Status :</h2>
            <div class="status">✅ Express server running</div>
            <div class="status">✅ CORS enabled</div>
            <div class="status">✅ All Veez.ai endpoints configured</div>
            <div class="status">⚠️ File upload: via FormData frontend</div>
        </body>
        </html>
    `);
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('💥 Erreur globale:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log('🚀 Serveur Proxy Veez.ai démarré !');
    console.log('='.repeat(50));
    console.log(`📍 URL: ${baseUrl}`);
    console.log(`🔗 API Proxy: ${baseUrl}/api/`);
    console.log(`📝 Test: ${baseUrl}/test`);
    console.log(`🔐 Test Auth: ${baseUrl}/test/auth`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log('   Templates:');
    console.log(`     GET  ${baseUrl}/api/template/`);
    console.log(`     GET  ${baseUrl}/api/template/{id}`);
    console.log('   Produits:');
    console.log(`     GET  ${baseUrl}/api/product/`);
    console.log(`     GET  ${baseUrl}/api/product/{id}`);
    console.log(`     POST ${baseUrl}/api/product/ (FormData)`);
    console.log(`     POST ${baseUrl}/api/product/{id}/generate-lora`);
    console.log('   Prédictions:');
    console.log(`     GET  ${baseUrl}/api/prediction/`);
    console.log(`     GET  ${baseUrl}/api/prediction/{id}`);
    console.log(`     POST ${baseUrl}/api/prediction/`);
    console.log('');
    console.log('⚠️  Upload de fichiers:');
    console.log('   Utilisez FormData depuis votre frontend');
    console.log('   Le proxy transmettra automatiquement à Veez.ai');
    console.log('');
    console.log('💡 Pour installer Multer plus tard:');
    console.log('   npm install multer');
    console.log('');
});
