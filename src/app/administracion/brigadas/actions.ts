"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { assertPermission } from "@/lib/auth/session";
import { aceptarSolicitudVoluntario } from "@/lib/cuentas";
import { Constants, type Enums } from "@/lib/database.types";
import type { EstadoBrigada } from "@/lib/db/brigadas";
import { errorInfo, getLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const logger = getLogger("brigadas");

// Helper helper to get authenticated supabase client
async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Debes iniciar sesión para realizar esta acción.");
  }

  return supabase;
}

// Revalidate all pages showing brigade information
function revalidateBrigadas() {
  revalidatePath("/administracion/brigadas");
  revalidatePath("/brigadas");
  revalidatePath("/voluntariado");
}

export async function getBrigadasAction() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("brigadas")
    .select("*")
    .order("fecha_brigada", { ascending: false });

  if (error) logger.error("Brigades fetch failed", errorInfo(error));
  return { data: data ?? null, error: error?.message ?? null };
}

// Helper para autogenerar código consecutivo de brigada (Capítulo 15 - Regla de comparación y composición)
export async function generarCodigoBrigada(
  fechaStr?: string
): Promise<{ codigo: string; error: string | null }> {
  try {
    const supabase = await getAuthedSupabase();

    // 1. Extraer el año base
    let currentYear = new Date().getFullYear();
    if (fechaStr) {
      const parsed = new Date(fechaStr);
      if (!Number.isNaN(parsed.getTime())) {
        currentYear = parsed.getFullYear();
      }
    }

    // 2. Correlativo global continuo (se mantiene la secuencia sin importar el año)
    const { data: brigadas } = await supabase.from("brigadas").select("codigo");

    let maxNum = 0;
    if (brigadas && brigadas.length > 0) {
      brigadas.forEach((b) => {
        const matches = b.codigo.match(/\d+/g);
        if (matches && matches.length > 0) {
          const lastNum = parseInt(matches[matches.length - 1], 10);
          if (!Number.isNaN(lastNum) && lastNum > maxNum) {
            maxNum = lastNum;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    const codigo = `BRIG-${currentYear}-${String(nextNum).padStart(3, "0")}`;
    return { codigo, error: null };
  } catch (e) {
    logger.warning("Brigade code generation failed", errorInfo(e));
    return {
      codigo: `BRIG-${new Date().getFullYear()}-001`,
      error: e instanceof Error ? e.message : "Error al autogenerar código.",
    };
  }
}

// 1. Crear Brigada
export async function crearBrigada(data: {
  codigo?: string;
  nombre: string;
  descripcion?: string | null;
  lugar: string;
  municipio: string;
  departamento: string;
  fecha_brigada: string; // ISO String
  fecha_inicio_inscripcion: string;
  fecha_fin_inscripcion: string;
  estado: EstadoBrigada;
  capacidad_voluntarios?: number | null;
  imagen_banner?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  presupuesto_estimado: number;
}) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_CREATE);
    const supabase = await getAuthedSupabase();

    // Prueba 7: Comparación con datos almacenados (verificar duplicado por nombre)
    const { data: existingName } = await supabase
      .from("brigadas")
      .select("id, nombre")
      .ilike("nombre", data.nombre.trim())
      .maybeSingle();

    if (existingName) {
      // se devuelve sin pasar por el catch para no llevar el nombre al log
      logger.warning("Brigade creation rejected", { reason: "duplicate name" });
      return {
        error: `Ya existe una brigada registrada con el nombre "${data.nombre.trim()}".`,
      };
    }

    // Autogenerar código si no fue provisto
    let finalCodigo = data.codigo?.trim().toUpperCase();
    if (!finalCodigo) {
      const genRes = await generarCodigoBrigada(data.fecha_brigada);
      finalCodigo = genRes.codigo;
    }

    const id = randomUUID();

    // 1. Insert brigade
    const { error: bError } = await supabase.from("brigadas").insert({
      id,
      codigo: finalCodigo,
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || null,
      lugar: data.lugar.trim(),
      municipio: data.municipio.trim(),
      departamento: data.departamento.trim(),
      fecha_brigada: data.fecha_brigada,
      fecha_inicio_inscripcion: data.fecha_inicio_inscripcion,
      fecha_fin_inscripcion: data.fecha_fin_inscripcion,
      estado: data.estado,
      capacidad_voluntarios: data.capacidad_voluntarios || null,
      imagen_banner: data.imagen_banner || null,
      latitud: data.latitud || null,
      longitud: data.longitud || null,
    });

    if (bError) {
      if (
        bError.message.includes("duplicate") ||
        bError.message.includes("unique")
      ) {
        throw new Error(
          `Ya existe una brigada con el código "${finalCodigo}".`
        );
      }
      logger.error("Brigade insert failed", errorInfo(bError));
      return { error: "No se pudo crear la brigada." };
    }

    // 2. Insert budget record
    const { error: pError } = await supabase
      .from("presupuestos_brigada")
      .insert({
        brigada_id: id,
        presupuesto_estimado: data.presupuesto_estimado || 0,
      });

    if (pError) {
      logger.warning("Brigade budget initialization failed", {
        ...errorInfo(pError),
        brigadaId: id,
      });
    }

    revalidateBrigadas();
    logger.info("Brigade created", {
      brigadaId: id,
      codigo: finalCodigo,
      estado: data.estado,
    });
    return { success: true, id, codigo: finalCodigo };
  } catch (e) {
    logger.warning("Brigade creation failed", errorInfo(e));
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error desconocido al crear la brigada.",
    };
  }
}

// 2. Editar Brigada
export async function editarBrigada(
  id: string,
  data: {
    nombre: string;
    descripcion?: string | null;
    lugar: string;
    municipio: string;
    departamento: string;
    fecha_brigada: string;
    fecha_inicio_inscripcion: string;
    fecha_fin_inscripcion: string;
    estado: EstadoBrigada;
    capacidad_voluntarios?: number | null;
    imagen_banner?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    presupuesto_estimado: number;
  }
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    if (!id) {
      throw new Error("ID de brigada no proporcionado.");
    }

    // Verificar nombre duplicado en otra brigada
    const { data: existingName } = await supabase
      .from("brigadas")
      .select("id, nombre")
      .ilike("nombre", data.nombre.trim())
      .neq("id", id)
      .maybeSingle();

    if (existingName) {
      // se devuelve sin pasar por el catch para no llevar el nombre al log
      logger.warning("Brigade update rejected", {
        reason: "duplicate name",
        brigadaId: id,
      });
      return {
        error: `Ya existe otra brigada registrada con el nombre "${data.nombre.trim()}".`,
      };
    }

    // 1. Update brigade details (no modificar código)
    const { error: bError } = await supabase
      .from("brigadas")
      .update({
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        lugar: data.lugar.trim(),
        municipio: data.municipio.trim(),
        departamento: data.departamento.trim(),
        fecha_brigada: data.fecha_brigada,
        fecha_inicio_inscripcion: data.fecha_inicio_inscripcion,
        fecha_fin_inscripcion: data.fecha_fin_inscripcion,
        estado: data.estado,
        capacidad_voluntarios: data.capacidad_voluntarios || null,
        imagen_banner: data.imagen_banner || null,
        latitud: data.latitud || null,
        longitud: data.longitud || null,
      })
      .eq("id", id);

    if (bError) {
      logger.error("Brigade update failed", {
        ...errorInfo(bError),
        brigadaId: id,
      });
      return { error: "No se pudo actualizar la brigada." };
    }

    // 2. Upsert estimated budget
    const { data: existingBudget } = await supabase
      .from("presupuestos_brigada")
      .select("id")
      .eq("brigada_id", id)
      .maybeSingle();

    if (existingBudget) {
      const { error: pError } = await supabase
        .from("presupuestos_brigada")
        .update({
          presupuesto_estimado: data.presupuesto_estimado || 0,
        })
        .eq("id", existingBudget.id);

      if (pError) {
        logger.error("Brigade budget update failed", {
          ...errorInfo(pError),
          brigadaId: id,
        });
        return { error: "No se pudo actualizar el presupuesto." };
      }
    } else {
      const { error: pError } = await supabase
        .from("presupuestos_brigada")
        .insert({
          brigada_id: id,
          presupuesto_estimado: data.presupuesto_estimado || 0,
        });

      if (pError) {
        logger.error("Brigade budget initialization failed", {
          ...errorInfo(pError),
          brigadaId: id,
        });
        return { error: "No se pudo inicializar el presupuesto." };
      }
    }

    revalidateBrigadas();
    logger.info("Brigade updated", { brigadaId: id, estado: data.estado });
    return { success: true };
  } catch (e) {
    logger.warning("Brigade edit failed", { ...errorInfo(e), brigadaId: id });
    return {
      error: e instanceof Error ? e.message : "Error al editar la brigada.",
    };
  }
}

// 3. Eliminar Brigada
export async function eliminarBrigada(id: string) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_DELETE);
    const supabase = await getAuthedSupabase();

    const { error } = await supabase.from("brigadas").delete().eq("id", id);

    if (error) {
      logger.error("Brigade delete failed", {
        ...errorInfo(error),
        brigadaId: id,
      });
      return { error: "No se pudo eliminar la brigada." };
    }

    revalidateBrigadas();
    logger.info("Brigade deleted", { brigadaId: id });
    return { success: true };
  } catch (e) {
    logger.warning("Brigade deletion failed", {
      ...errorInfo(e),
      brigadaId: id,
    });
    return {
      error: e instanceof Error ? e.message : "Error al eliminar la brigada.",
    };
  }
}

// 4. Registrar, editar o eliminar Gasto (CRUD completo)
export async function registrarGasto(
  data: {
    id?: string;
    brigada_id: string;
    categoria: Enums<"categoria_gasto">;
    descripcion: string;
    monto: number;
    fecha_gasto: string; // ISO Date String
  },
  isDelete = false
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    if (isDelete) {
      if (!data.id) throw new Error("ID de gasto requerido para eliminar.");
      const { error } = await supabase
        .from("gastos_brigada")
        .delete()
        .eq("id", data.id);
      if (error) {
        logger.error("Brigade expense delete failed", {
          ...errorInfo(error),
          gastoId: data.id,
        });
        return { error: "No se pudo eliminar el gasto." };
      }
      logger.info("Brigade expense deleted", { gastoId: data.id });
    } else if (data.id) {
      const { error } = await supabase
        .from("gastos_brigada")
        .update({
          categoria: data.categoria,
          descripcion: data.descripcion.trim(),
          monto: data.monto,
          fecha_gasto: data.fecha_gasto,
        })
        .eq("id", data.id);
      if (error) {
        logger.error("Brigade expense update failed", {
          ...errorInfo(error),
          gastoId: data.id,
        });
        return { error: "No se pudo actualizar el gasto." };
      }
      logger.info("Brigade expense updated", { gastoId: data.id });
    } else {
      const { error } = await supabase.from("gastos_brigada").insert({
        brigada_id: data.brigada_id,
        categoria: data.categoria,
        descripcion: data.descripcion.trim(),
        monto: data.monto,
        fecha_gasto: data.fecha_gasto,
      });
      if (error) {
        logger.error("Brigade expense insert failed", {
          ...errorInfo(error),
          brigadaId: data.brigada_id,
        });
        return { error: "No se pudo registrar el gasto." };
      }
      logger.info("Brigade expense created", {
        brigadaId: data.brigada_id,
        categoria: data.categoria,
      });
    }

    revalidateBrigadas();
    return { success: true };
  } catch (e) {
    logger.warning("Brigade expense change failed", {
      ...errorInfo(e),
      brigadaId: data.brigada_id,
    });
    return {
      error: e instanceof Error ? e.message : "Error al registrar el gasto.",
    };
  }
}

// 5. Actualizar Presupuesto Estimado
export async function actualizarPresupuesto(
  brigadaId: string,
  nuevoMonto: number
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    const { data: existingBudget } = await supabase
      .from("presupuestos_brigada")
      .select("id")
      .eq("brigada_id", brigadaId)
      .maybeSingle();

    if (existingBudget) {
      const { error } = await supabase
        .from("presupuestos_brigada")
        .update({ presupuesto_estimado: nuevoMonto })
        .eq("id", existingBudget.id);
      if (error) {
        logger.error("Brigade budget update failed", {
          ...errorInfo(error),
          brigadaId,
        });
        return { error: "No se pudo actualizar el presupuesto." };
      }
    } else {
      const { error } = await supabase.from("presupuestos_brigada").insert({
        brigada_id: brigadaId,
        presupuesto_estimado: nuevoMonto,
      });
      if (error) {
        logger.error("Brigade budget insert failed", {
          ...errorInfo(error),
          brigadaId,
        });
        return { error: "No se pudo registrar el presupuesto." };
      }
    }

    revalidateBrigadas();
    logger.info("Brigade budget updated", { brigadaId });
    return { success: true };
  } catch (e) {
    logger.warning("Brigade budget change failed", {
      ...errorInfo(e),
      brigadaId,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al actualizar el presupuesto.",
    };
  }
}

// 6. Aceptar Inscripción: crea la cuenta del voluntario y le envía su acceso
export async function aceptarInscripcion(inscripcionId: string) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    await aceptarSolicitudVoluntario(inscripcionId);

    revalidateBrigadas();
    return { success: true };
  } catch (e) {
    logger.warning("Registration acceptance failed", {
      ...errorInfo(e),
      inscripcionId,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al aceptar la inscripción.",
    };
  }
}

// 7. Rechazar Inscripción
export async function rechazarInscripcion(inscripcionId: string) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    const { error } = await supabase
      .from("inscripciones_voluntarios")
      .update({ estado: "rechazado" })
      .eq("id", inscripcionId);

    if (error) {
      logger.error("Registration rejection update failed", {
        ...errorInfo(error),
        inscripcionId,
      });
      return { error: "No se pudo rechazar la inscripción." };
    }

    revalidateBrigadas();
    logger.info("Registration rejected", { inscripcionId });
    return { success: true };
  } catch (e) {
    logger.warning("Registration rejection failed", {
      ...errorInfo(e),
      inscripcionId,
    });
    return {
      error:
        e instanceof Error ? e.message : "Error al rechazar la inscripción.",
    };
  }
}

// 8. Asignar Voluntario a Área
export async function asignarVoluntario(
  brigadaId: string,
  perfilId: string,
  areaAsignada: string | null
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    if (!areaAsignada || areaAsignada === "none") {
      // Eliminar asignación si es nula o "none"
      const { error } = await supabase
        .from("asignaciones_voluntarios")
        .delete()
        .eq("brigada_id", brigadaId)
        .eq("perfil_id", perfilId);

      if (error) {
        logger.error("Volunteer assignment delete failed", {
          ...errorInfo(error),
          brigadaId,
          perfilId,
        });
        return { error: "No se pudo quitar la asignación." };
      }
    } else {
      const area = Constants.public.Enums.area_voluntariado.find(
        (value) => value === areaAsignada
      );
      if (!area) {
        logger.warning("Volunteer assignment rejected", {
          reason: "invalid area",
          brigadaId,
          perfilId,
        });
        return { error: "Selecciona un área válida." };
      }

      // Upsert asignación
      const { data: existingAssignment } = await supabase
        .from("asignaciones_voluntarios")
        .select("id")
        .eq("brigada_id", brigadaId)
        .eq("perfil_id", perfilId)
        .maybeSingle();

      if (existingAssignment) {
        const { error } = await supabase
          .from("asignaciones_voluntarios")
          .update({ area_asignada: area })
          .eq("id", existingAssignment.id);
        if (error) {
          logger.error("Volunteer assignment update failed", {
            ...errorInfo(error),
            asignacionId: existingAssignment.id,
          });
          return { error: "No se pudo actualizar la asignación." };
        }
      } else {
        const { error } = await supabase
          .from("asignaciones_voluntarios")
          .insert({
            brigada_id: brigadaId,
            perfil_id: perfilId,
            area_asignada: area,
          });
        if (error) {
          logger.error("Volunteer assignment insert failed", {
            ...errorInfo(error),
            brigadaId,
            perfilId,
          });
          return { error: "No se pudo crear la asignación." };
        }
      }
    }

    revalidateBrigadas();
    logger.info("Volunteer assignment saved", {
      brigadaId,
      perfilId,
      areaAsignada,
    });
    return { success: true };
  } catch (e) {
    logger.warning("Volunteer assignment failed", {
      ...errorInfo(e),
      brigadaId,
      perfilId,
    });
    return {
      error: e instanceof Error ? e.message : "Error al asignar el voluntario.",
    };
  }
}

// 9. Subir Imagen a Supabase Storage y registrar en BD (Server Action autenticada)
export async function subirImagenBrigadaStorageAction(formData: FormData) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    const brigadaId = formData.get("brigadaId") as string;
    const brigadaCodigo = formData.get("brigadaCodigo") as string;
    const isCover = formData.get("portada") === "true";
    const file = formData.get("file") as File;

    if (!brigadaId || !brigadaCodigo || !file) {
      throw new Error("Parámetros faltantes para la subida de imagen.");
    }

    // 1. Generar ruta y nombre en el bucket
    const baseName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-]/g, "_");
    const fileName = `${Date.now()}-${baseName}.jpg`;
    const storagePath = `${brigadaCodigo}/${fileName}`;

    // 2. Subir archivo a Supabase Storage con cliente autenticado de servidor (bypass RLS de cliente anon)
    const { error: uploadError } = await supabase.storage
      .from("brigadas")
      .upload(storagePath, file, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      logger.error("Gallery storage upload failed", {
        ...errorInfo(uploadError),
        brigadaId,
        size: file.size,
      });
      return { error: "No se pudo subir la imagen." };
    }

    // 3. Obtener orden máximo para la nueva imagen
    const { data: currentImages } = await supabase
      .from("brigada_imagenes")
      .select("orden")
      .eq("brigada_id", brigadaId);

    const maxOrden =
      currentImages && currentImages.length > 0
        ? Math.max(...currentImages.map((img) => img.orden || 0))
        : 0;

    // 4. Si se seleccionó como portada, desmarcar portadas anteriores
    if (isCover) {
      await supabase
        .from("brigada_imagenes")
        .update({ portada: false })
        .eq("brigada_id", brigadaId);
    }

    // 5. Registrar metadatos en la base de datos
    const { error: dbError } = await supabase.from("brigada_imagenes").insert({
      brigada_id: brigadaId,
      nombre_archivo: fileName,
      storage_path: storagePath,
      portada: isCover,
      orden: maxOrden + 1,
    });

    if (dbError) {
      logger.error("Gallery image insert failed", {
        ...errorInfo(dbError),
        brigadaId,
      });
      return { error: "No se pudo registrar la imagen." };
    }

    revalidateBrigadas();
    logger.info("Gallery image uploaded", {
      brigadaId,
      portada: isCover,
      size: file.size,
    });
    return { success: true, fileName };
  } catch (e) {
    logger.warning("Gallery upload failed", errorInfo(e));
    return {
      error: e instanceof Error ? e.message : "Error al subir la imagen.",
    };
  }
}

// 9b. Subir Imagen (compatibilidad con metadatos)
export async function subirImagenBrigada(
  brigadaId: string,
  nombreArchivo: string,
  portada = false
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    const { data: currentImages } = await supabase
      .from("brigada_imagenes")
      .select("orden")
      .eq("brigada_id", brigadaId);

    const maxOrden =
      currentImages && currentImages.length > 0
        ? Math.max(...currentImages.map((img) => img.orden || 0))
        : 0;

    if (portada) {
      await supabase
        .from("brigada_imagenes")
        .update({ portada: false })
        .eq("brigada_id", brigadaId);
    }

    const { error } = await supabase.from("brigada_imagenes").insert({
      brigada_id: brigadaId,
      nombre_archivo: nombreArchivo,
      storage_path: nombreArchivo,
      portada,
      orden: maxOrden + 1,
    });

    if (error) {
      logger.error("Gallery metadata insert failed", {
        ...errorInfo(error),
        brigadaId,
      });
      return { error: "No se pudieron guardar los metadatos de la imagen." };
    }

    revalidateBrigadas();
    logger.info("Gallery image registered", { brigadaId, portada });
    return { success: true };
  } catch (e) {
    logger.warning("Gallery image registration failed", {
      ...errorInfo(e),
      brigadaId,
    });
    return {
      error: e instanceof Error ? e.message : "Error al guardar imagen en DB.",
    };
  }
}

// 10. Eliminar Imagen de Storage y Base de Datos (Server Action autenticada)
export async function eliminarImagenBrigada(
  imageId: string,
  brigadaCodigo?: string,
  nombreArchivo?: string
) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    // Si se proveen código y nombre de archivo, eliminar también el archivo físico en Storage
    if (brigadaCodigo && nombreArchivo) {
      const storagePath = `${brigadaCodigo}/${nombreArchivo}`;
      const { error: storageError } = await supabase.storage
        .from("brigadas")
        .remove([storagePath]);

      if (storageError) {
        logger.warning("Gallery file removal failed", {
          ...errorInfo(storageError),
          imageId,
        });
      }
    }

    // Eliminar registro referencial de la BD
    const { error: dbError } = await supabase
      .from("brigada_imagenes")
      .delete()
      .eq("id", imageId);

    if (dbError) {
      logger.error("Gallery image delete failed", {
        ...errorInfo(dbError),
        imageId,
      });
      return { error: "No se pudo eliminar la imagen." };
    }

    revalidateBrigadas();
    logger.info("Gallery image deleted", { imageId });
    return { success: true };
  } catch (e) {
    logger.warning("Gallery image deletion failed", {
      ...errorInfo(e),
      imageId,
    });
    return {
      error: e instanceof Error ? e.message : "Error al eliminar la imagen.",
    };
  }
}

// 11. Cambiar Portada
export async function cambiarPortada(brigadaId: string, imageId: string) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    // 1. Quitar todas las portadas
    const { error: resetError } = await supabase
      .from("brigada_imagenes")
      .update({ portada: false })
      .eq("brigada_id", brigadaId);

    if (resetError) {
      logger.error("Gallery cover reset failed", {
        ...errorInfo(resetError),
        brigadaId,
      });
      return { error: "No se pudieron quitar las portadas anteriores." };
    }

    // 2. Activar la seleccionada
    const { error: setPortadaError } = await supabase
      .from("brigada_imagenes")
      .update({ portada: true })
      .eq("id", imageId);

    if (setPortadaError) {
      logger.error("Gallery cover update failed", {
        ...errorInfo(setPortadaError),
        imageId,
      });
      return { error: "No se pudo establecer la portada." };
    }

    revalidateBrigadas();
    logger.info("Gallery cover changed", { brigadaId, imageId });
    return { success: true };
  } catch (e) {
    logger.warning("Gallery cover change failed", {
      ...errorInfo(e),
      brigadaId,
    });
    return {
      error:
        e instanceof Error
          ? e.message
          : "Error al cambiar la portada de la brigada.",
    };
  }
}

// 12. Reordenar Galería
export async function reordenarGaleria(imageIds: string[]) {
  try {
    await assertPermission(PERMISSIONS.BRIGADAS_UPDATE);
    const supabase = await getAuthedSupabase();

    // Execute sequential updates for each image order
    for (let i = 0; i < imageIds.length; i++) {
      const { error } = await supabase
        .from("brigada_imagenes")
        .update({ orden: i + 1 })
        .eq("id", imageIds[i]);

      if (error) {
        logger.error("Gallery order update failed", {
          ...errorInfo(error),
          imageId: imageIds[i],
        });
        return { error: "No se pudo reordenar la galería." };
      }
    }

    revalidateBrigadas();
    logger.info("Gallery reordered", { count: imageIds.length });
    return { success: true };
  } catch (e) {
    logger.warning("Gallery reorder failed", errorInfo(e));
    return {
      error: e instanceof Error ? e.message : "Error al reordenar la galería.",
    };
  }
}
