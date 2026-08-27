export class ProveedorEntity {
  constructor({ id_proveedor, nombre, telefono, contacto, es_externo }) {
    this.id_proveedor = id_proveedor;
    this.nombre = nombre;
    this.telefono = telefono || contacto;
    this.es_externo = !!es_externo;
    this.validate();
  }

  validate() {
    if (!this.nombre || this.nombre.trim() === '') {
      throw new Error('El nombre del proveedor es requerido y no puede estar vacío.');
    }
  }
}
