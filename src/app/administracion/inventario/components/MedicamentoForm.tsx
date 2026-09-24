import React, { useState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import type { InsertMedicamento } from "@/lib/db/inventario";
import styles from "@/styles/pages/admin.module.css";

interface MedicamentoFormProps {
  initialData?: any;
  categorias?: any[];
  onSubmit: (data: InsertMedicamento, cantidadInicial?: number) => Promise<void>;
  onCancel?: () => void;
  isLoading: boolean;
}

export function MedicamentoForm({ initialData, categorias = [], onSubmit, onCancel, isLoading }: MedicamentoFormProps) {
  const isEditing = Boolean(initialData?.id || initialData?.medicamento_id);

  console.log("MedicamentoForm - categorias prop:", categorias);

  const [cantidadInicial, setCantidadInicial] = useState<number>(0);
  const [formData, setFormData] = useState<InsertMedicamento>({
    nombre: initialData?.nombre || "",
    tipo_recurso: initialData?.tipo_recurso || "medicamento",
    descripcion: initialData?.descripcion || "",
    unidad_medida: initialData?.unidad_medida || "",
    stock_minimo: initialData?.stock_minimo !== undefined ? Number(initialData.stock_minimo) : 10,
    categoria_id: initialData?.categoria_id || (categorias[0]?.id || ""),
    codigo: initialData?.codigo || "",
  } as any);

  useEffect(() => {
    if (categorias && categorias.length > 0) {
      const exists = categorias.some((c) => c.id === formData.categoria_id);
      if (!exists || !formData.categoria_id) {
        setFormData((prev: any) => ({ ...prev, categoria_id: categorias[0].id }));
      }
    }
  }, [categorias, formData.categoria_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: InsertMedicamento) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategoriaId = formData.categoria_id || (categorias[0]?.id || "");
    await onSubmit({
      ...formData,
      categoria_id: finalCategoriaId,
      stock_minimo: Number(formData.stock_minimo),
    }, cantidadInicial);
  };

  // se muestra dentro de AdminModal: cuerpo con los campos + pie con los botones
  return (
    <form onSubmit={handleSubmit} className={styles.modalForm}>
      <div className={styles.modalBody}>
        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>1. Clasificación e Información General</h3>

          <label className="form-field">
            <span className="form-label">
              Tipo de Recurso <span className="form-required" aria-hidden="true">*</span>
            </span>
            <select
              className="form-input"
              name="tipo_recurso"
              value={formData.tipo_recurso || "medicamento"}
              onChange={handleChange}
              required
            >
              <option value="medicamento">Medicamento (Fármacos)</option>
              <option value="insumo_medico">Insumo Médico (Gasas, Jeringas, Guantes)</option>
              <option value="material_brigada">Material de Brigada (Toldos, Sillas, Básculas)</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">
              Categoría de Inventario <span className="form-required" aria-hidden="true">*</span>
            </span>
            <select
              className="form-input"
              name="categoria_id"
              value={formData.categoria_id || (categorias[0]?.id || "")}
              onChange={handleChange}
              required
            >
              {categorias && categorias.length > 0 ? (
                categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))
              ) : (
                <option value="">Cargando categorías...</option>
              )}
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">
              Nombre del Recurso <span className="form-required" aria-hidden="true">*</span>
            </span>
            <input
              className="form-input"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej. Paracetamol 500mg, Jeringas 5ml o Toldo Plegable 3x3m"
              required
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Código / Referencia <span className="form-optional">(Máximo 20 caracteres)</span>
            </span>
            <input
              className="form-input"
              name="codigo"
              maxLength={20}
              value={formData.codigo || ""}
              onChange={handleChange}
              placeholder="Ej. MED_AMOX_500"
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Descripción de Fármacos / Insumos <span className="form-optional">(Opcional)</span>
            </span>
            <textarea
              className="form-input"
              name="descripcion"
              value={formData.descripcion || ""}
              onChange={handleChange}
              placeholder="Descripción detallada de posología, concentración o tipo de insumo..."
              rows={3}
            />
          </label>
        </div>

        <div className={styles.formSection}>
          <h3 className={styles.formSectionTitle}>2. Control de Existencias y Presentación</h3>

          <label className="form-field">
            <span className="form-label">
              Unidad de Medida / Presentación <span className="form-optional">(Opcional)</span>
            </span>
            <input
              className="form-input"
              name="unidad_medida"
              value={formData.unidad_medida || ""}
              onChange={handleChange}
              placeholder="Ej. Cajas, Frascos, Blíster, Tabletas, Unidades"
            />
          </label>

          <label className="form-field">
            <span className="form-label">
              Stock Mínimo (Umbral de Alerta) <span className="form-required" aria-hidden="true">*</span>
            </span>
            <input
              className="form-input"
              type="number"
              min="0"
              name="stock_minimo"
              value={formData.stock_minimo ?? 0}
              onChange={handleChange}
              required
            />
          </label>

          {!isEditing && (
            <label className="form-field">
              <span className="form-label">
                Cantidad Inicial en Stock (Lote Inicial Automático) <span className="form-optional">(Opcional)</span>
              </span>
              <input
                className="form-input"
                type="number"
                min="0"
                name="cantidadInicial"
                value={cantidadInicial}
                onChange={(e) => setCantidadInicial(Number(e.target.value))}
                placeholder="Ingrese la cantidad inicial para crear su primer lote..."
              />
            </label>
          )}
        </div>
      </div>

      <div className={styles.modalFooter}>
        {onCancel && (
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary btn-sm" disabled={isLoading}>
          {isLoading && <LoaderCircle className="spin" aria-hidden="true" />}
          {isLoading ? "Guardando Cambios..." : (isEditing ? "Guardar cambios" : "Crear Recurso")}
        </button>
      </div>
    </form>
  );
}
