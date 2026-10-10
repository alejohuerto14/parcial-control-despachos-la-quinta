
const WEBHOOK_URL =
  "https://hook.us2.make.com/s2ty20lklef4xmtxumql4lc8hdf2pu33";

// Clave para guardar el historial en el navegador
const CLAVE_HISTORIAL = "historialDespachos";

// Elementos de la página
const form = document.getElementById("despachoForm");
const resultado = document.getElementById("resultado");
const historialBody = document.getElementById("historialBody");

// 
// CAMBIAR ENTRE REGISTRO E HISTORIAL
// 

function mostrarRegistro() {
  document.getElementById("registro").style.display = "block";
  document.getElementById("historial").style.display = "none";
}

function mostrarHistorial() {
  document.getElementById("registro").style.display = "none";
  document.getElementById("historial").style.display = "block";

  cargarHistorial();
}

// 
// HISTORIAL LOCAL
// 

function obtenerHistorial() {
  try {
    const datos = JSON.parse(
      localStorage.getItem(CLAVE_HISTORIAL) || "[]"
    );

    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    console.error("Error al leer historial:", error);
    return [];
  }
}

function guardarHistorial(movimiento) {
  const historial = obtenerHistorial();

  historial.push(movimiento);

  localStorage.setItem(
    CLAVE_HISTORIAL,
    JSON.stringify(historial)
  );

  cargarHistorial();
}

function cargarHistorial() {
  if (!historialBody) return;

  const historial = obtenerHistorial();

  historialBody.innerHTML = "";

  if (historial.length === 0) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");

    celda.colSpan = 6;
    celda.textContent = "No hay movimientos registrados.";

    fila.appendChild(celda);
    historialBody.appendChild(fila);
    return;
  }

  historial.forEach((movimiento) => {
    const fila = document.createElement("tr");

    const columnas = [
      movimiento.fecha_hora,
      movimiento.codigo_producto,
      movimiento.cantidad,
      movimiento.solicitante,
      movimiento.destino,
      movimiento.resultado
    ];

    columnas.forEach((dato) => {
      const celda = document.createElement("td");

      celda.textContent = dato ?? "";

      fila.appendChild(celda);
    });

    historialBody.appendChild(fila);
  });
}

// 
// OBTENER DATOS DEL FORMULARIO
// 

function obtenerCampo(nombre) {
  const campo =
    form.querySelector(`[name="${nombre}"]`) ||
    document.getElementById(nombre);

  return campo ? campo.value.trim() : "";
}

// 
// PROCESAR DESPACHO CON MAKE
// 

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const boton = form.querySelector(
      'button[type="submit"]'
    );

    const datos = {
      solicitante: obtenerCampo("solicitante"),
      correo: obtenerCampo("correo"),
      codigo_producto: obtenerCampo("codigo_producto"),
      cantidad: Number(obtenerCampo("cantidad")),
      destino: obtenerCampo("destino"),
      motivo: obtenerCampo("motivo")
    };

    try {
      if (boton) boton.disabled = true;

      resultado.textContent =
        "Procesando solicitud de despacho...";

      // Enviar solicitud a Make
      const respuesta = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datos)
      });

      // Leer respuesta de Make
      const textoRespuesta = await respuesta.text();

      let datosMake;

      try {
        datosMake = JSON.parse(textoRespuesta);
      } catch (error) {
        throw new Error(
          "Make no devolvió una respuesta JSON válida."
        );
      }

      if (!respuesta.ok) {
        throw new Error(
          datosMake.mensaje ||
          "No se pudo procesar el despacho."
        );
      }

      // Mostrar respuesta real de Make
      resultado.textContent = JSON.stringify(
        datosMake,
        null,
        2
      );

      // Guardar únicamente despachos aprobados
      if (
        datosMake.resultado === "APROBADO" ||
        datosMake.resultado === "APROBADO CON ALERTA"
      ) {
        guardarHistorial({
          fecha_hora: new Date().toLocaleString(),
          codigo_producto: datos.codigo_producto,
          cantidad: datos.cantidad,
          solicitante: datos.solicitante,
          destino: datos.destino,
          resultado: datosMake.resultado
        });
      }


      // Solo limpiar cuando Make haya respondido
      // correctamente, incluso si el despacho
      // fue rechazado o el código no existe.
      form.reset();

    } catch (error) {
      resultado.textContent =
        "Error al procesar el despacho: " +
        error.message;

      console.error(error);

      // Si hay un error de conexión, NO limpiamos
      // los campos para que el usuario no pierda
      // la información que escribió.

    } finally {
      if (boton) boton.disabled = false;
    }
  });
}

// Cargar historial al abrir la página
cargarHistorial();
