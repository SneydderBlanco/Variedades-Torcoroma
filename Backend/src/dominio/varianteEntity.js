export class VarianteEntity {
  constructor({ id_variante, id_modelo, color, talla }) {
    this.id_variante = id_variante;
    this.id_modelo = id_modelo;
    this.color = color;
    this.talla = talla;
    this.validate();
  }

  validate() {
    if (!this.id_modelo) {
      throw new Error('El id_modelo es requerido para crear una variante.');
    }
    if (!this.color || this.color.trim() === '') {
      throw new Error('El color de la variante es requerido.');
    }
    if (!this.talla || this.talla.trim() === '') {
      throw new Error('La talla de la variante es requerida.');
    }
  }
}
