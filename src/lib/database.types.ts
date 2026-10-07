export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actividades_infantiles: {
        Row: {
          brigada_id: string
          cantidad_regalos: number | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          responsable_id: string | null
        }
        Insert: {
          brigada_id: string
          cantidad_regalos?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          responsable_id?: string | null
        }
        Update: {
          brigada_id?: string
          cantidad_regalos?: number | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          responsable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actividades_infantiles_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_infantiles_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_infantiles_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "actividades_infantiles_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asignaciones_voluntarios: {
        Row: {
          area_asignada: Database["public"]["Enums"]["area_voluntariado"]
          asignado_por: string | null
          brigada_id: string
          created_at: string | null
          id: string
          observaciones: string | null
          perfil_id: string
          updated_at: string | null
        }
        Insert: {
          area_asignada: Database["public"]["Enums"]["area_voluntariado"]
          asignado_por?: string | null
          brigada_id: string
          created_at?: string | null
          id?: string
          observaciones?: string | null
          perfil_id: string
          updated_at?: string | null
        }
        Update: {
          area_asignada?: Database["public"]["Enums"]["area_voluntariado"]
          asignado_por?: string | null
          brigada_id?: string
          created_at?: string | null
          id?: string
          observaciones?: string | null
          perfil_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_voluntarios_asignado_por_fkey"
            columns: ["asignado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "asignaciones_voluntarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atenciones_pacientes: {
        Row: {
          atendido_por: string
          brigada_id: string
          cantidad: number
          created_at: string
          id: string
          notas: string | null
          tipo_atencion: string
        }
        Insert: {
          atendido_por: string
          brigada_id: string
          cantidad?: number
          created_at?: string
          id?: string
          notas?: string | null
          tipo_atencion: string
        }
        Update: {
          atendido_por?: string
          brigada_id?: string
          cantidad?: number
          created_at?: string
          id?: string
          notas?: string | null
          tipo_atencion?: string
        }
        Relationships: []
      }
      brigada_imagenes: {
        Row: {
          alto: number | null
          ancho: number | null
          brigada_id: string
          created_at: string | null
          id: string
          nombre_archivo: string
          orden: number | null
          peso_kb: number | null
          portada: boolean | null
          storage_path: string
        }
        Insert: {
          alto?: number | null
          ancho?: number | null
          brigada_id: string
          created_at?: string | null
          id?: string
          nombre_archivo: string
          orden?: number | null
          peso_kb?: number | null
          portada?: boolean | null
          storage_path: string
        }
        Update: {
          alto?: number | null
          ancho?: number | null
          brigada_id?: string
          created_at?: string | null
          id?: string
          nombre_archivo?: string
          orden?: number | null
          peso_kb?: number | null
          portada?: boolean | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "brigada_imagenes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigada_imagenes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigada_imagenes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
      brigadas: {
        Row: {
          capacidad_voluntarios: number | null
          codigo: string
          created_at: string | null
          created_by: string | null
          departamento: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_brigada"]
          fecha_brigada: string
          fecha_fin_inscripcion: string
          fecha_inicio_inscripcion: string
          id: string
          imagen_banner: string | null
          latitud: number | null
          longitud: number | null
          lugar: string
          municipio: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          capacidad_voluntarios?: number | null
          codigo: string
          created_at?: string | null
          created_by?: string | null
          departamento: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_brigada"]
          fecha_brigada: string
          fecha_fin_inscripcion: string
          fecha_inicio_inscripcion: string
          id?: string
          imagen_banner?: string | null
          latitud?: number | null
          longitud?: number | null
          lugar: string
          municipio: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          capacidad_voluntarios?: number | null
          codigo?: string
          created_at?: string | null
          created_by?: string | null
          departamento?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_brigada"]
          fecha_brigada?: string
          fecha_fin_inscripcion?: string
          fecha_inicio_inscripcion?: string
          id?: string
          imagen_banner?: string | null
          latitud?: number | null
          longitud?: number | null
          lugar?: string
          municipio?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brigadas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_inventario: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo_recurso: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo_recurso: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo_recurso?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categorias_productos: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      consultas: {
        Row: {
          brigada_id: string
          created_at: string | null
          diagnostico: string | null
          enfermedad_actual: string | null
          id: string
          medico_id: string | null
          motivo_consulta: string | null
          observaciones: string | null
          paciente_id: string
          requiere_postclinica: boolean | null
          tipo_consulta: string | null
          tratamiento: string | null
        }
        Insert: {
          brigada_id: string
          created_at?: string | null
          diagnostico?: string | null
          enfermedad_actual?: string | null
          id?: string
          medico_id?: string | null
          motivo_consulta?: string | null
          observaciones?: string | null
          paciente_id: string
          requiere_postclinica?: boolean | null
          tipo_consulta?: string | null
          tratamiento?: string | null
        }
        Update: {
          brigada_id?: string
          created_at?: string | null
          diagnostico?: string | null
          enfermedad_actual?: string | null
          id?: string
          medico_id?: string | null
          motivo_consulta?: string | null
          observaciones?: string | null
          paciente_id?: string
          requiere_postclinica?: boolean | null
          tipo_consulta?: string | null
          tratamiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "v_pacientes_atendidos"
            referencedColumns: ["id"]
          },
        ]
      }
      contacto: {
        Row: {
          apellido: string
          asunto: string | null
          created_at: string | null
          email: string
          id: string
          leido: boolean
          mensaje: string | null
          nombre: string
          telefono: string | null
        }
        Insert: {
          apellido: string
          asunto?: string | null
          created_at?: string | null
          email: string
          id?: string
          leido?: boolean
          mensaje?: string | null
          nombre: string
          telefono?: string | null
        }
        Update: {
          apellido?: string
          asunto?: string | null
          created_at?: string | null
          email?: string
          id?: string
          leido?: boolean
          mensaje?: string | null
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      destinatarios_correo: {
        Row: {
          aviso: string
          created_at: string
          perfil_id: string
        }
        Insert: {
          aviso: string
          created_at?: string
          perfil_id: string
        }
        Update: {
          aviso?: string
          created_at?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinatarios_correo_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_ventas: {
        Row: {
          cantidad: number
          id: string
          precio_unitario: number
          producto_id: string
          subtotal: number
          venta_id: string
        }
        Insert: {
          cantidad: number
          id?: string
          precio_unitario: number
          producto_id: string
          subtotal: number
          venta_id: string
        }
        Update: {
          cantidad?: number
          id?: string
          precio_unitario?: number
          producto_id?: string
          subtotal?: number
          venta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_ventas_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ventas_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "v_ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ventas_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosticos_consulta: {
        Row: {
          consulta_id: string
          diagnostico: string
          id: string
        }
        Insert: {
          consulta_id: string
          diagnostico: string
          id?: string
        }
        Update: {
          consulta_id?: string
          diagnostico?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnosticos_consulta_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      donaciones_ropa: {
        Row: {
          cantidad_prendas: number
          codigo: string
          created_at: string | null
          fecha_donacion: string
          id: string
          nombre_donante: string | null
          observaciones: string | null
        }
        Insert: {
          cantidad_prendas: number
          codigo: string
          created_at?: string | null
          fecha_donacion: string
          id?: string
          nombre_donante?: string | null
          observaciones?: string | null
        }
        Update: {
          cantidad_prendas?: number
          codigo?: string
          created_at?: string | null
          fecha_donacion?: string
          id?: string
          nombre_donante?: string | null
          observaciones?: string | null
        }
        Relationships: []
      }
      entregas_farmacia: {
        Row: {
          cantidad: number
          consulta_id: string
          entregado_por: string | null
          fecha_entrega: string | null
          id: string
          lote_id: string
          medicamento_id: string
          observaciones: string | null
        }
        Insert: {
          cantidad: number
          consulta_id: string
          entregado_por?: string | null
          fecha_entrega?: string | null
          id?: string
          lote_id: string
          medicamento_id: string
          observaciones?: string | null
        }
        Update: {
          cantidad?: number
          consulta_id?: string
          entregado_por?: string | null
          fecha_entrega?: string | null
          id?: string
          lote_id?: string
          medicamento_id?: string
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_farmacia_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_farmacia_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_farmacia_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "alertas_vencimiento"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "entregas_farmacia_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes_medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_farmacia_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_farmacia_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "stock_actual"
            referencedColumns: ["medicamento_id"]
          },
          {
            foreignKeyName: "entregas_farmacia_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "v_medicamentos_disponibles"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_ropa: {
        Row: {
          brigada_id: string
          cantidad_prendas: number
          entregado_por: string | null
          fecha_entrega: string | null
          id: string
          observaciones: string | null
          paciente_id: string
        }
        Insert: {
          brigada_id: string
          cantidad_prendas: number
          entregado_por?: string | null
          fecha_entrega?: string | null
          id?: string
          observaciones?: string | null
          paciente_id: string
        }
        Update: {
          brigada_id?: string
          cantidad_prendas?: number
          entregado_por?: string | null
          fecha_entrega?: string | null
          id?: string
          observaciones?: string | null
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_ropa_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_ropa_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_ropa_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "entregas_ropa_entregado_por_fkey"
            columns: ["entregado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_ropa_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_ropa_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "v_pacientes_atendidos"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo_consulta: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo_consulta?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo_consulta?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gastos_brigada: {
        Row: {
          brigada_id: string
          categoria: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_url: string | null
          created_at: string | null
          descripcion: string
          fecha_gasto: string
          id: string
          monto: number
          registrado_por: string | null
          updated_at: string | null
        }
        Insert: {
          brigada_id: string
          categoria: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_url?: string | null
          created_at?: string | null
          descripcion: string
          fecha_gasto: string
          id?: string
          monto: number
          registrado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          brigada_id?: string
          categoria?: Database["public"]["Enums"]["categoria_gasto"]
          comprobante_url?: string | null
          created_at?: string | null
          descripcion?: string
          fecha_gasto?: string
          id?: string
          monto?: number
          registrado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "gastos_brigada_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones_voluntarios: {
        Row: {
          area_interes: string | null
          brigada_id: string | null
          comentarios: string | null
          correo: string
          created_at: string | null
          estado: Database["public"]["Enums"]["estado_inscripcion"] | null
          id: string
          lugar: string | null
          nombre_completo: string
          profesion: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          area_interes?: string | null
          brigada_id?: string | null
          comentarios?: string | null
          correo: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_inscripcion"] | null
          id?: string
          lugar?: string | null
          nombre_completo: string
          profesion?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          area_interes?: string | null
          brigada_id?: string | null
          comentarios?: string | null
          correo?: string
          created_at?: string | null
          estado?: Database["public"]["Enums"]["estado_inscripcion"] | null
          id?: string
          lugar?: string | null
          nombre_completo?: string
          profesion?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscripciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
      lotes_medicamentos: {
        Row: {
          cantidad_actual: number
          cantidad_inicial: number | null
          created_at: string | null
          fabricante: string | null
          fecha_ingreso: string | null
          fecha_vencimiento: string
          id: string
          medicamento_id: string
          numero_lote: string
          observaciones: string | null
          updated_at: string | null
        }
        Insert: {
          cantidad_actual: number
          cantidad_inicial?: number | null
          created_at?: string | null
          fabricante?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento: string
          id?: string
          medicamento_id: string
          numero_lote: string
          observaciones?: string | null
          updated_at?: string | null
        }
        Update: {
          cantidad_actual?: number
          cantidad_inicial?: number | null
          created_at?: string | null
          fabricante?: string | null
          fecha_ingreso?: string | null
          fecha_vencimiento?: string
          id?: string
          medicamento_id?: string
          numero_lote?: string
          observaciones?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_medicamentos_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_medicamentos_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "stock_actual"
            referencedColumns: ["medicamento_id"]
          },
          {
            foreignKeyName: "lotes_medicamentos_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "v_medicamentos_disponibles"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          activo: boolean | null
          categoria_id: string
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          presentacion: string | null
          requiere_receta: boolean | null
          stock_actual: number
          stock_minimo: number | null
          tipo_recurso: string
          unidad_medida: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_id: string
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          presentacion?: string | null
          requiere_receta?: boolean | null
          stock_actual?: number
          stock_minimo?: number | null
          tipo_recurso?: string
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          presentacion?: string | null
          requiere_receta?: boolean | null
          stock_actual?: number
          stock_minimo?: number | null
          tipo_recurso?: string
          unidad_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos_consulta: {
        Row: {
          cantidad: number
          consulta_id: string
          id: string
          indicaciones: string | null
          medicamento_id: string
        }
        Insert: {
          cantidad: number
          consulta_id: string
          id?: string
          indicaciones?: string | null
          medicamento_id: string
        }
        Update: {
          cantidad?: number
          consulta_id?: string
          id?: string
          indicaciones?: string | null
          medicamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_consulta_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicamentos_consulta_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "medicamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicamentos_consulta_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "stock_actual"
            referencedColumns: ["medicamento_id"]
          },
          {
            foreignKeyName: "medicamentos_consulta_medicamento_id_fkey"
            columns: ["medicamento_id"]
            isOneToOne: false
            referencedRelation: "v_medicamentos_disponibles"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_inventario: {
        Row: {
          brigada_id: string | null
          cantidad: number
          fecha_movimiento: string | null
          id: string
          medicamento_id: string
          motivo: string | null
          observaciones: string | null
          tipo: string | null
          usuario_id: string | null
        }
        Insert: {
          brigada_id?: string | null
          cantidad: number
          fecha_movimiento?: string | null
          id?: string
          medicamento_id: string
          motivo?: string | null
          observaciones?: string | null
          tipo?: string | null
          usuario_id?: string | null
        }
        Update: {
          brigada_id?: string | null
          cantidad?: number
          fecha_movimiento?: string | null
          id?: string
          medicamento_id?: string
          motivo?: string | null
          observaciones?: string | null
          tipo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "movimientos_inventario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          actor_id: string | null
          created_at: string
          detalle: string | null
          enlace: string | null
          id: string
          permiso: string
          tipo: string
          titulo: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detalle?: string | null
          enlace?: string | null
          id?: string
          permiso: string
          tipo: string
          titulo: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detalle?: string | null
          enlace?: string | null
          id?: string
          permiso?: string
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      notificaciones_vistas: {
        Row: {
          perfil_id: string
          vistas_hasta: string
        }
        Insert: {
          perfil_id: string
          vistas_hasta?: string
        }
        Update: {
          perfil_id?: string
          vistas_hasta?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_vistas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          apellidos: string | null
          brigada_id: string
          codigo: string
          comunidad: string | null
          consulta_tomada_por: string | null
          created_at: string | null
          edad: number | null
          fecha_nacimiento: string | null
          id: string
          nombres: string
          responsable: string | null
          sexo: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          brigada_id: string
          codigo: string
          comunidad?: string | null
          consulta_tomada_por?: string | null
          created_at?: string | null
          edad?: number | null
          fecha_nacimiento?: string | null
          id?: string
          nombres: string
          responsable?: string | null
          sexo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          brigada_id?: string
          codigo?: string
          comunidad?: string | null
          consulta_tomada_por?: string | null
          created_at?: string | null
          edad?: number | null
          fecha_nacimiento?: string | null
          id?: string
          nombres?: string
          responsable?: string | null
          sexo?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "pacientes_consulta_tomada_por_fkey"
            columns: ["consulta_tomada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participaciones_voluntarios: {
        Row: {
          asignacion_id: string | null
          asistio: boolean
          brigada_id: string
          created_at: string | null
          hora_llegada: string | null
          hora_salida: string | null
          id: string
          observaciones: string | null
          perfil_id: string
          registrado_por: string | null
          updated_at: string | null
        }
        Insert: {
          asignacion_id?: string | null
          asistio?: boolean
          brigada_id: string
          created_at?: string | null
          hora_llegada?: string | null
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          perfil_id: string
          registrado_por?: string | null
          updated_at?: string | null
        }
        Update: {
          asignacion_id?: string | null
          asistio?: boolean
          brigada_id?: string
          created_at?: string | null
          hora_llegada?: string | null
          hora_salida?: string | null
          id?: string
          observaciones?: string | null
          perfil_id?: string
          registrado_por?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participaciones_voluntarios_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_voluntarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_voluntarios_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "participaciones_voluntarios_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participaciones_voluntarios_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participantes_actividad: {
        Row: {
          actividad_id: string
          cantidad_ninos: number
          created_at: string | null
          id: string
        }
        Insert: {
          actividad_id: string
          cantidad_ninos: number
          created_at?: string | null
          id?: string
        }
        Update: {
          actividad_id?: string
          cantidad_ninos?: number
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_actividad_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades_infantiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          especialidad_id: string | null
          fecha_nacimiento: string | null
          id: string
          nombre_completo: string
          rol_id: string
          sexo: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          especialidad_id?: string | null
          fecha_nacimiento?: string | null
          id: string
          nombre_completo: string
          rol_id?: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          especialidad_id?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre_completo?: string
          rol_id?: string
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfiles_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos_brigada: {
        Row: {
          brigada_id: string
          created_at: string | null
          id: string
          observaciones: string | null
          presupuesto_estimado: number
          updated_at: string | null
        }
        Insert: {
          brigada_id: string
          created_at?: string | null
          id?: string
          observaciones?: string | null
          presupuesto_estimado: number
          updated_at?: string | null
        }
        Update: {
          brigada_id?: string
          created_at?: string | null
          id?: string
          observaciones?: string | null
          presupuesto_estimado?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: true
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: true
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_brigada_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: true
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          categoria_id: string
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          precio: number
          stock: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria_id: string
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          precio: number
          stock?: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria_id?: string
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          precio?: number
          stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      rol_permisos: {
        Row: {
          permiso: string
          rol_id: string
        }
        Insert: {
          permiso: string
          rol_id: string
        }
        Update: {
          permiso?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rol_permisos_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string
          created_at: string
          descripcion: string | null
          es_predeterminado: boolean
          es_superadmin: boolean
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          descripcion?: string | null
          es_predeterminado?: boolean
          es_superadmin?: boolean
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          descripcion?: string | null
          es_predeterminado?: boolean
          es_superadmin?: boolean
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      signos_vitales: {
        Row: {
          created_at: string | null
          frecuencia_cardiaca: number | null
          frecuencia_respiratoria: number | null
          glucosa: number | null
          id: string
          observaciones: string | null
          paciente_id: string
          peso: number | null
          presion_arterial: string | null
          saturacion: number | null
          talla: number | null
          temperatura: number | null
        }
        Insert: {
          created_at?: string | null
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          glucosa?: number | null
          id?: string
          observaciones?: string | null
          paciente_id: string
          peso?: number | null
          presion_arterial?: string | null
          saturacion?: number | null
          talla?: number | null
          temperatura?: number | null
        }
        Update: {
          created_at?: string | null
          frecuencia_cardiaca?: number | null
          frecuencia_respiratoria?: number | null
          glucosa?: number | null
          id?: string
          observaciones?: string | null
          paciente_id?: string
          peso?: number | null
          presion_arterial?: string | null
          saturacion?: number | null
          talla?: number | null
          temperatura?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "signos_vitales_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signos_vitales_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "v_pacientes_atendidos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          brigada_id: string | null
          codigo: string
          created_at: string | null
          fecha: string | null
          id: string
          observaciones: string | null
          total: number | null
          vendedor_id: string | null
        }
        Insert: {
          brigada_id?: string | null
          codigo: string
          created_at?: string | null
          fecha?: string | null
          id?: string
          observaciones?: string | null
          total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          brigada_id?: string | null
          codigo?: string
          created_at?: string | null
          fecha?: string | null
          id?: string
          observaciones?: string | null
          total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
          {
            foreignKeyName: "ventas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voluntarios: {
        Row: {
          apellido: string
          created_at: string | null
          id: string
          mensaje: string | null
          nombre: string
          rol: string
          telefono: string
        }
        Insert: {
          apellido: string
          created_at?: string | null
          id?: string
          mensaje?: string | null
          nombre: string
          rol: string
          telefono: string
        }
        Update: {
          apellido?: string
          created_at?: string | null
          id?: string
          mensaje?: string | null
          nombre?: string
          rol?: string
          telefono?: string
        }
        Relationships: []
      }
    }
    Views: {
      alertas_vencimiento: {
        Row: {
          cantidad_actual: number | null
          dias_restantes: number | null
          estado_vencimiento: string | null
          fecha_vencimiento: string | null
          lote_id: string | null
          medicamento_nombre: string | null
          numero_lote: string | null
        }
        Relationships: []
      }
      dashboard_actividades: {
        Row: {
          actividades: number | null
          ninos_beneficiados: number | null
        }
        Relationships: []
      }
      dashboard_brigadas: {
        Row: {
          capacidad_voluntarios: number | null
          dias_faltantes: number | null
          estado: Database["public"]["Enums"]["estado_brigada"] | null
          fecha_brigada: string | null
          id: string | null
          lugar: string | null
          nombre: string | null
        }
        Relationships: []
      }
      dashboard_farmacia: {
        Row: {
          pacientes_atendidos: number | null
          total_entregas: number | null
          total_unidades_entregadas: number | null
        }
        Relationships: []
      }
      dashboard_inventario: {
        Row: {
          lotes_proximos_vencer: number | null
          lotes_vencidos: number | null
          medicamentos_stock_bajo: number | null
          total_medicamentos: number | null
          unidades_totales: number | null
        }
        Relationships: []
      }
      dashboard_pacientes: {
        Row: {
          hombres: number | null
          mujeres: number | null
          pacientes: number | null
        }
        Relationships: []
      }
      dashboard_ropa: {
        Row: {
          pacientes_beneficiados: number | null
          prendas_entregadas: number | null
        }
        Relationships: []
      }
      dashboard_ventas: {
        Row: {
          ingresos: number | null
          promedio_venta: number | null
          ventas: number | null
        }
        Relationships: []
      }
      dashboard_voluntarios: {
        Row: {
          logistica: number | null
          nuevos_este_ano: number | null
          profesionales_salud: number | null
          total_inscritos: number | null
        }
        Relationships: []
      }
      estadisticas_inventario: {
        Row: {
          anio: number | null
          mes: number | null
          tipo: string | null
          total_movimientos: number | null
        }
        Relationships: []
      }
      stock_actual: {
        Row: {
          categoria_id: string | null
          codigo: string | null
          descripcion: string | null
          estado_stock: string | null
          medicamento_id: string | null
          nombre: string | null
          stock_minimo: number | null
          stock_total: number | null
          tipo_recurso: string | null
          unidad_medida: string | null
        }
        Relationships: []
      }
      v_actividad_reciente: {
        Row: {
          created_at: string | null
          descripcion: string | null
          tipo: string | null
        }
        Relationships: []
      }
      v_alertas_sistema: {
        Row: {
          detalle: string | null
          icono: string | null
          mensaje: string | null
          prioridad: number | null
        }
        Relationships: []
      }
      v_entregas_farmacia: {
        Row: {
          brigada_id: string | null
          cantidad: number | null
          entregado_por: string | null
          fecha_entrega: string | null
          fecha_vencimiento: string | null
          id: string | null
          medicamento: string | null
          numero_lote: string | null
          paciente: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
      v_medicamentos_disponibles: {
        Row: {
          disponible: number | null
          id: string | null
          nombre: string | null
          presentacion: string | null
          unidad_medida: string | null
        }
        Relationships: []
      }
      v_pacientes_atendidos: {
        Row: {
          brigada: string | null
          brigada_id: string | null
          codigo: string | null
          created_at: string | null
          estado: string | null
          id: string | null
          medico: string | null
          paciente: string | null
          tipo_consulta: string | null
          tomado_por: string | null
          tomado_por_mi: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pacientes_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
      v_reporte_insumos_brigada: {
        Row: {
          brigada_id: string | null
          brigada_nombre: string | null
          comunidad: string | null
          fecha: string | null
          total_general: number | null
          total_juguetes: number | null
          total_medicamentos: number | null
          total_ropa: number | null
        }
        Relationships: []
      }
      v_resumen_brigadas_anual: {
        Row: {
          anio: number | null
          comunidades_atendidas: number | null
          promedio_pacientes_por_brigada: number | null
          total_brigadas: number | null
          total_pacientes: number | null
        }
        Relationships: []
      }
      v_resumen_financiero_mensual: {
        Row: {
          anio: number | null
          cantidad_donaciones: number | null
          cantidad_ventas: number | null
          mes: number | null
          total_donaciones: number | null
          total_general: number | null
          total_ventas: number | null
        }
        Relationships: []
      }
      v_resumen_ropa: {
        Row: {
          prendas_donadas: number | null
          prendas_entregadas: number | null
        }
        Relationships: []
      }
      v_ventas: {
        Row: {
          brigada_id: string | null
          codigo: string | null
          fecha: string | null
          id: string | null
          total: number | null
          vendedor: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "dashboard_brigadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_brigada_id_fkey"
            columns: ["brigada_id"]
            isOneToOne: false
            referencedRelation: "v_reporte_insumos_brigada"
            referencedColumns: ["brigada_id"]
          },
        ]
      }
    }
    Functions: {
      correos_aviso: { Args: { p_aviso: string }; Returns: string[] }
      cupos_ocupados: { Args: { p_brigada: string }; Returns: number }
      eliminar_rol: {
        Args: { p_destino: string; p_id: string }
        Returns: undefined
      }
      es_superadmin: { Args: never; Returns: boolean }
      es_usuario_panel: { Args: never; Returns: boolean }
      generar_codigo_brigada: { Args: { fecha: string }; Returns: string }
      guardar_rol: {
        Args: {
          p_color: string
          p_descripcion: string
          p_id: string
          p_nombre: string
          p_permisos: string[]
          p_predeterminado: boolean
        }
        Returns: string
      }
      marcar_notificaciones_vistas: { Args: never; Returns: undefined }
      notificar: {
        Args: {
          p_tipo: string
          p_titulo: string
          p_detalle?: string | null
          p_enlace?: string | null
          p_permiso?: string | null
          p_actor_id?: string | null
          p_para_todos?: boolean | null
        }
        Returns: undefined
      }
      rol_predeterminado_id: { Args: never; Returns: string }
      sp_confirmar_participacion: {
        Args: {
          p_brigada: string
          p_hora_llegada: string
          p_hora_salida: string
          p_observaciones: string
          p_perfil: string
          p_registrado_por: string
        }
        Returns: string
      }
      tiene_algun_permiso: { Args: { p_permisos: string[] }; Returns: boolean }
      tiene_permiso: { Args: { p_permiso: string }; Returns: boolean }
      usuarios_con_correo: {
        Args: never
        Returns: {
          activo: boolean
          email: string
          id: string
          nombre: string
        }[]
      }
    }
    Enums: {
      area_voluntariado:
        | "registro"
        | "preclinica"
        | "consulta_medica"
        | "consulta_odontologica"
        | "farmacia"
        | "postclinica"
        | "ropa"
        | "actividades"
        | "logistica"
        | "coordinacion"
      categoria_gasto:
        | "medicamentos"
        | "alimentacion"
        | "combustible"
        | "material_medico"
        | "papeleria"
        | "publicidad"
        | "otros"
      estado_brigada:
        | "planificacion"
        | "inscripciones_abiertas"
        | "inscripciones_cerradas"
        | "en_preparacion"
        | "finalizada"
        | "cancelada"
      estado_inscripcion: "pendiente" | "aceptado" | "rechazado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      area_voluntariado: [
        "registro",
        "preclinica",
        "consulta_medica",
        "consulta_odontologica",
        "farmacia",
        "postclinica",
        "ropa",
        "actividades",
        "logistica",
        "coordinacion",
      ],
      categoria_gasto: [
        "medicamentos",
        "alimentacion",
        "combustible",
        "material_medico",
        "papeleria",
        "publicidad",
        "otros",
      ],
      estado_brigada: [
        "planificacion",
        "inscripciones_abiertas",
        "inscripciones_cerradas",
        "en_preparacion",
        "finalizada",
        "cancelada",
      ],
      estado_inscripcion: ["pendiente", "aceptado", "rechazado"],
    },
  },
} as const

