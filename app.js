 

import {

  collection,

  doc,

  getDoc,

  onSnapshot,

  updateDoc,

  serverTimestamp

} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

 

import {

  onAuthStateChanged,

  signOut

} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

 

 

/* =========================================================

   AS CLICK ADMIN

   app.js

   ========================================================= */

 

 

/* =========================================================

   ESTADO GENERAL

   ========================================================= */

 

const state = {

 

  user: null,

  admin: null,

 

  servicios: [],

  solicitudes: [],

  proveedores: [],

  usuarios: [],

  membresias: [],

  emergencias: [],

 

  proveedorSeleccionado: null,

  servicioSeleccionado: null,

 

  listeners: [],

 

  actividad: []

 

};

 

 

/* =========================================================

   UTILIDADES

   ========================================================= */

 

const $ = id => document.getElementById(id);

 

 

function setText(id, value){

 

  const element = $(id);

 

  if(element){

    element.textContent = value ?? "";

  }

 

}

 

 

function escapeHtml(value){

 

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

 

}

 

 

function normalizeText(value){

 

  return String(value || "")

    .trim()

    .toLowerCase()

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "");

 

}

 

 

function formatMoney(value){

 

  return new Intl.NumberFormat(

    "es-MX",

    {

      style: "currency",

      currency: "MXN",

      maximumFractionDigits: 0

    }

  ).format(Number(value || 0));

 

}

 

 

function toDate(value){

 

  if(!value){

    return null;

  }

 

  if(typeof value.toDate === "function"){

    return value.toDate();

  }

 

  if(typeof value.seconds === "number"){

    return new Date(value.seconds * 1000);

  }

 

  const date = new Date(value);

 

  return Number.isNaN(date.getTime())

    ? null

    : date;

 

}

 

 

function formatDateTime(value){

 

  const date = toDate(value);

 

  if(!date){

    return "—";

  }

 

  return date.toLocaleString(

    "es-MX",

    {

      day: "2-digit",

      month: "2-digit",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit"

    }

  );

 

}

 

 

function formatTime(value){

 

  const date = toDate(value);

 

  if(!date){

    return "—";

  }

 

  return date.toLocaleTimeString(

    "es-MX",

    {

      hour: "2-digit",

      minute: "2-digit"

    }

  );

 

}

 

 

function getServiceDate(service){

 

  return (

    toDate(service.actualizadoEn) ||

    toDate(service.fechaCreacion) ||

    toDate(service.creadoEn) ||

    new Date(0)

  );

 

}

 

 

function getProviderName(service){

 

  return (

    service.asignacion?.nombreProveedor ||

    service.nombreProveedor ||

    "Sin asignar"

  );

 

}

 

 

function getClientName(service){

 

  return (

    service.cliente?.nombre ||

    service.clienteNombre ||

    service.nombreCliente ||

    "Cliente AS CLICK"

  );

 

}

 

 

function getServiceType(service){

 

  return (

    service.servicio?.nombre ||

    service.servicio?.tipo ||

    service.tipoServicio ||

    service.tipo ||

    "Servicio"

  );

 

}

 

 

function getFolio(service){

 

  return (

    service.folioOficial ||

    service.folio ||

    service.id ||

    "—"

  );

 

}

 

 

/* =========================================================

   FECHA Y HORA

   ========================================================= */

 

function updateClock(){

 

  const now = new Date();

 

  setText(

    "currentDate",

    now.toLocaleDateString(

      "es-MX",

      {

        weekday: "long",

        day: "2-digit",

        month: "long",

        year: "numeric"

      }

    )

  );

 

  setText(

    "currentTime",

    now.toLocaleTimeString(

      "es-MX",

      {

        hour: "2-digit",

        minute: "2-digit"

      }

    )

  );

 

}

 

 

updateClock();

 

setInterval(

  updateClock,

  30000

);

 

 

/* =========================================================

   AUTENTICACIÓN ADMIN

   ========================================================= */

 

onAuthStateChanged(

  auth,

 

  async user => {

 

    clearListeners();

 

    if(!user){

 

      window.location.replace("./login.html");

 

      return;

 

    }

 

    try{

 

      const adminSnap = await getDoc(

        doc(

          db,

          "usuarios",

          user.uid

        )

      );

 

      if(!adminSnap.exists()){

 

        await signOut(auth);

 

        window.location.replace("./login.html");

 

        return;

 

      }

 

      const adminData = adminSnap.data();

 

      if(

        adminData.rol !== "admin" ||

        adminData.activo !== true

      ){

 

        alert(

          "Esta cuenta no tiene autorización de administrador."

        );

 

        await signOut(auth);

 

        window.location.replace("./login.html");

 

        return;

 

      }

 

      state.user = user;

 

      state.admin = {

        id: adminSnap.id,

        ...adminData

      };

 

      renderAdmin();

 

      startRealtimeListeners();

 

    }catch(error){

 

      console.error(

        "Error validando administrador:",

        error

      );

 

      alert(

        "No fue posible validar la cuenta de administrador."

      );

 

    }

 

  }

);

 

 

/* =========================================================

   ADMIN HEADER

   ========================================================= */

 

function renderAdmin(){

 

  const name =

    state.admin?.nombre ||

    state.admin?.nombreCompleto ||

    "Administrador";

 

  document

    .querySelectorAll(".admin-profile strong")

    .forEach(element => {

 

      element.textContent = name;

 

    });

 

}

 

 

/* =========================================================

   LISTENERS FIREBASE

   ========================================================= */

 

function startRealtimeListeners(){

 

  listenServices();

 

  listenRequests();

 

  listenProviders();

 

  listenUsers();

 

  listenMemberships();

 

  listenEmergencies();

 

}

 

 

/* =========================================================

   SERVICIOS

   ========================================================= */

 

function listenServices(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "servicios"

    ),

 

    snapshot => {

 

      state.servicios =

        snapshot.docs.map(

          serviceDoc => ({

            id: serviceDoc.id,

            ...serviceDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo servicios:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   SOLICITUDES

   ========================================================= */

 

function listenRequests(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "solicitudes"

    ),

 

    snapshot => {

 

      snapshot.docChanges()

        .forEach(change => {

 

          if(

            change.type === "modified"

          ){

 

            const data = change.doc.data();

 

            addActivity(

              getClientName(data),

              formatStatus(

                data.estado

              ),

              `Folio ${getFolio({

                id: change.doc.id,

                ...data

              })}`

            );

 

          }

 

        });

 

 

      state.solicitudes =

        snapshot.docs.map(

          requestDoc => ({

            id: requestDoc.id,

            ...requestDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo solicitudes:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   PROVEEDORES

   ========================================================= */

 

function listenProviders(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "proveedores"

    ),

 

    snapshot => {

 

      state.proveedores =

        snapshot.docs.map(

          providerDoc => ({

            id: providerDoc.id,

            ...providerDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo proveedores:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   USUARIOS

   ========================================================= */

 

function listenUsers(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "usuarios"

    ),

 

    snapshot => {

 

      state.usuarios =

        snapshot.docs.map(

          userDoc => ({

            id: userDoc.id,

            ...userDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo usuarios:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   MEMBRESÍAS

   ========================================================= */

 

function listenMemberships(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "membresias"

    ),

 

    snapshot => {

 

      state.membresias =

        snapshot.docs.map(

          membershipDoc => ({

            id: membershipDoc.id,

            ...membershipDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo membresías:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   EMERGENCIAS

   ========================================================= */

 

function listenEmergencies(){

 

  const unsubscribe = onSnapshot(

 

    collection(

      db,

      "alertasEmergencia"

    ),

 

    snapshot => {

 

      state.emergencias =

        snapshot.docs.map(

          emergencyDoc => ({

            id: emergencyDoc.id,

            ...emergencyDoc.data()

          })

        );

 

      renderDashboard();

 

    },

 

    error => {

 

      console.error(

        "Error leyendo emergencias:",

        error

      );

 

    }

 

  );

 

  state.listeners.push(unsubscribe);

 

}

 

 

/* =========================================================

   RENDER GENERAL

   ========================================================= */

 

function renderDashboard(){

 

  renderStats();

 

  renderServices();

 

  renderPendingProviders();

 

  renderClients();

 

  renderEmergencies();

 

  renderActivity();

 

}

 

 

/* =========================================================

   ESTADÍSTICAS

   ========================================================= */

 

function renderStats(){

 

  const solicitudes =

    state.solicitudes.length;

 

  const activos =

    state.solicitudes.filter(

      service =>

        [

          "asignado",

          "aceptado",

          "en_camino",

          "arribo",

          "en_sitio",

          "en_proceso",

          "en_traslado",

          "destino"

        ].includes(

          normalizeText(service.estado)

            .replace(/\s+/g, "_")

        )

    ).length;

 

 

  const finalizados =

    state.solicitudes.filter(

      service =>

        normalizeText(

          service.estado

        ) === "finalizado"

    ).length;

 

 

  const cancelados =

    state.solicitudes.filter(

      service =>

        [

          "cancelado",

          "cancelada"

        ].includes(

          normalizeText(

            service.estado

          )

        )

    ).length;

 

 

  const proveedoresDisponibles =

    state.proveedores.filter(

      provider =>

        provider.disponible === true

    ).length;

 

 

  const proveedoresActivos =

    state.proveedores.filter(

      provider =>

        provider.activo === true

    ).length;

 

 

  const ingresos =

    calculateEstimatedIncome();

 

 

  const rating =

    calculateAverageRating();

 

 

  setText(

    "statSolicitados",

    solicitudes

  );

 

  setText(

    "statActivos",

    activos

  );

 

  setText(

    "statFinalizados",

    finalizados

  );

 

  setText(

    "statCancelados",

    cancelados

  );

 

  setText(

    "statProveedoresDisponibles",

    proveedoresDisponibles

  );

 

  setText(

    "statProveedores",

    proveedoresActivos

  );

 

  setText(

    "statIngresos",

    formatMoney(ingresos)

  );

 

  setText(

    "statCalificacion",

    rating.toFixed(1)

  );

 

}

 

 

/* =========================================================

   INGRESOS ESTIMADOS

   ========================================================= */

 

function calculateEstimatedIncome(){

 

  return state.solicitudes

 

    .filter(

      service =>

        normalizeText(

          service.estado

        ) === "finalizado"

    )

 

    .reduce(

      (total, service) => {

 

        return total +

          Number(

            service.costoServicio ||

            service.costo ||

            service.precio ||

            0

          );

 

      },

 

      0

    );

 

}

 

 

/* =========================================================

   CALIFICACIÓN PROMEDIO

   ========================================================= */

 

function calculateAverageRating(){

 

  const ratings = [];

 

  state.servicios.forEach(

    service => {

 

      const rating =

        Number(

          service.calificacion?.estrellas ??

          service.calificacion ??

          0

        );

 

      if(

        Number.isFinite(rating) &&

        rating > 0

      ){

 

        ratings.push(rating);

 

      }

 

    }

  );

 

 

  if(!ratings.length){

    return 0;

  }

 

 

  return (

    ratings.reduce(

      (a,b) => a + b,

      0

    ) /

    ratings.length

  );

 

}

 

 

/* =========================================================

   TABLA SERVICIOS

   ========================================================= */

 

function renderServices(){

 

  const body =

    $("servicesTableBody");

 

  if(!body){

    return;

  }

 

 

  const services =

    [...state.solicitudes]

 

      .sort(

        (a,b) =>

          getServiceDate(b) -

          getServiceDate(a)

      )

 

      .slice(

        0,

        6

      );

 

 

  if(!services.length){

 

    body.innerHTML = `

 

      <tr class="empty-row">

 

        <td colspan="7">

          No hay servicios para mostrar.

        </td>

 

      </tr>

 

    `;

 

    return;

 

  }

 

 

  body.innerHTML =

    services.map(

      service => {

 

        const folio =

          getFolio(service);

 

        const status =

          formatStatus(

            service.estado

          );

 

        return `

 

          <tr

            class="service-row"

            data-service-id="${escapeHtml(service.id)}"

          >

 

            <td>

              <strong>

                ${escapeHtml(folio)}

              </strong>

            </td>

 

            <td>

              <span class="green-dot"></span>

            </td>

 

            <td>

              ${escapeHtml(

                getClientName(service)

              )}

            </td>

 

            <td>

              ${escapeHtml(

                formatServiceType(

                  getServiceType(service)

                )

              )}

            </td>

 

            <td>

              ${escapeHtml(

                getProviderName(service)

              )}

            </td>

 

            <td>

 

              <span

                class="

                  status-badge

                  ${statusClass(service.estado)}

                "

              >

 

                ${escapeHtml(status)}

 

              </span>

 

            </td>

 

            <td>

 

              ${escapeHtml(

                calculateServiceTime(service)

              )}

 

            </td>

 

          </tr>

 

        `;

 

      }

 

    ).join("");

 

 

  body

    .querySelectorAll(

      ".service-row"

    )

    .forEach(

      row => {

 

        row.addEventListener(

          "click",

          () => {

 

            openServiceDetail(

              row.dataset.serviceId

            );

 

          }

        );

 

      }

    );

 

}

 

 

/* =========================================================

   TIEMPO SERVICIO

   ========================================================= */

 

function calculateServiceTime(service){

 

  const start =

    toDate(

      service.creadoEn ||

      service.fechaCreacion

    );

 

 

  if(!start){

    return "—";

  }

 

 

  const end =

    normalizeText(

      service.estado

    ) === "finalizado"

 

      ? (

          toDate(

            service.fechaFinalizacion

          ) ||

          new Date()

        )

 

      : new Date();

 

 

  const minutes =

    Math.max(

      0,

      Math.floor(

        (

          end.getTime() -

          start.getTime()

        ) /

        60000

      )

    );

 

 

  return `${minutes} min`;

 

}

 

 

/* =========================================================

   PROVEEDORES PENDIENTES

   ========================================================= */

 

function renderPendingProviders(){

 

  const body =

    $("providersPendingBody");

 

 

  if(!body){

    return;

  }

 

 

  const pending =

    state.proveedores.filter(

      provider => {

 

        return (

          provider.activo !== true ||

          normalizeText(

            provider.estado

          ) === "pendiente" ||

          normalizeText(

            provider.estadoSolicitud

          ) === "pendiente"

        );

 

      }

    );

 

 

  setText(

    "pendingProvidersCount",

    pending.length

  );

 

 

  if(!pending.length){

 

    body.innerHTML = `

 

      <tr class="empty-row">

 

        <td colspan="4">

          No hay proveedores pendientes.

        </td>

 

      </tr>

 

    `;

 

    return;

 

  }

 

 

  body.innerHTML =

    pending

 

      .slice(

        0,

        5

      )

 

      .map(

        provider => {

 

          const name =

            provider.nombre ||

            provider.nombreCompleto ||

            provider.correo ||

            "Proveedor";

 

          const type =

            provider.tipoServicio ||

            provider.tipo ||

            provider.servicio ||

            "Proveedor";

 

          const unit =

            provider.unidad?.tipoUnidad ||

            provider.unidad?.tipo ||

            provider.tipoUnidad ||

            provider.vehiculo?.tipo ||

            "—";

 

          return `

 

            <tr>

 

              <td>

 

                <strong>

                  ${escapeHtml(name)}

                </strong>

 

              </td>

 

              <td>

                ${escapeHtml(

                  formatServiceType(type)

                )}

              </td>

 

              <td>

                ${escapeHtml(unit)}

              </td>

 

              <td>

 

                <div class="provider-actions">

 

                  <button

                    class="authorize-button"

                    data-provider-id="${escapeHtml(provider.id)}"

                  >

                    ✓ Autorizar

                  </button>

 

                  <button

                    class="reject-button"

                    data-provider-id="${escapeHtml(provider.id)}"

                  >

                    ✕ Rechazar

                  </button>

 

                </div>

 

              </td>

 

            </tr>

 

          `;

 

        }

 

      ).join("");

 

 

  body

    .querySelectorAll(

      ".authorize-button"

    )

    .forEach(

      button => {

 

        button.addEventListener(

          "click",

          event => {

 

            event.stopPropagation();

 

            openAuthorizeModal(

              button.dataset.providerId

            );

 

          }

        );

 

      }

    );

 

 

  body

    .querySelectorAll(

      ".reject-button"

    )

    .forEach(

      button => {

 

        button.addEventListener(

          "click",

          event => {

 

            event.stopPropagation();

 

            openRejectModal(

              button.dataset.providerId

            );

 

          }

        );

 

      }

    );

 

}

 

 

/* =========================================================

   CLIENTES Y MEMBRESÍAS

   ========================================================= */

 

function renderClients(){

 

  const clients =

    state.usuarios.filter(

      user =>

        normalizeText(

          user.rol || "cliente"

        ) !== "admin"

    );

 

 

  const activeMemberships =

    state.membresias.filter(

      membership =>

        [

          "activa",

          "activo",

          "vigente"

        ].includes(

          normalizeText(

            membership.estado

          )

        )

    );

 

 

  const expiringMemberships =

    state.membresias.filter(

      membership =>

        isMembershipExpiring(

          membership

        )

    );

 

 

  setText(

    "clientesRegistrados",

    clients.length

  );

 

  setText(

    "membresiasActivas",

    activeMemberships.length

  );

 

  setText(

    "membresiasVencer",

    expiringMemberships.length

  );

 

}

 

 

/* =========================================================

   MEMBRESÍA POR VENCER

   ========================================================= */

 

function isMembershipExpiring(

  membership

){

 

  const date =

    toDate(

      membership.fechaVencimiento ||

      membership.venceEn ||

      membership.vigenciaHasta

    );

 

 

  if(!date){

    return false;

  }

 

 

  const now =

    new Date();

 

 

  const days =

    (

      date.getTime() -

      now.getTime()

    ) /

    86400000;

 

 

  return (

    days >= 0 &&

    days <= 30

  );

 

}

 

 

/* =========================================================

   EMERGENCIAS

   ========================================================= */

 

function renderEmergencies(){

 

  const container =

    $("emergencyList");

 

 

  if(!container){

    return;

  }

 

 

  const active =

    state.emergencias.filter(

      emergency => {

 

        const status =

          normalizeText(

            emergency.estado

          );

 

        return ![

          "finalizado",

          "finalizada",

          "cerrado",

          "cerrada",

          "cancelado",

          "cancelada"

        ].includes(status);

 

      }

    );

 

 

  setText(

    "emergencyCount",

    active.length

  );

 

 

  if(!active.length){

 

    container.innerHTML = `

 

      <div class="empty-message">

        No hay emergencias activas.

      </div>

 

    `;

 

    return;

 

  }

 

 

  container.innerHTML =

    active

 

      .slice(

        0,

        3

      )

 

      .map(

        emergency => {

 

          const type =

            emergency.tipo ||

            emergency.tipoEmergencia ||

            "Emergencia";

 

          const isRobbery =

            normalizeText(type)

              .includes("robo");

 

          const location =

            emergency.municipio ||

            emergency.ubicacionTexto ||

            emergency.direccion ||

            "Ubicación compartida";

 

          return `

 

            <div class="emergency-item">

 

              <div class="emergency-main">

 

                <div class="emergency-icon">

                  ${isRobbery ? "🚗" : "🚨"}

                </div>

 

                <div class="emergency-info">

 

                  <strong>

                    ${escapeHtml(type)}

                  </strong>

 

                  <span>

                    ${escapeHtml(location)}

                  </span>

 

                </div>

 

              </div>

 

              <div class="emergency-time">

 

                <strong>

                  ${formatTime(

                    emergency.creadoEn ||

                    emergency.fechaCreacion

                  )}

                </strong>

 

                <span>

                  En atención

                </span>

 

              </div>

 

            </div>

 

          `;

 

        }

 

      ).join("");

 

}

 

 

/* =========================================================

   ACTIVIDAD

   ========================================================= */

 

function addActivity(

  user,

  action,

  detail

){

 

  state.actividad.unshift({

 

    date: new Date(),

 

    user:

      user ||

      "Sistema",

 

    action:

      action ||

      "Actualización",

 

    detail:

      detail ||

      ""

 

  });

 

 

  if(

    state.actividad.length > 20

  ){

 

    state.actividad =

      state.actividad.slice(

        0,

        20

      );

 

  }

 

}

 

 

function renderActivity(){

 

  const body =

    $("activityTableBody");

 

 

  if(!body){

    return;

  }

 

 

  if(!state.actividad.length){

 

    body.innerHTML = `

 

      <tr class="empty-row">

 

        <td colspan="4">

          Todavía no hay actividad registrada.

        </td>

 

      </tr>

 

    `;

 

    return;

 

  }

 

 

  body.innerHTML =

    state.actividad

 

      .slice(

        0,

        8

      )

 

      .map(

        activity => `

 

          <tr>

 

            <td>

              ${escapeHtml(

                formatDateTime(

                  activity.date

                )

              )}

            </td>

 

            <td>

              ${escapeHtml(

                activity.user

              )}

            </td>

 

            <td>

              ${escapeHtml(

                activity.action

              )}

            </td>

 

            <td>

              ${escapeHtml(

                activity.detail

              )}

            </td>

 

          </tr>

 

        `

      )

 

      .join("");

 

}

 

 

/* =========================================================

   FORMATO ESTADOS

   ========================================================= */

 

function formatStatus(value){

 

  const status =

    normalizeText(value)

      .replace(/\s+/g, "_");

 

 

  const names = {

 

    pendiente_cabina:

      "Pendiente",

 

    solicitado:

      "Solicitado",

 

    asignado:

      "Asignado",

 

    aceptado:

      "Asignado",

 

    en_camino:

      "En camino",

 

    arribo:

      "Arribo",

 

    en_sitio:

      "En sitio",

 

    en_proceso:

      "En proceso",

 

    en_traslado:

      "En traslado",

 

    destino:

      "En destino",

 

    finalizado:

      "Finalizado",

 

    cancelado:

      "Cancelado",

 

    cancelada:

      "Cancelado"

 

  };

 

 

  return (

    names[status] ||

    value ||

    "Pendiente"

  );

 

}

 

 

/* =========================================================

   CLASE ESTADO

   ========================================================= */

 

function statusClass(value){

 

  const status =

    normalizeText(value)

      .replace(/\s+/g, "_");

 

 

  if(

    status === "asignado" ||

    status === "aceptado"

  ){

 

    return "status-asignado";

 

  }

 

 

  if(

    status === "en_camino"

  ){

 

    return "status-camino";

 

  }

 

 

  if(

    status === "arribo" ||

    status === "en_sitio" ||

    status === "en_proceso" ||

    status === "en_traslado" ||

    status === "destino"

  ){

 

    return "status-arribo";

 

  }

 

 

  if(

    status === "finalizado"

  ){

 

    return "status-finalizado";

 

  }

 

 

  if(

    status === "cancelado" ||

    status === "cancelada"

  ){

 

    return "status-cancelado";

 

  }

 

 

  return "status-asignado";

 

}

 

 

/* =========================================================

   TIPO DE SERVICIO

   ========================================================= */

 

function formatServiceType(value){

 

  const type =

    normalizeText(value)

      .replace(/\s+/g, "_");

 

 

  if(

    type.includes("grua")

  ){

 

    return "Grúa";

 

  }

 

 

  if(

    type.includes("auxilio")

  ){

 

    return "Auxilio vial";

 

  }

 

 

  if(

    type.includes("ajustador")

  ){

 

    return "Ajustador";

 

  }

 

 

  if(

    type.includes("abogado")

  ){

 

    return "Abogado";

 

  }

 

 

  return (

    value ||

    "Servicio"

  );

 

}

 

 

/* =========================================================

   MODAL AUTORIZAR

   ========================================================= */

 

function openAuthorizeModal(

  providerId

){

 

  const provider =

    state.proveedores.find(

      item =>

        item.id === providerId

    );

 

 

  if(!provider){

    return;

  }

 

 

  state.proveedorSeleccionado =

    provider;

 

 

  const name =

    provider.nombre ||

    provider.nombreCompleto ||

    provider.correo ||

    "Proveedor";

 

 

  const type =

    formatServiceType(

      provider.tipoServicio ||

      provider.tipo ||

      provider.servicio

    );

 

 

  $("authorizeProviderInfo").innerHTML = `

 

    <strong>

      ${escapeHtml(name)}

    </strong>

 

    <br>

 

    <span>

      ${escapeHtml(type)}

    </span>

 

  `;

 

 

  $("authorizeModal").hidden =

    false;

 

}

 

 

/* =========================================================

   CONFIRMAR AUTORIZACIÓN

   ========================================================= */

 

$("confirmAuthorize")

  ?.addEventListener(

    "click",

 

    async () => {

 

      const provider =

        state.proveedorSeleccionado;

 

 

      if(!provider){

        return;

      }

 

 

      const button =

        $("confirmAuthorize");

 

 

      button.disabled =

        true;

 

      button.textContent =

        "Autorizando...";

 

 

      try{

 

        await updateDoc(

 

          doc(

            db,

            "proveedores",

            provider.id

          ),

 

          {

 

            activo: true,

 

            estado:

              "autorizado",

 

            estadoSolicitud:

              "autorizado",

 

            autorizado:

              true,

 

            fechaAutorizacion:

              serverTimestamp(),

 

            ultimaActualizacion:

              serverTimestamp()

 

          }

 

        );

 

 

        addActivity(

 

          state.admin?.nombre ||

          "Administrador",

 

          "Proveedor autorizado",

 

          provider.nombre ||

          provider.correo ||

          provider.id

 

        );

 

 

        closeModal(

          "authorizeModal"

        );

 

 

      }catch(error){

 

        console.error(

          "Error autorizando proveedor:",

          error

        );

 

 

        alert(

          "Firebase no permitió autorizar al proveedor."

        );

 

      }finally{

 

        button.disabled =

          false;

 

        button.textContent =

          "Autorizar";

 

      }

 

    }

  );

 

 

/* =========================================================

   MODAL RECHAZAR

   ========================================================= */

 

function openRejectModal(

  providerId

){

 

  const provider =

    state.proveedores.find(

      item =>

        item.id === providerId

    );

 

 

  if(!provider){

    return;

  }

 

 

  state.proveedorSeleccionado =

    provider;

 

 

  const textarea =

    $("rejectReason");

 

 

  if(textarea){

    textarea.value = "";

  }

 

 

  $("rejectModal").hidden =

    false;

 

}

 

 

/* =========================================================

   CONFIRMAR RECHAZO

   ========================================================= */

 

$("confirmReject")

  ?.addEventListener(

    "click",

 

    async () => {

 

      const provider =

        state.proveedorSeleccionado;

 

 

      if(!provider){

        return;

      }

 

 

      const reason =

        $("rejectReason")

          ?.value

          ?.trim() ||

        "No especificado";

 

 

      const button =

        $("confirmReject");

 

 

      button.disabled =

        true;

 

      button.textContent =

        "Rechazando...";

 

 

      try{

 

        await updateDoc(

 

          doc(

            db,

            "proveedores",

            provider.id

          ),

 

          {

 

            activo: false,

 

            estado:

              "rechazado",

 

            estadoSolicitud:

              "rechazado",

 

            autorizado:

              false,

 

            motivoRechazo:

              reason,

 

            fechaRechazo:

              serverTimestamp(),

 

            ultimaActualizacion:

              serverTimestamp()

 

          }

 

        );

 

 

        addActivity(

 

          state.admin?.nombre ||

          "Administrador",

 

          "Proveedor rechazado",

 

          provider.nombre ||

          provider.correo ||

          provider.id

 

        );

 

 

        closeModal(

          "rejectModal"

        );

 

 

      }catch(error){

 

        console.error(

          "Error rechazando proveedor:",

          error

        );

 

 

        alert(

          "Firebase no permitió rechazar al proveedor."

        );

 

      }finally{

 

        button.disabled =

          false;

 

        button.textContent =

          "Rechazar";

 

      }

 

    }

  );

 

 

/* =========================================================

   DETALLE DE SERVICIO

   ========================================================= */

 

function openServiceDetail(

  serviceId

){

 

  const service =

    state.solicitudes.find(

      item =>

        item.id === serviceId

    );

 

 

  if(!service){

    return;

  }

 

 

  state.servicioSeleccionado =

    service;

 

 

  const assignment =

    service.asignacion ||

    {};

 

 

  const vehicle =

    service.vehiculo ||

    {};

 

 

  const client =

    service.cliente ||

    {};

 

 

  $("serviceDetailContent").innerHTML = `

 

    <div

      style="

        display:grid;

        grid-template-columns:repeat(2,minmax(0,1fr));

        gap:14px;

        text-align:left;

        margin-top:20px;

      "

    >

 

      <div>

        <small>Folio</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            getFolio(service)

          )}

        </strong>

      </div>

 

      <div>

        <small>Estado</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            formatStatus(

              service.estado

            )

          )}

        </strong>

      </div>

 

      <div>

        <small>Cliente</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            getClientName(service)

          )}

        </strong>

      </div>

 

      <div>

        <small>Teléfono</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            client.telefono ||

            service.telefonoCliente ||

            "—"

          )}

        </strong>

      </div>

 

      <div>

        <small>Servicio</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            formatServiceType(

              getServiceType(service)

            )

          )}

        </strong>

      </div>

 

      <div>

        <small>Proveedor</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            assignment.nombreProveedor ||

            "Sin asignar"

          )}

        </strong>

      </div>

 

      <div>

        <small>Vehículo</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            [

              vehicle.marca,

              vehicle.subMarca ||

              vehicle.submarca,

              vehicle.color

            ]

              .filter(Boolean)

              .join(" · ") ||

            "—"

          )}

        </strong>

      </div>

 

      <div>

        <small>Placas</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            vehicle.placas ||

            "—"

          )}

        </strong>

      </div>

 

      <div>

        <small>Solicitado</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            formatDateTime(

              service.creadoEn ||

              service.fechaCreacion

            )

          )}

        </strong>

      </div>

 

      <div>

        <small>Última actualización</small>

        <strong style="display:block;margin-top:3px;">

          ${escapeHtml(

            formatDateTime(

              service.actualizadoEn

            )

          )}

        </strong>

      </div>

 

    </div>

 

  `;

 

 

  $("serviceModal").hidden =

    false;

 

}

 

 

/* =========================================================

   CERRAR MODALES

   ========================================================= */

 

function closeModal(id){

 

  const modal =

    $(id);

 

 

  if(modal){

 

    modal.hidden =

      true;

 

  }

 

}

 

 

document

  .querySelectorAll(

    "[data-close-modal]"

  )

  .forEach(

    button => {

 

      button.addEventListener(

        "click",

        () => {

 

          const overlay =

            button.closest(

              ".modal-overlay"

            );

 

 

          if(overlay){

 

            overlay.hidden =

              true;

 

          }

 

        }

      );

 

    }

  );

 

 

document

  .querySelectorAll(

    ".modal-overlay"

  )

  .forEach(

    overlay => {

 

      overlay.addEventListener(

        "click",

        event => {

 

          if(

            event.target === overlay

          ){

 

            overlay.hidden =

              true;

 

          }

 

        }

      );

 

    }

  );

 

 

/* =========================================================

   SIDEBAR MÓVIL

   ========================================================= */

 

$("menuButton")

  ?.addEventListener(

    "click",

    () => {

 

      document.body.classList.toggle(

        "sidebar-open"

      );

 

    }

  );

 

 

/* =========================================================

   MENÚ

   ========================================================= */

 

document

  .querySelectorAll(

    ".nav-item"

  )

  .forEach(

    item => {

 

      item.addEventListener(

        "click",

        event => {

 

          event.preventDefault();

 

 

          document

            .querySelectorAll(

              ".nav-item"

            )

            .forEach(

              nav =>

                nav.classList.remove(

                  "active"

                )

            );

 

 

          item.classList.add(

            "active"

          );

 

 

          const section =

            item.dataset.section;

 

 

          if(

            section !== "inicio"

          ){

 

            alert(

              `El módulo "${item.textContent.trim()}" se conectará en la siguiente etapa.`

            );

 

          }

 

 

          document.body.classList.remove(

            "sidebar-open"

          );

 

        }

      );

 

    }

  );

 

 

/* =========================================================

   BOTONES GENERALES

   ========================================================= */

 

$("viewAllServices")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos el módulo completo de Servicios."

      );

 

    }

  );

 

 

$("viewAllProviders")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos la administración completa de proveedores."

      );

 

    }

  );

 

 

$("manageClients")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos Clientes y Membresías."

      );

 

    }

  );

 

 

$("viewEmergencies")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos Emergencias en tiempo real."

      );

 

    }

  );

 

 

$("viewFullMap")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos el mapa completo de proveedores."

      );

 

    }

  );

 

 

$("viewFullReport")

  ?.addEventListener(

    "click",

    () => {

 

      alert(

        "Aquí abriremos los reportes administrativos."

      );

 

    }

  );

 

 

/* =========================================================

   LIMPIEZA

   ========================================================= */

 

function clearListeners(){

 

  state.listeners

    .forEach(

      unsubscribe => {

 

        try{

 

          unsubscribe();

 

        }catch(error){

 

          console.warn(

            "Error cerrando listener:",

            error

          );

 

        }

 

      }

    );

 

 

  state.listeners = [];

 

}

 

 

window.addEventListener(

  "beforeunload",

  clearListeners

);
