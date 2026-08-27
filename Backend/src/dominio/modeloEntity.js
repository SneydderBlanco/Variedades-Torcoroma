export class ModeloEntity {
  constructor({ id_modelo, nombre, precio_compra, precio_minimo_venta, es_externo, id_proveedor_aliado }) {
    this.id_modelo = id_modelo;
    this.nombre = nombre;
    this.precio_compra = Number(precio_compra || 0);
    this.precio_minimo_venta = Number(precio_minimo_venta || 0);
    this.es_externo = Boolean(es_externo);
    this.id_proveedor_aliado = id_proveedor_aliado;
    this.validate();
  }

  validate() {
    if (!this.nombre || this.nombre.trim() === '') {
      throw new Error('El nombre del modelo es requerido.');
    }
    if (isNaN(this.precio_compra) || this.precio_compra < 0) {
      throw new Error('El precio de compra debe ser un número mayor o igual a cero.');
    }
    if (isNaN(this.precio_minimo_venta) || this.precio_minimo_venta < 0) {
      throw new Error('El precio mínimo de venta debe ser un número mayor o igual a cero.');
    }
    if (this.es_externo && (!this.id_proveedor_aliado || this.id_proveedor_aliado.trim() === '')) {
      throw new Error('Los modelos de calzado externo en consignación requieren el ID o nombre del proveedor aliado.');
    }
  }
}
