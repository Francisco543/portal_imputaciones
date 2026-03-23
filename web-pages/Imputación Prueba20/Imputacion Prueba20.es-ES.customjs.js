/* =========================================================quedan
ImputacionHoras - JS UNIFICADO (WebPages / Power Pages)
Adaptado para funcionar SIN CDN de Tailwind
Incluye (sin simplificar) el contenido original de:
constants.js, state.js, utils.js, validators.js, entryManager.js, toast.js, dates.js, actionbar.js, actions.js, render.js, main.js
Orden de carga respetado.


TRAZABILIDAD exc_linenumber
- Estado global de secuencia por usuario activo: líneas 97-102
- Cálculo del siguiente valor disponible (max + 10000): líneas 282-309
- Reserva del consecutivo en memoria (reserve + 10000): líneas 321-328
- Reset al cambiar el contexto del usuario: líneas 1363-1367
- Asignación al crear DailyRecord: líneas 3431-3438
- Inicialización al cargar la cabecera activa: líneas 4680-4686
========================================================= */

/* ===================== constants.js ===================== */
// ========================================
// CONSTANTES GLOBALES DE LA APLICACIÓN
// ========================================

// Días de la semana (claves internas)
const DAYS = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday'
};

// Etiquetas de los días para mostrar al usuario
const DAY_LABELS = {
  [DAYS.MONDAY]: 'Lunes',
  [DAYS.TUESDAY]: 'Martes',
  [DAYS.WEDNESDAY]: 'Miércoles',
  [DAYS.THURSDAY]: 'Jueves',
  [DAYS.FRIDAY]: 'Viernes'
};

// Límite máximo de horas por día
const DAY_MAX_HOURS = {
  [DAYS.MONDAY]: 8,
  [DAYS.TUESDAY]: 8,
  [DAYS.WEDNESDAY]: 8,
  [DAYS.THURSDAY]: 8,
  [DAYS.FRIDAY]: 8
};

// Límite máximo de horas semanales
const WEEK_LIMIT = 40;

// Clave para localStorage
const STORAGE_KEY = "figmaImputaciones_state_v1";

// Opciones predefinidas para horas
const HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

// Días en orden para iteraciones consistentes
const DAYS_ARRAY = [
  DAYS.MONDAY,
  DAYS.TUESDAY,
  DAYS.WEDNESDAY,
  DAYS.THURSDAY,
  DAYS.FRIDAY
];

// Mapea cada día laboral a su posición dentro del array semanal [L, M, X, J, V].
const DAY_TO_INDEX = {
  [DAYS.MONDAY]: 0,
  [DAYS.TUESDAY]: 1,
  [DAYS.WEDNESDAY]: 2,
  [DAYS.THURSDAY]: 3,
  [DAYS.FRIDAY]: 4
};

// Mapeo de días a nombres en minúscula (para mensajes)
const DAY_NAMES_LOWER = {
  [DAYS.MONDAY]: "lunes",
  [DAYS.TUESDAY]: "martes",
  [DAYS.WEDNESDAY]: "miércoles",
  [DAYS.THURSDAY]: "jueves",
  [DAYS.FRIDAY]: "viernes"
};

// Flag global para logs de depuración
const DEBUG = true;
// Flag de seguridad para borrado en Dataverse:
// false -> simulacion con debugLog
// true  -> DELETE real en exc_diarioimputacions
const ENABLE_DB_DELETE = true;
// CAMBIO DOCUMENTADO:
// Version de script para diagnosticar cache/publicacion en Power Pages.
const APP_BUILD_VERSION = "2026-03-17-copy-header-url";
const COPY_RETURN_URL_SESSION_KEY = "cab20_copy_return_url";
const HEADER_LIST_URL = "/Cabecera-Imputaciones20/";
var isCopyPreviewMode = false;
var isSubmittingCopiedEntries = false;
var isCancellingCopy = false;
var isDeletingEntryFromModal = false;
// Secuencia de exc_linenumber cacheada para el usuario actualmente autenticado.
var nextDailyLineNumber = null;
// Contacto al que pertenece la secuencia cacheada de exc_linenumber.
var nextDailyLineNumberContactId = null;

// CAMBIO DOCUMENTADO:
// Modo de item por tipo de proyecto:
// - "task"    => se mostrara "Tarea"
// - "request" => se mostrara "Peticion"
// Nota: si Dataverse trae label formateado (formatted value), se prioriza ese label.
const PROJECT_TYPE_CODE_TO_MODE = {
  6: "request",
  2: "task",
};

// CAMBIO DOCUMENTADO:
// Catalogo de textos para reutilizar el mismo campo visual (taskField)
// cuando el proyecto trabaja con tareas o con peticiones.
const WORK_ITEM_UI = {
  task: { label: "Tarea", placeholder: "Selecciona una tarea..." },
  request: { label: "Petición", placeholder: "Selecciona una petición..." },
  none: { label: "", placeholder: "..." },
};

function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

/* ========= Helpers de visibilidad / Bootstrap ========= */
function hideEl(el) {
  if (!el) return;
  el.classList.add("d-none");
  el.classList.remove("show-flex");
}

function showEl(el, displayMode = "") {
  if (!el) return;
  el.classList.remove("d-none");
  if (displayMode === "flex") {
    el.classList.add("show-flex");
  } else {
    el.classList.remove("show-flex");
  }
}

function isHiddenEl(el) {
  if (!el) return true;
  return el.classList.contains("d-none");
}

function refreshIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function ensureEntryObservations(entry) {
  if (entry && !entry.observaciones) {
    entry.observaciones = createEmptyObservations();
  }
  return entry;
}

function refreshUI({ lockDatePicker = false } = {}) {
  renderAll();
  if (lockDatePicker) {
    checkAndLockDatePicker?.();
  }
}

function isCopyFlowLocked() {
  return isCopyPreviewMode === true;
}

function shouldPersistImmediately() {
  return isCopyPreviewMode !== true;
}

function setSecondaryButtonBusyState(button, enabled, busyLabel, idleLabel) {
  if (!button) return;
  button.disabled = !enabled;
  button.setAttribute("aria-disabled", enabled ? "false" : "true");
  button.textContent = enabled ? idleLabel : busyLabel;
}

function syncModalActionButtonsState({
  cancelBtn,
  confirmBtn,
  mode = "idle",
  idleCancelText = "Cancelar",
  busyCancelText = "Cerrando...",
  idleConfirmText = "Aceptar",
  busyConfirmText = "Procesando...",
  canConfirm = true,
  useConfirmHtml = false,
}) {
  const isBusy = mode !== "idle";

  if (cancelBtn) {
    const cancelEnabled = !isBusy;
    cancelBtn.disabled = !cancelEnabled;
    cancelBtn.setAttribute("aria-disabled", cancelEnabled ? "false" : "true");
    cancelBtn.textContent = mode === "cancel" ? busyCancelText : idleCancelText;
  }

  if (confirmBtn) {
    const isConfirmBusy = mode === "confirm";
    const confirmEnabled = !isBusy && canConfirm;
    confirmBtn.disabled = !confirmEnabled;
    confirmBtn.setAttribute("aria-disabled", confirmEnabled ? "false" : "true");
    const nextText = isConfirmBusy ? busyConfirmText : idleConfirmText;

    if (useConfirmHtml) {
      confirmBtn.innerHTML = nextText;
    } else {
      confirmBtn.textContent = nextText;
    }

    if (confirmBtn.classList.contains("ip20-btn-active") || confirmBtn.classList.contains("ip20-btn-disabled")) {
      setThemedButtonState(confirmBtn, confirmEnabled);
    }
  }
}

function syncDeleteModalButtonsState(mode = "idle") {
  syncModalActionButtonsState({
    cancelBtn: document.getElementById("cancelDeleteBtn"),
    confirmBtn: document.getElementById("confirmDeleteBtn"),
    mode,
    idleConfirmText: "Eliminar",
    busyConfirmText: "Eliminando...",
  });
  isDeletingEntryFromModal = mode === "confirm";
}

function syncObservationModalButtonsState(mode = "idle", canSave = true) {
  syncModalActionButtonsState({
    cancelBtn: document.getElementById("modalCancelBtn"),
    confirmBtn: document.getElementById("saveObservationBtn"),
    mode,
    idleConfirmText: "Guardar",
    busyConfirmText: "Guardando...",
    canConfirm: canSave,
  });
}

const ODATA_HEADERS = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "OData-Version": "4.0",
  "OData-MaxVersion": "4.0",
};

async function fetchJson(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: ODATA_HEADERS,
  });

  if (!res.ok) {
    // CAMBIO DOCUMENTADO:
    // Incluimos el cuerpo de error de Dataverse para diagnosticar 400/401/403
    // (campo inexistente, filtro incorrecto, permisos, etc.).
    const details = await res.text().catch(() => "");
    throw new Error(`Error HTTP ${res.status} al consultar ${url}. ${details}`);
  }

  return res.json();
}

/**
 * Inicializa y devuelve el siguiente `exc_linenumber` disponible para el
 * usuario autenticado consultando el valor máximo ya persistido en Dataverse.
 *
 * La función cachea el resultado por `contactId` para no recalcular la secuencia
 * mientras el usuario sigue trabajando con la misma sesión.
 *
 * @returns {Promise<number>} Próximo `exc_linenumber` disponible (`max + 10000`).
 * @throws {Error} Si no se puede resolver el contacto autenticado para calcular la secuencia.
 */
async function ensureNextDailyLineNumber() {
  const contactId = getCurrentPortalContactId();
  if (!contactId) {
    throw new Error("No se pudo resolver el contacto autenticado para calcular exc_linenumber.");
  }

  if (
    nextDailyLineNumber !== null &&
    nextDailyLineNumberContactId === contactId
  ) {
    return nextDailyLineNumber;
  }

  const data = await fetchJson(
    `/_api/exc_diarioimputacions?$select=exc_linenumber&$filter=_exc_contact_value eq ${contactId}&$top=500`
  );
  const rows = Array.isArray(data?.value) ? data.value : [];
  const maxLineNumber = rows.reduce((maxValue, row) => {
    const numericValue = Number(row?.exc_linenumber);
    if (!Number.isFinite(numericValue)) {
      return maxValue;
    }

    return Math.max(maxValue, numericValue);
  }, 0);

  nextDailyLineNumber = maxLineNumber > 0 ? maxLineNumber + 10000 : 10000;
  nextDailyLineNumberContactId = contactId;
  debugLog("[exc_linenumber] Secuencia inicializada para usuario", {
    contactId,
    maxLineNumber,
    nextDailyLineNumber,
  });
  return nextDailyLineNumber;
}

/**
 * Reserva el siguiente `exc_linenumber` en memoria y avanza la secuencia local.
 *
 * Debe invocarse únicamente después de haber inicializado la secuencia con
 * `ensureNextDailyLineNumber(...)`.
 *
 * @returns {number} Valor reservado de `exc_linenumber` para el próximo diario nuevo.
 * @throws {Error} Si la secuencia todavía no se ha inicializado para la cabecera activa.
 */
function reserveNextDailyLineNumber() {
  if (!Number.isFinite(nextDailyLineNumber) || nextDailyLineNumber === null) {
    throw new Error("La secuencia de exc_linenumber no está inicializada.");
  }

  const reservedLineNumber = nextDailyLineNumber;
  nextDailyLineNumber += 10000;
  debugLog("[exc_linenumber] Valor reservado", {
    reservedLineNumber,
    nextDailyLineNumber,
    contactId: nextDailyLineNumberContactId,
  });
  return reservedLineNumber;
}

// CAMBIO DOCUMENTADO:
// Intenta obtener el tipo de proyecto (codigo + label) desde la fila de proyecto.
// Acepta tanto campos en la fila raiz como en la entidad expandida exc_ProyectosNav.
function extractProjectTypeInfo(projectRow) {
  if (!projectRow || typeof projectRow !== "object") {
    return { code: null, label: "" };
  }

  const expanded =
    projectRow.exc_ProyectosNav ||
    projectRow.exc_proyectosnav ||
    null;

  const rawCode =
    projectRow.exc_projecttypecode ??
    expanded?.exc_projecttypecode ??
    null;

  const formatted =
    projectRow["exc_projecttypecode@OData.Community.Display.V1.FormattedValue"] ||
    expanded?.["exc_projecttypecode@OData.Community.Display.V1.FormattedValue"] ||
    "";

  const numericCode = Number(rawCode);

  return {
    code: Number.isFinite(numericCode) ? numericCode : null,
    label: String(formatted || "").trim(),
  };
}

// CAMBIO DOCUMENTADO:
// Traduce tipo de proyecto a modo de campo unico (task/request/none).
// Prioriza label formateado de Dataverse y luego hace fallback al mapeo por codigo.
function resolveWorkItemModeByType(typeCode) {
  const code = Number(typeCode);
  // CAMBIO DOCUMENTADO:
  // Mapeo deterministico por tipo de proyecto (2=tarea, 6=peticion).
  return PROJECT_TYPE_CODE_TO_MODE[code] || "none";
}

// CAMBIO DOCUMENTADO:
// Actualiza label + placeholder del campo unico de trabajo (Tarea/Peticion).
function applyWorkItemFieldMode(mode) {
  const safeMode = WORK_ITEM_UI[mode] ? mode : "none";
  const cfg = WORK_ITEM_UI[safeMode];

  const labelEl = document.getElementById("taskFieldLabel");
  const inputEl = document.getElementById("taskInput");

  if (labelEl) labelEl.textContent = cfg.label;
  if (inputEl) inputEl.placeholder = cfg.placeholder;
}

// CAMBIO DOCUMENTADO:
// Helpers de modo para no duplicar reglas en validaciones y mensajes.
function getWorkItemModeByProject(projectId) {
  if (!projectId) return "none";
  return projectWorkItemModeById[projectId] || projectsMap[projectId]?.mode || "none";
}

function getAvailableWorkItemsByProject(projectId) {
  if (!projectId) return [];
  return Array.isArray(workItemsByProject[projectId]) ? workItemsByProject[projectId] : [];
}

function hasAvailableWorkItemsByProject(projectId) {
  return getAvailableWorkItemsByProject(projectId).length > 0;
}

function isWorkItemRequiredByProject(projectId) {
  return getWorkItemModeByProject(projectId) !== "none";
}

function getWorkItemLabelByProject(projectId) {
  return getWorkItemModeByProject(projectId) === "request" ? "peticion" : "tarea";
}

function isProjectMissingRequiredWorkItems(projectId) {
  const mode = getWorkItemModeByProject(projectId);
  if (mode !== "task" && mode !== "request") return false;
  return !hasAvailableWorkItemsByProject(projectId);
}

function getMissingWorkItemsToastMessage(projectId) {
  const typeCode = Number(projectTypeById[projectId] ?? projectsMap[projectId]?.projectTypeCode ?? null);
  if (typeCode === 6) {
    return "Proyecto bolsa de horas sin peticiones, contactar a su responsable";
  }
  if (typeCode === 2) {
    return "Proyecto I+D sin tareas, contactar a su responsable";
  }

  return getWorkItemModeByProject(projectId) === "request"
    ? "Proyecto sin peticiones, contactar a su responsable"
    : "Proyecto sin tareas, contactar a su responsable";
}

function notifyMissingWorkItemsForProject(projectId) {
  if (!isProjectMissingRequiredWorkItems(projectId)) {
    lastMissingWorkItemsToastProjectId = null;
    return false;
  }

  if (lastMissingWorkItemsToastProjectId === projectId) {
    return true;
  }

  showToast(getMissingWorkItemsToastMessage(projectId), "error");
  lastMissingWorkItemsToastProjectId = projectId;
  return true;
}

// CAMBIO DOCUMENTADO:
// Normaliza numeros opcionales provenientes de Dataverse o de valores formateados.
// Casos cubiertos:
// - `null` / `undefined` / "" => no hay limite (null)
// - "40,00" => 40
// - "1.234,50" => 1234.5
// - `40` => 40
function parseOptionalAssignedHours(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  const text = String(rawValue).trim();
  if (!text) return null;

  const normalizedText = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(",", ".");

  const value = Number(normalizedText);
  return Number.isFinite(value) ? value : null;
}

function createWorkItemFields(mode, name) {
  const safeMode = mode === "request" || mode === "task" ? mode : "none";
  const text = String(name || "").trim();
  const meta = arguments[2] && typeof arguments[2] === "object" ? arguments[2] : null;
  const workItemId = meta?.id ? String(meta.id).trim() : null;
  const assignedHours = parseOptionalAssignedHours(meta?.assignedHours);

  return {
    workItemMode: safeMode,
    workItemName: text || null,
    workItemId: workItemId || null,
    workItemAssignedHours: assignedHours,
    task: safeMode === "task" ? (text || null) : null,
    taskId: safeMode === "task" ? (workItemId || null) : null,
    request: safeMode === "request" ? (text || null) : null,
    requestId: safeMode === "request" ? (workItemId || null) : null,
  };
}

function normalizeEntryWorkItem(entry) {
  if (!entry || typeof entry !== "object") return entry;

  const inferredMode = entry.workItemMode === "task" || entry.workItemMode === "request"
    ? entry.workItemMode
    : (
      entry.request || entry.requestId ? "request"
        : entry.task || entry.taskId ? "task"
          : "none"
    );

  const inferredName = String(
    entry.workItemName ||
    (inferredMode === "request" ? entry.request : "") ||
    entry.task ||
    ""
  ).trim();
  const inferredId = String(
    entry.workItemId ||
    (inferredMode === "request" ? entry.requestId : "") ||
    entry.taskId ||
    ""
  ).trim();
  const inferredAssignedHoursRaw =
    entry.workItemAssignedHours ??
    entry.assignedHours ??
    null;
  const inferredAssignedHours = inferredAssignedHoursRaw === null || inferredAssignedHoursRaw === undefined || inferredAssignedHoursRaw === ""
    ? NaN
    : Number(inferredAssignedHoursRaw);

  const normalized = createWorkItemFields(inferredMode, inferredName, {
    id: inferredId,
    assignedHours: Number.isFinite(inferredAssignedHours) ? inferredAssignedHours : null,
  });
  entry.workItemMode = normalized.workItemMode;
  entry.workItemName = normalized.workItemName;
  entry.workItemId = normalized.workItemId;
  entry.workItemAssignedHours = normalized.workItemAssignedHours;
  entry.task = normalized.task;
  entry.taskId = normalized.taskId;
  entry.request = normalized.request;
  entry.requestId = normalized.requestId;
  return entry;
}

function getEntryTaskText(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  return normalized?.workItemMode === "task" ? (normalized.task || "") : "";
}

function getEntryRequestText(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  return normalized?.workItemMode === "request" ? (normalized.request || "") : "";
}

function getEntryWorkItemDisplayText(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  return normalized?.workItemName || "";
}

function pickFirstWorkItemValue(row, fieldNames) {
  for (const field of fieldNames) {
    const raw = row?.[field];
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      return raw;
    }
  }
  return null;
}

function pickFirstWorkItemText(row, fieldNames) {
  for (const field of fieldNames) {
    const raw = row?.[field];
    const formatted = row?.[`${field}@OData.Community.Display.V1.FormattedValue`];
    const text = String(raw ?? formatted ?? "").trim();
    if (text) return text;
  }
  return "";
}

function resolveWorkItemSourceRow(row, mode) {
  if (!row || typeof row !== "object") return null;

  if (mode === "task") {
    return row.exc_TareaId || row.exc_tareaid || row;
  }

  return row;
}

function buildWorkItemDisplayName(row, mode) {
  const sourceRow = resolveWorkItemSourceRow(row, mode);
  if (!sourceRow || typeof sourceRow !== "object") return "";

  const codeFields = mode === "request"
    ? ["exc_peticion", "cr774_peticion", "exc_code", "exc_documentnumber"]
    : ["exc_tarea", "cr774_tarea", "exc_code", "exc_documentnumber"];

  const descriptionFields = mode === "request"
    ? ["exc_description", "exc_descripcion", "exc_nombre", "cr774_nombre", "exc_name", "name"]
    : ["exc_description", "exc_descripcion", "exc_nombre", "cr774_nombre", "exc_name", "name"];

  const code = pickFirstWorkItemText(sourceRow, codeFields);
  const description = pickFirstWorkItemText(sourceRow, descriptionFields);

  if (code && description) {
    const sameValue = code.trim().toLowerCase() === description.trim().toLowerCase();
    return sameValue ? code : `${code} - ${description}`;
  }

  return code || description;
}

function pickWorkItemId(row, mode) {
  const sourceRow = resolveWorkItemSourceRow(row, mode);
  if (!sourceRow || typeof sourceRow !== "object") return null;

  const idFields = mode === "request"
    ? ["exc_peticionesid", "_exc_peticiones_value", "cr774_peticionid"]
    : ["exc_tareasconsultoriaid", "_exc_tareasconsultoria_value", "cr774_tareaid"];

  const id = pickFirstWorkItemValue(sourceRow, idFields);
  return id ? String(id).trim() : null;
}

function pickWorkItemAssignedHours(row, mode) {
  const sourceRow = resolveWorkItemSourceRow(row, mode);
  if (!sourceRow || typeof sourceRow !== "object") return null;

  const raw =
    sourceRow.exc_assignedhours ??
    sourceRow["exc_assignedhours@OData.Community.Display.V1.FormattedValue"] ??
    null;

  return parseOptionalAssignedHours(raw);
}

// CAMBIO DOCUMENTADO:
// Al recargar desde Dataverse no siempre viene disponible el tipo de proyecto
// suficiente para reconstruir si la línea era "task" o "request".
// En ese caso inferimos el modo directamente desde los lookups persistidos
// del diario (`_exc_tareasconsultoria_value` / `_exc_peticiones_value`).
function inferPersistedWorkItemInfo(row, fallbackMode = "none") {
  const taskId = pickWorkItemId(row, "task");
  const requestId = pickWorkItemId(row, "request");

  if (taskId && !requestId) {
    return { mode: "task", id: taskId };
  }

  if (requestId && !taskId) {
    return { mode: "request", id: requestId };
  }

  const safeFallback = fallbackMode === "task" || fallbackMode === "request"
    ? fallbackMode
    : "none";

  return {
    mode: safeFallback,
    id: safeFallback === "none" ? null : pickWorkItemId(row, safeFallback),
  };
}

function buildWorkItemOption(row, mode) {
  const text = buildWorkItemDisplayName(row, mode);
  const id = pickWorkItemId(row, mode);
  const assignedHours = pickWorkItemAssignedHours(row, mode);

  if (!text) return null;

  return {
    id: id || null,
    text,
    mode,
    assignedHours,
  };
}

// CAMBIO DOCUMENTADO:
// Normaliza cualquier item de tarea/peticion a un objeto consistente `{ id, text, mode }`.
// Esto permite conservar el GUID real del lookup para persistirlo despues en Dataverse.
function normalizeWorkItemOption(option, fallbackMode = "none") {
  if (!option) return null;

  if (typeof option === "object") {
    const text = String(option.text || option.name || option.label || "").trim();
    if (!text) return null;

    const id = option.id ? String(option.id).trim() : null;
    const mode = option.mode === "task" || option.mode === "request" ? option.mode : fallbackMode;
    const assignedHours = parseOptionalAssignedHours(option.assignedHours);

    return { id, text, mode, assignedHours };
  }

  const text = String(option || "").trim();
  if (!text) return null;

  return {
    id: null,
    text,
    mode: fallbackMode,
    assignedHours: null,
  };
}

function getWorkItemOptionText(option, fallbackMode = "none") {
  return normalizeWorkItemOption(option, fallbackMode)?.text || "";
}

function getWorkItemOptionId(option, fallbackMode = "none") {
  return normalizeWorkItemOption(option, fallbackMode)?.id || null;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractWorkItemOptions(values, mode) {
  const byText = new Map();

  values.forEach((row) => {
    if (!row || typeof row !== "object") return;

    const option = buildWorkItemOption(row, mode);
    if (!option?.text) return;

    if (!byText.has(option.text)) {
      byText.set(option.text, option);
      return;
    }

    const existing = byText.get(option.text);
    if (!existing?.id && option.id) {
      byText.set(option.text, option);
    }
  });

  return Array.from(byText.values());
}

// CAMBIO DOCUMENTADO:
// Extrae texto de item (tarea/peticion) desde filas Dataverse con varios nombres posibles.
function extractWorkItemNames(values, mode) {
  return extractWorkItemOptions(values, mode).map(option => option.text);
}

// CAMBIO DOCUMENTADO:
// Configuracion explicita de Dataverse por tipo de proyecto.
// IMPORTANTE: ajustar "filterColumn" al nombre logico real del lookup en cada tabla.
const WORK_ITEM_QUERY_CONFIG = {
  task: {
    entitySet: "exc_tareasconsultorias",
    filterColumn: "_exc_proyectosnav_value", // TODO: reemplazar por el lookup real de tareas -> proyecto NAV
    filterValueSource: "navId",
    fallbackEntitySet: "exc_proyectoimputacions",
    fallbackFilterColumn: "_exc_proyectosnav_value",
  },
  request: {
    // CAMBIO DOCUMENTADO:
    // Ajustado a la tabla habilitada en Site Settings: exc_peticiones.
    entitySet: "exc_peticioneses",
    // CAMBIO DOCUMENTADO:
    // Recovery solicitado: volvemos al punto donde no habia 400
    // y se filtraba por el lookup de codigo.
    filterColumn: "_exc_proyectosnav_value",
    filterValueSource: "proyectosnavId",
    fallbackEntitySet: "exc_proyectoimputacions",
    fallbackFilterColumn: "_exc_proyectosnav_value",
  },
};

// CAMBIO DOCUMENTADO:
// Carga items de trabajo (tareas/peticiones) con consulta deterministica:
// una sola tabla + una sola columna de filtro por tipo.
async function fetchWorkItemsForProject(projectContext, mode) {
  if (!projectContext || mode === "none") return [];
  const cfg = WORK_ITEM_QUERY_CONFIG[mode];
  if (!cfg) return [];
  console.log("proyect", projectContext)
  const navIdEscaped = String(projectContext.navId || "").trim();
  const codeIdEscaped = String(projectContext.codeId || "").trim();

  // AHORA: Para peticiones usamos navId (relación con proyectosnav)
  // Para tareas podemos mantener la lógica anterior
  const filterValueRaw = mode === "request" ? navIdEscaped : (cfg.filterValueSource === "codeId" ? codeIdEscaped : navIdEscaped);

  if (!filterValueRaw) return [];

  // CAMBIO DOCUMENTADO:
  // Los valores GUID en OData deben ir entre comillas simples
  // También escapamos comillas simples dentro del valor por seguridad
  const escapeODataString = (value) => {
    return `'${String(value).replace(/'/g, "''")}'`;
  };

  const filterValueEscaped = escapeODataString(filterValueRaw);
  const primaryUrl = `/_api/${cfg.entitySet}?$top=500&$filter=${cfg.filterColumn} eq ${filterValueEscaped}`;

  try {
    debugLog(`[work-items][${mode}] query deterministica`, primaryUrl);
    const data = await fetchJson(primaryUrl);
    const values = Array.isArray(data?.value) ? data.value : [];
    const options = extractWorkItemOptions(values, mode);
    if (options.length > 0) return options;
  } catch (error) {
    console.error(`[work-items][${mode}] Error critico cargando items`, {
      entitySet: cfg.entitySet,
      filterColumn: cfg.filterColumn,
      filterValueSource: cfg.filterValueSource,
      filterValue: filterValueRaw,
      navId: navIdEscaped,
      codeId: codeIdEscaped,
      error,
    });

    // CAMBIO DOCUMENTADO:
    // Fallback mejorado - para peticiones intentamos también por código como último recurso
    if (cfg.fallbackEntitySet && cfg.fallbackFilterColumn) {
      // Para peticiones, intentamos primero con navId (que es lo correcto)
      const fallbackFilterValueEscaped = escapeODataString(navIdEscaped);
      const fallbackUrl = `/_api/${cfg.fallbackEntitySet}?$top=200&$filter=${cfg.fallbackFilterColumn} eq ${fallbackFilterValueEscaped}`;
      try {
        debugLog(`[work-items][${mode}] fallback controlado`, fallbackUrl);
        const fallbackData = await fetchJson(fallbackUrl);
        const fallbackValues = Array.isArray(fallbackData?.value) ? fallbackData.value : [];
        const fallbackOptions = extractWorkItemOptions(fallbackValues, mode);
        if (fallbackOptions.length > 0) {
          return fallbackOptions;
        }
      } catch (fallbackError) {
        console.error(`[work-items][${mode}] Error fallback controlado`, {
          fallbackEntitySet: cfg.fallbackEntitySet,
          fallbackFilterColumn: cfg.fallbackFilterColumn,
          filterValueSource: cfg.filterValueSource,
          filterValue: filterValueRaw,
          navId: navIdEscaped,
          codeId: codeIdEscaped,
          fallbackError,
        });
      }
    }

    // Último intento: para peticiones, si tenemos codeId, intentamos filtrar por código
    if (mode === "request" && codeIdEscaped) {
      try {
        const codeFilterValueEscaped = escapeODataString(codeIdEscaped);
        const codeUrl = `/_api/exc_peticiones?$top=200&$filter=_exc_code_value eq ${codeFilterValueEscaped}`;
        debugLog(`[work-items][${mode}] intento por código`, codeUrl);
        const codeData = await fetchJson(codeUrl);
        const codeValues = Array.isArray(codeData?.value) ? codeData.value : [];
        const codeOptions = extractWorkItemOptions(codeValues, mode);
        if (codeOptions.length > 0) {
          return codeOptions;
        }
      } catch (codeError) {
        console.error(`[work-items][${mode}] Error intento por código`, codeError);
      }
    }

    showToast("No se pudieron cargar las opciones del proyecto.", "error");
    return [];
  }
}

function setControlDisabledState(control, disabled) {
  if (!control) return;
  control.disabled = disabled;
  control.classList.toggle("ip20-disabled-control", disabled);
}

function setThemedButtonState(button, enabled) {
  if (!button) return;
  const disabled = !enabled;
  button.disabled = disabled;
  button.setAttribute("aria-disabled", disabled ? "true" : "false");
  button.classList.remove("ip20-btn-active", "ip20-btn-disabled");
  button.classList.add(enabled ? "ip20-btn-active" : "ip20-btn-disabled");
}

function canEnableAddButton() {
  const hasPendingEdit = editingHoursEntryId !== null;
  const okProject = !!selectedProjectId;
  const okDates = !!selectedDateRange.start && !!selectedDateRange.end;
  const taskRequired = isWorkItemRequiredByProject(selectedProjectId);
  const okTask = !taskRequired || !!selectedTaskOption;
  return !(hasPendingEdit || !(okProject && okDates && okTask));
}

function canEnableSubmitButton() {
  const hasRows = Array.isArray(entries) && entries.length > 0;
  const hasPendingEdit = editingHoursEntryId !== null;
  let hasPendingAdd = false;
  try {
    hasPendingAdd = !!isAdding;
  } catch (error) {
    hasPendingAdd = false;
  }
  return hasRows && !hasPendingEdit && !hasPendingAdd;
}

function ensureSubmitButtonLabel() {
  const btnSubmit = document.getElementById("btnSubmit") || document.querySelector('button[onclick="submitData()"]');
  if (!btnSubmit) return;

  let submitLabel = btnSubmit.querySelector("span");
  if (!submitLabel) {
    submitLabel = document.createElement("span");
    btnSubmit.textContent = "";
    btnSubmit.appendChild(submitLabel);
  }

  if ((submitLabel.textContent || "").trim() !== "Enviar") {
    submitLabel.textContent = "Enviar";
  }
  btnSubmit.setAttribute("aria-label", "Enviar");
}

function initSubmitButtonGuard() {
  const btnSubmit = document.getElementById("btnSubmit") || document.querySelector('button[onclick="submitData()"]');
  if (!btnSubmit || btnSubmit._ip20LabelGuard) return;

  ensureSubmitButtonLabel();

  const observer = new MutationObserver(() => {
    ensureSubmitButtonLabel();
  });

  observer.observe(btnSubmit, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  btnSubmit._ip20LabelGuard = observer;
  window.addEventListener("resize", ensureSubmitButtonLabel);
}

function syncCopyActionButtonsState() {
  const copyActions = document.getElementById("copyActions");
  const btnAccept = document.getElementById("btnAcceptCopy");
  const btnCancel = document.getElementById("btnCancelCopy");

  if (!copyActions || !btnAccept || !btnCancel) return;

  if (!isCopyFlowLocked()) {
    hideEl(copyActions);
    return;
  }

  showEl(copyActions, "flex");

  const canAccept =
    Array.isArray(entries) &&
    entries.length > 0 &&
    !isSubmittingCopiedEntries &&
    !isCancellingCopy &&
    editingHoursEntryId === null;

  setThemedButtonState(btnAccept, canAccept);
  setSecondaryButtonBusyState(
    btnCancel,
    !isSubmittingCopiedEntries && !isCancellingCopy,
    isCancellingCopy ? "Cancelando..." : "Cancelar",
    "Cancelar"
  );

  btnAccept.textContent = isSubmittingCopiedEntries ? "Aceptando..." : "Aceptar";
}

/* ===================== state.js ===================== */
// ========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ========================================

var projectsMap = {};
// CAMBIO DOCUMENTADO:
// Estado unico para opciones dinamicas (tareas o peticiones) por proyecto.
var workItemsByProject = {};
var projectTypeById = {};
// CAMBIO DOCUMENTADO:
// Cachea el modo de cada proyecto: "task", "request" o "none".
var projectWorkItemModeById = {};
// CAMBIO DOCUMENTADO:
// Evita recargas repetidas de items por proyecto.
var projectWorkItemsLoaded = {};
// CAMBIO DOCUMENTADO:
// Cache de disponibilidad restante por tarea (horas asignadas - horas imputadas).
// Se indexa por combinacion proyecto+tarea para reutilizar el calculo en la tabla.
var taskAvailabilityCache = {};
var entries = [];
var startDate = null;
var detailedLog = [];
var isRecordsLoading = false;

var selectedDateRange = { start: null, end: null };
var selectedProjectId = null;
var selectedTask = null;
var selectedTaskOption = null;
var lastMissingWorkItemsToastProjectId = null;
var currentHeaderId = null;
var blockedHeaderWeekStarts = new Set();
var isDatePickerEditMode = false;

var editingEntryId = null;
var observationEditEnabled = false;
var editingHoursEntryId = null;
var hoursDraft = null;

function saveState() {
  try {
    const payload = {
      entries: entries,
      detailedLog: detailedLog,
      selectedDateRange: selectedDateRange
        ? {
          start: selectedDateRange.start
            ? new Date(selectedDateRange.start).toISOString()
            : null,
          end: selectedDateRange.end
            ? new Date(selectedDateRange.end).toISOString()
            : null,
        }
        : { start: null, end: null },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Error guardando estado:", e);
  }
}

function preloadEntries(imputaciones, options = {}) {
  // CAMBIO DOCUMENTADO:
  // Agrupa filas diarias de Dataverse en una sola línea visual semanal.
  // Ademas conserva IDs fisicos por línea para trazabilidad.
  const resetPersistedState = options?.resetPersistedState === true;
  const targetHeaderId = String(options?.targetHeaderId || currentHeaderId || "").trim() || null;
  const grouped = {};

  imputaciones.forEach(item => {
    if (!item.exc_Proyectoimputacion) {
      console.warn("Imputación sin proyecto, se ignorará:", item.exc_diarioimputacionid);
      return;
    }

    const projectCode = item.exc_Proyectoimputacion.exc_iteminternalid?.split("-")[0] || "-";
    const projectName = item.exc_Proyectoimputacion.exc_proyectodescripcion || "-";
    const rawWorkItemName = String(item.exc_task || "").trim();
    const observation = item.exc_observations || "";
    // Dia laboral derivado desde la fecha del registro diario (lunes-viernes).
    const dayKey = dayKeyFromDate(item.exc_imputationdate);
    const hours = item.exc_quantity || 0;
    // Metadatos de línea para poder agrupar los 5 dias en una sola fila de UI.
    const journalBatchName = item.exc_journalbatchname || null;


    const lineNumber = item.exc_linenumber ?? null;
    const projectId = item._exc_proyectoimputacion_value
      || item.exc_Proyectoimputacion?.exc_proyectoimputacionid
      || null;
    const projectTypeInfo = extractProjectTypeInfo(item.exc_Proyectoimputacion);
    const projectedMode = resolveWorkItemModeByType(projectTypeInfo.code);
    const persistedWorkItemInfo = inferPersistedWorkItemInfo(item, projectedMode);
    const workItemFields = createWorkItemFields(
      persistedWorkItemInfo.mode,
      rawWorkItemName,
      { id: persistedWorkItemInfo.id }
    );

    // Agrupamos por batch+lí­nea para consolidar en una sola fila los 5 registros diarios.
    const key = buildFunctionalWorkItemKey(projectCode, workItemFields);

    if (!grouped[key]) {
      grouped[key] = {
        projectCode,
        projectName,
        projectId,
        ...workItemFields,
        lineNumber,
        journalBatchName,
        headerId: resetPersistedState
          ? targetHeaderId
          : (item._exc_cr774_registro_value || targetHeaderId || null),
        // IDs de BD asociados a esta línea (potencialmente L-V).
        dbRecordIds: [],
        // RelaciÃ³n día -> id en BD, para trazabilidad.
        dayRecordIds: {},
        // Array de 5 posiciones [L, M, X, J, V].
        weekHoursArray: createWeekHoursArray(),
        hours: {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0
        },
        observaciones: createEmptyObservations()
      };
    }

    // Acumulamos todos los IDs diarios que pertenezcan a la misma línea.
    if (item.exc_diarioimputacionid) {
      grouped[key].dbRecordIds.push(item.exc_diarioimputacionid);
    }

    if (!dayKey) {
      const date = new Date(item.exc_imputationdate);
      console.warn(`Día no válido: ${date.getDay()}`);
      return;
    }

    // Mantenemos horas por objeto (monday..friday).
    grouped[key].hours[dayKey] = Number(grouped[key].hours[dayKey] || 0) + Number(hours || 0);
    // Guardamos id fisico por dia para diagnostico/operaciones futuras.
    grouped[key].dayRecordIds[dayKey] = item.exc_diarioimputacionid;
    // Mantenemos tambien la vista por array fijo [L, M, X, J, V].
    grouped[key].weekHoursArray[DAY_TO_INDEX[dayKey]] = grouped[key].hours[dayKey] > 0
      ? grouped[key].hours[dayKey]
      : null;

    if (observation) {
      grouped[key].observaciones[dayKey] = observation;
    }
  });

  // Normalizamos IDs duplicados y sincronizamos la estructura semanal final.
  entries = Object.values(grouped).map(entry => {
    if (resetPersistedState) {
      entry.headerId = targetHeaderId;
      entry.dayRecordIds = {};
      entry.dbRecordIds = [];
      entry.dbRecordIds = Array.from(new Set((entry.dbRecordIds || []).filter(Boolean)));
    }
    normalizeEntryWorkItem(entry);
    syncWeekHoursArray(entry);
    return finalizeEntryIdentity(entry);
  });

  const imputacionesSinProyecto = imputaciones.filter(i => !i.exc_Proyectoimputacion);

  debugLog("📊 Entries agrupadas:", entries);
  debugLog("❌ Imputaciones sin proyecto (ignoradas):", imputacionesSinProyecto.length);

  renderTable();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (parsed && Array.isArray(parsed.entries)) {
      entries = parsed.entries.map(entry => finalizeEntryIdentity(entry));
    }
    if (parsed && Array.isArray(parsed.detailedLog)) detailedLog = parsed.detailedLog;

    if (parsed && parsed.selectedDateRange) {
      selectedDateRange = {
        start: parsed.selectedDateRange.start
          ? new Date(parsed.selectedDateRange.start)
          : null,
        end: parsed.selectedDateRange.end
          ? new Date(parsed.selectedDateRange.end)
          : null,
      };
    }
  } catch (e) {
    console.warn("Error cargando estado:", e);
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Error limpiando estado:", e);
  }
}

var hasCommentChanges = false;
var pendingDeleteId = null;

/* ===================== utils.js ===================== */
// ========================================
// FUNCIONES UTILITARIAS
// ========================================

function parseHourValue(value) {
  const cleaned = String(value ?? "").trim().replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function isIntegerLike(n) {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

function formatLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeDateAtLocalMidnight(date) {
  if (!date) return null;

  const normalized = new Date(date);
  if (Number.isNaN(normalized.getTime())) return null;
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function normalizeApiDateValueToYMD(value) {
  if (value instanceof Date) {
    const normalizedDate = normalizeDateAtLocalMidnight(value);
    return normalizedDate ? formatLocalYMD(normalizedDate) : "";
  }

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

  const parsedDate = normalizeDateAtLocalMidnight(new Date(text));
  return parsedDate ? formatLocalYMD(parsedDate) : "";
}

function extractODataNextLink(payload) {
  return String(
    payload?.["@odata.nextLink"] ||
    payload?.["odata.nextLink"] ||
    ""
  ).trim();
}

async function loadBlockedHeaderWeekStarts() {
  blockedHeaderWeekStarts = new Set();

  if (isDatePickerEditMode) {
    return blockedHeaderWeekStarts;
  }

  const contactId = getCurrentPortalContactId();
  if (!contactId) {
    console.warn("No se pudo resolver el contacto para cargar lunes bloqueados.");
    return blockedHeaderWeekStarts;
  }

  let url =
    `/_api/cr774_registros` +
    `?$select=cr774_fechaderegistro` +
    `&$filter=_cr774_contact_value eq ${contactId}` +
    `&$top=5000`;

  while (url) {
    const data = await fetchJson(url);
    const rows = Array.isArray(data?.value) ? data.value : [];

    rows.forEach((row) => {
      const normalizedDate = normalizeApiDateValueToYMD(
        row?.cr774_fechaderegistro ||
        row?.["cr774_fechaderegistro@OData.Community.Display.V1.FormattedValue"]
      );

      if (normalizedDate) {
        blockedHeaderWeekStarts.add(normalizedDate);
      }
    });

    url = extractODataNextLink(data);
  }

  debugLog("[Imputacion20] Lunes bloqueados cargados:", Array.from(blockedHeaderWeekStarts));
  return blockedHeaderWeekStarts;
}

function isBlockedHeaderMonday(date) {
  if (isDatePickerEditMode || !blockedHeaderWeekStarts.size) {
    return false;
  }

  const normalizedDate = normalizeApiDateValueToYMD(date);
  return !!normalizedDate && blockedHeaderWeekStarts.has(normalizedDate);
}

function getSelectedWeekStartDate() {
  const rangeStart = normalizeDateAtLocalMidnight(selectedDateRange?.start);
  if (rangeStart) return rangeStart;

  const pickerDate = document.getElementById("datePicker")?._flatpickr?.selectedDates?.[0] || null;
  return normalizeDateAtLocalMidnight(pickerDate);
}

// CAMBIO DOCUMENTADO:
// Resuelve el contacto autenticado del portal usando varias fuentes ya presentes
// en el proyecto. Se usa al crear la cabecera real en `cr774_registros` para
// persistir el usuario de sesión en la lookup `cr774_Contact`.
function getCurrentPortalContactId() {
  const contactId =
    window.portalUser?.contactId ||
    window.Microsoft?.Dynamic365?.Portal?.User?.contactId ||
    document.getElementById("contactId")?.value ||
    "";

  return String(contactId || "").replace(/[{}]/g, "").trim();
}

// CAMBIO DOCUMENTADO:
// Resuelve tambien el resto de datos del usuario autenticado para futuras
// ampliaciones (nombre visible, id del usuario del portal, etc.) sin depender
// de una unica fuente global.
function getCurrentPortalUserContext() {
  return {
    contactId: getCurrentPortalContactId(),
    userId: String(
      window.portalUser?.userId ||
      document.getElementById("userId")?.value ||
      ""
    ).replace(/[{}]/g, "").trim(),
    userName: String(
      window.portalUser?.userName ||
      document.getElementById("userName")?.value ||
      ""
    ).trim(),
  };
}

// CAMBIO DOCUMENTADO:
// AÃ±ade al payload el contacto autenticado del portal usando la lookup indicada.
// Se reutiliza en cabecera y diario para que ambos registros queden asociados
// al mismo usuario creador.
function appendPortalContactBinding(payload, fieldName = "exc_Contact") {
  const contactId = getCurrentPortalContactId();
  if (!contactId) {
    throw new Error("No se pudo resolver el contacto del usuario autenticado.");
  }

  payload[`${fieldName}@odata.bind`] = `/contacts(${contactId})`;
  return payload;
}

function encodeStableKeyPart(value) {
  return encodeURIComponent(String(value ?? "").trim());
}

function buildFunctionalWorkItemKey(projectCode, workItemFields) {
  const normalizedProjectCode = String(projectCode || "").trim() || "-";
  const normalizedMode = String(workItemFields?.workItemMode || "none").trim() || "none";
  const normalizedWorkItemIdentity = String(
    workItemFields?.workItemId || workItemFields?.workItemName || ""
  ).trim();

  return [
    "project",
    encodeStableKeyPart(normalizedProjectCode),
    "mode",
    encodeStableKeyPart(normalizedMode),
    "item",
    encodeStableKeyPart(normalizedWorkItemIdentity),
  ].join("__");
}

function buildStableEntryId(entry) {
  if (!entry || typeof entry !== "object") return "";

  const normalized = normalizeEntryWorkItem(entry);

  return [
    "header",
    encodeStableKeyPart(normalized.headerId || currentHeaderId || normalized.weekStart || ""),
    buildFunctionalWorkItemKey(normalized.projectCode || normalized.projectId || "", normalized),
  ].join("__");
}

function finalizeEntryIdentity(entry) {
  if (!entry || typeof entry !== "object") return entry;

  entry.id = buildStableEntryId(entry);
  return entry;
}

function setHeaderIdInUrl(headerId) {
  const url = new URL(window.location.href);
  if (headerId) {
    url.searchParams.set("id", headerId);
  } else {
    url.searchParams.delete("id");
  }

  window.history.replaceState({}, "", url.toString());
  currentHeaderId = headerId || null;
}

function extractEntityIdFromHeaders(headers) {
  const entityHeader =
    headers?.get?.("OData-EntityId") ||
    headers?.get?.("odata-entityid") ||
    headers?.get?.("entityid") ||
    "";

  const match = String(entityHeader).match(/\(([^)]+)\)/);
  return match ? match[1] : "";
}

function createEmptyHours() {
  const hours = {};
  DAYS_ARRAY.forEach(day => hours[day] = 0);
  return hours;
}

// Estructura semanal fija [L, M, X, J, V]; `null` significa sin horas ese día.
function createWeekHoursArray() {
  return [null, null, null, null, null];
}

// Convierte una fecha a la clave interna del día laboral correspondiente.
function dayKeyFromDate(dateValue) {
  const date = new Date(dateValue);
  const day = date.getDay();
  switch (day) {
    case 1: return DAYS.MONDAY;
    case 2: return DAYS.TUESDAY;
    case 3: return DAYS.WEDNESDAY;
    case 4: return DAYS.THURSDAY;
    case 5: return DAYS.FRIDAY;
    default: return null;
  }
}

// Sincroniza `entry.hours` con `entry.weekHoursArray` para mantener ambas vistas coherentes.
function syncWeekHoursArray(entry) {
  if (!entry) return;
  if (!Array.isArray(entry.weekHoursArray) || entry.weekHoursArray.length !== 5) {
    entry.weekHoursArray = createWeekHoursArray();
  }

  DAYS_ARRAY.forEach(day => {
    const idx = DAY_TO_INDEX[day];
    const value = Number(entry.hours?.[day] || 0);
    entry.weekHoursArray[idx] = value > 0 ? value : null;
  });
}

function cloneHoursDraft(draft) {
  const cloned = createEmptyHours();

  DAYS_ARRAY.forEach(day => {
    cloned[day] = parseHourValue(draft?.[day] || 0);
  });

  return cloned;
}

function stagePendingEntryPersistence(entry, prevDraft, nextDraft) {
  if (!entry) return;

  entry._pendingPersistence = {
    prevDraft: cloneHoursDraft(prevDraft),
    nextDraft: cloneHoursDraft(nextDraft),
    hadPersistedRecordsBefore: Array.isArray(entry.dbRecordIds) && entry.dbRecordIds.filter(Boolean).length > 0,
    wasNewEntry: entry._openObsAfterSave === true,
  };
}

function clearPendingEntryPersistence(entry) {
  if (!entry || typeof entry !== "object") return;
  delete entry._pendingPersistence;
}

function revertPendingEntryPersistence(entry) {
  if (!entry || typeof entry !== "object") return false;

  const pending = entry._pendingPersistence;
  if (!pending) return false;

  EntryManager.updateEntryHours(entry, pending.prevDraft);
  syncWeekHoursArray(entry);
  clearPendingEntryPersistence(entry);
  return true;
}

function createEmptyObservations() {
  const obs = {};
  DAYS_ARRAY.forEach(day => obs[day] = "");
  return obs;
}

function formatDateES(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function getDatesInRangeInclusive(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const dates = [];
  const d = new Date(start);

  while (d <= end) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

/* ===================== validators.js ===================== */
// ========================================
// VALIDADORES DE LA APLICACIÓN
// ========================================

const HourValidators = {
  validateDailyHours(daily) {
    if (daily < 0) {
      return { valid: false, error: "No se permiten horas negativas." };
    }
    if (daily > 8) {
      return { valid: false, error: "Las horas diarias no pueden superar 8." };
    }
    return { valid: true };
  },

  validateDayHours(day, value) {
    const cap = DAY_MAX_HOURS[day];

    if (value < 0) {
      return { valid: false, error: "No se permiten horas negativas." };
    }

    if (value > cap) {
      const dayName = DAY_NAMES_LOWER[day];
      return {
        valid: false,
        error: `El ${dayName} no puede superar ${cap}h.`
      };
    }

    return { valid: true };
  },

  validateWeeklyTotal(entries) {
    const weeklyTotal = entries.reduce((acc, entry) => {
      return acc +
        Number(entry.hours?.[DAYS.MONDAY] || 0) +
        Number(entry.hours?.[DAYS.TUESDAY] || 0) +
        Number(entry.hours?.[DAYS.WEDNESDAY] || 0) +
        Number(entry.hours?.[DAYS.THURSDAY] || 0) +
        Number(entry.hours?.[DAYS.FRIDAY] || 0);
    }, 0);

    if (weeklyTotal > WEEK_LIMIT) {
      const exceso = weeklyTotal - WEEK_LIMIT;
      return {
        valid: false,
        error: `No se puede enviar: te has pasado ${exceso.toFixed(1)}h (Total: ${weeklyTotal.toFixed(1)}h / Máx: ${WEEK_LIMIT}h).`,
        total: weeklyTotal
      };
    }

    return { valid: true, total: weeklyTotal };
  },

  validateDailyTotals(entries, entryId, draft) {
    const totalsExcl = createEmptyHours();

    entries.forEach(e => {
      if (e.id === entryId) return;
      DAYS_ARRAY.forEach(day => {
        totalsExcl[day] += Number(e.hours?.[day] || 0);
      });
    });

    for (const day of DAYS_ARRAY) {
      const cap = DAY_MAX_HOURS[day];
      const total = totalsExcl[day] + draft[day];

      if (total > cap + 1e-9) {
        const disponible = Math.max(0, Number((cap - totalsExcl[day]).toFixed(2)));
        return {
          valid: false,
          error: `Total ${DAY_NAMES_LOWER[day]} supera ${cap}h. Disponible: ${disponible.toFixed(2)}h.`,
          dayWithError: day
        };
      }
    }

    return { valid: true };
  },

  isValidHourValue(value) {
    return Number.isFinite(value) && value >= 0 && value <= 8;
  },

  parseAndValidateHourInput(raw) {
    const cleaned = String(raw).trim().replace(",", ".");
    const value = parseFloat(cleaned);

    if (!Number.isFinite(value)) {
      return { valid: false, error: "Introduce un número válido." };
    }

    if (value < 0) {
      return { valid: false, error: "No se permiten horas negativas." };
    }

    if (value > 8) {
      return { valid: false, error: "No puedes introducir más de 8 horas diarias." };
    }

    return { valid: true, value };
  }
};

function sumDraftHours(draft) {
  return DAYS_ARRAY.reduce((acc, day) => acc + Number(draft?.[day] || 0), 0);
}

function formatHoursExceeded(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("es-ES", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  });
}

// CAMBIO DOCUMENTADO:
// Recupera y cachea el maximo de horas asignadas (`exc_assignedhours`) del item
// seleccionado. Si el proyecto no trabaja con tarea/peticion, no aplica limite.
async function ensureEntryAssignedHoursLimit(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  const cached = parseOptionalAssignedHours(normalized?.workItemAssignedHours);
  if (Number.isFinite(cached) && cached >= 0) {
    return cached;
  }

  if (!normalized?.workItemId || !normalized?.workItemMode || normalized.workItemMode === "none") {
    return null;
  }

  const entitySet = normalized.workItemMode === "task"
    ? "exc_tareasconsultorias"
    : "exc_peticioneses";

  try {
    const record = await fetchJson(`/_api/${entitySet}(${normalized.workItemId})?$select=exc_assignedhours`);
    const limit = parseOptionalAssignedHours(record?.exc_assignedhours);

    normalized.workItemAssignedHours = Number.isFinite(limit) ? limit : null;
    return normalized.workItemAssignedHours;
  } catch (error) {
    // CAMBIO DOCUMENTADO:
    // Si no se puede recuperar `exc_assignedhours`, no bloqueamos la imputacion.
    // La restriccion solo debe aplicar cuando el maximo este realmente informado
    // y sea accesible para el usuario del portal.
    console.warn("[assigned-hours] No se pudo recuperar exc_assignedhours, se omite la validacion.", {
      workItemMode: normalized.workItemMode,
      workItemId: normalized.workItemId,
      entitySet,
      error,
    });
    normalized.workItemAssignedHours = null;
    return null;
  }
}

// CAMBIO DOCUMENTADO:
// Valida que el total acumulado imputado para la misma combinacion
// proyecto + tarea/peticion no supere el maximo configurado por PM en
// `exc_assignedhours`.
async function validateAssignedHoursLimit(entry, draft) {
  const normalized = normalizeEntryWorkItem(entry);

  // CAMBIO DOCUMENTADO:
  // Esta restriccion SOLO aplica cuando la línea tiene una tarea o peticion
  // real seleccionada. Si el proyecto no usa item de trabajo o la línea no
  // tiene lookup persistible, no debe bloquear el guardado.
  const hasSelectedWorkItem =
    (normalized.workItemMode === "task" || normalized.workItemMode === "request") &&
    !!String(normalized.workItemId || "").trim() &&
    !!String(normalized.workItemName || normalized.task || normalized.request || "").trim();

  if (!hasSelectedWorkItem) {
    return { valid: true };
  }

  const assignedHoursLimit = await ensureEntryAssignedHoursLimit(normalized);

  if (!(Number.isFinite(assignedHoursLimit) && assignedHoursLimit >= 0)) {
    return { valid: true };
  }

  const filterParts = [`_exc_proyectoimputacion_value eq '${String(normalized.projectId || "").trim()}'`];

  if (normalized.workItemMode === "task" && normalized.workItemId) {
    filterParts.push(`_exc_tareasconsultoria_value eq '${normalized.workItemId}'`);
  }

  if (normalized.workItemMode === "request" && normalized.workItemId) {
    filterParts.push(`_exc_peticiones_value eq '${normalized.workItemId}'`);
  }

  const url =
    `/_api/exc_diarioimputacions` +
    `?$top=5000` +
    `&$select=exc_diarioimputacionid,exc_quantity` +
    `&$filter=${filterParts.join(" and ")}`;

  const data = await fetchJson(url);
  const values = Array.isArray(data?.value) ? data.value : [];
  const currentRecordIds = new Set(Object.values(normalized.dayRecordIds || {}).filter(Boolean));

  let persistedTotal = 0;
  let currentEntryPersistedTotal = 0;

  values.forEach(item => {
    const quantity = Number(item?.exc_quantity || 0);
    persistedTotal += quantity;

    if (currentRecordIds.has(item?.exc_diarioimputacionid)) {
      currentEntryPersistedTotal += quantity;
    }
  });

  const nextDraftTotal = sumDraftHours(draft);
  const totalAfterSave = persistedTotal - currentEntryPersistedTotal + nextDraftTotal;
  const exceededHours = totalAfterSave - assignedHoursLimit;

  if (exceededHours > 0.0001) {
    return {
      valid: false,
      exceededHours,
      assignedHoursLimit,
      totalAfterSave,
      error: `No se ha podido guardar la imputación por superar el número de horas asignadas (+${formatHoursExceeded(exceededHours)}h).`,
    };
  }

  return {
    valid: true,
    assignedHoursLimit,
    totalAfterSave,
  };
}

function getTaskAvailabilityKey(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  if (normalized?.workItemMode !== "task") return "";

  const projectId = String(normalized?.projectId || "").trim();
  const taskId = String(normalized?.workItemId || "").trim();

  if (!projectId || !taskId) return "";
  return `${projectId}__${taskId}`;
}

function invalidateTaskAvailabilityCache(entry) {
  const key = getTaskAvailabilityKey(entry);
  if (!key) return;
  delete taskAvailabilityCache[key];
}

function shouldShowTaskAvailabilityForEntry(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  return normalized?.workItemMode === "task" && !!String(normalized?.workItemName || "").trim();
}

function formatTaskAvailabilityHours(value) {
  const numeric = Number(value || 0);
  return `${numeric.toLocaleString("es-ES", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })}h`;
}

function renderTaskAvailabilityCellContent(entry) {
  if (!shouldShowTaskAvailabilityForEntry(entry)) {
    return "";
  }

  const key = getTaskAvailabilityKey(entry);
  if (!key) {
    return "";
  }

  const cached = taskAvailabilityCache[key];
  if (!cached || cached.status === "loading") {
    return '<p class="small text-secondary mb-0">...</p>';
  }

  if (cached.status === "ready" && cached.hasLimit) {
    return `<p class="small text-dark fw-medium mb-0">${formatTaskAvailabilityHours(cached.remainingHours)}</p>`;
  }

  return "";
}

async function ensureTaskAvailabilityForEntry(entry) {
  const normalized = normalizeEntryWorkItem(entry);
  if (!shouldShowTaskAvailabilityForEntry(normalized)) return;

  const key = getTaskAvailabilityKey(normalized);
  if (!key) return;

  const cached = taskAvailabilityCache[key];
  if (cached?.status === "ready" || cached?.status === "loading") {
    return;
  }

  taskAvailabilityCache[key] = { status: "loading" };

  try {
    const assignedHoursLimit = await ensureEntryAssignedHoursLimit(normalized);
    if (!(Number.isFinite(assignedHoursLimit) && assignedHoursLimit >= 0)) {
      taskAvailabilityCache[key] = {
        status: "ready",
        hasLimit: false,
        remainingHours: null,
        assignedHoursLimit: null,
        totalImputedHours: null,
      };
      return;
    }

    const filterParts = [
      `_exc_proyectoimputacion_value eq '${String(normalized.projectId || "").trim()}'`,
      `_exc_tareasconsultoria_value eq '${String(normalized.workItemId || "").trim()}'`,
    ];

    const url =
      `/_api/exc_diarioimputacions` +
      `?$top=5000` +
      `&$select=exc_quantity` +
      `&$filter=${filterParts.join(" and ")}`;

    const data = await fetchJson(url);
    const values = Array.isArray(data?.value) ? data.value : [];
    const totalImputedHours = values.reduce((sum, item) => sum + Number(item?.exc_quantity || 0), 0);
    const remainingHours = assignedHoursLimit - totalImputedHours;

    taskAvailabilityCache[key] = {
      status: "ready",
      hasLimit: true,
      remainingHours,
      assignedHoursLimit,
      totalImputedHours,
    };
  } catch (error) {
    console.warn("[task-availability] No se pudo calcular la disponibilidad de la tarea.", {
      key,
      error,
    });
    taskAvailabilityCache[key] = {
      status: "ready",
      hasLimit: false,
      remainingHours: null,
      assignedHoursLimit: null,
      totalImputedHours: null,
    };
  }
}

function refreshTaskAvailabilityCells() {
  document.querySelectorAll("[data-task-availability-key]").forEach((cell) => {
    const entryId = cell.getAttribute("data-entry-id");
    if (!entryId) return;

    const entry = entries.find(item => item.id === entryId);
    if (!entry) return;

    cell.innerHTML = renderTaskAvailabilityCellContent(entry);
  });
}

async function refreshTaskAvailabilityForVisibleEntries() {
  const taskEntries = entries.filter(entry => shouldShowTaskAvailabilityForEntry(entry));
  const uniqueEntriesByKey = new Map();

  taskEntries.forEach((entry) => {
    const key = getTaskAvailabilityKey(entry);
    if (key && !uniqueEntriesByKey.has(key)) {
      uniqueEntriesByKey.set(key, entry);
    }
  });

  if (!uniqueEntriesByKey.size) {
    refreshTaskAvailabilityCells();
    return;
  }

  await Promise.all(
    Array.from(uniqueEntriesByKey.values()).map(entry => ensureTaskAvailabilityForEntry(entry))
  );

  refreshTaskAvailabilityCells();
}

/* ===================== entryManager.js ===================== */
// ========================================
// GESTOR DE ENTRADAS (IMPUTACIONES)
// ========================================

const EntryManager = {
  createEntry(projectId, project, taskRequired, selectedTask, hasDaily, daily, selectedWorkItemOption = null) {
    const hours = this._createHoursObject(hasDaily, daily);
    const workItemMode = taskRequired ? getWorkItemModeByProject(projectId) : "none";
    const option = normalizeWorkItemOption(selectedWorkItemOption, workItemMode);
    const workItemFields = createWorkItemFields(
      workItemMode,
      selectedTask,
      {
        id: option?.id || null,
        assignedHours: option?.assignedHours ?? null,
      }
    );
    const entry = {
      projectId,
      projectCode: project.code,
      projectName: project.name,
      ...workItemFields,
      hours,
      // Vista semanal fija para manipular horas por índice [L, M, X, J, V].
      weekHoursArray: DAYS_ARRAY.map(day => {
        const value = Number(hours[day] || 0);
        return value > 0 ? value : null;
      }),
      // Se rellena al cargar datos existentes desde Dataverse.
      dbRecordIds: [],
      dayRecordIds: {},
      headerId: currentHeaderId,
      observaciones: createEmptyObservations(),
      weekStart: formatLocalYMD(selectedDateRange.start),
      weekEnd: formatLocalYMD(selectedDateRange.end),
      _openObsAfterSave: true,
    };

    return finalizeEntryIdentity(entry);
  },

  _createHoursObject(hasDaily, daily) {
    const hours = createEmptyHours();
    if (hasDaily && daily > 0) {
      DAYS_ARRAY.forEach(day => {
        hours[day] = daily;
      });
    }
    return hours;
  },

  findExistingEntry(projectId, taskRequired, taskKey, taskId = null) {
    return entries.findIndex(e => {
      if (!e || e.projectId !== projectId) return false;

      const normalized = normalizeEntryWorkItem(e);
      const eWorkItem = String(normalized?.workItemName || "").trim();
      const eWorkItemId = String(normalized?.workItemId || "").trim();
      return taskRequired
        ? (taskId ? eWorkItemId === taskId : eWorkItem === taskKey)
        : eWorkItem === "";
    });
  },

  deleteEntry(entryId) {
    const idx = entries.findIndex(e => e.id === entryId);
    if (idx < 0) return false;

    entries.splice(idx, 1);

    if (Array.isArray(detailedLog) && detailedLog.some(l => l?.entryId)) {
      detailedLog = detailedLog.filter(log => log.entryId !== entryId);
    }

    return true;
  },

  createDraftFromEntry(entry) {
    const draft = {};
    DAYS_ARRAY.forEach(day => {
      draft[day] = parseHourValue(entry.hours?.[day] || 0);
    });
    return draft;
  },

  updateEntryHours(entry, draft) {
    DAYS_ARRAY.forEach(day => {
      entry.hours[day] = draft[day];
    });
  },

  shouldOpenObservations(entry, prev) {
    if (entry._openObsAfterSave === true) return true;

    const newlyAddedDays = DAYS_ARRAY.filter(day => {
      const before = Number(prev[day] || 0);
      const now = Number(entry.hours?.[day] || 0);
      return before <= 0 && now > 0;
    });

    return newlyAddedDays.length > 0;
  },

  cleanupObservations(entry, prev) {
    DAYS_ARRAY.forEach(day => {
      const now = Number(entry.hours[day] || 0);
      const before = Number(prev[day] || 0);

      if (now <= 0) {
        entry.observaciones[day] = "";
      } else if (before <= 0 && now > 0) {
        if (typeof entry.observaciones[day] !== "string") {
          entry.observaciones[day] = "";
        }
      }
    });
  },

  hasAnyHours(entry) {
    return DAYS_ARRAY.some(day => (entry.hours?.[day] || 0) > 0);
  },

  draftHasAnyHours(draft) {
    return DAYS_ARRAY.some(day => (draft[day] || 0) > 0);
  }
};

/* ===================== toast.js ===================== */
// ========================================
// NOTIFICACIONES TOAST
// ========================================

function showToast(message, type = "success") {
  const bg = type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#3B82F6";

  if (typeof Toastify === "undefined") {
    console.log(`[${type}] ${message}`);
    return;
  }

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: { background: bg, borderRadius: "8px", fontWeight: "bold" },
  }).showToast();
}

/* ===================== dates.js ===================== */
// ========================================
// MANEJO DE FECHAS Y FLATPICKR
// ========================================

var isDatePickerLocked = false;

function initFlatpickrInclusive() {
  const el = document.getElementById("datePicker");
  const params = new URLSearchParams(window.location.search);
  const cabeceraId = params.get("id");

  if (!el || typeof flatpickr === "undefined" || (!startDate && cabeceraId)) return;

  addFlatpickrStyles();

  const fp = flatpickr(el, {
    mode: "single",
    locale: "es",
    dateFormat: "d/m/Y",
    disable: [(date) => date.getDay() !== 1 || isBlockedHeaderMonday(date)],
    onDayCreate: markUnavailablePickerDays,
    onChange: handleDateChange,
  });

  if (cabeceraId && startDate) {
    const [day, month, year] = startDate.split("/");
    const start = new Date(year, month - 1, day);
    start.setHours(0, 0, 0, 0);
    fp.setDate(start, true);
  }

  el._flatpickr = fp;
}

function addFlatpickrStyles() {
  if (document.getElementById("only-mondays-style")) return;

  const style = document.createElement("style");
  style.id = "only-mondays-style";
  style.textContent = `
  .flatpickr-day.not-monday-disabled,
  .flatpickr-day.not-monday-disabled:hover {
    color: #9CA3AF !important;
    background: #F3F4F6 !important;
    border-color: #E5E7EB !important;
    text-decoration: line-through;
    opacity: 1 !important;
    position: relative;
    cursor: not-allowed !important;
    pointer-events: none;
  }
  .flatpickr-day.not-monday-disabled::after {
    content: "-";
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -55%);
    color: #9CA3AF;
    font-weight: 800;
    font-size: 14px;
    pointer-events: none;
  }
  .flatpickr-day.blocked-existing-monday,
  .flatpickr-day.blocked-existing-monday:hover {
    color: #7C5A63 !important;
    background: #FDF1F4 !important;
    border-color: transparent !important;
    opacity: 1 !important;
    position: relative;
    cursor: not-allowed !important;
    pointer-events: none;
    font-weight: 600;
  }`;
  document.head.appendChild(style);
}

function markUnavailablePickerDays(_dObj, _dStr, _fp, dayElem) {
  try {
    const d = dayElem.dateObj;
    dayElem.classList.remove("not-monday-disabled", "blocked-existing-monday");
    dayElem.removeAttribute("title");

    if (!d) return;

    if (d.getDay() !== 1) {
      dayElem.classList.add("not-monday-disabled");
      return;
    }

    if (isBlockedHeaderMonday(d)) {
      dayElem.classList.add("blocked-existing-monday");
      dayElem.setAttribute("title", "Ya existe una cabecera para este lunes.");
    }
  } catch (e) { }
}

function handleDateChange(selectedDates) {
  const fp = this;

  if (isDatePickerLocked) {
    if (selectedDateRange.start) {
      fp.setDate(selectedDateRange.start);
    }
    return;
  }

  if (selectedDates?.length === 1) {
    const start = new Date(selectedDates[0]);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    end.setHours(23, 59, 59, 999);

    selectedDateRange = { start, end };

    saveState?.();
    updateCurrentPeriod?.();
  } else {
    selectedDateRange = { start: null, end: null };
  }

  syncAddButtonState?.();
}

function setDatePickerLock(locked) {
  isDatePickerLocked = locked;
  const el = document.getElementById("datePicker");
  if (!el) return;

  setControlDisabledState(el, locked);
  if (locked) {
    el.setAttribute("disabled", "disabled");
    el.style.pointerEvents = "none";
  } else {
    el.removeAttribute("disabled");
    el.style.pointerEvents = "";
  }
}

function checkAndLockDatePicker() {
  const hasEntries = entries && entries.length > 0;
  setDatePickerLock(hasEntries);
}

function formatPeriodES(start, end) {
  const fmtDayMonth = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });
  const fmtYear = new Intl.DateTimeFormat("es-ES", { year: "numeric" });

  const s = fmtDayMonth.format(start).replace(".", "");
  const e = fmtDayMonth.format(end).replace(".", "");
  const y1 = fmtYear.format(start);
  const y2 = fmtYear.format(end);

  return y1 === y2 ? `${s} - ${e} ${y2}` : `${s} ${y1} - ${e} ${y2}`;
}

function updateCurrentPeriod() {
  const params = new URLSearchParams(window.location.search);
  const cabeceraId = params.get("id");

  if (cabeceraId) {
    return;
  }

  const el = document.getElementById("currentPeriodValue");
  if (!el) return;

  const has = selectedDateRange?.start && selectedDateRange?.end;

  if (!has) {
    el.textContent = "";
    el.classList.add("text-secondary");
    el.classList.remove("fw-bold");
    return;
  }

  el.textContent = formatPeriodES(
    new Date(selectedDateRange.start),
    new Date(selectedDateRange.end)
  );
  el.classList.remove("text-secondary");
  el.classList.add("fw-bold");
}

function placeCommentsField() {
  const commentsField = document.getElementById("commentsField");
  const commentsInput = document.getElementById("commentsInput");
  const anchorProject = document.getElementById("commentsAnchorProject");
  const anchorTask = document.getElementById("commentsAnchorTask");

  if (!commentsField || !anchorProject || !anchorTask) return;

  if (!selectedProjectId) {
    if (commentsInput) commentsInput.value = "";
    hideEl(commentsField);
    return;
  }

  showEl(commentsField);

  const hasTasks = isWorkItemRequiredByProject(selectedProjectId);

  if (hasTasks) {
    anchorTask.appendChild(commentsField);
  } else {
    anchorProject.appendChild(commentsField);
  }
}

function resetDatePickerToInitialState() {
  debugLog("Reseteando datepicker a estado inicial");

  const fp = document.getElementById("datePicker")?._flatpickr;
  if (fp) {
    fp.clear();
    fp.setDate(null);
  }

  const dateInput = document.getElementById("datePicker");
  if (dateInput) {
    dateInput.value = "";
    dateInput.placeholder = "Selecciona un lunes...";
  }

  selectedDateRange = { start: null, end: null };
  setDatePickerLock(false);
  updateCurrentPeriod();
  syncAddButtonState();

  debugLog("Datepicker reseteado correctamente");
}

// CAMBIO DOCUMENTADO:
// Resuelve tipo + carga de items (tarea/peticion) al seleccionar proyecto.
// Mantiene cache para reducir llamadas repetidas al Web API.
async function loadWorkItemsContextForProject(projectId, projectRaw) {
  if (!projectId) return { mode: "none", items: [] };

  const typeInfo = extractProjectTypeInfo(projectRaw);
  const projectTypeCode = typeInfo.code;
  const mode = resolveWorkItemModeByType(projectTypeCode);

  projectTypeById[projectId] = projectTypeCode;
  projectWorkItemModeById[projectId] = mode;

  applyWorkItemFieldMode(mode);

  if (projectWorkItemsLoaded[projectId]) {
    return {
      mode,
      items: workItemsByProject[projectId] || [],
    };
  }

  const navId =
    projectRaw?._exc_proyectosnav_value ||
    projectRaw?.exc_ProyectosNav?.exc_proyectosnavid ||
    projectId;

  // CAMBIO DOCUMENTADO:
  // Contexto completo para resolver filtro por NAV o por CODE segun configuracion.
  const codeId =
    projectRaw?._exc_code_value ||
    projectRaw?.exc_ProyectosNav?._exc_code_value ||
    projectRaw?.exc_iteminternalid ||
    "";

  const projectCode =
    projectRaw?.exc_iteminternalid ||
    projectRaw?.exc_proyecto ||
    projectsMap[projectId]?.code ||
    "";

  debugLog(`[loadWorkItems] Proyecto ${projectId}:`, {
    mode,
    navId,
    codeId,
    projectCode
  });

  const items = await fetchWorkItemsForProject({ navId, codeId, projectCode }, mode);

  workItemsByProject[projectId] = items;
  projectWorkItemsLoaded[projectId] = true;

  return { mode, items };
}

/* ===================== actionbar.js ===================== */
// ========================================
// AUTOCOMPLETADO DE PROYECTOS
// ========================================

function initProjectAutocomplete() {
  if (window.__IMPUTACION_PROJECT_SEARCH_INIT__) return;
  window.__IMPUTACION_PROJECT_SEARCH_INIT__ = true;

  const input = document.getElementById("projectInput");
  const dropdown = document.getElementById("projectDropdown");
  const btnSearch = document.getElementById("btnProjectModal");

  if (!input || !dropdown) return;

  const PROJECTS_API_BASE = "/_api";
  const PROJECTS_ENTITYSET = "exc_proyectoimputacions";
  const PROJECTS_PAGE_SIZE = 100;

  let currentNextLink = null;
  let currentTerm = "";
  let items = [];
  let isLoading = false;
  let activeIndex = -1;

  function escapeODataString(s) {
    return String(s ?? "").replace(/'/g, "''");
  }

  function normalizeProjectStatusValue(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function isExecutionProject(row) {
    const expanded = row?.exc_ProyectosNav || row?.exc_proyectosnav || null;
    const candidates = [
      row?.["exc_estadoproyecto@OData.Community.Display.V1.FormattedValue"],
      row?.exc_estadoproyecto,
      expanded?.["exc_estadoproyecto@OData.Community.Display.V1.FormattedValue"],
      expanded?.exc_estadoproyecto,
    ];

    return candidates.some((candidate) => normalizeProjectStatusValue(candidate) === "ejecucion");
  }

  async function fetchProjectsPage({ term, nextLink }) {
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json; charset=utf-8",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    };

    let url = nextLink;

    if (!url) {
      const t = (term || "").trim();
      const safe = escapeODataString(t);
      const filter = t
        ? `contains(exc_iteminternalid,'${safe}') or contains(exc_proyectodescripcion,'${safe}') or contains(exc_proyecto,'${safe}')`
        : "";

      const top = `$top=${PROJECTS_PAGE_SIZE}`;
      const parts = [top];
      if (filter) parts.push(`$filter=${filter}`);
      // CAMBIO DOCUMENTADO:
      // Recovery solicitado: volvemos a incluir $expand=exc_ProyectosNav en la consulta de proyectos.
      url = `${PROJECTS_API_BASE}/${PROJECTS_ENTITYSET}?${parts.join("&")}&$expand=exc_ProyectosNav`;
    }

    const res = await fetch(url, { method: "GET", headers, credentials: "same-origin" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Error al cargar proyectos (${res.status}): ${txt || res.statusText}`);
    }

    const data = await res.json();
    const values = Array.isArray(data?.value) ? data.value : [];
    const next = data?.["@odata.nextLink"] || null;

    return { values, nextLink: next };
  }

  function normalizeProjectRow(p) {
    const navId = p?._exc_proyectosnav_value || p?.exc_ProyectosNav?.exc_proyectosnavid || "";
    const projectId = p?.exc_proyectoimputacionid || navId || "";
    const code = (p?.exc_iteminternalid ?? p?.exc_proyecto ?? "").toString().trim().split("-")[0];
    const name = (p?.exc_proyectodescripcion ?? "").toString().trim();
    const functionalKey = String(navId || `${code}__${name}` || projectId).trim();

    const typeInfo = extractProjectTypeInfo(p);
    const projectTypeCode = typeInfo.code;
    const mode = resolveWorkItemModeByType(projectTypeCode);

    return {
      id: projectId,
      navId,
      code,
      name,
      functionalKey,
      raw: p,
      projectTypeCode,
      mode
    };
  }

  function dedupeProjects(list) {
    const map = new Map();
    let duplicatesCollapsed = 0;

    list.forEach(item => {
      if (!item || !item.id) return;

      const key = String(item.functionalKey || item.navId || item.id).trim();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, item);
        return;
      }

      duplicatesCollapsed += 1;
      const existing = map.get(key);
      const existingScore = getProjectDeduplicationScore(existing);
      const incomingScore = getProjectDeduplicationScore(item);

      if (incomingScore > existingScore) {
        map.set(key, item);
      }
    });

    if (duplicatesCollapsed > 0) {
      debugLog("[projects] Duplicados funcionales colapsados en buscador", {
        duplicatesCollapsed,
        before: list.length,
        after: map.size,
      });
    }

    return Array.from(map.values());
  }

  function getProjectDeduplicationScore(item) {
    if (!item) return 0;

    let score = 0;
    if (item.navId) score += 4;
    if (item.id) score += 3;
    if (item.code) score += 2;
    if (item.name) score += 1;
    return score;
  }

  function ensureDropdownVisible() {
    showEl(dropdown);
  }

  function hideDropdown() {
    hideEl(dropdown);
    activeIndex = -1;
  }

  function setActiveIndex(idx) {
    activeIndex = idx;
    const buttons = dropdown.querySelectorAll("button[data-project-id]");
    buttons.forEach((b, i) => {
      if (i === idx) b.classList.add("ip20-option-active");
      else b.classList.remove("ip20-option-active");
    });
  }

  function renderDropdown() {
    ensureDropdownVisible();

    if (!items.length && !isLoading) {
      dropdown.innerHTML = `<div class="px-3 py-2 small text-secondary">No se encontraron proyectos</div>`;
      return;
    }

    const listHtml = items.map((it) => {
      const labelCode = it.code || "(sin código)";
      const labelName = it.name || "(sin descripción)";
      return `
        <button type="button"
          data-project-id="${String(it.id)}"
          data-project-code="${String(it.code).replace(/"/g, "&quot;")}"
          data-project-name="${String(it.name).replace(/"/g, "&quot;")}"
          class="ip20-option d-flex align-items-center gap-2 w-100">
          <span class="small fw-bold text-dark">${labelCode}</span>
          <span class="small text-dark">${labelName}</span>
        </button>
      `;
    }).join("");

    const loadingHtml = isLoading
      ? `<div class="px-3 py-2 small text-secondary border-top bg-light">Cargando…</div>`
      : (currentNextLink ? `<div class="px-3 py-2 small text-secondary border-top bg-light">Scroll para cargar más…</div>` : "");

    dropdown.innerHTML = listHtml + loadingHtml;

    dropdown.querySelectorAll("button[data-project-id]").forEach((btn, i) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.projectId || "";
        const code = btn.dataset.projectCode || "";
        const name = btn.dataset.projectName || "";
        const item = items.find((x) => String(x.id) === String(id));

        selectedProjectId = id;
        input.dataset.projectId = id;

        if (id) {
          // Consolidamos en una sola asignacion toda la metadata del proyecto seleccionado.
          projectsMap[id] = {
            code: code || id,
            name: name || "",
            raw: item?.raw || null,
            mode: item?.mode || "none",
            navId: item?.navId || null,
            projectTypeCode: item?.projectTypeCode ?? null,
          };

          // Al seleccionar proyecto, se calcula su tipo y se cargan tareas/peticiones.
          await loadWorkItemsContextForProject(id, item?.raw || null);
          notifyMissingWorkItemsForProject(id);
        }

        input.value = `${code}${code && name ? " - " : ""}${name}`;

        await setTaskFieldForProject(id);
        placeCommentsField();
        syncAddButtonState();

        hideDropdown();
      });

      btn.addEventListener("mouseenter", () => setActiveIndex(i));
    });

    if (activeIndex >= 0) setActiveIndex(activeIndex);
  }

  async function loadFirstPage(term) {
    currentTerm = term || "";
    currentNextLink = null;
    items = [];
    activeIndex = -1;

    isLoading = true;
    renderDropdown();

    try {
      const page = await fetchProjectsPage({ term: currentTerm, nextLink: null });
      items = dedupeProjects(
        page.values
          .filter(isExecutionProject)
          .map(normalizeProjectRow)
          .filter(x => x.id)
      );
      currentNextLink = page.nextLink || null;
      debugLog("[projects] Primera pagina filtrada por estado Ejecucion", {
        requested: page.values.length,
        kept: items.length,
      });
    } finally {
      isLoading = false;
      renderDropdown();
    }
  }

  async function loadNextPage() {
    if (!currentNextLink || isLoading) return;

    isLoading = true;
    renderDropdown();

    try {
      const page = await fetchProjectsPage({ term: currentTerm, nextLink: currentNextLink });
      const more = page.values
        .filter(isExecutionProject)
        .map(normalizeProjectRow)
        .filter(x => x.id);
      items = dedupeProjects(items.concat(more));
      currentNextLink = page.nextLink || null;
      debugLog("[projects] Pagina adicional filtrada por estado Ejecucion", {
        requested: page.values.length,
        kept: more.length,
      });
    } finally {
      isLoading = false;
      renderDropdown();
    }
  }

  let debounceTimer = null;
  input.addEventListener("input", () => {
    selectedProjectId = null;
    selectedTask = null;
    selectedTaskOption = null;
    lastMissingWorkItemsToastProjectId = null;
    input.dataset.projectId = "";

    // Al limpiar proyecto, reseteamos el campo dinámico a su estado base.
    applyWorkItemFieldMode("none");
    setTaskFieldForProject(null);
    placeCommentsField();

    const q = (input.value || "").trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      loadFirstPage(q).catch(err => {
        console.error(err);
        showToast?.("No se pudieron cargar proyectos.", "error");
        hideDropdown();
      });
      syncAddButtonState();
    }, 250);
  });

  input.addEventListener("focus", () => {
    hideDropdown();
  });

  input.addEventListener("keydown", (e) => {
    const buttons = dropdown.querySelectorAll("button[data-project-id]");
    if (isHiddenEl(dropdown)) return;

    if (e.key === "Escape") {
      e.preventDefault();
      hideDropdown();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(buttons.length - 1, activeIndex + 1);
      setActiveIndex(next);
      buttons[next]?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(0, activeIndex - 1);
      setActiveIndex(prev);
      buttons[prev]?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && buttons[activeIndex]) {
        e.preventDefault();
        buttons[activeIndex].click();
      }
    }
  });

  dropdown.addEventListener("scroll", () => {
    const nearBottom = dropdown.scrollTop + dropdown.clientHeight >= dropdown.scrollHeight - 40;
    if (nearBottom) loadNextPage().catch(() => { });
  });

  const container = dropdown.parentElement || input.closest(".position-relative") || document.body;
  document.addEventListener("click", (e) => {
    if (container && !container.contains(e.target)) hideDropdown();
  });

  if (btnSearch) {
    btnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isHiddenEl(dropdown)) {
        hideDropdown();
      }

      loadFirstPage("").catch(err => {
        console.error(err);
        showToast?.("No se pudieron cargar proyectos.", "error");
        hideDropdown();
      });
    });
  }
}

// ========================================
// AUTOCOMPLETADO DE TAREAS
// ========================================

function initTaskDropdown() {
  const field = document.getElementById("taskField");
  const input = document.getElementById("taskInput");
  const dropdown = document.getElementById("taskDropdown");
  const btnAll = document.getElementById("btnTaskAll");

  if (!field || !input || !dropdown) return;

  function getTasksForProject() {
    return getAvailableWorkItemsByProject(selectedProjectId);
  }

  function getCurrentMode() {
    if (!selectedProjectId) return "none";
    return projectWorkItemModeById[selectedProjectId] || projectsMap[selectedProjectId]?.mode || "none";
  }

  function filterTasks(tasks, query) {
    const q = (query || "").toLowerCase().trim();
    if (!q) return [];
    return tasks.filter((t) => getWorkItemOptionText(t, getCurrentMode()).toLowerCase().includes(q));
  }

  function render(tasks, headerText) {
    if (!tasks || tasks.length === 0) {
      const mode = getCurrentMode();
      const emptyText = mode === "request" ? "Sin peticiones" : "Sin tareas";
      dropdown.innerHTML = `<div class="px-3 py-2 small text-secondary">${emptyText}</div>`;
      showEl(dropdown);
      return;
    }

    const normalizedTasks = tasks
      .map(task => normalizeWorkItemOption(task, getCurrentMode()))
      .filter(Boolean);

    dropdown.innerHTML = `
      ${headerText ? `<div class="px-3 py-2 small text-secondary bg-light border-bottom">${headerText}</div>` : ""}
      ${normalizedTasks.map((task, index) => `
        <button type="button" data-task-index="${index}" class="ip20-option w-100">
          <span class="small text-dark">${escapeHtml(task.text)}</span>
        </button>
      `).join("")}
    `;

    dropdown.querySelectorAll("button[data-task-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const option = normalizedTasks[Number(btn.dataset.taskIndex)];
        if (!option) return;

        selectedTaskOption = option;
        selectedTask = option.text;
        input.value = selectedTask;
        hideEl(dropdown);
        syncAddButtonState();
      });
    });

    showEl(dropdown);
  }

  function hide() {
    hideEl(dropdown);
  }

  input.addEventListener("input", () => {
    selectedTask = null;
    selectedTaskOption = null;
    const q = (input.value || "").trim();
    const tasks = getTasksForProject();

    if (!q) {
      hide();
      syncAddButtonState();
      return;
    }

    const filtered = filterTasks(tasks, q);
    render(filtered);
    syncAddButtonState();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const first = dropdown.querySelector("button[data-task-index]");
    if (first) {
      e.preventDefault();
      first.click();
    }
  });

  if (btnAll) {
    btnAll.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!selectedProjectId) {
        showToast?.("Primero selecciona un proyecto.", "error");
      }

      const all = getTasksForProject();
      if (all.length === 0) {
        notifyMissingWorkItemsForProject(selectedProjectId);
        hide();
      }

      if (!isHiddenEl(dropdown)) {
        hide();
      }

      render(all);
    });
  }

  document.addEventListener("click", (e) => {
    if (!field.contains(e.target)) hide();
  });
}

async function setTaskFieldForProject(projectId) {
  const field = document.getElementById("taskField");
  const input = document.getElementById("taskInput");
  const dropdown = document.getElementById("taskDropdown");

  if (!field || !input || !dropdown) return;

  selectedTask = null;
  selectedTaskOption = null;
  input.value = "";
  hideEl(dropdown);

  if (!projectId) {
    applyWorkItemFieldMode("none");
    hideEl(field);
    return;
  }

  // Garantiza que tipo + items esten cargados al entrar en el campo.
  const rawProject = projectsMap[projectId]?.raw || null;
  const ctx = await loadWorkItemsContextForProject(projectId, rawProject);

  // El campo se muestra por tipo de proyecto, aunque la lista este vacia.
  // Asi el usuario ve claramente si corresponde Tarea o Peticion.
  if (ctx.mode !== "none" && Array.isArray(ctx.items) && ctx.items.length > 0) {
    showEl(field);
  } else {
    hideEl(field);
  }
}

// ========================================
// AUTOCOMPLETADO DE HORAS
// ========================================

function initHoursAutocomplete() {
  const input = document.getElementById("hoursInput");
  const dropdown = document.getElementById("hoursDropdown");
  const btnSearchHours = document.getElementById("btnHoursSearch");

  if (!input || !dropdown) return;

  function normalize(v) {
    return String(v ?? "").trim().replace(".", ",");
  }

  function isDropdownVisible() {
    return dropdown.offsetParent !== null;
  }

  function render(list) {
    dropdown.innerHTML = list
      .map(h => `
        <button type="button" data-h="${h}" class="ip20-option d-flex align-items-center justify-content-between w-100">
          <span class="small fw-semibold text-dark">${h}</span>
        </button>
      `).join("");

    dropdown.querySelectorAll("button[data-h]").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = String(btn.dataset.h);
        hideEl(dropdown);
        syncAddButtonState();
      });
    });

    showEl(dropdown);
  }

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const raw = String(input.value || "").trim();
    const validation = HourValidators.parseAndValidateHourInput(raw);

    if (!validation.valid) {
      showToast(validation.error, "error");
      return;
    }

    input.value = String(validation.value).replace(".", ",");
    hideEl(dropdown);
    syncAddButtonState?.();

    setTimeout(() => input.focus(), 0);
  });

  input.addEventListener("input", () => {
    input.value = normalize(input.value);
    syncAddButtonState();
  });

  if (btnSearchHours) {
    btnSearchHours.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    btnSearchHours.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDropdownVisible()) {
        hideEl(dropdown);
      } else {
        render(HOURS_OPTIONS);
        input.focus();
      }
    });
  }

  document.addEventListener("click", (e) => {
    const wrap = input.closest(".position-relative");
    if (wrap && !wrap.contains(e.target)) {
      hideEl(dropdown);
    }
  });

  input.addEventListener("blur", () => syncAddButtonState());
}

function parseHoursInput(raw) {
  const validation = HourValidators.parseAndValidateHourInput(raw);
  return validation.valid ? validation.value : NaN;
}

// ========================================
// MODAL DE PROYECTOS
// ========================================

function initModalProjects() {
  const btn = document.getElementById("btnProjectModal");
  const modal = document.getElementById("projectModal");
  const list = document.getElementById("projectModalList");
  const close = document.getElementById("projectModalClose");
  const input = document.getElementById("projectInput");

  if (!btn || !modal || !list || !close || !input) return;

  function open() {
    list.innerHTML = Object.keys(projectsMap)
      .map((id) => {
        const p = projectsMap[id];
        return `
          <button type="button" data-id="${id}" class="ip20-option d-flex align-items-center gap-3 w-100 border rounded">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;background:#EAF4EF;color:#035246;font-weight:700;">${p.code}</span>
            <span class="small text-dark fw-medium">${p.name}</span>
          </button>
        `;
      })
      .join("");

    list.querySelectorAll("button[data-id]").forEach((b) => {
      b.addEventListener("click", async () => {
        const id = String(b.dataset.id);
        selectedProjectId = id;
        input.value = `${projectsMap[id].code} - ${projectsMap[id].name}`;

        await loadWorkItemsContextForProject(id, projectsMap[id]?.raw || null);
        notifyMissingWorkItemsForProject(id);
        await setTaskFieldForProject(id);
        placeCommentsField();

        hide();
        syncAddButtonState();
      });
    });

    showEl(modal, "flex");
  }

  function hide() {
    hideEl(modal);
  }

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    open();
  });

  close.addEventListener("click", hide);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });
}

// ========================================
// ESTADO DEL BOTÓN AGREGAR
// ========================================

function syncAddButtonState() {
  const btnAdd = document.getElementById("btnAdd");
  const projectInput = document.getElementById("projectInput");
  const btnProjectModal = document.getElementById("btnProjectModal");
  const taskInput = document.getElementById("taskInput");
  const btnTaskAll = document.getElementById("btnTaskAll");
  const hoursInput = document.getElementById("hoursInput");
  const datePicker = document.getElementById("datePicker");
  const btnHoursSearch = document.getElementById("btnHoursSearch");

  const hasPendingEdit = editingHoursEntryId !== null;
  const canAdd = canEnableAddButton();
  setThemedButtonState(btnAdd, canAdd);

  const controls = [
    projectInput,
    btnProjectModal,
    taskInput,
    btnTaskAll,
    hoursInput,
    datePicker,
    btnHoursSearch
  ];

  controls.forEach(control => {
    setControlDisabledState(control, hasPendingEdit);
  });

  if (!hasPendingEdit) {
    checkAndLockDatePicker?.();
  }
}

/* ===================== actions.js ===================== */
// ========================================
// RESET DE LA BARRA DE ACCIÓN
// ========================================

function resetActionBar(keepDateRange = false) {
  selectedProjectId = null;
  selectedTask = null;
  selectedTaskOption = null;
  lastMissingWorkItemsToastProjectId = null;

  const projectInput = document.getElementById("projectInput");
  const projectDropdown = document.getElementById("projectDropdown");
  if (projectInput) projectInput.value = "";
  hideEl(projectDropdown);

  const taskInput = document.getElementById("taskInput");
  const taskDropdown = document.getElementById("taskDropdown");
  const taskField = document.getElementById("taskField");
  if (taskInput) taskInput.value = "";
  // CAMBIO DOCUMENTADO:
  // Restablece textos del campo dinamico al limpiar la action bar.
  applyWorkItemFieldMode("none");
  hideEl(taskDropdown);
  hideEl(taskField);

  const commentsInput = document.getElementById("commentsInput");
  const commentsField = document.getElementById("commentsField");
  if (commentsInput) commentsInput.value = "";
  hideEl(commentsField);

  if (!keepDateRange) {
    clearDatePicker();
    selectedDateRange = { start: null, end: null };

    updateCurrentPeriod?.();
    setDatePickerLock?.(false);
  }

  const hoursInput = document.getElementById("hoursInput");
  const hoursDropdown = document.getElementById("hoursDropdown");
  if (hoursInput) hoursInput.value = "";
  hideEl(hoursDropdown);

  syncAddButtonState();
}

function clearDatePicker() {
  const fp = document.getElementById("datePicker")?._flatpickr;
  if (!fp) return;

  fp.clear();
  fp.setDate(null);

  const dateInput = document.getElementById("datePicker");
  if (dateInput) {
    dateInput.value = "";
    dateInput.placeholder = "Selecciona un lunes...";
  }
}

let isAdding = false;

async function handleAddHours() {
  if (isAdding) {
    debugLog("Ya se está ejecutando handleAddHours, ignorando");
    return;
  }

  isAdding = true;
  debugLog("handleAddHours ejecutado", Date.now());

  if (!selectedProjectId) {
    showToast("Selecciona un proyecto.", "error");
    isAdding = false;
    return;
  }

  if (!selectedDateRange.start || !selectedDateRange.end) {
    showToast("Selecciona una fecha de inicio (Lunes).", "error");
    isAdding = false;
    return;
  }

  const projectId = selectedProjectId;
  const project = projectsMap[projectId];
  const taskRequired = isWorkItemRequiredByProject(projectId);

  if (taskRequired && !selectedTaskOption) {
    const label = getWorkItemLabelByProject(projectId);
    showToast(`Selecciona una ${label} para este proyecto.`, "error");
    isAdding = false;
    return;
  }

  const taskKey = taskRequired ? String(selectedTaskOption?.text || selectedTask || "").trim() : "";
  const taskId = taskRequired ? String(selectedTaskOption?.id || "").trim() : "";

  const hoursRaw = document.getElementById("hoursInput")?.value ?? "";
  const normalizedHoursRaw = String(hoursRaw).trim();
  let daily = 0;
  let hasDaily = false;

  if (normalizedHoursRaw) {
    const validation = HourValidators.parseAndValidateHourInput(hoursRaw);

    if (!validation.valid) {
      showToast(validation.error, "error");
      isAdding = false;
      return;
    }

    daily = validation.value;
    hasDaily = Number.isFinite(daily) && daily > 0;
  }

  const existingEntryIndex = EntryManager.findExistingEntry(projectId, taskRequired, taskKey, taskId);

  if (existingEntryIndex >= 0) {
    showToast("Ya existe una imputación para este proyecto", "success");

    refreshUI({ lockDatePicker: true });
    resetActionBar(true);

    setTimeout(() => {
      isAdding = false;
    }, 500);

    return;
  }

  try {
    await ensureCurrentHeader();
  } catch (error) {
    console.error("Error creando cabecera de imputación:", error);
    showToast("No se pudo crear la cabecera de imputación.", "error");
    isAdding = false;
    return;
  }

  const entry = EntryManager.createEntry(
    projectId,
    project,
    taskRequired,
    selectedTask,
    hasDaily,
    daily,
    selectedTaskOption
  );

  entries.push(entry);
  editingHoursEntryId = entry.id;
  hoursDraft = EntryManager.createDraftFromEntry(entry);

  if (typeof saveState === "function") saveState();

  refreshUI({ lockDatePicker: true });
  resetActionBar(true);

  setTimeout(() => {
    isAdding = false;
    debugLog("Flag isAdding reseteado");
  }, 500);
}

window.handleEdit = function (code) {
  showToast(`Editando proyecto ${code}`, "success");
};

window.handleCopy = function (projectId) {
  const entry = entries.find((e) => e.projectId === projectId);
  if (!entry) return;

  const clonedEntry = finalizeEntryIdentity({
    ...entry,
    projectId: entry.projectId + 1000,
    projectCode: entry.projectCode + "-C",
    headerId: entry.headerId || currentHeaderId || null,
  });

  entries.push(clonedEntry);

  showToast(`Proyecto ${entry.projectCode} copiado`, "success");
  refreshUI();
};

window.handleDetails = function (projectId) {
  const entry = entries.find((e) => e.projectId === projectId);
  if (!entry) return;

  const total = Object.values(entry.hours).reduce((a, b) => a + b, 0);
  showToast(`Proyecto ${entry.projectCode}: ${total} horas totales`, "success");
};

window.handleDelete = function (entryId) {
  // Punto único de borrado para mantener el flujo centralizado.
  return shouldPersistImmediately()
    ? deleteEntryWithDataverseSync(entryId)
    : deleteEntryLocally(entryId);
};

async function getRequestVerificationToken() {
  // CAMBIO DOCUMENTADO:
  // Power Pages exige __RequestVerificationToken para operaciones de escritura.
  // Intentamos primero por shell.getTokenDeferred (v�a recomendada del portal).
  if (window.shell && typeof window.shell.getTokenDeferred === "function") {
    return new Promise((resolve, reject) => {
      window.shell.getTokenDeferred().done(resolve).fail(reject);
    });
  }

  // Fallback por si el token est� expuesto como hidden input en el DOM.
  const tokenInput = document.querySelector('input[name="__RequestVerificationToken"]');
  const token = tokenInput?.value || "";
  if (token) return token;

  throw new Error('No se pudo obtener el token "__RequestVerificationToken".');
}

async function buildDataverseHeaders() {
  // CAMBIO DOCUMENTADO:
  // Armamos headers est�ndar de Dataverse incluyendo anti-forgery token.
  const verificationToken = await getRequestVerificationToken();
  return {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "OData-Version": "4.0",
    "OData-MaxVersion": "4.0",
    "If-Match": "*",
    "__RequestVerificationToken": verificationToken,
  };
}

async function createDataverseRecord(entitySet, payload, idCandidates = []) {
  const headers = await buildDataverseHeaders();
  headers["Prefer"] = "return=representation";

  const res = await fetch(`/_api/${entitySet}`, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text().catch(() => "");
  let data = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (error) {
      data = {};
    }
  }

  if (!res.ok) {
    throw new Error(`No se pudo crear en ${entitySet}. HTTP ${res.status}. ${rawBody}`);
  }

  const recordId =
    extractEntityIdFromHeaders(res.headers) ||
    idCandidates.map(key => data?.[key]).find(Boolean) ||
    "";

  return { id: recordId, data };
}

async function updateDataverseRecord(entitySet, recordId, payload) {
  const headers = await buildDataverseHeaders();
  const res = await fetch(`/_api/${entitySet}(${recordId})`, {
    method: "PATCH",
    headers,
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 204) {
    const details = await res.text().catch(() => "");
    throw new Error(`No se pudo actualizar ${entitySet}(${recordId}). HTTP ${res.status}. ${details}`);
  }
}

async function deleteDataverseHeaderById(recordId) {
  if (!recordId) return;

  const headers = await buildDataverseHeaders();
  const res = await fetch(`/_api/cr774_registros(${recordId})`, {
    method: "DELETE",
    headers,
    credentials: "same-origin",
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const details = await res.text().catch(() => "");
    throw new Error(`No se pudo eliminar la cabecera ${recordId}. HTTP ${res.status}. ${details}`);
  }
}

function getCopyFlowContext() {
  const params = new URLSearchParams(window.location.search);
  return {
    isCopyMode: params.get("mode") === "copy",
    sourceId: String(params.get("sourceId") || "").trim(),
    headerId: String(params.get("id") || "").trim(),
  };
}

function getStoredCopyReturnUrl() {
  try {
    return String(sessionStorage.getItem(COPY_RETURN_URL_SESSION_KEY) || "").trim();
  } catch (error) {
    console.warn("No se pudo recuperar la URL de retorno de copia:", error);
    return "";
  }
}

function finalizeCopyModeInUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("mode");
  url.searchParams.delete("sourceId");
  window.history.replaceState({}, "", url.toString());
  isCopyPreviewMode = false;
}

function clearStoredCopyReturnUrl() {
  try {
    sessionStorage.removeItem(COPY_RETURN_URL_SESSION_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar la URL de retorno de copia:", error);
  }
}

function navigateToHeaderList() {
  clearStoredCopyReturnUrl();
  window.location.href = HEADER_LIST_URL;
}

async function headerHasPersistedDailyRecords(headerId) {
  if (!headerId) return false;

  const data = await fetchJson(
    `/_api/exc_diarioimputacions?$select=exc_diarioimputacionid&$filter=_exc_cr774_registro_value eq ${headerId}&$top=1`
  );

  return Array.isArray(data?.value) && data.value.length > 0;
}

function buildHeaderPayload() {
  const start = getSelectedWeekStartDate();
  if (!start) throw new Error("No hay fecha seleccionada para crear la cabecera.");

  // CAMBIO DOCUMENTADO:
  // La cabecera debe quedar asociada al usuario autenticado del portal.
  // Si no se puede resolver el contacto de sesión, abortamos la creación
  // para evitar cabeceras huérfanas sin `cr774_Contact`.
  return appendPortalContactBinding({
    cr774_fechaderegistro: formatLocalYMD(start),
  }, "cr774_Contact");
}

async function ensureCurrentHeader() {
  if (currentHeaderId) return currentHeaderId;

  const { id } = await createDataverseRecord(
    "cr774_registros",
    buildHeaderPayload(),
    ["cr774_registroid", "cr774_registrosid"]
  );

  if (!id) {
    throw new Error("Dataverse creó la cabecera pero no devolvió su identificador.");
  }

  setHeaderIdInUrl(id);
  return id;
}

// CAMBIO DOCUMENTADO:
// Persistimos tambien el lookup real de tarea/peticion en el diario.
// Guardar solo `exc_task` (texto visible) no permite rehidratar despues
// la relacion y por eso la edicion posterior no podia recuperar el item.
function appendDailyWorkItemBindings(payload, entry) {
  const normalized = normalizeEntryWorkItem(entry);
  const workItemId = String(normalized?.workItemId || "").trim();

  if (!workItemId) {
    return payload;
  }

  if (normalized.workItemMode === "task") {
    payload["exc_TareasConsultoria@odata.bind"] = `/exc_tareasconsultorias(${workItemId})`;
  }

  if (normalized.workItemMode === "request") {
    payload["exc_Peticiones@odata.bind"] = `/exc_peticioneses(${workItemId})`;
  }

  return payload;
}

function buildDailyPayload(entry, day, hours) {
  const imputationDate = getDateForDayKey(day);
  if (!imputationDate) {
    throw new Error(`No se pudo resolver la fecha del día ${day}.`);
  }
  const payload = {
    exc_imputationdate: formatLocalYMD(imputationDate),
    exc_quantity: Number(hours || 0),
    exc_projectcode: entry.projectCode || "",
    exc_observations: entry.observaciones?.[day] || "",
    "exc_cr774_Registro@odata.bind": `/cr774_registros(${entry.headerId || currentHeaderId})`,
    // CAMBIO DOCUMENTADO:
    // El lookup `exc_Proyectoimputacion` debe bindear contra el entity set
    // plural de Dataverse (`exc_proyectoimputacions`). Con el path singular
    // Dataverse responde HTTP 400 al crear la línea diaria.
    "exc_Proyectoimputacion@odata.bind": `/exc_proyectoimputacions(${entry.projectId})`

  };


  const workItemText = getEntryWorkItemDisplayText(entry);
  if (workItemText) {
    payload.exc_task = workItemText;
  }

  appendPortalContactBinding(payload);
  return appendDailyWorkItemBindings(payload, entry);
}

/**
 * Crea un diario nuevo en Dataverse asignando un `exc_linenumber`
 * consecutivo e independiente para ese registro físico.
 *
 * Esta numeración solo se aplica en creación. Los diarios que ya existen
 * y se editan posteriormente conservan su `exc_linenumber`.
 *
 * @param {Object} entry Línea semanal del frontend asociada al diario a crear.
 * @param {string} day Clave interna del día laboral.
 * @param {number} hours Horas a persistir para ese día.
 * @returns {Promise<string>} Identificador del diario creado en Dataverse.
 */
async function createDailyRecord(entry, day, hours) {
  const payload = buildDailyPayload(entry, day, hours);
  await ensureNextDailyLineNumber();
  payload.exc_linenumber = reserveNextDailyLineNumber();
  const { id } = await createDataverseRecord(
    "exc_diarioimputacions",
    payload,
    ["exc_diarioimputacionid"]
  );

  if (!id) {
    throw new Error(`No se recibió ID al crear el diario del ${DAY_LABELS[day]}.`);
  }

  if (!entry.dayRecordIds) entry.dayRecordIds = {};
  entry.dayRecordIds[day] = id;
  syncEntryRecordIds(entry);
  return id;
}

async function updateDailyRecord(entry, day, hours) {
  const recordId = entry.dayRecordIds?.[day];
  if (!recordId) {
    return createDailyRecord(entry, day, hours);
  }

  await updateDataverseRecord("exc_diarioimputacions", recordId, {
    exc_imputationdate: formatLocalYMD(getDateForDayKey(day)),
    exc_quantity: Number(hours || 0),
    exc_projectcode: entry.projectCode || "",
    exc_task: getEntryWorkItemDisplayText(entry) || null,
    exc_observations: entry.observaciones?.[day] || "",
    ...appendPortalContactBinding({}),
    ...appendDailyWorkItemBindings({}, entry),
  });

  return recordId;
}

async function syncDailyRecordsForEntry(entry, draft) {
  const daysWithHours = DAYS_ARRAY.filter(day => Number(draft[day] || 0) > 0);
  for (const day of daysWithHours) {
    await updateDailyRecord(entry, day, draft[day]);
  }
  syncEntryRecordIds(entry);
}

async function syncObservationRecords(entry, days) {
  const daysToUpdate = Array.isArray(days) ? days : [];
  for (const day of daysToUpdate) {
    const recordId = entry.dayRecordIds?.[day];
    if (!recordId) continue;

    await updateDataverseRecord("exc_diarioimputacions", recordId, {
      exc_observations: entry.observaciones?.[day] || "",
      exc_projectcode: entry.projectCode || "",
      exc_task: getEntryWorkItemDisplayText(entry) || null,
      ...appendPortalContactBinding({}),
      ...appendDailyWorkItemBindings({}, entry),
    });
  }
}

async function cleanupEmptyHeaderAndResetUi() {
  if (entries.length > 0) return false;

  if (currentHeaderId) {
    await deleteDataverseHeaderById(currentHeaderId);
  }

  currentHeaderId = null;
  setHeaderIdInUrl(null);

  editingHoursEntryId = null;
  hoursDraft = null;
  editingEntryId = null;
  pendingDeleteId = null;

  resetDatePickerToInitialState();
  resetActionBar(false);
  refreshUI();
  return true;
}

async function deleteDataverseRecordById(recordId) {
  // CAMBIO DOCUMENTADO:
  // Si ENABLE_DB_DELETE=false, no toca BD y solo traza en consola.
  // Si ENABLE_DB_DELETE=true, ejecuta DELETE real en Dataverse.
  if (!ENABLE_DB_DELETE) {
    debugLog("[DEBUG][NO-DB] DELETE simulado en exc_diarioimputacions:", recordId);
    return Promise.resolve();
  }

  const headers = await buildDataverseHeaders();

  const url = `/_api/exc_diarioimputacions(${recordId})`;
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "same-origin",
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const details = await res.text().catch(() => "");
    throw new Error(`No se pudo eliminar ${recordId}. HTTP ${res.status}. ${details}`);
  }
}

function getDateForDayKey(dayKey) {
  const weekStart = getSelectedWeekStartDate();
  if (!weekStart || !DAY_TO_INDEX.hasOwnProperty(dayKey)) return null;

  const date = new Date(weekStart);
  date.setDate(date.getDate() + DAY_TO_INDEX[dayKey]);
  return date;
}

async function deleteDataverseRecordsByIds(recordIds) {
  const ids = Array.from(new Set((recordIds || []).filter(Boolean)));
  if (!ids.length) return;

  debugLog("[dataverse-delete] IDs candidatos a borrado:", ids);
  await Promise.all(ids.map(recordId => deleteDataverseRecordById(recordId)));
}

async function deleteEntryWithDataverseSync(entryId) {
  // CAMBIO DOCUMENTADO:
  // Limpia estado de la línea en frontend y registra por consola
  // los IDs de BD que se borrarian en un escenario real.
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  const recordsToDelete = Array.from(new Set((entry.dbRecordIds || []).filter(Boolean)));
  await deleteDataverseRecordsByIds(recordsToDelete);
  invalidateTaskAvailabilityCache(entry);

  // Reseteo local del array semanal para que quede sin valores imputados.
  if (Array.isArray(entry.weekHoursArray)) {
    entry.weekHoursArray = createWeekHoursArray();
  }

  // Reseteo local del objeto de horas y observaciones.
  DAYS_ARRAY.forEach(day => {
    if (entry.hours) entry.hours[day] = 0;
    if (entry.observaciones) entry.observaciones[day] = "";
  });

  // Reseteo local de la relacion dia -> id fisico.
  if (entry.dayRecordIds) {
    Object.keys(entry.dayRecordIds).forEach(day => {
      entry.dayRecordIds[day] = null;
    });
  }

  // Reseteo local de la lista de ids fisicos asociados a la línea.
  entry.dbRecordIds = [];

  if (!EntryManager.deleteEntry(entryId)) return;

  saveState?.();
  showToast(
    ENABLE_DB_DELETE
      ? "Imputación eliminada"
      : "Imputación eliminada (modo debug, sin borrar BD)",
    "success"
  );

  if (entries.length === 0) {
    await cleanupEmptyHeaderAndResetUi();
    return;
  }

  refreshUI({ lockDatePicker: true });
}

async function deleteEntryLocally(entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  invalidateTaskAvailabilityCache(entry);

  if (Array.isArray(entry.weekHoursArray)) {
    entry.weekHoursArray = createWeekHoursArray();
  }

  DAYS_ARRAY.forEach(day => {
    if (entry.hours) entry.hours[day] = 0;
    if (entry.observaciones) entry.observaciones[day] = "";
  });

  if (entry.dayRecordIds) {
    Object.keys(entry.dayRecordIds).forEach(day => {
      entry.dayRecordIds[day] = null;
    });
  }

  entry.dbRecordIds = [];

  if (!EntryManager.deleteEntry(entryId)) return;

  saveState?.();
  showToast("Imputación eliminada", "success");
  refreshUI({ lockDatePicker: true });
}

function syncEntryRecordIds(entry) {
  if (!entry || typeof entry !== "object") return;

  const dayRecordIds = entry.dayRecordIds || {};
  entry.dbRecordIds = Array.from(new Set(
    DAYS_ARRAY
      .map(day => dayRecordIds[day])
      .filter(Boolean)
  ));
}

async function deleteZeroHourDayRecords(entry, prevDraft, nextDraft) {
  if (!entry || !prevDraft || !nextDraft) return [];

  const recordsToDelete = DAYS_ARRAY
    .map((day) => {
      const before = Number(prevDraft[day] || 0);
      const now = Number(nextDraft[day] || 0);
      const recordId = entry.dayRecordIds?.[day] || null;

      if (before > 0 && now <= 0 && recordId) {
        return { day, recordId };
      }

      return null;
    })
    .filter(Boolean);

  if (!recordsToDelete.length) return [];

  debugLog("[edit-hours] registros diarios a borrar por pasar a 0h:", recordsToDelete);
  await deleteDataverseRecordsByIds(recordsToDelete.map(({ recordId }) => recordId));

  recordsToDelete.forEach(({ day }) => {
    if (entry.dayRecordIds) {
      entry.dayRecordIds[day] = null;
    }
  });

  syncEntryRecordIds(entry);
  return recordsToDelete;
}

/* ===================== render.js ===================== */
// ========================================
// RENDERIZADO PRINCIPAL
// ========================================

function renderAll() {
  renderTable();
  updateTotalPanel();
  updateCurrentPeriod();
  syncSubmitButtonState();
  syncAddButtonState();
  syncCopyActionButtonsState();
}

function renderRecordsLoadingState() {
  return `
  <tr class="align-middle">
    <td colspan="12" class="p-4 text-center">
      <div class="d-flex justify-content-center align-items-center gap-2">
        <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
        <span class="small text-secondary">Cargando registros...</span>
      </div>
    </td>
  </tr>
  `;
}

// ========================================
// RENDERIZADO DE TABLA
// ========================================

function renderTable() {
  const tbody = document.getElementById("tableBody");
  const tableWrap = document.querySelector(".ip20-table-wrap");
  const table = tableWrap?.querySelector("table");

  if (!tbody || !tableWrap || !table) return;

  if (isRecordsLoading) {
    tbody.innerHTML = renderRecordsLoadingState();
    tableWrap.classList.remove("table-responsive");
    syncWorkItemColumnsVisibility();
    refreshIcons();
    return;
  }

  tbody.innerHTML = entries.length
    ? `${entries.map(entry => renderTableRow(entry)).join("")}${renderDailyTotalsRow()}`
    : "";

  if (entries.length <= 1) {
    tableWrap.classList.remove("table-responsive");
  } else {
    tableWrap.classList.add("table-responsive");
  }

  syncWorkItemColumnsVisibility();
  refreshTaskAvailabilityForVisibleEntries().catch((error) => {
    console.warn("[task-availability] No se pudieron refrescar las horas disponibles.", error);
  });
  refreshIcons();
}

function syncWorkItemColumnsVisibility() {
  const hasTaskRows = entries.some(entry => !!getEntryTaskText(entry));
  const hasRequestRows = entries.some(entry => !!getEntryRequestText(entry));

  document.querySelectorAll(".ip20-col-task").forEach((el) => {
    el.classList.toggle("d-none", !hasTaskRows);
  });

  document.querySelectorAll(".ip20-col-request").forEach((el) => {
    el.classList.toggle("d-none", !hasRequestRows);
  });

  document.querySelectorAll(".ip20-col-task-availability").forEach((el) => {
    el.classList.toggle("d-none", !hasTaskRows);
  });
}

function renderTableRow(entry) {
  ensureEntryStructure(entry);

  const tieneObservaciones = hasObservations(entry);
  const isEditing = editingHoursEntryId === entry.id;
  const taskText = getEntryTaskText(entry);
  const requestText = getEntryRequestText(entry);
  const taskAvailabilityKey = getTaskAvailabilityKey(entry);

  return `
  <tr class="align-middle">
    <td class="p-3">
      <p class="small text-dark mb-0">${entry?.projectCode || entry?.projectId}</p>
    </td>

    <td class="p-3">
      <p class="small text-dark mb-0">${entry.projectName}</p>
    </td>

    <td class="p-3 text-center ip20-col-task">
      ${taskText
      ? `<p class="small text-dark fw-medium mb-0">${taskText}</p>`
      : ''}
    </td>

    <td class="p-3 text-center ip20-col-request">
      ${requestText
      ? `<p class="small text-dark fw-medium mb-0">${requestText}</p>`
      : ''}
    </td>

    <td class="p-3 text-center ip20-col-task-availability"
      data-entry-id="${entry.id}"
      data-task-availability-key="${taskAvailabilityKey}">
      ${renderTaskAvailabilityCellContent(entry)}
    </td>

    ${DAYS_ARRAY.map(day => `
      <td class="p-3 text-center fw-medium ip20-day-col">
        ${isEditing
          ? renderEditInput(entry.id, day, entry.hours[day])
          : formatHourDisplay(entry.hours[day])}
      </td>
    `).join('')}

    <td class="px-3 py-3">
      <div class="d-flex justify-content-center gap-1">
        ${renderActionButtons(entry, isEditing, tieneObservaciones)}
      </div>
    </td>
  </tr>`;
}

function ensureEntryStructure(entry) {
  ensureEntryObservations(entry);
  normalizeEntryWorkItem(entry);
}

function hasObservations(entry) {
  return Object.values(entry.observaciones).some(txt => (txt || "").trim() !== "");
}

function calculateDailyTotals() {
  return entries.reduce((totals, entry) => {
    const hoursSource =
      editingHoursEntryId === entry.id && hoursDraft
        ? hoursDraft
        : entry.hours;

    DAYS_ARRAY.forEach(day => {
      totals[day] += Number(hoursSource?.[day] || 0);
    });

    return totals;
  }, createEmptyHours());
}

function renderDailyTotalsRow() {
  if (!entries.length) return "";

  const dailyTotals = calculateDailyTotals();

  return `
  <tr id="dailyTotalsRow" class="align-middle border-top">
    <td colspan="2" class="px-3 py-3 fw-bold text-dark bg-light">
      Resumen diario de horas imputadas:
    </td>

    <td class="p-3 bg-light ip20-col-task"></td>
    <td class="p-3 bg-light ip20-col-request"></td>
    <td class="p-3 bg-light ip20-col-task-availability"></td>

    ${DAYS_ARRAY.map(day => `
      <td class="p-3 text-center fw-bold text-dark bg-light ip20-day-col" data-daily-total-day="${day}">
        ${formatDailyTotalDisplay(dailyTotals[day])}
      </td>
    `).join('')}

    <td class="p-3 bg-light"></td>
  </tr>`;
}

function formatDailyTotalDisplay(hours) {
  const normalizedHours = Number(hours || 0);
  return `${Number(normalizedHours.toFixed(2))}h`;
}

function updateDailyTotalsRow() {
  const dailyTotalsRow = document.getElementById("dailyTotalsRow");
  if (!dailyTotalsRow) return;

  const dailyTotals = calculateDailyTotals();
  DAYS_ARRAY.forEach(day => {
    const cell = dailyTotalsRow.querySelector(`[data-daily-total-day="${day}"]`);
    if (cell) {
      cell.textContent = formatDailyTotalDisplay(dailyTotals[day]);
    }
  });
}

function formatHourDisplay(hours) {
  return hours && hours > 0 ? `${hours}h` : "-";
}

function renderEditInput(entryId, day, currentValue) {
  const v = (hoursDraft && editingHoursEntryId === entryId)
    ? hoursDraft[day]
    : (currentValue || 0);

  const max = DAY_MAX_HOURS[day];
  const disabledAttr = "";

  return `
    <div class="d-flex justify-content-center">
      <input
        type="number"
        min="0"
        max="${max}"
        step="0.5"
        value="${v}"
        oninput="updateDraftHour('${day}', this.value)"
        ${disabledAttr}
        class="form-control form-control-sm text-center ip20-input"
        style="width: 58px; padding-left: 4px; padding-right: 4px;"
        placeholder="0"
      />
    </div>
  `;
}

function renderActionButtons(entry, isEditing, tieneObservaciones) {
  if (isEditing) {
    return `
      <button type="button" onclick="cancelEditHours()" title="Cancelar"
        class="btn btn-sm text-danger border-0">
        <i data-lucide="x" size="18"></i>
      </button>
      <button type="button" onclick="confirmEditHours()" title="Confirmar"
        class="btn btn-sm text-success border-0">
        <i data-lucide="check" size="18"></i>
      </button>
    `;
  }

  return `
    <button type="button" onclick="openModal('${entry.id}', false)" title="Observaciones"
      class="btn btn-sm border-0 ${tieneObservaciones ? "ip20-observations-btn-active" : "ip20-observations-btn"}">
        <i data-lucide="clipboard-list" size="18"></i>
        </button>
    <button type="button" onclick="startEditHours('${entry.id}')" title="Editar horas"
      class="btn btn-sm text-success border-0">
      <i data-lucide="pencil" size="18"></i>
    </button>
    <button type="button" onclick="openDeleteModal('${entry.id}')" title="Eliminar"
      class="btn btn-sm text-danger border-0">
      <i data-lucide="trash-2" size="18"></i>
    </button>
  `;
}

// ========================================
// EDICIÓN INLINE DE HORAS
// ========================================

window.startEditHours = function (entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  editingHoursEntryId = entryId;
  hoursDraft = EntryManager.createDraftFromEntry(entry);

  refreshUI();
};

window.updateDraftHour = function (day, value) {
  if (!hoursDraft) return;
  hoursDraft[day] = parseHourValue(value);
  updateDailyTotalsRow();
  updateTotalPanel();
};

window.cancelEditHours = async function () {
  if (!editingHoursEntryId) {
    debugLog("No hay edición activa para cancelar");
    return;
  }

  debugLog("Cancelando edición para ID:", editingHoursEntryId);

  const entryIndex = entries.findIndex(e => e.id === editingHoursEntryId);

  if (entryIndex === -1) {
    debugLog("ERROR: No se encontró entrada");
    editingHoursEntryId = null;
    hoursDraft = null;
    refreshUI();
    return;
  }

  const entry = entries[entryIndex];

  if (entry._openObsAfterSave === true) {
    debugLog("Eliminando entrada NUEVA");
    entries.splice(entryIndex, 1);
    saveState?.();
  }

  debugLog("Entrada existente - NO se borra");

  editingHoursEntryId = null;
  hoursDraft = null;

  if (entries.length === 0) {
    try {
      await cleanupEmptyHeaderAndResetUi();
    } catch (error) {
      console.error("No se pudo limpiar la cabecera vacía al cancelar la edición:", error);
      showToast("No se pudo limpiar la cabecera vacía.", "error");
    }
    return;
  }

  refreshUI({ lockDatePicker: true });

  debugLog("Cancelación completada");
};

window.confirmEditHours = async function () {
  debugLog("confirmEditHours ejecutado", editingHoursEntryId, hoursDraft);

  if (!editingHoursEntryId || !hoursDraft) {
    debugLog("Falta editingHoursEntryId o hoursDraft");
    return;
  }

  const entry = entries.find(e => e.id === editingHoursEntryId);
  if (!entry) return;

  if (!entry.hours) entry.hours = createEmptyHours();
  ensureEntryObservations(entry);

  const prev = EntryManager.createDraftFromEntry(entry);
  const draft = EntryManager.createDraftFromEntry({ hours: hoursDraft });
  const hadPersistedRecordsBefore = Array.isArray(entry.dbRecordIds) && entry.dbRecordIds.filter(Boolean).length > 0;

  const hasAnyHours = DAYS_ARRAY.some(day => draft[day] > 0);

  for (const day of DAYS_ARRAY) {
    const validation = HourValidators.validateDayHours(day, draft[day]);
    if (!validation.valid) {
      showToast(validation.error, "error");
      return;
    }
  }

  const totalsValidation = HourValidators.validateDailyTotals(entries, entry.id, draft);
  if (!totalsValidation.valid) {
    showToast(totalsValidation.error, "error");
    return;
  }

  if (!hasAnyHours && !hadPersistedRecordsBefore && shouldPersistImmediately()) {
    showToast("Debes indicar al menos una hora en algún día", "error");
    return;
  }

  if (!hasAnyHours) {
    try {
      if (shouldPersistImmediately()) {
        await deleteZeroHourDayRecords(entry, prev, draft);
      }
      invalidateTaskAvailabilityCache(entry);
    } catch (error) {
      console.error("[edit-hours] Error eliminando registros diarios puestos a 0h", error);
      showToast("No se pudieron eliminar los registros con 0 horas.", "error");
      return;
    }

    if (!EntryManager.deleteEntry(entry.id)) return;

    editingHoursEntryId = null;
    hoursDraft = null;

    saveState?.();
    showToast(
      ENABLE_DB_DELETE
        ? "Imputación eliminada"
        : "Imputación eliminada (modo debug, sin borrar BD)",
      "success"
    );

    if (entries.length === 0) {
      if (shouldPersistImmediately()) {
        await cleanupEmptyHeaderAndResetUi();
      } else {
        refreshUI({ lockDatePicker: true });
      }
      return;
    }

    refreshUI({ lockDatePicker: true });
    return;
  }

  try {
    const assignedHoursValidation = await validateAssignedHoursLimit(entry, draft);
    if (!assignedHoursValidation.valid) {
      showToast(assignedHoursValidation.error, "error");
      return;
    }
  } catch (error) {
    console.error("[edit-hours] Error validando horas asignadas", error);
    showToast("No se pudo validar el número máximo de horas asignadas.", "error");
    return;
  }

  EntryManager.updateEntryHours(entry, draft);
  // Tras confirmar edición, mantenemos actualizado el array semanal de 5 posiciones.
  syncWeekHoursArray(entry);
  stagePendingEntryPersistence(entry, prev, draft);

  saveState?.();

  editingHoursEntryId = null;
  hoursDraft = null;

  refreshUI();

  if (typeof window.openModal === "function") {
    debugLog("Abriendo modal para persistir observaciones");
    setTimeout(() => window.openModal(entry.id), 0);
  }
};

// ========================================
// MODAL DE OBSERVACIONES
// ========================================

// CAMBIO DOCUMENTADO:
// Modal unico de observaciones para ambos flujos (click manual y post-edicion).
window.openModal = function (entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  ensureEntryObservations(entry);
  editingEntryId = entryId;
  hasCommentChanges = false;

  const modal = document.getElementById("observationModal");
  const title = document.getElementById("modalProjectCode");
  const container = document.getElementById("modalInputsContainer");
  const editBtn = document.getElementById("editObservationBtn");
  const saveBtn = document.getElementById("saveObservationBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");
  const modalTitle = document.querySelector("#observationModal h3");

  if (!modal || !title || !container) return;

  if (modalTitle) {
    const workItemText = getEntryWorkItemDisplayText(entry);
    modalTitle.textContent = `${entry.projectCode} - ${entry.projectName}${workItemText ? ` (${workItemText})` : ""}`;
  }

  container.innerHTML = "";

  const DIAS_CON_HORAS = DAYS_ARRAY
    .map(day => ({ key: day, label: DAY_LABELS[day] }))
    .filter(d => (entry.hours?.[d.key] || 0) > 0);

  if (editBtn) hideEl(editBtn);

  if (saveBtn) {
    setThemedButtonState(saveBtn, true);
  }

  if (cancelBtn) {
    // CAMBIO DOCUMENTADO:
    // Siempre visible para mantener el mismo comportamiento del modal.
    showEl(cancelBtn);
  }

  if (DIAS_CON_HORAS.length === 0) {
    container.innerHTML = `<div class="text-center py-4 text-secondary"><p class="mb-0">No hay horas registradas para este proyecto.</p></div>`;
  } else {
    DIAS_CON_HORAS.forEach(d => renderObservationDay(container, d, entry, false));
  }

  showEl(modal, "flex");
  refreshIcons();
};

function renderObservationDay(container, dayInfo, entry, readOnly) {
  const bloque = document.createElement("div");
  bloque.className = "mb-3 p-3 border rounded bg-light";

  const hasComment = entry.observaciones[dayInfo.key]?.trim() !== "";
  const initialValue = entry.observaciones[dayInfo.key] || "";

  const requiredIndicator = '<span class="small text-danger ms-2">*</span>';

  const textareaClasses = readOnly
    ? "form-control form-control-sm bg-light text-secondary ip20-input"
    : "form-control form-control-sm bg-white ip20-input";

  const extraNoCommentClass = !readOnly && !hasComment ? ' border-secondary' : '';

  bloque.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="d-flex align-items-center">
        <span class="fw-bold text-dark">${dayInfo.label}</span>
        ${requiredIndicator}
      </div>
      <span class="badge rounded-pill text-bg-success">${entry.hours[dayInfo.key]} h</span>
    </div>
    <textarea
      id="obs-${dayInfo.key}"
      rows="2"
      class="${textareaClasses}${extraNoCommentClass}"
      placeholder="Descripción..."
      ${readOnly ? "disabled" : ""}
      data-initial="${initialValue.replace(/"/g, '&quot;')}"
      oninput="checkCommentsFilled('${entry.id}'); trackCommentChanges('${entry.id}')"
    >${entry.observaciones[dayInfo.key] || ""}</textarea>
  `;

  container.appendChild(bloque);
}

window.enableObservationEditing = function () {
  const entry = entries.find(e => e.id === editingEntryId);
  if (!entry) return;

  DAYS_ARRAY.forEach(day => {
    const el = document.getElementById(`obs-${day}`);
    if (el) el.disabled = false;
  });

  const editBtn = document.getElementById("editObservationBtn");
  const saveBtn = document.getElementById("saveObservationBtn");

  if (editBtn) hideEl(editBtn);
  if (saveBtn) {
    syncObservationModalButtonsState("idle", true);
  }

  showToast?.("Modo edición activado.", "success");
};

window.saveObservation = async function () {
  const saveBtn = document.getElementById("saveObservationBtn");
  if (saveBtn?.disabled) return;

  const entry = entries.find(e => e.id === editingEntryId);
  if (!entry) return;

  ensureEntryObservations(entry);

  const daysWithHours = DAYS_ARRAY.filter(day => (entry.hours?.[day] || 0) > 0);
  const missingComments = [];

  daysWithHours.forEach(day => {
    const el = document.getElementById(`obs-${day}`);
    const comment = el ? el.value.trim() : "";

    if (comment === "") {
      missingComments.push(DAY_LABELS[day]);
    }
  });

  if (missingComments.length > 0) {
    const daysList = missingComments.join(", ");
    showToast(`Los siguientes días requieren comentarios: ${daysList}`, "error");

    daysWithHours.forEach(day => {
      const el = document.getElementById(`obs-${day}`);
      if (el && el.value.trim() === "") {
        el.classList.add("border-danger", "bg-light");
        el.classList.remove("border-secondary");
      }
    });

    trackCommentChanges(entry.id);
    return;
  }

  daysWithHours.forEach(day => {
    const el = document.getElementById(`obs-${day}`);
    if (el) entry.observaciones[day] = el.value;
  });

  const pendingPersistence = entry._pendingPersistence || null;

  try {
    syncObservationModalButtonsState("confirm", false);
    if (pendingPersistence && shouldPersistImmediately()) {
      const assignedHoursValidation = await validateAssignedHoursLimit(entry, pendingPersistence.nextDraft);
      if (!assignedHoursValidation.valid) {
        syncObservationModalButtonsState("idle", true);
        showToast(assignedHoursValidation.error, "error");
        return;
      }

      await ensureCurrentHeader();
      entry.headerId = currentHeaderId;
      await deleteZeroHourDayRecords(entry, pendingPersistence.prevDraft, pendingPersistence.nextDraft);
      await syncDailyRecordsForEntry(entry, pendingPersistence.nextDraft);
      invalidateTaskAvailabilityCache(entry);
      EntryManager.cleanupObservations(entry, pendingPersistence.prevDraft);
      if (pendingPersistence.wasNewEntry && entry._openObsAfterSave === true) {
        entry._openObsAfterSave = false;
      }
      clearPendingEntryPersistence(entry);
    } else if (pendingPersistence) {
      const assignedHoursValidation = await validateAssignedHoursLimit(entry, pendingPersistence.nextDraft);
      if (!assignedHoursValidation.valid) {
        syncObservationModalButtonsState("idle", true);
        showToast(assignedHoursValidation.error, "error");
        return;
      }

      invalidateTaskAvailabilityCache(entry);
      EntryManager.cleanupObservations(entry, pendingPersistence.prevDraft);
      if (pendingPersistence.wasNewEntry && entry._openObsAfterSave === true) {
        entry._openObsAfterSave = false;
      }
      clearPendingEntryPersistence(entry);
    } else if (shouldPersistImmediately()) {
      await syncObservationRecords(entry, daysWithHours);
    }
  } catch (error) {
    syncObservationModalButtonsState("idle", true);
    console.error("Error guardando observaciones en Dataverse:", error);
    showToast("No se pudieron guardar las observaciones.", "error");
    return;
  }

  hasCommentChanges = false;

  saveState?.();
  syncObservationModalButtonsState("idle", false);
  await closeModal(true);
  refreshUI();
};

window.closeModal = async function (preserveChanges = false) {
  syncObservationModalButtonsState("cancel", false);
  const entry = entries.find(e => e.id === editingEntryId);
  const pendingPersistence = entry?._pendingPersistence || null;
  const modal = document.getElementById("observationModal");
  if (!modal) return;

  if (entry && pendingPersistence && !preserveChanges) {
    editingHoursEntryId = entry.id;
    hoursDraft = { ...pendingPersistence.nextDraft };
  }

  editingEntryId = null;
  hasCommentChanges = false;
  hideEl(modal);
  syncObservationModalButtonsState("idle", false);
  refreshUI({ lockDatePicker: true });
};

// ========================================
// PANEL DE TOTALES
// ========================================

function updateTotalPanel() {
  const totalPanel = document.getElementById("totalPanel");
  const totalDisplay = document.getElementById("totalDisplay");
  const diffText = document.getElementById("diffText");
  const limitText = document.getElementById("limitText");
  const alertIcon = document.getElementById("alertIcon");

  if (!totalPanel || !totalDisplay || !diffText || !limitText) return;

  const currentHours = createEmptyHours();

  entries.forEach(entry => {
    const hoursSource =
      editingHoursEntryId === entry.id && hoursDraft
        ? hoursDraft
        : entry.hours;

    DAYS_ARRAY.forEach(day => {
      currentHours[day] += Number(hoursSource?.[day] || 0);
    });
  });

  const totalWeek = Object.values(currentHours).reduce((a, b) => a + b, 0);
  const diff = Number((WEEK_LIMIT - totalWeek).toFixed(2));

  totalDisplay.textContent = `${Number(totalWeek.toFixed(2))}h`;
  limitText.textContent = `Límite máximo: ${WEEK_LIMIT} horas`;

  if (totalWeek > WEEK_LIMIT) {
    totalPanel.style.setProperty("background-color", "#fdecec", "important");
    totalPanel.style.setProperty("border-color", "#dc3545", "important");
    diffText.textContent = `Te pasas en ${Math.abs(diff)}h`;
    diffText.className = "small mt-1 mb-0 text-dark fw-semibold";
    if (alertIcon) showEl(alertIcon);
  } else if (totalWeek === WEEK_LIMIT) {
    totalPanel.style.setProperty("background-color", "#fff4e5", "important");
    totalPanel.style.setProperty("border-color", "#f0ad4e", "important");
    diffText.textContent = "Has llegado al límite (0h disponibles)";
    diffText.className = "small mt-1 mb-0 text-dark fw-semibold";
    if (alertIcon) hideEl(alertIcon);
  } else {
    totalPanel.style.setProperty("background-color", "#eef8f1", "important");
    totalPanel.style.setProperty("border-color", "#468e6e", "important");
    diffText.className = "small mt-1 mb-0 text-dark fw-semibold";
    if (alertIcon) hideEl(alertIcon);
  }
}

// ========================================
// ENVÍO DE DATOS
// ========================================

function syncSubmitButtonState() {
  const btnSubmit = document.getElementById("btnSubmit") || document.querySelector('button[onclick="submitData()"]');
  if (!btnSubmit) return;

  ensureSubmitButtonLabel();
  const canSubmit = canEnableSubmitButton();
  btnSubmit.dataset.state = canSubmit ? "enabled" : "disabled";
  setThemedButtonState(btnSubmit, canSubmit);

  if (!canSubmit) {
    const hasRows = Array.isArray(entries) && entries.length > 0;
    const hasPendingEdit = editingHoursEntryId !== null;
    let hasPendingAdd = false;
    try {
      hasPendingAdd = !!isAdding;
    } catch (error) {
      hasPendingAdd = false;
    }

    if (!hasRows) {
      debugLog("Botón Enviar DESHABILITADO: No hay filas de imputación");
    } else if (hasPendingEdit) {
      debugLog("Botón Enviar DESHABILITADO: Hay edición pendiente");
    } else if (hasPendingAdd) {
      debugLog("Botón Enviar DESHABILITADO: Hay alta de imputación en curso");
    }
  }
}

window.cancelCopy = async function cancelCopy() {
  const { isCopyMode, headerId } = getCopyFlowContext();
  if (!isCopyMode || isCancellingCopy || isSubmittingCopiedEntries) return;

  const returnUrl = getStoredCopyReturnUrl();
  isCancellingCopy = true;
  syncCopyActionButtonsState();

  try {
    if (headerId) {
      const hasPersistedChildren = await headerHasPersistedDailyRecords(headerId);
      if (hasPersistedChildren) {
        showToast("No se puede cancelar la copia porque ya existen imputaciones guardadas.", "success");
        isCancellingCopy = false;
        syncCopyActionButtonsState();
        return;
      }

      await deleteDataverseHeaderById(headerId);
    }
  } catch (error) {
    console.error("No se pudo cancelar la copia:", error);
    showToast("No se pudo cancelar la copia.", "error");
    isCancellingCopy = false;
    syncCopyActionButtonsState();
    return;
  }

  clearStoredCopyReturnUrl();

  if (returnUrl) {
    window.location.href = returnUrl;
    return;
  }

  window.history.back();
};

async function persistCopiedEntries() {
  await ensureCurrentHeader();

  for (const entry of entries) {
    const draft = EntryManager.createDraftFromEntry(entry);
    const assignedHoursValidation = await validateAssignedHoursLimit(entry, draft);
    if (!assignedHoursValidation.valid) {
      throw new Error(assignedHoursValidation.error);
    }

    entry.headerId = currentHeaderId;
    await syncDailyRecordsForEntry(entry, draft);
    invalidateTaskAvailabilityCache(entry);
  }
}

window.acceptCopy = async function acceptCopy() {
  const { isCopyMode } = getCopyFlowContext();
  if (!isCopyMode || isSubmittingCopiedEntries) return;

  if (entries.length === 0) {
    showToast("No hay imputaciones copiadas para aceptar.", "error");
    return;
  }

  const validation = HourValidators.validateWeeklyTotal(entries);
  if (!validation.valid) {
    showToast(validation.error, "error");
    return;
  }

  isSubmittingCopiedEntries = true;
  syncCopyActionButtonsState();

  try {
    await persistCopiedEntries();
    const returnUrl = getStoredCopyReturnUrl();
    clearStoredCopyReturnUrl();
    finalizeCopyModeInUrl();
    saveState?.();
    showToast("La copia se registró correctamente.", "success");
    window.location.href = returnUrl || "/Cabecera-Imputaciones20/";
  } catch (error) {
    console.error("No se pudieron persistir las imputaciones copiadas:", error);
    showToast(error?.message || "No se pudieron registrar las imputaciones copiadas.", "error");
  } finally {
    isSubmittingCopiedEntries = false;
    syncCopyActionButtonsState();
  }
};

window.submitData = function submitData() {
  if (entries.length === 0) {
    showToast("No hay imputaciones para enviar.", "error");
    return;
  }

  const validation = HourValidators.validateWeeklyTotal(entries);
  if (!validation.valid) {
    showToast(validation.error, "error");
    return;
  }

  const payload = entries.map(entry => {
    const imputaciones = [];

    DAYS_ARRAY.forEach(day => {
      const hours = Number(entry.hours?.[day] || 0);
      if (hours > 0) {
        imputaciones.push({
          dayName: DAY_LABELS[day],
          hours: hours,
          observacion: entry.observaciones?.[day] || ""
        });
      }
    });

    return {
      projectId: entry.projectId,
      projectName: entry.projectName,
      task: getEntryWorkItemDisplayText(entry) || null,
      workItemMode: entry.workItemMode || "none",
      totalSemana: imputaciones.reduce((acc, d) => acc + d.hours, 0),
      imputaciones
    };
  });

  debugLog("=========== REPORTE FINAL ===========");
  debugLog(JSON.stringify(payload, null, 2));
  debugLog("=====================================");

  showToast(`Enviado: ${payload.length} proyecto(s).`, "success");

  entries = [];
  resetDatePickerToInitialState();
  resetActionBar(false);
  saveState?.();
  refreshUI();
  setDatePickerLock?.(false);
};

window.checkCommentsFilled = function (entryId) {
  debugLog("checkCommentsFilled llamada para entry:", entryId);

  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  const daysWithHours = DAYS_ARRAY.filter(day => (entry.hours?.[day] || 0) > 0);

  daysWithHours.forEach(day => {
    const el = document.getElementById(`obs-${day}`);
    if (el) {
      if (el.value.trim() === "") {
        el.classList.add("border-danger");
        el.classList.remove("border-secondary");
      } else {
        el.classList.remove("border-danger");
        el.classList.add("border-secondary");
      }
    }
  });

  trackCommentChanges(entryId);
};

window.trackCommentChanges = function (entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  const daysWithHours = DAYS_ARRAY.filter(day => (entry.hours?.[day] || 0) > 0);
  const saveBtn = document.getElementById("saveObservationBtn");

  if (!saveBtn) return;

  let hasChanges = false;
  let allFilled = true;

  daysWithHours.forEach(day => {
    const el = document.getElementById(`obs-${day}`);
    if (el) {
      const initialValue = el.dataset.initial || "";
      const currentValue = el.value;

      if (currentValue !== initialValue) {
        hasChanges = true;
      }

      if (currentValue.trim() === "") {
        allFilled = false;
      }
    }
  });

  hasCommentChanges = hasChanges;

  syncObservationModalButtonsState("idle", hasChanges && allFilled);
};

// ========================================
// MODAL DE CONFIRMACIÓN PARA ELIMINAR
// ========================================

window.openDeleteModal = function (entryId) {
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  pendingDeleteId = entryId;

  const projectInfo = document.getElementById("deleteProjectInfo");
  if (projectInfo) {
    const workItemText = getEntryWorkItemDisplayText(entry);
    projectInfo.textContent = `${entry.projectCode} - ${entry.projectName}${workItemText ? ` (${workItemText})` : ''}`;
  }

  const modal = document.getElementById("deleteConfirmModal");
  if (modal) {
    showEl(modal, "flex");
  }

  syncDeleteModalButtonsState("idle");
  refreshIcons();
};

window.closeDeleteModal = function () {
  if (isDeletingEntryFromModal) return;

  syncDeleteModalButtonsState("cancel");
  const modal = document.getElementById("deleteConfirmModal");
  if (modal) {
    hideEl(modal);
  }
  pendingDeleteId = null;
  syncDeleteModalButtonsState("idle");
};

window.confirmDelete = async function () {
  if (!pendingDeleteId || isDeletingEntryFromModal) return;

  // Referencia del boton para mostrar estado de proceso al usuario.
  try {
    // Bloqueamos el botón para evitar doble clic mientras se procesa el borrado.
    syncDeleteModalButtonsState("confirm");
    await handleDelete(pendingDeleteId);
    isDeletingEntryFromModal = false;
    closeDeleteModal();
  } catch (error) {
    console.error("Error eliminando imputaciÃ³n:", error);
    showToast("No se pudo eliminar la imputaciÃ³n en base de datos.", "error");
  } finally {
    syncDeleteModalButtonsState("idle");
  }
};

/* ===================== main.js ===================== */
// ========================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ========================================

document.addEventListener("DOMContentLoaded", async () => {
  // CAMBIO DOCUMENTADO:
  // Log de arranque para verificar que el portal carga la version correcta del JS.
  debugLog("[Imputacion20] build", APP_BUILD_VERSION, WORK_ITEM_QUERY_CONFIG?.request);
  const params = new URLSearchParams(window.location.search);
  const cabeceraId = params.get("id");
  const sourceCabeceraId = String(params.get("sourceId") || "").trim();
  const isCopyMode = params.get("mode") === "copy";
  isCopyPreviewMode = isCopyMode && !!sourceCabeceraId;
  currentHeaderId = cabeceraId || null;
  isDatePickerEditMode = !!cabeceraId;

  const el = document.getElementById("currentPeriodValue");

  if (cabeceraId) {
    isRecordsLoading = true;
    renderTable();

    try {
      const sourceHeaderId = isCopyMode && sourceCabeceraId ? sourceCabeceraId : cabeceraId;
      const [imputaciones, cabecera] = await Promise.all([
        fetchJson(`/_api/exc_diarioimputacions?$filter=_exc_cr774_registro_value eq ${sourceHeaderId}&$expand=exc_Proyectoimputacion`),
        fetchJson(`/_api/cr774_registros(${cabeceraId})`),
      ]);

      debugLog("Cabecera:", cabecera);
      debugLog("Imputaciones:", imputaciones);

      preloadEntries(imputaciones.value, {
        resetPersistedState: isCopyMode && !!sourceCabeceraId,
        targetHeaderId: cabeceraId,
      });
      // La secuencia se inicializa siempre contra el usuario autenticado,
      // incluso en copia, y nunca contra la cabecera origen (`sourceId`).
      await ensureNextDailyLineNumber();

      const fechaInicioRaw = cabecera["cr774_fechaderegistro@OData.Community.Display.V1.FormattedValue"];
      startDate = fechaInicioRaw;

      const [day, month, year] = fechaInicioRaw.split("/");
      const start = new Date(year, month - 1, day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 4);
      end.setHours(23, 59, 59, 999);

      selectedDateRange = { start, end };

      if (el) {
        // el.textContent = fechaInicioRaw;
        el.textContent = formatPeriodES(start, end);
        el.classList.remove("text-secondary");
        el.classList.add("fw-bold");
      }



    } catch (error) {
      console.error("Error inicializando la página de imputación:", error);
      showToast("No se pudo cargar la información inicial.", "error");
      return;
    } finally {
      isRecordsLoading = false;
      renderTable();
    }
  } else {
    startDate = null;
    selectedDateRange = { start: null, end: null };

    if (el) {
      el.textContent = "Seleccione un lunes";
    }

    try {
      await loadBlockedHeaderWeekStarts();
    } catch (error) {
      blockedHeaderWeekStarts = new Set();
      console.warn("No se pudieron cargar las cabeceras existentes para bloquear lunes ocupados:", error);
    }
  }

  initFlatpickrInclusive();
  initProjectAutocomplete();
  initTaskDropdown();
  initHoursAutocomplete();
  initModalProjects();

  const hoursInput = document.getElementById("hoursInput");
  if (hoursInput && !hoursInput.value) {
    hoursInput.value = "";
  }

  const btnAdd = document.getElementById("btnAdd");
  if (btnAdd) {
    btnAdd.addEventListener("click", handleAddHours);
  }

  refreshUI();
  initSubmitButtonGuard();
  ensureSubmitButtonLabel();
  placeCommentsField();

  setTimeout(() => {
    checkAndLockDatePicker?.();
  }, 100);
});
