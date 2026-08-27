const API_URL = 'http://localhost:4000/api/pos';

async function testPermitidosFlow() {
  try {
    console.log('1. Creando local "Karen"...');
    const localRes = await fetch(`${API_URL}/locales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre_local: 'Karen' })
    });
    
    if (!localRes.ok && localRes.status !== 400) { // 400 = Already exists
      throw new Error(`Failed to create local: ${await localRes.text()}`);
    }
    
    const locales = await (await fetch(`${API_URL}/locales`)).json();
    const karen = locales.find(l => l.nombre_local === 'Karen');
    console.log('Local Karen ID:', karen.id_local);

    console.log('2. Buscando un modelo (ej. id_modelo = 1)...');
    const modelos = await (await fetch(`${API_URL}/modelos`)).json();
    if (modelos.length === 0) {
      console.log('No hay modelos para probar.');
      return;
    }
    const modeloTest = modelos[0];
    
    console.log('3. Asignando 2 unidades de Talla 37, Color "TODO BLANCO" a Karen...');
    const assignRes = await fetch(`${API_URL}/permitidos/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_local: karen.id_local,
        modeloId: modeloTest.id_modelo,
        color: 'TODO BLANCO',
        talla: '37',
        cantidad: 2
      })
    });
    console.log('Asignación response:', await assignRes.json());
    
    console.log('4. Verificando stock sumado (matriz local principal ubicacion=2)...');
    const matrixRes = await fetch(`${API_URL}/modelos?matrix=true&ubicacionId=2`);
    const matrix = await matrixRes.json();
    
    const modeloEnMatriz = matrix.find(m => m.id_modelo === modeloTest.id_modelo);
    const colorEnMatriz = modeloEnMatriz.colores.find(c => c.nombre_color === 'TODO BLANCO');
    const talla37 = colorEnMatriz.tallas['37'];
    console.log(`Stock total en matriz para talla 37: ${talla37} (debe ser >= 2)`);
    
    console.log('5. Intentando asignar total menor a 2 (debería fallar)...');
    const updateFailRes = await fetch(`${API_URL}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modeloId: modeloTest.id_modelo,
        color: 'TODO BLANCO',
        tallas: { '37': 1 },
        ubicacionId: 2
      })
    });
    console.log('Fallo esperado:', await updateFailRes.json());

    console.log('6. Asignando total de 5 (debería ser exitoso)...');
    const updateOkRes = await fetch(`${API_URL}/stock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modeloId: modeloTest.id_modelo,
        color: 'TODO BLANCO',
        tallas: { '37': 5 },
        ubicacionId: 2
      })
    });
    console.log('Éxito esperado:', await updateOkRes.json());
    
    console.log('Prueba finalizada.');
  } catch (err) {
    console.error('Test error:', err);
  }
}

testPermitidosFlow();
