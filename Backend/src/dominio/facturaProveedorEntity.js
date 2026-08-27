export class FacturaProveedorEntity {
  constructor({ id_factura, id_proveedor, numero_factura, total_costo, fecha_emision, suma_abonos, descripcion, cantidad_zapatos, valor_unitario }) {
    this.id_factura = id_factura;
    this.id_proveedor = id_proveedor;
    this.numero_factura = numero_factura;
    this.total_costo = Number(total_costo || 0);
    this.fecha_emision = fecha_emision;
    this.suma_abonos = Number(suma_abonos || 0);
    this.saldo_restante = Math.max(0, this.total_costo - this.suma_abonos);
    this.descripcion = descripcion || '';
    this.cantidad_zapatos = cantidad_zapatos !== undefined ? Number(cantidad_zapatos) : 0;
    this.valor_unitario = valor_unitario !== undefined ? Number(valor_unitario) : 0;
    this.validate();
  }

  validate() {
    if (this.total_costo < 0) {
      throw new Error('El costo total de la factura no puede ser negativo.');
    }
  }
}
