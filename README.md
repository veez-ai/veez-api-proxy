# Proxy Veez.ai Ultra-Simple

Proxy CORS pour API Veez.ai - Résout les erreurs "fail to fetch".

## 🚀 Déploiement Render

1. Connectez ce repo à [render.com](https://render.com)
2. Créez un "Web Service"
3. Ajoutez `VEEZ_TOKEN` dans Environment Variables
4. Deploy

## 🔧 URL du Proxy

Après déploiement, utilisez dans votre app :
```javascript
const PROXY_URL = 'https://veez-proxy.onrender.com';
```

## ✅ Test

`GET https://veez-proxy.onrender.com/`

## 🎯 Utilisation

```javascript
// Lister produits
fetch(`${PROXY_URL}/api/product/`)

// Créer prédiction
fetch(`${PROXY_URL}/api/prediction/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    product_id: 'id_produit',
    prompt: 'Description de l\'image',
    aspect_ratio: '1:1'
  })
})
