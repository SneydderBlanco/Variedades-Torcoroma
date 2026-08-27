const fs = require('fs');
const path = require('path');

const helperCode = `const getImgUrl = (path) => path ? (path.startsWith('http') ? path : \\\`\\\${API_URL}\\\${path}\\\`) : '';\n`;

function patchFile(filepath, replacements) {
  let content = fs.readFileSync(filepath, 'utf8');
  if (!content.includes('const getImgUrl')) {
    const importMatch = content.match(/const API_URL = [^\n]+;/);
    if (importMatch) {
      content = content.replace(importMatch[0], importMatch[0] + '\n' + helperCode);
    }
  }
  for (const rep of replacements) {
    content = content.replace(rep.from, rep.to);
  }
  fs.writeFileSync(filepath, content);
  console.log('Patched', filepath);
}

// 1. Torcoroma-Web / Home.jsx
patchFile(path.join(__dirname, 'Torcoroma-Web/src/pages/Home.jsx'), [
  { from: /\`\$\{API_URL\}\$\{prod\.imagen_principal\}\`/g, to: 'getImgUrl(prod.imagen_principal)' },
  { from: /\`url\(\$\{API_URL\}\$\{webConfig\.hero_img\}\)\`/g, to: '`url(${getImgUrl(webConfig.hero_img)})`' },
  { from: /\`url\(\$\{API_URL\}\$\{webConfig\.promo_img\}\)\`/g, to: '`url(${getImgUrl(webConfig.promo_img)})`' }
]);

// 2. Torcoroma-Web / Producto.jsx
patchFile(path.join(__dirname, 'Torcoroma-Web/src/pages/Producto.jsx'), [
  { from: /\`\$\{API_URL\}\$\{img\.ruta_imagen\}\`/g, to: 'getImgUrl(img.ruta_imagen)' },
  { from: /\`\$\{API_URL\}\$\{imagenes\[0\]\.ruta_imagen\}\`/g, to: 'getImgUrl(imagenes[0].ruta_imagen)' }
]);

// 3. Torcoroma-Web / Catalogo.jsx
patchFile(path.join(__dirname, 'Torcoroma-Web/src/pages/Catalogo.jsx'), [
  { from: /\`\$\{API_URL\}\$\{prod\.imagen_principal\}\`/g, to: 'getImgUrl(prod.imagen_principal)' }
]);

// 4. Torcoroma-Web / CartDrawer.jsx
patchFile(path.join(__dirname, 'Torcoroma-Web/src/components/CartDrawer.jsx'), [
  { from: /\`\$\{API_URL\}\$\{item\.imagen\}\`/g, to: 'getImgUrl(item.imagen)' }
]);

// 5. Frontend / EcommercePanel.jsx
patchFile(path.join(__dirname, 'Frontend/src/components/EcommercePanel.jsx'), [
  { from: /\`\$\{API_URL\}\$\{prod\.imagen_principal\}\`/g, to: 'getImgUrl(prod.imagen_principal)' },
  { from: /\`\$\{API_URL\}\$\{img\.ruta_imagen\}\`/g, to: 'getImgUrl(img.ruta_imagen)' }
]);

// 6. Frontend / WebConfigModal.jsx
patchFile(path.join(__dirname, 'Frontend/src/components/WebConfigModal.jsx'), [
  { from: /\`\$\{API_URL\}\$\{data\.hero_img\}\`/g, to: 'getImgUrl(data.hero_img)' },
  { from: /\`\$\{API_URL\}\$\{data\.promo_img\}\`/g, to: 'getImgUrl(data.promo_img)' }
]);

console.log("All files patched!");
