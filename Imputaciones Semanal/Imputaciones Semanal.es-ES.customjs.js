/*$(document).ready(function () {

    // ===============================
    // Datos del usuario autenticado
    // ===============================
    var contactoId = document.getElementById("contactId")?.value;
    console.log("Contacto ID:", contactoId);

    var userId = '{{ user.id }}';
    var userName = '{{ user.fullname }}';

    console.log("Portal User ID:", userId);
    console.log("Portal User Name:", userName);


    // ===============================
    // Listener (mensaje entre páginas)
    // ===============================
    console.log("✅ JS de Imputación Semanal cargado");

    const raw = sessionStorage.getItem("portalMessage");
    console.log("📦 portalMessage leído:", raw);

    if (!raw) {
        console.log("ℹ️ No hay mensaje en sessionStorage");
        return;
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error("❌ Error parseando portalMessage", e);
        sessionStorage.removeItem("portalMessage");
        return;
    }

    // Limpiar para que no se repita (evita loops)
    sessionStorage.removeItem("portalMessage");
    console.log("🧹 portalMessage eliminado");

    // Validar estructura mínima
    if (!data.type) {
        console.warn("⚠️ Mensaje sin type:", data);
        return;
    }

    console.log("📨 Mensaje recibido:", data);

    // ===============================
    // Acciones por tipo
    // ===============================
    if (data.type === "COPIA_DIA_OK") {

        mostrarPopup(
            "Proceso completado",
            data.message || "Las imputaciones se copiaron correctamente.",
            "success"
        );

        // 👉 EMITIR MENSAJE INTERNO A LA MISMA PÁGINA
        window.postMessage(
            { tipo: "REFRESH_SUBGRID_DIARIO" },
            window.location.origin
        );

        console.log("ha salido posterior al emitir en la misma pagina");

        
        // 🔁 RECARGA CONTROLADA (UNA SOLA VEZ)
        // Usamos replace + query dinámica para romper caché
        setTimeout(() => {
            const url = window.location.pathname + "?r=" + Date.now();
            console.log("🔄 Forzando recarga con URL:", url);
            window.location.replace(url);
        }, 3000);
    }

    if (data.type === "COPIA_DIA_WARNING") {
        mostrarPopup(
            "Advertencia",
            data.message || "El proceso finalizó con observaciones.",
            "warning"
        );
    }

    if (data.type === "COPIA_DIA_ERROR") {
        mostrarPopup(
            "Error",
            data.message || "Ocurrió un error durante el proceso.",
            "error"
        );
    }

});

function mostrarPopup(titulo, mensaje, tipo) {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "20px";
    popup.style.right = "20px";
    popup.style.padding = "14px 18px";
    popup.style.borderRadius = "6px";
    popup.style.zIndex = "9999";
    popup.style.background = "#fff";
    popup.style.boxShadow = "0 4px 12px rgba(0,0,0,.2)";
    popup.innerHTML = `<strong>${titulo}</strong><div style="margin-top:6px">${mensaje}</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
}


// Flag global
window.__refreshSubgridPendiente = false;

window.addEventListener("message", function (event) {

  console.log("📥 [GLOBAL] Mensaje recibido:", {
    data: event.data,
    origin: event.origin
  });

  if (event.origin !== window.location.origin) return;

  if (event.data?.tipo === "REFRESH_SUBGRID_DIARIO") {
    console.log("✅ [GLOBAL] REFRESH_SUBGRID_DIARIO capturado");
    window.__refreshSubgridPendiente = true;
  }

});


// Este listener se registra al cargar la página
$('#modalParteSemanal').on('shown.bs.modal', function () {

  console.log("🪟 Modal abierto");

  if (window.__refreshSubgridPendiente) {
    console.log("🎯 Mensaje estaba pendiente → el modal lo reconoce");
  } else {
    console.log("ℹ️ No hay mensaje pendiente al abrir el modal");
  }

});
*/

/*************************************************
 * FLAG GLOBAL
 *************************************************/
window.__refreshSubgridPendiente = false;


/*************************************************
 * LISTENER GLOBAL postMessage
 * (captura aunque el modal esté cerrado)
 *************************************************/
window.addEventListener("message", function (event) {

    console.log("📥 [GLOBAL] Mensaje recibido:", {
        data: event.data,
        origin: event.origin
    });

    if (event.origin !== window.location.origin) return;

    if (event.data?.tipo === "REFRESH_SUBGRID_DIARIO") {
        console.log("✅ [GLOBAL] REFRESH_SUBGRID_DIARIO capturado");
        window.__refreshSubgridPendiente = true;
    }
});


/*************************************************
 * LISTENER DEL MODAL (DELEGADO – SEGURO)
 *************************************************/
$(document).on('shown.bs.modal', '#modalParteSemanal', function () {

    console.log("🪟 Modal abierto");

    if (window.__refreshSubgridPendiente) {
        console.log("🎯 Mensaje estaba pendiente → el modal lo reconoce");

        //  AQUÍ conectarás luego el refresh real
        refreshPowerPagesHtmlList("DiarioImputacion_List");

        // Limpiamos para evitar doble ejecución
        window.__refreshSubgridPendiente = false;

    } else {
        console.log("ℹ️ No hay mensaje pendiente al abrir el modal");
    }
});


/*************************************************
 * DOM READY
 *************************************************/
$(document).ready(function () {

    // ===============================
    // Datos del usuario autenticado
    // ===============================
    var contactoId = document.getElementById("contactId")?.value;
    console.log("Contacto ID:", contactoId);

    var userId = '{{ user.id }}';
    var userName = '{{ user.fullname }}';

    console.log("Portal User ID:", userId);
    console.log("Portal User Name:", userName);

    console.log("✅ JS de Imputación Semanal cargado");

    // ===============================
    // Mensaje proveniente de Página B
    // ===============================
    const raw = sessionStorage.getItem("portalMessage");
    console.log("📦 portalMessage leído:", raw);

    if (!raw) {
        console.log("ℹ️ No hay mensaje en sessionStorage");
        return; // aquí sí es seguro
    }

    let data = null;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error("❌ Error parseando portalMessage", e);
    }

    // Limpiar SIEMPRE para evitar loops
    sessionStorage.removeItem("portalMessage");
    console.log("🧹 portalMessage eliminado");

    if (!data?.type) {
        console.warn("⚠️ Mensaje sin type válido:", data);
        return;
    }

    console.log("📨 Mensaje recibido:", data);

    // ===============================
    // Acciones según tipo
    // ===============================
    if (data.type === "COPIA_DIA_OK") {

        mostrarPopup(
            "Proceso completado",
            data.message || "Las imputaciones se copiaron correctamente.",
            "success"
        );

        console.log("📤 Emitiendo mensaje interno REFRESH_SUBGRID_DIARIO");

        window.postMessage(
            { tipo: "REFRESH_SUBGRID_DIARIO" },
            window.location.origin
        );

        // 🔁 RECARGA CONTROLADA (UNA SOLA VEZ)
        // Usamos replace + query dinámica para romper caché
        setTimeout(() => {
            const url = window.location.pathname + "?r=" + Date.now();
            console.log("🔄 Forzando recarga con URL:", url);
            window.location.replace(url);
        }, 10000);


    }

    if (data.type === "COPIA_DIA_WARNING") {
        mostrarPopup(
            "Advertencia",
            data.message || "El proceso finalizó con observaciones.",
            "warning"
        );
    }

    if (data.type === "COPIA_DIA_ERROR") {
        mostrarPopup(
            "Error",
            data.message || "Ocurrió un error durante el proceso.",
            "error"
        );
    }

});


/*************************************************
 * POPUP SIMPLE
 *************************************************/
function mostrarPopup(titulo, mensaje, tipo) {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "20px";
    popup.style.right = "20px";
    popup.style.padding = "14px 18px";
    popup.style.borderRadius = "6px";
    popup.style.zIndex = "9999";
    popup.style.background = "#fff";
    popup.style.boxShadow = "0 4px 12px rgba(0,0,0,.2)";
    popup.innerHTML = `<strong>${titulo}</strong><div style="margin-top:6px">${mensaje}</div>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
}



function refreshPowerPagesHtmlList(listId) {

    console.log("🔄 Intentando refrescar subgrid HTML:", listId);

    const list = document.getElementById(listId);
    if (!list) {
        console.warn("⚠️ Subgrid no encontrada:", listId);
        return;
    }

    // 1️⃣ Intentar forzar AJAX usando paginación
    const nextBtn = list.querySelector("a[aria-label='Next']");
    const prevBtn = list.querySelector("a[aria-label='Previous']");

    if (nextBtn && prevBtn) {
        console.log("➡️ Forzando refresh vía paginación");

        nextBtn.click();
        setTimeout(() => {
            prevBtn.click();
        }, 3000);

        return;
    }

    // 2️⃣ Fallback: forzar evento de búsqueda
    const searchInput = list.querySelector("input[type='search']");
    if (searchInput) {
        console.log("🔎 Forzando refresh vía búsqueda");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        return;
    }

    console.warn("⚠️ No se pudo forzar refresh (sin paginación ni búsqueda)");
}
