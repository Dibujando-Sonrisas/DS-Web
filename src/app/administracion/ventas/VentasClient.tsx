"use client";

import React, { useState, useEffect } from "react";
import {
  getDashboardVentasAction as getDashboardVentas,
  getCategoriasProductosAction as getCategoriasProductos,
  getProductosAction as getProductos,
  getHistorialVentasAction as getHistorialVentas,
  getBajoStockAction as getBajoStock,
  crearCategoriaProductoAction as createCategoriaProducto,
  crearProductoAction as createProducto,
  updateStockProductoAction as updateStockProducto,
  registrarVentaAction as registrarVenta,
  deleteCategoriaProductoAction as deleteCategoriaProducto,
  deleteProductoAction as deleteProducto,
} from "./actions";
import { getBrigadasAction as getBrigadas } from "@/app/administracion/brigadas/actions";
import {
  Banknote,
  Boxes,
  Check,
  History,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import AdminModal from "@/app/administracion/components/AdminModal";
import ConfirmDialog from "@/app/administracion/components/ConfirmDialog";
import StatCard from "@/app/administracion/components/StatCard";
import styles from "@/styles/pages/admin.module.css";
import ventas from "@/styles/pages/admin-ventas.module.css";
import { usePermissions } from "@/app/administracion/components/PermissionsProvider";
import { PERMISSIONS } from "@/lib/auth/permissions";

export function VentasClient({ userId }: { userId: string }) {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<"dashboard" | "nueva_venta" | "inventario" | "historial">("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [bajoStock, setBajoStock] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [brigadas, setBrigadas] = useState<any[]>([]);

  // Modals state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Forms state
  const [catForm, setCatForm] = useState({ codigo: "", nombre: "", descripcion: "" });
  const [prodForm, setProdForm] = useState({ categoria_id: "", codigo: "", nombre: "", descripcion: "", precio: 0, stock: 0 });
  const [stockForm, setStockForm] = useState({ id: "", nombre: "", stock: 0 });

  // Delete target states
  const [deleteCatTarget, setDeleteCatTarget] = useState<any>(null);
  const [deleteProdTarget, setDeleteProdTarget] = useState<any>(null);

  // Venta state (Cart)
  const [ventaBrigadaId, setVentaBrigadaId] = useState("");
  const [ventaObservaciones, setVentaObservaciones] = useState("");
  const [cart, setCart] = useState<Array<{ producto_id: string, nombre: string, cantidad: number, precio_unitario: number, maxStock: number }>>([]);
  const [isSubmittingVenta, setIsSubmittingVenta] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dash, hist, bs, cats, prods, brigs] = await Promise.all([
        getDashboardVentas(),
        getHistorialVentas(),
        getBajoStock(),
        getCategoriasProductos(),
        getProductos(),
        getBrigadas()
      ]);
      setDashboard(dash);
      setHistorial(hist);
      setBajoStock(bs);
      setCategorias(cats);
      setProductos(prods);
      setBrigadas(brigs.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -- Handlers Inventario --
  const submitCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategoriaProducto(catForm);
      setIsCatModalOpen(false);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const submitProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProducto(prodForm);
      setIsProdModalOpen(false);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const submitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateStockProducto(stockForm.id, stockForm.stock);
      setIsStockModalOpen(false);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  // -- Handlers Carrito de Ventas --
  const addToCart = (productoId: string) => {
    const prod = productos.find(p => p.id === productoId);
    if (!prod || prod.stock <= 0) return;

    setCart(prev => {
      const exists = prev.find(item => item.producto_id === productoId);
      if (exists) {
        if (exists.cantidad >= prod.stock) {
          alert("No puedes vender más del stock disponible.");
          return prev;
        }
        return prev.map(item => item.producto_id === productoId ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { producto_id: prod.id, nombre: prod.nombre, cantidad: 1, precio_unitario: prod.precio, maxStock: prod.stock }];
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => prev.filter(item => item.producto_id !== productoId));
  };

  const updateCartQty = (productoId: string, qty: number) => {
    setCart(prev => prev.map(item => {
      if (item.producto_id === productoId) {
        if (qty > item.maxStock) {
          alert("Límite de stock excedido.");
          return item;
        }
        return { ...item, cantidad: qty > 0 ? qty : 1 };
      }
      return item;
    }));
  };

  const calcularTotalCarrito = () => cart.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0);

  const confirmarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return alert("El carrito está vacío");

    setIsSubmittingVenta(true);
    try {
      const res = await registrarVenta({
        vendedor_id: userId,
        brigada_id: ventaBrigadaId || undefined,
        observaciones: ventaObservaciones,
        detalles: cart
      });
      alert(`Venta registrada exitosamente. Código: ${res.codigo}`);
      setCart([]);
      setVentaBrigadaId("");
      setVentaObservaciones("");
      fetchData();
      setActiveTab("dashboard");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmittingVenta(false);
    }
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard aria-hidden="true" /> },
    { id: "nueva_venta", label: "Nueva Venta", icon: <ShoppingCart aria-hidden="true" /> },
    { id: "inventario", label: "Inventario", icon: <Boxes aria-hidden="true" /> },
    { id: "historial", label: "Historial", icon: <History aria-hidden="true" /> },
  ] as const;

  return (
    <div className={styles.stack}>
      {/* Menu Pestañas */}
      <div className={styles.tabs} role="tablist" aria-label="Secciones de ventas">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "nueva_venta" && cart.length > 0 && (
              <span className={styles.tabCount}>{cart.length}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={styles.statGrid}>
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className={styles.stack}>
              <div className={`${styles.statGrid} tone-rotate`}>
                <StatCard
                  label="Ventas Realizadas"
                  value={dashboard?.ventas || 0}
                  icon={<ShoppingCart />}
                />
                <StatCard
                  label="Ingresos Totales"
                  value={`L. ${Number(dashboard?.ingresos || 0).toFixed(2)}`}
                  icon={<Banknote />}
                  valueTone="ok"
                />
                <StatCard
                  label="Promedio por Venta"
                  value={`L. ${Number(dashboard?.promedio_venta || 0).toFixed(2)}`}
                  icon={<Receipt />}
                />
              </div>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Productos con Bajo Stock (5 o menos)</h2>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th className={styles.num}>Stock Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bajoStock.length === 0 ? (
                        <tr>
                          <td colSpan={3} className={styles.emptyCell}>
                            Inventario saludable.
                          </td>
                        </tr>
                      ) : (
                        bajoStock.map((p) => (
                          <tr key={p.id}>
                            <td className={styles.cellCode}>{p.codigo}</td>
                            <td className={styles.cellMain}>{p.nombre}</td>
                            <td className={styles.num}>
                              <span
                                className={`${styles.badge} ${
                                  p.stock === 0 ? styles.badgeDanger : styles.badgeWarning
                                }`}
                              >
                                {p.stock}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: NUEVA VENTA */}
          {activeTab === "nueva_venta" && (
            <div className={styles.layoutAside}>
              {/* Catalogo */}
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Catálogo de Productos</h2>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.gridAuto}>
                    {productos.filter((p) => p.activo).map((p) => (
                      <div key={p.id} className={ventas.product}>
                        <span className={ventas.productCode}>{p.codigo}</span>
                        <h3 className={ventas.productName}>{p.nombre}</h3>
                        <span className={ventas.productPrice}>L. {p.precio}</span>
                        <span
                          className={`${ventas.productStock} ${
                            p.stock > 0 ? "" : ventas.productStockOut
                          }`}
                        >
                          Stock: {p.stock}
                        </span>
                        <button
                          type="button"
                          className="btn-primary btn-xs"
                          onClick={() => addToCart(p.id)}
                          disabled={p.stock === 0}
                        >
                          <Plus aria-hidden="true" />
                          {p.stock === 0 ? "Agotado" : "Añadir"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Carrito */}
              <form className={`${styles.panel} ${styles.sticky}`} onSubmit={confirmarVenta}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Resumen de Venta
                    {cart.length > 0 && <span className={styles.count}>{cart.length}</span>}
                  </h2>
                </div>

                <div className={styles.panelBody}>
                  <ul className={ventas.cartList}>
                    {cart.length === 0 ? (
                      <li className={`${ventas.cartEmpty} ${styles.muted}`}>Carrito vacío</li>
                    ) : (
                      cart.map((item, idx) => (
                        <li key={idx} className={ventas.cartItem}>
                          <span className={ventas.cartName}>{item.nombre}</span>
                          <label className={ventas.cartQty}>
                            <span className="sr-only">Cantidad de {item.nombre}</span>
                            <input
                              type="number"
                              min="1"
                              max={item.maxStock}
                              value={item.cantidad}
                              onChange={(e) =>
                                updateCartQty(item.producto_id, Number(e.target.value))
                              }
                              className="form-input form-input-sm"
                            />
                            <span>x L. {item.precio_unitario}</span>
                          </label>
                          <span className={ventas.cartSubtotal}>
                            L. {(item.cantidad * item.precio_unitario).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.producto_id)}
                            className="btn-icon btn-icon-danger"
                            aria-label={`Remover ${item.nombre} del carrito`}
                          >
                            <X aria-hidden="true" />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>

                  <div className={ventas.cartTotal}>
                    <span>TOTAL:</span>
                    <strong>L. {calcularTotalCarrito().toFixed(2)}</strong>
                  </div>

                  <div className={ventas.cartForm}>
                    <label className="form-field">
                      <span className="form-label">
                        Asociar a Brigada <span className="form-optional">(Opcional)</span>
                      </span>
                      <select
                        className="form-input"
                        value={ventaBrigadaId}
                        onChange={(e) => setVentaBrigadaId(e.target.value)}
                      >
                        <option value="">-- Ninguna --</option>
                        {brigadas.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field">
                      <span className="form-label">
                        Observaciones <span className="form-optional">(Opcional)</span>
                      </span>
                      <textarea
                        className="form-input"
                        rows={2}
                        value={ventaObservaciones}
                        onChange={(e) => setVentaObservaciones(e.target.value)}
                        placeholder="Ej. Cliente pagó exacto..."
                      />
                    </label>

                    {can(PERMISSIONS.VENTAS_CREATE) && (
                      <button
                        type="submit"
                        className="btn-primary btn-block"
                        disabled={cart.length === 0 || isSubmittingVenta}
                      >
                        {isSubmittingVenta ? (
                          <LoaderCircle className="spin" aria-hidden="true" />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                        {isSubmittingVenta ? "Procesando Venta..." : "Confirmar Venta"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: INVENTARIO (Categorías y Productos) */}
          {activeTab === "inventario" && (
            <div className={styles.stack}>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Categorías <span className={styles.count}>{categorias.length}</span>
                  </h2>
                  {can(PERMISSIONS.VENTAS_CREATE) && (
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setCatForm({ codigo: "", nombre: "", descripcion: "" });
                        setIsCatModalOpen(true);
                      }}
                    >
                      <Plus aria-hidden="true" />
                      Nueva Categoría
                    </button>
                  )}
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th className={styles.num}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorias.map((c) => (
                        <tr key={c.id}>
                          <td className={styles.cellCode}>{c.codigo}</td>
                          <td className={styles.cellMain}>{c.nombre}</td>
                          <td>{c.descripcion}</td>
                          <td>
                            <div className={styles.rowActions}>
                              {can(PERMISSIONS.VENTAS_DELETE) && (
                                <button
                                  type="button"
                                  className="btn-icon btn-icon-danger"
                                  onClick={() => setDeleteCatTarget(c)}
                                  aria-label={`Eliminar categoría ${c.nombre}`}
                                  title="Eliminar"
                                >
                                  <Trash2 aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>
                    Productos <span className={styles.count}>{productos.length}</span>
                  </h2>
                  {can(PERMISSIONS.VENTAS_CREATE) && (
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => {
                        setProdForm({ categoria_id: "", codigo: "", nombre: "", descripcion: "", precio: 0, stock: 0 });
                        setIsProdModalOpen(true);
                      }}
                    >
                      <Plus aria-hidden="true" />
                      Nuevo Producto
                    </button>
                  )}
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th className={styles.num}>Precio</th>
                        <th className={styles.num}>Stock</th>
                        <th className={styles.num}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((p) => (
                        <tr key={p.id}>
                          <td className={styles.cellCode}>{p.codigo}</td>
                          <td className={styles.cellMain}>{p.nombre}</td>
                          <td>{p.categorias_productos?.nombre}</td>
                          <td className={styles.num}>L. {p.precio}</td>
                          <td className={styles.num}>
                            {p.stock === 0 ? (
                              <span className={`${styles.badge} ${styles.badgeDanger}`}>0</span>
                            ) : (
                              p.stock
                            )}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className="btn-ghost btn-xs"
                                onClick={() => {
                                  setStockForm({ id: p.id, nombre: p.nombre, stock: p.stock });
                                  setIsStockModalOpen(true);
                                }}
                              >
                                <SlidersHorizontal aria-hidden="true" />
                                Ajustar Stock
                              </button>
                              <button
                                type="button"
                                className="btn-icon btn-icon-danger"
                                onClick={() => setDeleteProdTarget(p)}
                                aria-label={`Eliminar producto ${p.nombre}`}
                                title="Eliminar"
                              >
                                <Trash2 aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: HISTORIAL DE VENTAS */}
          {activeTab === "historial" && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>
                  Historial de Ventas <span className={styles.count}>{historial.length}</span>
                </h2>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Vendedor</th>
                      <th className={styles.num}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          No hay ventas registradas.
                        </td>
                      </tr>
                    ) : (
                      historial.map((v) => (
                        <tr key={v.id}>
                          <td className={styles.nowrap}>{new Date(v.fecha).toLocaleString()}</td>
                          <td className={styles.cellCode}>{v.codigo}</td>
                          <td>{v.vendedor}</td>
                          <td className={`${styles.num} ${styles.cellMain}`}>
                            L. {Number(v.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* MODAL CATEGORIA */}
      {isCatModalOpen && (
        <AdminModal title="Nueva Categoría de Producto" size="sm" onClose={() => setIsCatModalOpen(false)}>
          <form className={styles.modalForm} onSubmit={submitCategoria}>
            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>1. Clasificación de Recaudación</h3>
                <label className="form-field">
                  <span className="form-label">
                    Código de Categoría <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    className="form-input"
                    value={catForm.codigo}
                    onChange={(e) => setCatForm({ ...catForm, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej. CAM"
                    required
                    maxLength={15}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Nombre de Categoría <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    className="form-input"
                    value={catForm.nombre}
                    onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })}
                    placeholder="Ej. Camisetas"
                    required
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Descripción <span className="form-optional">(Opcional)</span>
                  </span>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={catForm.descripcion}
                    onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsCatModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Guardar Categoría
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* MODAL PRODUCTO */}
      {isProdModalOpen && (
        <AdminModal title="Nuevo Producto de Recaudación" size="sm" onClose={() => setIsProdModalOpen(false)}>
          <form className={styles.modalForm} onSubmit={submitProducto}>
            <div className={styles.modalBody}>
              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>1. Información del Producto</h3>
                <label className="form-field">
                  <span className="form-label">
                    Categoría <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <select
                    className="form-input"
                    value={prodForm.categoria_id}
                    onChange={(e) => setProdForm({ ...prodForm, categoria_id: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Código Identificador <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    className="form-input"
                    value={prodForm.codigo}
                    onChange={(e) => setProdForm({ ...prodForm, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej. CAM-001"
                    required
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">
                    Nombre del Producto <span className="form-required" aria-hidden="true">*</span>
                  </span>
                  <input
                    className="form-input"
                    value={prodForm.nombre}
                    onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                    placeholder="Ej. Camiseta Oficial Blanca"
                    required
                  />
                </label>
              </div>

              <div className={styles.formSection}>
                <h3 className={styles.formSectionTitle}>2. Precio y Existencias</h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span className="form-label">
                      Precio (L.) <span className="form-required" aria-hidden="true">*</span>
                    </span>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodForm.precio}
                      onChange={(e) => setProdForm({ ...prodForm, precio: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">
                      Stock Inicial <span className="form-required" aria-hidden="true">*</span>
                    </span>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      value={prodForm.stock}
                      onChange={(e) => setProdForm({ ...prodForm, stock: Number(e.target.value) })}
                      required
                    />
                  </label>
                </div>
                <label className="form-field">
                  <span className="form-label">
                    Descripción <span className="form-optional">(Opcional)</span>
                  </span>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={prodForm.descripcion}
                    onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsProdModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Guardar Producto
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* MODAL AJUSTAR STOCK */}
      {isStockModalOpen && (
        <AdminModal
          title="Ajustar Stock Físico"
          description={
            <>
              Actualizando existencias para: <strong>{stockForm.nombre}</strong>
            </>
          }
          size="sm"
          onClose={() => setIsStockModalOpen(false)}
        >
          <form className={styles.modalForm} onSubmit={submitStock}>
            <div className={styles.modalBody}>
              <label className="form-field">
                <span className="form-label">
                  Nuevo Nivel de Stock <span className="form-required" aria-hidden="true">*</span>
                </span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={stockForm.stock}
                  onChange={(e) => setStockForm({ ...stockForm, stock: Number(e.target.value) })}
                  required
                />
              </label>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setIsStockModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Actualizar Stock
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* MODAL ADVERTENCIA ELIMINAR CATEGORÍA */}
      {deleteCatTarget && (
        <ConfirmDialog
          title="¿Eliminar Categoría?"
          confirmLabel="Sí, Eliminar"
          onCancel={() => setDeleteCatTarget(null)}
          onConfirm={async () => {
            try {
              await deleteCategoriaProducto(deleteCatTarget.id);
              setDeleteCatTarget(null);
              fetchData();
            } catch (e: any) { alert("Error al eliminar: " + e.message); }
          }}
        >
          ¿Estás seguro de que deseas eliminar la categoría <strong>{deleteCatTarget.nombre}</strong>? (No debe tener productos asociados). Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}

      {/* MODAL ADVERTENCIA ELIMINAR PRODUCTO */}
      {deleteProdTarget && (
        <ConfirmDialog
          title="¿Eliminar Producto?"
          confirmLabel="Sí, Eliminar"
          onCancel={() => setDeleteProdTarget(null)}
          onConfirm={async () => {
            try {
              await deleteProducto(deleteProdTarget.id);
              setDeleteProdTarget(null);
              fetchData();
            } catch (e: any) { alert("Error al eliminar: " + e.message); }
          }}
        >
          ¿Estás seguro de que deseas eliminar el producto <strong>{deleteProdTarget.nombre}</strong>? (No debe tener ventas asociadas). Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}
    </div>
  );
}
