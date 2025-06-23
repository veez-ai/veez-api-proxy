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
