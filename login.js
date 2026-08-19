import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


/* =========================================================
   AS CLICK ADMIN
   login.js
   ========================================================= */


/* =========================================================
   ELEMENTOS
   ========================================================= */

const loginForm =
  document.getElementById("loginForm");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const rememberSession =
  document.getElementById("rememberSession");

const loginButton =
  document.getElementById("loginButton");

const loginButtonText =
  document.getElementById("loginButtonText");

const loginButtonIcon =
  document.getElementById("loginButtonIcon");

const loginMessage =
  document.getElementById("loginMessage");

const togglePassword =
  document.getElementById("togglePassword");

const sessionLoader =
  document.getElementById("sessionLoader");


/* =========================================================
   ESTADO
   ========================================================= */

let loginInProgress = false;

let checkingExistingSession = true;


/* =========================================================
   MENSAJES
   ========================================================= */

function showMessage(message, type = "error") {

  if (!loginMessage) {
    return;
  }

  loginMessage.textContent = message;

  loginMessage.className =
    `login-message ${type}`;

  loginMessage.hidden = false;

}


function hideMessage() {

  if (!loginMessage) {
    return;
  }

  loginMessage.hidden = true;

  loginMessage.textContent = "";

  loginMessage.className =
    "login-message";

}


/* =========================================================
   LOADER
   ========================================================= */

function showSessionLoader() {

  if (sessionLoader) {
    sessionLoader.hidden = false;
  }

}


function hideSessionLoader() {

  if (sessionLoader) {
    sessionLoader.hidden = true;
  }

}


/* =========================================================
   BOTÓN CARGANDO
   ========================================================= */

function setLoginLoading(loading) {

  if (!loginButton) {
    return;
  }

  loginButton.disabled = loading;


  if (loading) {

    if (loginButtonText) {
      loginButtonText.textContent =
        "Verificando acceso...";
    }

    if (loginButtonIcon) {
      loginButtonIcon.textContent = "⏳";
    }

  } else {

    if (loginButtonText) {
      loginButtonText.textContent =
        "Ingresar al panel";
    }

    if (loginButtonIcon) {
      loginButtonIcon.textContent = "→";
    }

  }

}


/* =========================================================
   MOSTRAR / OCULTAR CONTRASEÑA
   ========================================================= */

togglePassword?.addEventListener(
  "click",
  () => {

    const showingPassword =
      passwordInput.type === "text";


    passwordInput.type =
      showingPassword
        ? "password"
        : "text";


    togglePassword.textContent =
      showingPassword
        ? "👁"
        : "🙈";


    togglePassword.setAttribute(
      "aria-label",
      showingPassword
        ? "Mostrar contraseña"
        : "Ocultar contraseña"
    );

    togglePassword.setAttribute(
      "title",
      showingPassword
        ? "Mostrar contraseña"
        : "Ocultar contraseña"
    );

  }
);


/* =========================================================
   VALIDAR DOCUMENTO DEL ADMIN
   ========================================================= */

async function getAdminData(uid) {

  const adminRef =
    doc(
      db,
      "usuarios",
      uid
    );


  const adminSnapshot =
    await getDoc(adminRef);


  if (!adminSnapshot.exists()) {

    return {
      valid: false,
      reason: "NO_USER_DOCUMENT",
      data: null
    };

  }


  const data =
    adminSnapshot.data();


  const role =
    String(data.rol || "")
      .trim()
      .toLowerCase();


  if (role !== "admin") {

    return {
      valid: false,
      reason: "NOT_ADMIN",
      data
    };

  }


  if (data.activo !== true) {

    return {
      valid: false,
      reason: "INACTIVE",
      data
    };

  }


  return {
    valid: true,
    reason: null,
    data
  };

}


/* =========================================================
   MENSAJE SEGÚN VALIDACIÓN
   ========================================================= */

function getAuthorizationMessage(reason) {

  switch (reason) {

    case "NO_USER_DOCUMENT":

      return (
        "La cuenta existe en Firebase Authentication, " +
        "pero no tiene un registro de usuario autorizado."
      );


    case "NOT_ADMIN":

      return (
        "Esta cuenta no tiene permisos de administrador."
      );


    case "INACTIVE":

      return (
        "La cuenta de administrador está desactivada."
      );


    default:

      return (
        "No fue posible validar los permisos de administrador."
      );

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

loginForm?.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    if (loginInProgress) {
      return;
    }


    hideMessage();


    const email =
      String(emailInput?.value || "")
        .trim();


    const password =
      String(passwordInput?.value || "");


    /* =====================================================
       VALIDACIONES
       ===================================================== */

    if (!email) {

      showMessage(
        "Ingresa tu correo electrónico."
      );

      emailInput?.focus();

      return;

    }


    if (!password) {

      showMessage(
        "Ingresa tu contraseña."
      );

      passwordInput?.focus();

      return;

    }


    loginInProgress = true;

    setLoginLoading(true);


    try {

      /* ===================================================
         PERSISTENCIA
         =================================================== */

      const persistence =
        rememberSession?.checked
          ? browserLocalPersistence
          : browserSessionPersistence;


      await setPersistence(
        auth,
        persistence
      );


      /* ===================================================
         FIREBASE AUTH
         =================================================== */

      const credential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        credential.user;


      /* ===================================================
         VALIDAR ADMIN EN FIRESTORE
         =================================================== */

      const validation =
        await getAdminData(
          user.uid
        );


      if (!validation.valid) {

        await signOut(auth);


        showMessage(
          getAuthorizationMessage(
            validation.reason
          )
        );


        return;

      }


      /* ===================================================
         ACCESO CORRECTO
         =================================================== */

      showMessage(
        "Acceso autorizado. Abriendo panel...",
        "success"
      );


      showSessionLoader();


      window.location.replace(
        "./index.html"
      );


    } catch (error) {

      console.error(
        "Error iniciando sesión:",
        error
      );


      showMessage(
        firebaseLoginErrorMessage(error)
      );


    } finally {

      loginInProgress = false;

      setLoginLoading(false);

    }

  }
);


/* =========================================================
   ERRORES FIREBASE AUTH
   ========================================================= */

function firebaseLoginErrorMessage(error) {

  const code =
    error?.code || "";


  switch (code) {

    case "auth/invalid-email":

      return (
        "El correo electrónico no es válido."
      );


    case "auth/missing-password":

      return (
        "Ingresa tu contraseña."
      );


    case "auth/invalid-credential":

      return (
        "Correo o contraseña incorrectos."
      );


    case "auth/user-not-found":

      return (
        "Correo o contraseña incorrectos."
      );


    case "auth/wrong-password":

      return (
        "Correo o contraseña incorrectos."
      );


    case "auth/user-disabled":

      return (
        "Esta cuenta fue deshabilitada."
      );


    case "auth/too-many-requests":

      return (
        "Se realizaron demasiados intentos. " +
        "Espera unos minutos e inténtalo nuevamente."
      );


    case "auth/network-request-failed":

      return (
        "No fue posible conectarse con Firebase. " +
        "Revisa tu conexión a internet."
      );


    case "permission-denied":

    case "firestore/permission-denied":

      return (
        "Firestore no permitió validar los permisos " +
        "de esta cuenta."
      );


    default:

      return (
        "No fue posible iniciar sesión. " +
        "Revisa tus datos e inténtalo nuevamente."
      );

  }

}


/* =========================================================
   DETECTAR SESIÓN EXISTENTE
   ========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    /*
      Si el usuario acaba de presionar Ingresar,
      dejamos que el flujo del formulario termine
      la validación.
    */

    if (loginInProgress) {

      checkingExistingSession = false;

      return;

    }


    if (!checkingExistingSession) {

      return;

    }


    checkingExistingSession = false;


    if (!user) {

      hideSessionLoader();

      return;

    }


    showSessionLoader();


    try {

      const validation =
        await getAdminData(
          user.uid
        );


      if (!validation.valid) {

        await signOut(auth);

        hideSessionLoader();


        showMessage(
          getAuthorizationMessage(
            validation.reason
          )
        );


        return;

      }


      /*
        Ya existe una sesión válida de administrador.
      */

      window.location.replace(
        "./index.html"
      );


    } catch (error) {

      console.error(
        "Error verificando sesión:",
        error
      );


      hideSessionLoader();


      /*
        Si Firestore no permite leer usuarios/{uid},
        necesitamos corregir reglas.
        No dejamos entrar al dashboard sin validar.
      */

      showMessage(
        error?.code === "permission-denied" ||
        error?.code === "firestore/permission-denied"

          ? (
              "La sesión existe, pero Firestore no permitió " +
              "validar los permisos de administrador."
            )

          : (
              "No fue posible verificar la sesión."
            )
      );

    }

  }
);


/* =========================================================
   ENTER / LIMPIAR ERRORES
   ========================================================= */

emailInput?.addEventListener(
  "input",
  hideMessage
);


passwordInput?.addEventListener(
  "input",
  hideMessage
);


/* =========================================================
   ESTADO INICIAL
   ========================================================= */

hideSessionLoader();

setLoginLoading(false);
