/* =========================================================
   CabeceraImputaciones - JS UNIFICADO (WebPages / Power Pages)
   Incluye (sin simplificar) el contenido original de:
   constants.js, state.js, utils.js, api.js, actions.js, render.js, main.js
   Orden de carga respetado.
   Generado: 2026-03-13
   ========================================================= */

/* ===================== constants.js ===================== */
// ========================================
// CONSTANTES GLOBALES DE CABECERA
//
// Centraliza solo rutas y configuraciones fijas
// reutilizadas por la pantalla.
// ========================================

const CONFIG_URLS = {
    create: "/Imputacion-Prueba2_0/",
    edit: "/Imputacion-Prueba2_0/",
    copy: "/copiar-imputacion?id=",
};

const CSV_FILENAME = "registros_imputacion.csv";

/* ===================== state.js ===================== */
// ========================================
// ESTADO GLOBAL DE LA APLICACION
//
// Mantiene los datos de tabla, filtros, ordenacion,
// dialogos y referencias cacheadas del DOM.
// ========================================

var records = [];
var searchQuery = "";
var recordToDeleteId = null;
var recordToCopyId = null;
var isLoading = true;
var loadErrorMessage = "";
var deleteDialog = null;
var copyDialog = null;
var isDeletingRecord = false;
var isNavigatingToCopy = false;

var sortState = {
    key: null,
    direction: "asc",
    type: "text",
};

var dom = {
    tableBody: null,
    tableWrap: null,
    table: null,
    searchInput: null,
    createButton: null,
    downloadButton: null,
    deleteDialogElement: null,
    deleteRecordInfo: null,
    confirmDeleteButton: null,
    copyDialogElement: null,
    copyRecordInfo: null,
    confirmCopyButton: null,
    contactIdInput: null,
    userIdInput: null,
    userNameInput: null,
    sortButtons: [],
};

/**
 * Modelo normalizado de una cabecera mostrada en la tabla.
 *
 * @typedef {Object} CabeceraRecord
 * @property {string} id Identificador unico del registro.
 * @property {string} fechaInicio Fecha de inicio en formato ISO.
 * @property {string} fechaFin Fecha de fin en formato ISO.
 * @property {string} estadoAprobacion Estado visible del registro.
 * @property {string} contacto Nombre del contacto asociado.
 * @property {number} totalHoras Total de horas imputadas.
 */

/**
 * Contexto minimo del usuario logeado en Power Pages.
 *
 * @typedef {Object} PortalUserContext
 * @property {string} contactId Id del contacto del portal.
 * @property {string} userId Id del usuario autenticado.
 * @property {string} userName Nombre completo del usuario.
 */

/* ===================== utils.js ===================== */
// ========================================
// UTILIDADES GENERALES
//
// Reune helpers de formato, normalizacion y lectura
// segura de valores provenientes del DOM y la Web API.
// ========================================

/**
 * Rehidrata los iconos de Lucide despues de renderizar HTML dinamico.
 */
function refreshIcons() {
    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
}

/**
 * Escapa caracteres HTML para evitar inyeccion al pintar texto en la UI.
 *
 * @param {*} value Valor original a escapar.
 * @returns {string} Texto seguro para insertar en HTML.
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Convierte una fecha ISO al formato visual dd/MM/yyyy.
 *
 * @param {*} value Fecha original.
 * @returns {string} Fecha lista para mostrar en pantalla.
 */
function formatDateDisplay(value) {
    const text = String(value || "").trim();
    if (!text) return "-";

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return text;

    return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Formatea un numero de horas para mostrarlo con sufijo "h".
 *
 * @param {*} value Numero original de horas.
 * @returns {string} Texto formateado para la columna de horas.
 */
function formatHourDisplay(value) {
    const numeric = Number(value || 0);
    if (!(numeric > 0)) return "-";

    return `${numeric.toLocaleString("es-ES", {
        minimumFractionDigits: numeric % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
    })}h`;
}

/**
 * Limpia un GUID eliminando espacios y llaves.
 *
 * @param {*} value GUID original.
 * @returns {string} GUID normalizado.
 */
function sanitizeGuid(value) {
    return String(value || "")
        .trim()
        .replace(/[{}]/g, "");
}

/**
 * Normaliza un texto para comparaciones y busquedas.
 *
 * @param {*} value Texto original.
 * @returns {string} Texto en minusculas y sin espacios sobrantes.
 */
function normalizeText(value) {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase("es-ES");
}

/**
 * Obtiene el valor numerico de una fecha para poder ordenarla.
 *
 * @param {*} value Fecha original.
 * @returns {number} Timestamp de la fecha o un minimo si no es valida.
 */
function getDateSortValue(value) {
    const text = String(value || "").trim();
    if (!text) return Number.NEGATIVE_INFINITY;

    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * Convierte un valor a numero para ordenacion numerica.
 *
 * @param {*} value Valor original.
 * @returns {number} Numero resultante o un minimo si no es valido.
 */
function getNumberSortValue(value) {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? Number.NEGATIVE_INFINITY : numeric;
}

/**
 * Normaliza una fecha de la API al formato ISO yyyy-MM-dd.
 *
 * @param {*} value Fecha original en cualquier formato soportado.
 * @returns {string} Fecha normalizada o el texto original si no se puede convertir.
 */
function normalizeApiDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return text;
    }

    const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) {
        return isoMatch[1];
    }

    const localMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (localMatch) {
        return `${localMatch[3]}-${localMatch[2]}-${localMatch[1]}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Calcula una fecha fin laboral sumando 4 dias a la fecha de inicio.
 *
 * @param {*} startDate Fecha de inicio base.
 * @returns {string} Fecha fin calculada en formato ISO si es posible.
 */
function buildEndDateFromStart(startDate) {
    const normalizedStartDate = normalizeApiDate(startDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedStartDate)) {
        return normalizedStartDate;
    }

    const derivedDate = new Date(`${normalizedStartDate}T00:00:00`);
    if (Number.isNaN(derivedDate.getTime())) {
        return normalizedStartDate;
    }

    derivedDate.setDate(derivedDate.getDate() + 4);
    const year = derivedDate.getFullYear();
    const month = String(derivedDate.getMonth() + 1).padStart(2, "0");
    const day = String(derivedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Escapa un valor para que sea valido dentro de un CSV.
 *
 * @param {*} value Valor original.
 * @returns {string} Texto compatible con CSV.
 */
function escapeCsvValue(value) {
    const text = String(value ?? "");
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

/* ===================== api.js ===================== */
// ========================================
// ACCESO A DATOS Y MAPEOS
//
// Encapsula la lectura del usuario logeado, el acceso
// a la Web API y la transformacion de registros.
// ========================================

/**
 * Obtiene el contexto del usuario actual desde los objetos del portal o inputs ocultos.
 *
 * @returns {PortalUserContext} Datos minimos del usuario logeado.
 */
function getPortalUserContext() {
    const portalUser = window.portalUser || {};
    const dynamicPortalUser = window.Microsoft?.Dynamic365?.Portal?.User || {};
    const userContext = {
        contactId: sanitizeGuid(
            dynamicPortalUser.contactId ||
            portalUser.contactId ||
            dom.contactIdInput?.value
        ),
        userId: sanitizeGuid(
            dynamicPortalUser.userId ||
            portalUser.userId ||
            dom.userIdInput?.value
        ),
        userName: String(
            dynamicPortalUser.fullName ||
            portalUser.userName ||
            dom.userNameInput?.value ||
            ""
        ).trim(),
    };

    console.log("[CabeceraImputaciones] Contexto de usuario resuelto:", userContext);
    return userContext;
}

/**
 * Devuelve las cabeceras HTTP necesarias para consumir la Web API de Dataverse.
 *
 * @returns {Object<string, string>} Cabeceras comunes para las peticiones GET.
 */
function getApiHeaders() {
    return {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
        Prefer: 'odata.include-annotations="*"',
    };
}

/**
 * Construye las cabeceras necesarias para operaciones con mutacion
 * usando el token antiforgery del portal.
 *
 * @returns {Promise<Object<string, string>>} Cabeceras para POST/PATCH/DELETE.
 */
async function buildPortalApiHeaders() {
    const token = await shell.getTokenDeferred();

    return {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
        Prefer: 'odata.include-annotations="*"',
        "__RequestVerificationToken": token,
    };
}

/**
 * Transforma un registro crudo de Dataverse al modelo usado por la tabla.
 *
 * @param {Object} record Registro original devuelto por Dataverse.
 * @param {PortalUserContext} portalUser Contexto del usuario actual.
 * @returns {CabeceraRecord} Registro normalizado para renderizado.
 */
function mapCabeceraRecord(record, portalUser) {
    const fechaInicioRaw =
        record?.["cr774_fechaderegistro@OData.Community.Display.V1.FormattedValue"] ||
        record?.cr774_fechaderegistro ||
        "";
    const fechaInicio = normalizeApiDate(fechaInicioRaw);
    const fechaFinRaw =
        record?.["exc_fechafinal@OData.Community.Display.V1.FormattedValue"] ||
        record?.exc_fechafinal ||
        "";
    const fechaFin = normalizeApiDate(fechaFinRaw) || buildEndDateFromStart(fechaInicio);
    const totalHoras = Number(record?.exc_totalhorasregistradas);

    return {
        id: sanitizeGuid(record?.cr774_registroid || record?.cr774_registrosid || ""),
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        estadoAprobacion:
            record?.["exc_estadoaprobacionsemana@OData.Community.Display.V1.FormattedValue"] ||
            String(record?.exc_estadoaprobacionsemana ?? "").trim() ||
            "Sin estado",
        contacto:
            record?.["_cr774_contact_value@OData.Community.Display.V1.FormattedValue"] ||
            portalUser.userName ||
            "-",
        totalHoras: Number.isNaN(totalHoras) ? 0 : totalHoras,
    };
}

/**
 * Extrae IDs unicos de cabecera a partir de los diarios del usuario.
 *
 * @param {Object[]} diarioRows Filas de exc_diarioimputacions recuperadas desde la API.
 * @returns {string[]} Lista de ids de cabecera sin duplicados.
 */
function buildCabeceraIds(diarioRows) {
    const ids = diarioRows
        .map((row) => sanitizeGuid(row?._exc_cr774_registro_value))
        .filter(Boolean);

    return Array.from(new Set(ids));
}

/**
 * Recupera el detalle de una cabecera concreta para pintarla en la tabla principal.
 *
 * @param {string} cabeceraId Identificador de la cabecera.
 * @param {PortalUserContext} portalUser Contexto del usuario actual.
 * @returns {Promise<CabeceraRecord>} Cabecera normalizada lista para renderizar.
 */
async function fetchCabeceraDetail(cabeceraId, portalUser) {
    const url = `/_api/cr774_registros(${cabeceraId})?$select=cr774_registroid,cr774_fechaderegistro,exc_fechafinal,_cr774_contact_value,exc_estadoaprobacionsemana,exc_totalhorasregistradas`;
    console.log(`[CabeceraImputaciones] Cargando detalle de cabecera ${cabeceraId}:`, url);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: getApiHeaders(),
            credentials: "same-origin",
        });

        console.log(`[CabeceraImputaciones] Respuesta detalle ${cabeceraId}:`, {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`[CabeceraImputaciones] Error HTTP en detalle ${cabeceraId}:`, errorText);
            throw new Error(errorText || `No se pudo cargar la cabecera ${cabeceraId}.`);
        }

        const data = await response.json();
        console.log(`[CabeceraImputaciones] Payload detalle ${cabeceraId}:`, data);
        return mapCabeceraRecord(data, portalUser);
    } catch (error) {
        console.error(`[CabeceraImputaciones] Fallo cargando detalle ${cabeceraId}:`, error);
        throw error;
    }
}

/**
 * Recupera las cabeceras del usuario logeado a partir de sus lineas diarias asociadas.
 *
 * @returns {Promise<CabeceraRecord[]>} Cabeceras normalizadas del usuario actual.
 * @throws {Error} Lanza un error si no se puede identificar al usuario o consultar la API.
 */
async function fetchCabecerasForCurrentUser() {
    const portalUser = getPortalUserContext();
    console.log("[CabeceraImputaciones] Inicio de carga de cabeceras del usuario.");

    if (!portalUser.contactId) {
        console.error("[CabeceraImputaciones] Usuario sin contactId. No se puede consultar la Web API.");
        throw new Error("No se pudo identificar el usuario logeado.");
    }

    const diarioUrl = `/_api/exc_diarioimputacions?$select=_exc_cr774_registro_value&$filter=_exc_contact_value eq '${portalUser.contactId}'`;
    console.log("[CabeceraImputaciones] URL diario:", diarioUrl);

    const diarioResponse = await fetch(diarioUrl, {
        method: "GET",
        headers: getApiHeaders(),
        credentials: "same-origin",
    });

    console.log("[CabeceraImputaciones] Respuesta diario:", {
        ok: diarioResponse.ok,
        status: diarioResponse.status,
        statusText: diarioResponse.statusText,
    });

    if (!diarioResponse.ok) {
        const errorText = await diarioResponse.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error HTTP cargando diarios:", errorText);
        throw new Error(errorText || "No se pudieron cargar las imputaciones diarias del usuario.");
    }

    const diarioData = await diarioResponse.json();
    console.log("[CabeceraImputaciones] Payload diario:", diarioData);
    const diarioRows = Array.isArray(diarioData?.value) ? diarioData.value : [];
    console.log("[CabeceraImputaciones] Numero de diarios recuperados:", diarioRows.length);

    const cabeceraIds = buildCabeceraIds(diarioRows);
    console.log("[CabeceraImputaciones] Cabeceras detectadas desde diarios:", cabeceraIds);

    if (!cabeceraIds.length) {
        console.warn("[CabeceraImputaciones] No se encontraron cabeceras asociadas al usuario.");
        return [];
    }

    const detailResults = await Promise.allSettled(
        cabeceraIds.map((cabeceraId) => fetchCabeceraDetail(cabeceraId, portalUser))
    );

    detailResults.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(`[CabeceraImputaciones] Error cargando la cabecera ${cabeceraIds[index]}:`, result.reason);
        } else {
            console.log(`[CabeceraImputaciones] Cabecera cargada correctamente ${cabeceraIds[index]}:`, result.value);
        }
    });

    const successfulRecords = detailResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .sort((leftRecord, rightRecord) => getDateSortValue(rightRecord.fechaInicio) - getDateSortValue(leftRecord.fechaInicio));

    console.log("[CabeceraImputaciones] Numero de cabeceras renderizables:", successfulRecords.length);

    if (successfulRecords.length > 0) {
        return successfulRecords;
    }

    const firstRejected = detailResults.find((result) => result.status === "rejected");
    throw firstRejected?.reason || new Error("No se pudieron cargar las cabeceras del usuario.");
}

/**
 * Recupera las lineas de imputacion hijas de una cabecera.
 *
 * @param {string} recordId Id de la cabecera.
 * @returns {Promise<Object[]>} Lista de lineas hijas.
 */
async function fetchDailyLinesByHeaderId(recordId) {
    const headers = await buildPortalApiHeaders();
    const normalizedRecordId = sanitizeGuid(recordId);

    const url =
        `/_api/exc_diarioimputacions` +
        `?$select=exc_diarioimputacionid` +
        `&$filter=_exc_cr774_registro_value eq ${normalizedRecordId}`;

    console.log("[CabeceraImputaciones] Cargando lineas hijas de cabecera:", normalizedRecordId, url);

    const response = await fetch(url, {
        method: "GET",
        headers,
        credentials: "same-origin",
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error cargando lineas hijas:", details);
        throw new Error(`No se pudieron cargar las lineas de imputacion. HTTP ${response.status}. ${details}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data?.value) ? data.value : [];
    console.log("[CabeceraImputaciones] Lineas hijas recuperadas:", rows);

    return rows;
}

/**
 * Elimina una linea de imputacion concreta.
 *
 * @param {string} lineId Id de la linea.
 * @returns {Promise<void>}
 */
async function deleteDailyLineById(lineId) {
    const normalizedLineId = sanitizeGuid(lineId);
    if (!normalizedLineId) return;

    const headers = await buildPortalApiHeaders();
    console.log("[CabeceraImputaciones] Eliminando linea hija:", normalizedLineId);

    const response = await fetch(`/_api/exc_diarioimputacions(${normalizedLineId})`, {
        method: "DELETE",
        headers,
        credentials: "same-origin",
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error eliminando linea hija:", normalizedLineId, details);
        throw new Error(`No se pudo eliminar la linea ${normalizedLineId}. HTTP ${response.status}. ${details}`);
    }
}

/**
 * Elimina una cabecera concreta en Dataverse.
 *
 * @param {string} recordId Id de la cabecera.
 * @returns {Promise<void>}
 */
async function deleteDataverseHeaderById(recordId) {
    const normalizedRecordId = sanitizeGuid(recordId);
    if (!normalizedRecordId) return;

    const headers = await buildPortalApiHeaders();
    console.log("[CabeceraImputaciones] Eliminando cabecera:", normalizedRecordId);

    const response = await fetch(`/_api/cr774_registros(${normalizedRecordId})`, {
        method: "DELETE",
        headers,
        credentials: "same-origin",
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error eliminando cabecera:", normalizedRecordId, details);
        throw new Error(`No se pudo eliminar la cabecera ${normalizedRecordId}. HTTP ${response.status}. ${details}`);
    }
}

/**
 * Elimina una cabecera y todas sus lineas hijas asociadas.
 *
 * @param {string} recordId Id de la cabecera.
 * @returns {Promise<void>}
 */
async function deleteHeaderWithChildren(recordId) {
    const normalizedRecordId = sanitizeGuid(recordId);
    if (!normalizedRecordId) return;

    const childLines = await fetchDailyLinesByHeaderId(normalizedRecordId);

    for (const line of childLines) {
        const lineId = sanitizeGuid(line?.exc_diarioimputacionid);
        if (lineId) {
            await deleteDailyLineById(lineId);
        }
    }

    await deleteDataverseHeaderById(normalizedRecordId);
}

/**
 * Carga los registros de la tabla y actualiza los estados de carga y error.
 *
 * @returns {Promise<void>}
 */
async function loadRecords() {
    isLoading = true;
    loadErrorMessage = "";
    console.log("[CabeceraImputaciones] Comienza loadRecords.");
    renderTable();

    try {
        records = await fetchCabecerasForCurrentUser();
        console.log("[CabeceraImputaciones] Registros cargados en memoria:", records);
    } catch (error) {
        records = [];
        loadErrorMessage = error?.message || "No se pudieron cargar las cabeceras.";
        console.error("Error cargando cabeceras:", error);
    } finally {
        isLoading = false;
        console.log("[CabeceraImputaciones] Fin de loadRecords. Total final:", records.length);
        renderTable();
    }
}

/* ===================== actions.js ===================== */
// ========================================
// ACCIONES Y MANEJO DE EVENTOS
//
// Implementa la logica de filtrado, ordenacion,
// descarga y gestion del modal de borrado.
// ========================================

/**
 * Compara dos registros usando la configuracion de ordenacion actual.
 *
 * @param {CabeceraRecord} leftRecord Registro izquierdo.
 * @param {CabeceraRecord} rightRecord Registro derecho.
 * @returns {number} Resultado de comparacion para Array.sort.
 */
function compareRecords(leftRecord, rightRecord) {
    if (!sortState.key) return 0;

    const leftValue = leftRecord?.[sortState.key];
    const rightValue = rightRecord?.[sortState.key];
    let comparison = 0;

    if (sortState.type === "date") {
        comparison = getDateSortValue(leftValue) - getDateSortValue(rightValue);
    } else if (sortState.type === "number") {
        comparison = getNumberSortValue(leftValue) - getNumberSortValue(rightValue);
    } else {
        comparison = normalizeText(leftValue).localeCompare(normalizeText(rightValue), "es-ES", {
            sensitivity: "base",
            numeric: true,
        });
    }

    if (comparison === 0) {
        comparison = String(leftRecord?.id ?? "").localeCompare(String(rightRecord?.id ?? ""), "es-ES", {
            numeric: true,
        });
    }

    return sortState.direction === "desc" ? comparison * -1 : comparison;
}

/**
 * Aplica el texto de busqueda actual sobre todos los registros cargados.
 *
 * @returns {CabeceraRecord[]} Registros que cumplen el filtro de busqueda.
 */
function getFilteredRecords() {
    const normalizedQuery = normalizeText(searchQuery);
    if (!normalizedQuery) return records;

    return records.filter((record) => {
        const searchIndex = normalizeText([
            record.contacto,
            record.estadoAprobacion,
            record.fechaInicio,
            record.fechaFin,
            String(record.totalHoras ?? ""),
        ].join(" "));

        return searchIndex.includes(normalizedQuery);
    });
}

/**
 * Devuelve los registros que se deben mostrar, ya filtrados y ordenados.
 *
 * @returns {CabeceraRecord[]} Registros visibles en la tabla.
 */
function getVisibleRecords() {
    const filteredRecords = getFilteredRecords();
    if (!sortState.key) return filteredRecords;

    return filteredRecords.slice().sort(compareRecords);
}

/**
 * Activa o invierte la ordenacion de una columna.
 *
 * @param {string} key Campo del registro por el que se quiere ordenar.
 * @param {string} type Tipo de ordenacion: text, date o number.
 * @returns {void}
 */
function toggleSort(key, type) {
    if (!key) return;

    if (sortState.key === key) {
        sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
    } else {
        sortState = {
            key: key,
            direction: "asc",
            type: type || "text",
        };
    }

    updateSortButtonsState();
    renderTable();
}

/**
 * Busca un registro concreto dentro del estado actual.
 *
 * @param {string} recordId Identificador del registro.
 * @returns {CabeceraRecord|null} Registro encontrado o null.
 */
function getRecordById(recordId) {
    return records.find((record) => record.id === recordId) || null;
}

/**
 * Construye el texto descriptivo mostrado en el modal de borrado.
 *
 * @param {CabeceraRecord|null} record Registro a eliminar.
 * @returns {string} Mensaje descriptivo para el usuario.
 */
function buildDeleteDescription(record) {
    if (!record) return "Esta accion no se puede deshacer.";

    return `Se eliminara el registro de ${record.contacto || "sin contacto"} (${formatDateDisplay(record.fechaInicio)} - ${formatDateDisplay(record.fechaFin)}) y todas sus lineas de imputacion asociadas.`;
}

/**
 * Construye el texto descriptivo mostrado en el modal de copia.
 *
 * @param {CabeceraRecord|null} record Registro a copiar.
 * @returns {string} Mensaje descriptivo para el usuario.
 */
function buildCopyDescription(record) {
    if (!record) return "¿Quieres copiar la cabecera seleccionada?";

    return `¿Quieres copiar la cabecera de ${record.contacto || "sin contacto"} (${formatDateDisplay(record.fechaInicio)} - ${formatDateDisplay(record.fechaFin)})?`;
}

/**
 * Marca visualmente el boton de confirmacion durante el borrado.
 *
 * @param {boolean} isBusy Indica si el borrado esta en curso.
 */
function setDeleteButtonBusyState(isBusy) {
    isDeletingRecord = !!isBusy;

    if (!dom.confirmDeleteButton) return;

    dom.confirmDeleteButton.disabled = isDeletingRecord;
    dom.confirmDeleteButton.textContent = isDeletingRecord ? "Eliminando..." : "Eliminar";
}

/**
 * Marca visualmente el boton de confirmacion durante la redireccion de copia.
 *
 * @param {boolean} isBusy Indica si la navegacion ya esta en curso.
 */
function setCopyButtonBusyState(isBusy) {
    isNavigatingToCopy = !!isBusy;

    if (!dom.confirmCopyButton) return;

    dom.confirmCopyButton.disabled = isNavigatingToCopy;
    dom.confirmCopyButton.textContent = isNavigatingToCopy ? "Abriendo..." : "Aceptar";
}

/**
 * Abre el modal de borrado y carga la descripcion del registro seleccionado.
 *
 * @param {string} recordId Identificador del registro a eliminar.
 * @returns {void}
 */
function openDeleteDialog(recordId) {
    recordToDeleteId = sanitizeGuid(recordId);
    setDeleteButtonBusyState(false);

    if (dom.deleteRecordInfo) {
        dom.deleteRecordInfo.textContent = buildDeleteDescription(getRecordById(recordToDeleteId));
    }

    if (deleteDialog) {
        deleteDialog.show();
        return;
    }

    if (dom.deleteDialogElement) {
        dom.deleteDialogElement.style.display = "block";
        dom.deleteDialogElement.classList.add("show");
        dom.deleteDialogElement.setAttribute("aria-modal", "true");
        dom.deleteDialogElement.removeAttribute("aria-hidden");
    }
}

/**
 * Abre el modal de copia y carga la descripcion del registro seleccionado.
 *
 * @param {string} recordId Identificador del registro a copiar.
 * @returns {void}
 */
function openCopyDialog(recordId) {
    recordToCopyId = sanitizeGuid(recordId);
    setCopyButtonBusyState(false);

    if (dom.copyRecordInfo) {
        dom.copyRecordInfo.textContent = buildCopyDescription(getRecordById(recordToCopyId));
    }

    if (copyDialog) {
        copyDialog.show();
        return;
    }

    if (dom.copyDialogElement) {
        dom.copyDialogElement.style.display = "block";
        dom.copyDialogElement.classList.add("show");
        dom.copyDialogElement.setAttribute("aria-modal", "true");
        dom.copyDialogElement.removeAttribute("aria-hidden");
    }
}

/**
 * Cierra el modal de borrado usando Bootstrap o fallback manual.
 */
function hideDeleteDialog() {
    setDeleteButtonBusyState(false);

    if (deleteDialog) {
        deleteDialog.hide();
        return;
    }

    if (dom.deleteDialogElement) {
        dom.deleteDialogElement.style.display = "none";
        dom.deleteDialogElement.classList.remove("show");
        dom.deleteDialogElement.removeAttribute("aria-modal");
        dom.deleteDialogElement.setAttribute("aria-hidden", "true");
    }
}

/**
 * Cierra el modal de copia usando Bootstrap o fallback manual.
 */
function hideCopyDialog() {
    setCopyButtonBusyState(false);

    if (copyDialog) {
        copyDialog.hide();
        return;
    }

    if (dom.copyDialogElement) {
        dom.copyDialogElement.style.display = "none";
        dom.copyDialogElement.classList.remove("show");
        dom.copyDialogElement.removeAttribute("aria-modal");
        dom.copyDialogElement.setAttribute("aria-hidden", "true");
    }
}

/**
 * Genera y descarga un CSV con los registros visibles actualmente.
 */
function downloadCsv() {
    const visibleRecords = getVisibleRecords();
    const rows = [
        ["Fecha Inicio", "Fecha Fin", "Estado", "Contacto", "Total Horas"],
        ...visibleRecords.map((record) => [
            formatDateDisplay(record.fechaInicio),
            formatDateDisplay(record.fechaFin),
            record.estadoAprobacion,
            record.contacto,
            formatHourDisplay(record.totalHoras),
        ]),
    ];

    const csv = rows
        .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = CSV_FILENAME;
    link.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Redirige a la pagina de creacion de una nueva cabecera.
 */
function handleCreateClick() {
    window.location.href = CONFIG_URLS.create;
}

/**
 * Lanza la descarga del CSV desde el boton de accion.
 */
function handleDownloadClick() {
    downloadCsv();
}

/**
 * Actualiza el filtro de busqueda cada vez que cambia el input.
 *
 * @param {Event} event Evento input del buscador.
 * @returns {void}
 */
function handleSearchInput(event) {
    searchQuery = event.target?.value || "";
    renderTable();
}

/**
 * Gestiona el click sobre una cabecera ordenable.
 *
 * @param {Event} event Evento click del boton de ordenacion.
 * @returns {void}
 */
function handleSortClick(event) {
    const button = event.currentTarget;
    toggleSort(button?.dataset.sortKey || "", button?.dataset.sortType || "text");
}

/**
 * Delegacion de eventos del cuerpo de tabla para detectar acciones por fila.
 *
 * @param {Event} event Evento click dentro del tbody.
 * @returns {void}
 */
function handleTableBodyClick(event) {
    const copyButton = event.target.closest(".copy-btn");
    if (copyButton) {
        event.preventDefault();
        openCopyDialog(copyButton.dataset.id || "");
        return;
    }

    const deleteButton = event.target.closest(".delete-btn");
    if (!deleteButton) return;

    openDeleteDialog(deleteButton.dataset.id || "");
}

/**
 * Elimina en Dataverse el registro confirmado y todas sus lineas hijas.
 */
async function handleConfirmDeleteClick() {
    if (!recordToDeleteId || isDeletingRecord) return;

    const recordId = sanitizeGuid(recordToDeleteId);
    if (!recordId) return;

    try {
        setDeleteButtonBusyState(true);
        await deleteHeaderWithChildren(recordId);

        records = records.filter((record) => record.id !== recordId);
        recordToDeleteId = null;
        hideDeleteDialog();
        renderTable();
    } catch (error) {
        console.error("[CabeceraImputaciones] Error eliminando cabecera y lineas asociadas:", error);
        setDeleteButtonBusyState(false);
        alert(error?.message || "No se pudo eliminar la cabecera con sus lineas de imputacion.");
    }
}

/**
 * Limpia el registro pendiente y cierra el modal al cancelar.
 */
function handleDeleteDialogDismiss() {
    if (isDeletingRecord) return;

    recordToDeleteId = null;
    hideDeleteDialog();
}

/**
 * Navega al flujo de copia tras confirmar el modal.
 */
function handleConfirmCopyClick() {
    if (!recordToCopyId || isNavigatingToCopy) return;

    const recordId = sanitizeGuid(recordToCopyId);
    if (!recordId) return;

    setCopyButtonBusyState(true);
    window.location.href = buildCopyUrl(recordId);
}

/**
 * Limpia el registro pendiente y cierra el modal al cancelar la copia.
 */
function handleCopyDialogDismiss() {
    if (isNavigatingToCopy) return;

    recordToCopyId = null;
    hideCopyDialog();
}

/* ===================== render.js ===================== */
// ========================================
// RENDERIZADO DE LA UI
//
// Genera el HTML de estados, filas, acciones y aplica
// el estado visual de la ordenacion en la tabla.
// ========================================

/**
 * Traduce un estado funcional a la clase visual del badge.
 *
 * @param {string} status Estado de aprobacion del registro.
 * @returns {string} Clase CSS del badge.
 */
function getStatusBadgeClass(status) {
    const normalized = String(status || "").trim().toLowerCase();

    if (normalized === "aprobado") return "text-bg-success";
    if (normalized === "pendiente") return "text-bg-warning text-dark";
    if (normalized === "rechazado") return "text-bg-danger";
    return "text-bg-secondary";
}

/**
 * Genera el HTML del badge de estado.
 *
 * @param {string} status Estado de aprobacion del registro.
 * @returns {string} HTML del badge listo para insertar.
 */
function renderStatusBadge(status) {
    const safeStatus = escapeHtml(status || "Sin estado");
    return `
    <div class="d-flex justify-content-center align-items-center">
        <span class="text-bg-success rounded-pill ${getStatusBadgeClass(status)} px-5 py-2 fw-semibold">
            ${safeStatus}
        </span>
    </div>
    `;
}

/**
 * Construye la URL para duplicar una cabecera existente.
 *
 * @param {string} recordId Identificador del registro origen.
 * @returns {string} URL de navegacion para copiar el registro.
 */
function buildCopyUrl(recordId) {
    return `${CONFIG_URLS.copy}${encodeURIComponent(recordId)}`;
}

/**
 * Construye la URL para editar una cabecera existente.
 *
 * @param {string} recordId Identificador del registro a editar.
 * @returns {string} URL de navegacion para editar el registro.
 */
function buildEditUrl(recordId) {
    return `${CONFIG_URLS.edit}?id=${encodeURIComponent(recordId)}`;
}

/**
 * Genera el bloque HTML con las acciones de copiar, editar y eliminar.
 *
 * @param {CabeceraRecord} record Registro de la fila actual.
 * @returns {string} HTML de botones de accion.
 */
function renderActionButtons(record) {
    return `
    <a href="${buildCopyUrl(record.id)}" data-id="${escapeHtml(record.id)}" title="Copiar"
      class="d-inline-flex align-items-center justify-content-center text-decoration-none cab20-action-btn copy-btn"
      style="width: 32px; height: 32px; color: #31708f;"
      aria-label="Copiar registro">
      <i data-lucide="copy" size="18"></i>
    </a>

    <a href="${buildEditUrl(record.id)}" title="Editar"
      class="d-inline-flex align-items-center justify-content-center text-decoration-none cab20-action-btn"
      style="width: 32px; height: 32px; color: #059669;"
      aria-label="Editar registro">
      <i data-lucide="pencil" size="18"></i>
    </a>

    <button type="button" data-id="${escapeHtml(record.id)}" title="Eliminar"
      class="d-inline-flex align-items-center justify-content-center border-0 bg-transparent delete-btn cab20-action-btn"
      style="width: 32px; height: 32px; color: #dc3545; padding: 0;"
      aria-label="Eliminar registro">
      <i data-lucide="trash-2" size="18"></i>
    </button>
    `;
}

/**
 * Genera la fila vacia cuando no existen registros para mostrar.
 *
 * @returns {string} HTML del estado vacio.
 */
function renderEmptyState() {
    return `
    <tr class="align-middle">
        <td colspan="6" class="p-4 text-center">
            <p class="small text-secondary fst-italic mb-0">No hay registros para mostrar.</p>
        </td>
    </tr>
    `;
}

/**
 * Genera la fila de feedback para carga o error.
 *
 * @param {string} message Mensaje a mostrar al usuario.
 * @returns {string} HTML del mensaje de feedback.
 */
function renderFeedbackState(message) {
    return `
    <tr class="align-middle">
        <td colspan="6" class="p-4 text-center">
            <p class="small text-secondary fst-italic mb-0">${escapeHtml(message)}</p>
        </td>
    </tr>
    `;
}

/**
 * Genera el HTML completo de una fila de la tabla.
 *
 * @param {CabeceraRecord} record Registro de la fila.
 * @returns {string} HTML de la fila renderizada.
 */
function renderTableRow(record) {
    return `
    <tr class="border-b hover:bg-gray-50 transition-colors align-middle">

     <!-- FECHA DE INICIO -->
        <td class="p-3">
            <p class="small text-dark mb-0 text-center">${escapeHtml(formatDateDisplay(record.fechaInicio))}</p>
        </td>

     <!-- FECHA FIN -->
        <td class="p-3">
            <p class="small text-dark mb-0 text-center">${escapeHtml(formatDateDisplay(record.fechaFin))}</p>
        </td>

     <!-- ESTADO APROBACION -->
        <td class="p-4">
            ${renderStatusBadge(record.estadoAprobacion)}
        </td>

     <!-- CONTACTO -->
        <td class="p-3">
            <p class="small text-dark mb-0 text-center">${escapeHtml(record.contacto || "-")}</p>
        </td>

     <!-- HORAS TOTALES -->
        <td class="p-3 text-center fw-bold text-dark align-middle">${escapeHtml(formatHourDisplay(record.totalHoras))}</td>
        
     <!-- BOTONES -->
        <td class="px-3 py-3">
            <div class="d-flex justify-content-center gap-1">${renderActionButtons(record)}</div>
        </td>
    </tr>
    `;
}

/**
 * Sincroniza los atributos visuales y de accesibilidad de las cabeceras ordenables.
 */
function updateSortButtonsState() {
    dom.sortButtons.forEach((button) => {
        const isActive = button.dataset.sortKey === sortState.key;
        const headerCell = button.closest("th");
        const ariaSortValue = isActive
            ? (sortState.direction === "asc" ? "ascending" : "descending")
            : "none";

        button.dataset.sortDirection = isActive ? sortState.direction : "none";
        button.setAttribute("aria-pressed", String(isActive));

        if (headerCell) {
            headerCell.setAttribute("aria-sort", ariaSortValue);
        }
    });
}

/**
 * Renderiza el contenido actual de la tabla segun carga, error, filtros y ordenacion.
 */
function renderTable() {
    if (!dom.tableBody || !dom.tableWrap || !dom.table) return;

    if (isLoading) {
        dom.tableBody.innerHTML = renderFeedbackState("Cargando cabeceras...");
        dom.tableWrap.classList.remove("table-responsive");
        refreshIcons();
        return;
    }

    const visibleRecords = getVisibleRecords();
    dom.tableBody.innerHTML = visibleRecords.length
        ? visibleRecords.map((record) => renderTableRow(record)).join("")
        : (loadErrorMessage ? renderFeedbackState(loadErrorMessage) : renderEmptyState());

    if (visibleRecords.length <= 1) {
        dom.tableWrap.classList.remove("table-responsive");
    } else {
        dom.tableWrap.classList.add("table-responsive");
    }

    refreshIcons();
}

/* ===================== main.js ===================== */
// ========================================
// INICIALIZACION DE LA APLICACION
//
// Cachea referencias del DOM, registra eventos y lanza
// la carga inicial de datos al estar el documento listo.
// ========================================

/**
 * Crea el modal de copia si la pagina no lo incluye en el HTML base.
 */
function ensureCopyDialogMarkup() {
    if (document.getElementById("copyDialog")) return;

    document.body?.insertAdjacentHTML("beforeend", `
<div id="copyDialog" class="modal fade" aria-hidden="true">
  <div class="modal-dialog modal-sm modal-dialog-centered">
    <div class="modal-content bg-white rounded shadow w-100 overflow-hidden cab20-modal-card border-0">
      <div class="px-4 py-3 border-bottom cab20-modal-head text-center">
        <i data-lucide="copy" class="mb-2 mt-2" style="width: 48px; height: 48px; color: #31708f;"></i>
        <h5 class="fw-bold text-dark mb-0">Copiar cabecera</h5>
      </div>
      <div class="p-4 text-center">
        <p id="copyRecordInfo" class="small text-dark mb-0">¿Quieres copiar la cabecera seleccionada?</p>
      </div>
      <div class="px-4 py-3 border-top d-flex justify-content-between align-items-center gap-3 cab20-modal-foot">
        <button type="button" data-bs-dismiss="modal" class="btn btn-light text-secondary">Cancelar</button>
        <button id="confirmCopyBtn" class="green-background text-white rounded border-0 px-4 py-2 d-inline-flex align-items-center gap-2 cab20-btn-active">
          <i data-lucide="copy" style="width: 18px; height: 18px;"></i>
          <span>Aceptar</span>
        </button>
      </div>
    </div>
  </div>
</div>`);
}

/**
 * Cachea todas las referencias del DOM usadas por la pantalla.
 */
function cacheDomElements() {
    dom.tableBody = document.getElementById("tableBody");
    dom.tableWrap = document.querySelector(".cab20-table-wrap");
    dom.table = dom.tableWrap?.querySelector("table") || null;
    dom.searchInput = document.getElementById("searchInput");
    dom.createButton = document.getElementById("btnCreate");
    dom.downloadButton = document.getElementById("btnDownload");
    dom.deleteDialogElement = document.getElementById("deleteDialog");
    dom.deleteRecordInfo = document.getElementById("deleteRecordInfo");
    dom.confirmDeleteButton = document.getElementById("confirmDeleteBtn");
    dom.copyDialogElement = document.getElementById("copyDialog");
    dom.copyRecordInfo = document.getElementById("copyRecordInfo");
    dom.confirmCopyButton = document.getElementById("confirmCopyBtn");
    dom.contactIdInput = document.getElementById("contactId");
    dom.userIdInput = document.getElementById("userId");
    dom.userNameInput = document.getElementById("userName");
    dom.sortButtons = Array.from(document.querySelectorAll(".cab20-sort-btn"));
}

/**
 * Inicializa la instancia del modal de borrado si Bootstrap esta disponible.
 */
function initDeleteDialog() {
    deleteDialog = dom.deleteDialogElement && window.bootstrap?.Modal
        ? new window.bootstrap.Modal(dom.deleteDialogElement)
        : null;
}

/**
 * Inicializa la instancia del modal de copia si Bootstrap esta disponible.
 */
function initCopyDialog() {
    copyDialog = dom.copyDialogElement && window.bootstrap?.Modal
        ? new window.bootstrap.Modal(dom.copyDialogElement)
        : null;
}

/**
 * Registra todos los listeners de la pantalla una sola vez.
 */
function initEventListeners() {
    dom.createButton?.addEventListener("click", handleCreateClick);
    dom.downloadButton?.addEventListener("click", handleDownloadClick);
    dom.searchInput?.addEventListener("input", handleSearchInput);
    dom.tableBody?.addEventListener("click", handleTableBodyClick);
    dom.confirmDeleteButton?.addEventListener("click", handleConfirmDeleteClick);
    dom.confirmCopyButton?.addEventListener("click", handleConfirmCopyClick);

    dom.sortButtons.forEach((button) => {
        button.addEventListener("click", handleSortClick);
    });

    dom.deleteDialogElement?.querySelectorAll('[data-bs-dismiss="modal"]').forEach((button) => {
        button.addEventListener("click", handleDeleteDialogDismiss);
    });

    dom.copyDialogElement?.querySelectorAll('[data-bs-dismiss="modal"]').forEach((button) => {
        button.addEventListener("click", handleCopyDialogDismiss);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    ensureCopyDialogMarkup();
    cacheDomElements();
    initDeleteDialog();
    initCopyDialog();
    initEventListeners();
    updateSortButtonsState();
    renderTable();
    loadRecords();
});
