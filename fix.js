const fs = require('fs');
const files = [
  'Torcoroma-Web/src/pages/Home.jsx',
  'Torcoroma-Web/src/pages/Producto.jsx',
  'Torcoroma-Web/src/pages/Catalogo.jsx',
  'Torcoroma-Web/src/components/CartDrawer.jsx',
  'Frontend/src/components/EcommercePanel.jsx',
  'Frontend/src/components/WebConfigModal.jsx'
];
for(let f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\\`\\\$\{API_URL\}\\\$\{path\}\\`/g, '`${API_URL}${path}`');
  c = c.replace(/\\\$/g, '$');
  c = c.replace(/\\`/g, '`');
  fs.writeFileSync(f, c);
}
console.log("Done");
