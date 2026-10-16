import('./src/api/catalog.routes.js').then(m => {
    const r = m.default;
    const routes = [];
    r.stack.forEach(layer => {
        if (layer.route) {
            const path = layer.route.path;
            const methods = Object.keys(layer.route.methods).join(',');
            routes.push(methods + ' ' + path);
        }
    });
    console.log('Catalog router routes:');
    routes.forEach(x => console.log(' ', x));
});