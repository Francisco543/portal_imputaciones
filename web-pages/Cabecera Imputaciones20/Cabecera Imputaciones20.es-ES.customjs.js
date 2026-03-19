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
    copy: "/Imputacion-Prueba2_0/",
};

const CSV_FILENAME = "registros_imputacion.csv";
const COPY_RETURN_URL_SESSION_KEY = "cab20_copy_return_url";
const COPY_RETURN_TOAST_SESSION_KEY = "cab20_copy_return_toast";

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
var hasCurrentWeekHeader = false;

var sortState = {
    key: "fechaInicio",
    direction: "desc",
    type: "date",
};

//Paginación de la tabla
const PAGE_SIZE = 10;
var paginationState = {
    currentPage: 1,
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
    cancelDeleteButton: null,
    confirmDeleteButton: null,
    copyDialogElement: null,
    copyRecordInfo: null,
    cancelCopyButton: null,
    confirmCopyButton: null,
    contactIdInput: null,
    userIdInput: null,
    userNameInput: null,
    isAdminRoleInput: null,
    sortButtons: [],
    paginationWrap: null,
    paginationInfo: null,
    prevPageButton: null,
    nextPageButton: null,
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
 * @property {boolean} isAdminRole Indica si el usuario tiene rol web de administrador.
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
 * Muestra un toast simple reutilizando Toastify cuando esta disponible.
 *
 * @param {string} message Mensaje a mostrar.
 * @param {"success"|"error"|"info"} type Variante visual del toast.
 */
function showToast(message, type = "success") {
    const bg = type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#3B82F6";

    if (typeof Toastify === "undefined") {
        console.log(`[${type}] ${message}`);
        return;
    }

    Toastify({
        text: message,
        duration: 4500,
        gravity: "top",
        position: "right",
        className: "cab20-toast",
        style: {
            background: bg,
            borderRadius: "8px",
            fontWeight: "bold",
            maxWidth: "320px",
            width: "fit-content",
            padding: "12px 14px",
            lineHeight: "1.35",
            whiteSpace: "normal",
        },
    }).showToast();
}

/**
 * Recupera un toast pendiente guardado desde la pantalla de copia y lo muestra.
 */
function consumePendingCopyToast() {
    try {
        const raw = sessionStorage.getItem(COPY_RETURN_TOAST_SESSION_KEY);
        if (!raw) return;

        sessionStorage.removeItem(COPY_RETURN_TOAST_SESSION_KEY);
        const parsed = JSON.parse(raw);
        if (!parsed?.message) return;

        showToast(parsed.message, parsed.type || "success");
    } catch (error) {
        console.warn("No se pudo recuperar el toast pendiente de copia:", error);
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
 * Normaliza una fecha al inicio del dia en horario local.
 *
 * @param {*} value Fecha original.
 * @returns {Date|null} Fecha normalizada o null si no es valida.
 */
function normalizeDateAtLocalMidnight(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Convierte una fecha al formato yyyy-MM-dd en horario local.
 *
 * @param {*} value Fecha original.
 * @returns {string} Fecha formateada para Dataverse.
 */
function formatLocalYMD(value) {
    const date = normalizeDateAtLocalMidnight(value);
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Devuelve el lunes de la semana actual siguiendo la misma regla que Imputacion 2.0.
 *
 * @param {Date} [baseDate] Fecha base para el calculo.
 * @returns {Date} Lunes de la semana actual.
 */
function getCurrentWeekMonday(baseDate = new Date()) {
    const monday = normalizeDateAtLocalMidnight(baseDate) || new Date();
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
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
    const isAdminRole =
        String(dom.isAdminRoleInput?.value || "").trim().toLowerCase() === "true";
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
        isAdminRole: isAdminRole,
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
 * Extrae el identificador de entidad devuelto por Dataverse en la cabecera OData-EntityId.
 *
 * @param {Headers} headers Cabeceras HTTP de la respuesta.
 * @returns {string} Guid de la entidad creada o cadena vacia.
 */
function extractEntityIdFromHeaders(headers) {
    const entityHeader =
        headers?.get?.("OData-EntityId") ||
        headers?.get?.("odata-entityid") ||
        headers?.get?.("entityid") ||
        "";

    const match = String(entityHeader).match(/\(([^)]+)\)/);
    return match ? sanitizeGuid(match[1]) : "";
}

/**
 * Crea una nueva cabecera real para la semana actual asociada al usuario autenticado.
 *
 * @returns {Promise<string>} Identificador de la cabecera creada.
 */
async function createCopyHeaderForCurrentWeek() {
    const portalUser = getPortalUserContext();
    if (!portalUser.contactId) {
        throw new Error("No se pudo identificar el usuario logeado.");
    }

    const headers = await buildPortalApiHeaders();
    headers.Prefer = "return=representation";

    const payload = {
        cr774_fechaderegistro: formatLocalYMD(getCurrentWeekMonday()),
        "cr774_Contact@odata.bind": `/contacts(${portalUser.contactId})`,
    };

    const response = await fetch("/_api/cr774_registros", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify(payload),
    });

    const rawBody = await response.text().catch(() => "");
    let data = {};

    if (rawBody) {
        try {
            data = JSON.parse(rawBody);
        } catch (error) {
            data = {};
        }
    }

    if (!response.ok) {
        throw new Error(`No se pudo crear la cabecera de copia. HTTP ${response.status}. ${rawBody}`);
    }

    const createdId =
        extractEntityIdFromHeaders(response.headers) ||
        sanitizeGuid(data?.cr774_registroid) ||
        sanitizeGuid(data?.cr774_registrosid) ||
        "";

    if (!createdId) {
        throw new Error("Dataverse creo la cabecera de copia pero no devolvio su identificador.");
    }

    return createdId;
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
    const url = `/_api/cr774_registros(${cabeceraId})`;
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
 * Recupera las cabeceras del usuario logeado a partir de sus líneas diarias asociadas.
 *
 * @returns {Promise<CabeceraRecord[]>} Cabeceras normalizadas del usuario actual.
 * @throws {Error} Lanza un error si no se puede identificar al usuario o consultar la API.
 */
async function fetchCabecerasForCurrentUser() {
    const portalUser = getPortalUserContext();
    console.log("[CabeceraImputaciones] Inicio de carga de cabeceras del usuario.");

    if (!portalUser.isAdminRole && !portalUser.contactId) {
        console.error("[CabeceraImputaciones] Usuario sin contactId. No se puede consultar la Web API.");
        throw new Error("No se pudo identificar el usuario logeado.");
    }

    if (portalUser.isAdminRole) {
        const headersUrl =
            `/_api/cr774_registros` +
            `?$select=cr774_registroid,cr774_fechaderegistro,exc_fechafinal,_cr774_contact_value,exc_estadoaprobacionsemana,exc_totalhorasregistradas` +
            `&$top=500`;
        console.log("[CabeceraImputaciones] URL cabeceras admin:", headersUrl);

        const headersResponse = await fetch(headersUrl, {
            method: "GET",
            headers: getApiHeaders(),
            credentials: "same-origin",
        });

        console.log("[CabeceraImputaciones] Respuesta cabeceras admin:", {
            ok: headersResponse.ok,
            status: headersResponse.status,
            statusText: headersResponse.statusText,
        });

        if (!headersResponse.ok) {
            const errorText = await headersResponse.text().catch(() => "");
            console.error("[CabeceraImputaciones] Error HTTP cargando cabeceras admin:", errorText);
            throw new Error(errorText || "No se pudieron cargar todas las cabeceras.");
        }

        const headersData = await headersResponse.json();
        console.log("[CabeceraImputaciones] Payload cabeceras admin:", headersData);
        const headerRows = Array.isArray(headersData?.value) ? headersData.value : [];
        const allRecords = headerRows
            .map((record) => mapCabeceraRecord(record, portalUser))
            .filter((record) => !!record?.id)
            .sort((leftRecord, rightRecord) => getDateSortValue(rightRecord.fechaInicio) - getDateSortValue(leftRecord.fechaInicio));

        console.log("[CabeceraImputaciones] Numero de cabeceras admin renderizables:", allRecords.length);
        return allRecords;
    }

    // Añadimos $top=100 para asegurar que traiga suficientes líneas diarias
    const diarioUrl = `/_api/exc_diarioimputacions?$select=_exc_cr774_registro_value&$filter=_exc_contact_value eq '${portalUser.contactId}'&$top=100`;
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
 * Recupera las líneas de imputación hijas de una cabecera.
 *
 * @param {string} recordId Id de la cabecera.
 * @returns {Promise<Object[]>} Lista de líneas hijas.
 */
async function fetchDailyLinesByHeaderId(recordId) {
    const headers = await buildPortalApiHeaders();
    const normalizedRecordId = sanitizeGuid(recordId);

    const url =
        `/_api/exc_diarioimputacions` +
        `?$select=exc_diarioimputacionid` +
        `&$filter=_exc_cr774_registro_value eq ${normalizedRecordId}`;

    console.log("[CabeceraImputaciones] Cargando líneas hijas de cabecera:", normalizedRecordId, url);

    const response = await fetch(url, {
        method: "GET",
        headers,
        credentials: "same-origin",
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error cargando líneas hijas:", details);
        throw new Error(`No se pudieron cargar las líneas de imputacion. HTTP ${response.status}. ${details}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data?.value) ? data.value : [];
    console.log("[CabeceraImputaciones] líneas hijas recuperadas:", rows);

    return rows;
}

/**
 * Elimina una línea de imputaciónconcreta.
 *
 * @param {string} lineId Id de la línea.
 * @returns {Promise<void>}
 */
async function deleteDailyLineById(lineId) {
    const normalizedLineId = sanitizeGuid(lineId);
    if (!normalizedLineId) return;

    const headers = await buildPortalApiHeaders();
    console.log("[CabeceraImputaciones] Eliminando línea hija:", normalizedLineId);

    const response = await fetch(`/_api/exc_diarioimputacions(${normalizedLineId})`, {
        method: "DELETE",
        headers,
        credentials: "same-origin",
    });

    if (!response.ok && response.status !== 204 && response.status !== 404) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error eliminando línea hija:", normalizedLineId, details);
        throw new Error(`No se pudo eliminar la línea ${normalizedLineId}. HTTP ${response.status}. ${details}`);
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
 * Elimina una cabecera y todas sus líneas hijas asociadas.
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
    const currentWeekHeaderAvailabilityPromise = refreshCurrentWeekHeaderAvailability();

    try {
        records = await fetchCabecerasForCurrentUser();
        paginationState.currentPage = 1;
        console.log("[CabeceraImputaciones] Registros cargados en memoria:", records);
    } catch (error) {
        records = [];
        loadErrorMessage = error?.message || "No se pudieron cargar las cabeceras.";
        console.error("Error cargando cabeceras:", error);
    } finally {
        await currentWeekHeaderAvailabilityPromise;
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
// descarga y gestión del modal de borrado.
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

function getTotalPages(totalItems) {
    return Math.max(1, Math.ceil((totalItems || 0) / PAGE_SIZE));
}

function clampCurrentPage(totalItems) {
    const totalPages = getTotalPages(totalItems);
    if (paginationState.currentPage > totalPages) {
        paginationState.currentPage = totalPages;
    }
    if (paginationState.currentPage < 1) {
        paginationState.currentPage = 1;
    }
}

function getPaginatedRecords(visibleRecords) {
    clampCurrentPage(visibleRecords.length);

    const startIndex = (paginationState.currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    return visibleRecords.slice(startIndex, endIndex);
}

function goToPreviousPage() {
    if (paginationState.currentPage <= 1) return;
    paginationState.currentPage -= 1;
    renderTable();
}

function goToNextPage() {
    const totalPages = getTotalPages(getVisibleRecords().length);
    if (paginationState.currentPage >= totalPages) return;
    paginationState.currentPage += 1;
    renderTable();
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

    paginationState.currentPage = 1;
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

    return `Se eliminará el registro de ${record.contacto || "sin contacto"} (${formatDateDisplay(record.fechaInicio)} - ${formatDateDisplay(record.fechaFin)}) y todas sus líneas de imputación asociadas.`;
}

/**
 * Construye el texto descriptivo mostrado en el modal de copia.
 *
 * @param {CabeceraRecord|null} record Registro a copiar.
 * @returns {string} Mensaje descriptivo para el usuario.
 */
function buildCopyDescription(record) {
    if (!record) return "Se copiará la cabecera seleccionada a la semana actual.";

    return `Cabecera de ${record.contacto || "Sin contacto"} (${formatDateDisplay(record.fechaInicio)} - ${formatDateDisplay(record.fechaFin)})`;
}

/**
 * Sincroniza el estado visual de un par Cancelar/Confirmar de modal.
 *
 * @param {Object} config Configuracion de botones y textos.
 * @param {HTMLButtonElement|null} config.cancelButton Boton secundario del modal.
 * @param {HTMLButtonElement|null} config.confirmButton Boton principal del modal.
 * @param {boolean} config.isBusy Indica si la accion esta en curso.
 * @param {string} config.idleCancelText Texto del boton cancelar en reposo.
 * @param {string} config.busyCancelText Texto del boton cancelar durante proceso.
 * @param {string} config.idleConfirmText Texto del boton confirmar en reposo.
 * @param {string} config.busyConfirmText Texto del boton confirmar durante proceso.
 */
function syncModalButtonsState({
    cancelButton,
    confirmButton,
    isBusy,
    idleCancelText = "Cancelar",
    busyCancelText = "Cerrando...",
    idleConfirmText = "Aceptar",
    busyConfirmText = "Procesando...",
}) {
    if (cancelButton) {
        cancelButton.disabled = !!isBusy;
        cancelButton.textContent = isBusy ? busyCancelText : idleCancelText;
    }

    if (confirmButton) {
        confirmButton.disabled = !!isBusy;
        confirmButton.textContent = isBusy ? busyConfirmText : idleConfirmText;
    }
}

/**
 * Marca visualmente el boton de confirmacion durante el borrado.
 *
 * @param {boolean} isBusy Indica si el borrado esta en curso.
 */
function setDeleteButtonBusyState(isBusy) {
    isDeletingRecord = !!isBusy;
    syncModalButtonsState({
        cancelButton: dom.cancelDeleteButton,
        confirmButton: dom.confirmDeleteButton,
        isBusy: isDeletingRecord,
        idleConfirmText: "Eliminar",
        busyConfirmText: "Eliminando...",
    });
}

/**
 * Marca visualmente el boton de confirmacion durante la navegacion al flujo de copia.
 *
 * @param {boolean} isBusy Indica si la navegacion esta en curso.
 */
function setCopyButtonBusyState(isBusy) {
    isNavigatingToCopy = !!isBusy;
    syncModalButtonsState({
        cancelButton: dom.cancelCopyButton,
        confirmButton: dom.confirmCopyButton,
        isBusy: isNavigatingToCopy,
        idleConfirmText: "Aceptar",
        busyConfirmText: "Abriendo...",
    });
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

async function getCabecerasImputacion() {

    const portalUser = getPortalUserContext();
    if (!portalUser.contactId) {
        throw new Error("No se pudo identificar el usuario logeado.");
    }
    const url =
        `/_api/cr774_registros` +
        `?$filter=_cr774_contact_value eq ${portalUser.contactId}` +
        `&$top=50`;

    console.log("[CabeceraImputaciones] Validando cabecera en semana actual:", url);

    const response = await fetch(url, {
        method: "GET",
        headers: getApiHeaders(),
        credentials: "same-origin",
    });

    console.log(response, "CABECERAS")
}
getCabecerasImputacion()
/**
 * Comprueba si el usuario actual ya tiene una cabecera creada para la semana actual.
 *
 * @returns {Promise<boolean>} true si existe una cabecera para el lunes actual.
 */
async function fetchCurrentWeekHeaderExists() {
    const portalUser = getPortalUserContext();
    if (!portalUser.contactId) {
        throw new Error("No se pudo identificar el usuario logeado.");
    }

    const weekStart = formatLocalYMD(getCurrentWeekMonday());
    const url =
        `/_api/cr774_registros` +
        `?$select=cr774_registroid` +
        `&$filter=_cr774_contact_value eq ${portalUser.contactId} and cr774_fechaderegistro eq ${weekStart}` +
        `&$top=50`;

    console.log("[CabeceraImputaciones] Validando cabecera en semana actual:", url);

    const response = await fetch(url, {
        method: "GET",
        headers: getApiHeaders(),
        credentials: "same-origin",
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("[CabeceraImputaciones] Error validando cabecera de semana actual:", details);
        throw new Error(`No se pudo validar la cabecera de la semana actual. HTTP ${response.status}. ${details}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data?.value) ? data.value : [];
    let hasValidCurrentWeekHeader = false;

    for (const row of rows) {
        const headerId = sanitizeGuid(row?.cr774_registroid || row?.cr774_registrosid || "");
        if (!headerId) {
            continue;
        }

        const childLines = await fetchDailyLinesByHeaderId(headerId);
        if (Array.isArray(childLines) && childLines.length > 0) {
            hasValidCurrentWeekHeader = true;
            continue;
        }

        console.warn("[CabeceraImputaciones] Cabecera vacía detectada en la semana actual. Se eliminará:", headerId);
        await deleteDataverseHeaderById(headerId);
    }

    return hasValidCurrentWeekHeader;
}

/**
 * Refresca el estado global que controla la disponibilidad del boton copiar.
 *
 * @returns {Promise<boolean>} Estado actualizado del bloqueo de copia.
 */
async function refreshCurrentWeekHeaderAvailability() {
    try {
        hasCurrentWeekHeader = await fetchCurrentWeekHeaderExists();
    } catch (error) {
        console.warn("[CabeceraImputaciones] No se pudo resolver la disponibilidad de copia:", error);
        hasCurrentWeekHeader = false;
    }

    return hasCurrentWeekHeader;
}

/**
 * Abre el modal de copia y carga la descripcion del registro seleccionado.
 *
 * @param {string} recordId Identificador del registro a copiar.
 */
function openCopyDialog(recordId) {
    if (hasCurrentWeekHeader) return;

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
    paginationState.currentPage = 1;
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
        if (hasCurrentWeekHeader) return;
        openCopyDialog(copyButton.dataset.id || "");
        return;
    }

    const deleteButton = event.target.closest(".delete-btn");
    if (!deleteButton) return;

    openDeleteDialog(deleteButton.dataset.id || "");
}

/**
 * Crea una nueva cabecera de la semana actual y navega a Imputacion Prueba 2.0 en modo copia.
 */
async function handleConfirmCopyClick() {
    if (!recordToCopyId || isNavigatingToCopy || hasCurrentWeekHeader) return;

    const recordId = sanitizeGuid(recordToCopyId);
    if (!recordId) return;

    try {
        sessionStorage.setItem(COPY_RETURN_URL_SESSION_KEY, window.location.href);
    } catch (error) {
        console.warn("No se pudo guardar la URL de retorno para copia:", error);
    }

    try {
        setCopyButtonBusyState(true);

        hasCurrentWeekHeader = await fetchCurrentWeekHeaderExists();
        if (hasCurrentWeekHeader) {
            recordToCopyId = null;
            hideCopyDialog();
            renderTable();
            showToast("Ya existe una cabecera en la semana actual.", "success");
            return;
        }

        const newHeaderId = await createCopyHeaderForCurrentWeek();
        window.location.href = buildCopyUrl(recordId, newHeaderId);
    } catch (error) {
        console.error("[CabeceraImputaciones] Error creando la cabecera para copia:", error);
        setCopyButtonBusyState(false);
        showToast(error?.message || "No se pudo preparar la copia de la cabecera.", "error");
    }
}

/**
 * Elimina en Dataverse el registro confirmado y todas sus líneas hijas.
 */
async function handleConfirmDeleteClick() {
    if (!recordToDeleteId || isDeletingRecord) return;

    const recordId = sanitizeGuid(recordToDeleteId);
    if (!recordId) return;

    try {
        setDeleteButtonBusyState(true);
        await deleteHeaderWithChildren(recordId);
        await refreshCurrentWeekHeaderAvailability();

        records = records.filter((record) => record.id !== recordId);
        clampCurrentPage(getVisibleRecords().length);
        recordToDeleteId = null;
        hideDeleteDialog();
        renderTable();
    } catch (error) {
        console.error("[CabeceraImputaciones] Error eliminando cabecera y líneas asociadas:", error);
        setDeleteButtonBusyState(false);
        alert(error?.message || "No se pudo eliminar la cabecera con sus líneas de imputación.");
    }
}

/**
 * Limpia el registro pendiente y cierra el modal al cancelar.
 */
function handleDeleteDialogDismiss() {
    if (isDeletingRecord) return;

    setDeleteButtonBusyState(true);
    recordToDeleteId = null;
    hideDeleteDialog();
}

/**
 * Limpia el registro pendiente y cierra el modal al cancelar la copia.
 */
function handleCopyDialogDismiss() {
    if (isNavigatingToCopy) return;

    setCopyButtonBusyState(true);
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
 * Construye la URL para duplicar una cabecera existente.
 *
 * @param {string} recordId Identificador del registro origen.
 * @param {string} [targetHeaderId] Identificador de la nueva cabecera creada.
 * @returns {string} URL de navegacion para copiar el registro.
 */
function buildCopyUrl(recordId, targetHeaderId = "") {
    const baseUrl = `${CONFIG_URLS.copy}?mode=copy&sourceId=${encodeURIComponent(recordId)}`;
    return targetHeaderId
        ? `${baseUrl}&id=${encodeURIComponent(targetHeaderId)}`
        : baseUrl;
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
    const copyActionHtml = hasCurrentWeekHeader
        ? `
    <button type="button" title="Ya existe una cabecera en la semana actual"
      class="d-inline-flex align-items-center justify-content-center border-0 bg-transparent cab20-action-btn"
      style="width: 32px; height: 32px; color: #9ca3af; padding: 0; opacity: 0.45; cursor: not-allowed;"
      aria-label="Copiar registro deshabilitado"
      aria-disabled="true"
      disabled>
      <i data-lucide="copy" size="18"></i>
    </button>
    `
        : `
    <a href="${buildCopyUrl(record.id)}" title="Copiar"
      data-id="${escapeHtml(record.id)}"
      class="d-inline-flex align-items-center justify-content-center text-decoration-none cab20-action-btn copy-btn"
      style="width: 32px; height: 32px; color: #31708f;"
      aria-label="Copiar registro">
      <i data-lucide="copy" size="18"></i>
    </a>
    `;

    return `
    ${copyActionHtml}

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
 * Genera un spinner cuando no existen registros para mostrar.
 *
 * @returns {string} HTML del estado vacio.
 */
function renderLoadingState() {
    return `
    <tr class="align-middle">
        <td colspan="6" class="p-4 text-center">
            <div class="d-flex justify-content-center align-items-center gap-2">
                <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
                <span class="small text-secondary">Cargando cabeceras...</span>
            </div>
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
        <td class="p-3">
            <p class="small text-dark mb-0 text-center">${escapeHtml(record.estadoAprobacion || "Sin estado")}</p>
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

function renderPagination(totalItems) {
    if (!dom.paginationWrap || !dom.paginationInfo || !dom.prevPageButton || !dom.nextPageButton) return;

    // Si no hay registros o solo hay una página, ocultamos el control
    if (totalItems <= PAGE_SIZE) {
        dom.paginationWrap.classList.add("d-none");
        dom.paginationWrap.classList.remove("d-flex"); // Quitamos d-flex para que d-none mande
        return;
    }

    const totalPages = getTotalPages(totalItems);
    const startItem = totalItems === 0 ? 0 : ((paginationState.currentPage - 1) * PAGE_SIZE) + 1;
    const endItem = Math.min(paginationState.currentPage * PAGE_SIZE, totalItems);

    dom.paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${totalItems}`;

    // Estado de los botones
    dom.prevPageButton.disabled = paginationState.currentPage === 1;
    dom.nextPageButton.disabled = paginationState.currentPage === totalPages;

    // Mostrar el contenedor: Quitamos d-none y ponemos d-flex
    dom.paginationWrap.classList.remove("d-none");
    dom.paginationWrap.classList.add("d-flex");
}

function renderTable() {
    if (!dom.tableBody || !dom.tableWrap || !dom.table) return;

    // 1. Si está cargando, mostrar spinner y ocultar paginación
    if (isLoading) {
        dom.tableBody.innerHTML = renderLoadingState();
        if (dom.paginationWrap) dom.paginationWrap.classList.add("d-none");
        refreshIcons();
        return;
    }

    // 2. Obtener registros filtrados/ordenados y LUEGO paginados
    const visibleRecords = getVisibleRecords();
    const totalItems = visibleRecords.length;

    // Forzamos el ajuste de la página actual si los filtros reducen la cantidad de registros
    clampCurrentPage(totalItems);

    const paginatedRecords = getPaginatedRecords(visibleRecords);

    // 3. Renderizar filas
    dom.tableBody.innerHTML = paginatedRecords.length
        ? paginatedRecords.map((record) => renderTableRow(record)).join("")
        : (loadErrorMessage ? renderFeedbackState(loadErrorMessage) : renderEmptyState());

    // 4. Control de scroll horizontal de la tabla
    if (paginatedRecords.length <= 1) {
        dom.tableWrap.classList.remove("table-responsive");
    } else {
        dom.tableWrap.classList.add("table-responsive");
    }

    // 5. IMPORTANTE: Renderizar la barra de paginación
    renderPagination(totalItems);
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
    dom.cancelDeleteButton = document.getElementById("cancelDeleteBtn");
    dom.confirmDeleteButton = document.getElementById("confirmDeleteBtn");
    dom.copyDialogElement = document.getElementById("copyDialog");
    dom.copyRecordInfo = document.getElementById("copyRecordInfo");
    dom.cancelCopyButton = document.getElementById("cancelCopyBtn");
    dom.confirmCopyButton = document.getElementById("confirmCopyBtn");
    dom.contactIdInput = document.getElementById("contactId");
    dom.userIdInput = document.getElementById("userId");
    dom.userNameInput = document.getElementById("userName");
    dom.isAdminRoleInput = document.getElementById("isAdminRole");
    dom.sortButtons = Array.from(document.querySelectorAll(".cab20-sort-btn"));
    dom.paginationWrap = document.getElementById("cab20Pagination");
    dom.paginationInfo = document.getElementById("cab20PaginationInfo");
    dom.prevPageButton = document.getElementById("cab20PrevPage");
    dom.nextPageButton = document.getElementById("cab20NextPage");
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
    dom.prevPageButton?.addEventListener("click", goToPreviousPage);
    dom.nextPageButton?.addEventListener("click", goToNextPage);

    dom.sortButtons.forEach((button) => {
        button.addEventListener("click", handleSortClick);
    });

    dom.deleteDialogElement?.querySelectorAll('[data-bs-dismiss="modal"]').forEach((button) => {
        button.addEventListener("click", handleDeleteDialogDismiss);
    });
    dom.copyDialogElement?.querySelectorAll('[data-copy-dismiss="modal"]').forEach((button) => {
        button.addEventListener("click", handleCopyDialogDismiss);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    cacheDomElements();
    initDeleteDialog();
    initCopyDialog();
    initEventListeners();
    updateSortButtonsState();
    consumePendingCopyToast();
    renderTable();
    loadRecords();
});
