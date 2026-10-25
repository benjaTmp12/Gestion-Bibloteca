(() => {
  'use strict';
  const actualizar = document.getElementById('actualizar-devoluciones');
  const mensaje = document.getElementById('mensaje-devolucion');
  const listado = document.getElementById('mensaje-listado');
  const filas = document.getElementById('filas-devoluciones');
  const contenedor = document.getElementById('contenedor-tabla');
  let cargando = false;
  let enviando = false;
  let solicitud = 0;

  const dia = fecha => new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', dateStyle: 'short'
  }).format(new Date(fecha));
  const calendario = fecha => fecha.split('-').reverse().join('/');

  function anunciar(texto, tipo = '') {
    mensaje.textContent = texto;
    mensaje.dataset.tipo = tipo;
  }
  function actualizarBotones() {
    const ocupado = cargando || enviando;
    actualizar.disabled = ocupado;
    contenedor.setAttribute('aria-busy', String(ocupado));
    filas.querySelectorAll('button').forEach(boton => { boton.disabled = ocupado; });
  }
  async function pedir(url, opciones) {
    const respuesta = await fetch(url, opciones);
    const body = await respuesta.json();
    if (!respuesta.ok) {
      const error = new Error(typeof body.error === 'string' ? body.error
        : body.error?.mensaje || 'No se pudo completar la solicitud.');
      error.status = respuesta.status;
      throw error;
    }
    return body;
  }
  function celda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
  }
  function dibujar(registros, libros = []) {
    const catalogo = new Map(libros.map(libro => [libro.id, libro]));
    filas.replaceChildren();
    for (const registro of registros) {
      const tr = document.createElement('tr');
      const libro = celda(registro.libro_titulo);
      const referencia = document.createElement('small');
      referencia.className = 'referencia';
      referencia.textContent = registro.id;
      libro.append(referencia);
      const estado = celda('');
      const etiqueta = document.createElement('span');
      etiqueta.className = 'estado-prestamo ' + (registro.vencido ? 'vencido' : 'activo');
      etiqueta.textContent = registro.vencido ? 'Vencido' : 'Activo';
      estado.append(etiqueta);
      const ejemplar = catalogo.get(registro.libro_id);
      const disponibles = ejemplar ? (ejemplar.copias_disponibles ?? ejemplar.disponibles)
        + ' de ' + ejemplar.copias_total + ' copias' : 'Libro no disponible';
      const accion = celda('');
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton-devolver';
      boton.textContent = 'Devolver';
      boton.setAttribute('aria-label', 'Devolver ' + registro.libro_titulo + ' de ' + registro.socio_nombre);
      boton.addEventListener('click', () => devolver(registro, boton));
      accion.append(boton);
      tr.append(libro, celda(registro.socio_nombre), celda(dia(registro.fecha_prestamo)),
        celda(calendario(registro.fecha_vencimiento)), estado, celda(disponibles), accion);
      filas.append(tr);
    }
    contenedor.hidden = registros.length === 0;
    actualizarBotones();
  }
  async function cargar() {
    const actual = ++solicitud;
    cargando = true;
    actualizarBotones();
    listado.textContent = 'Consultando préstamos y disponibilidad…';
    try {
      const [resultado, libros] = await Promise.all([
        pedir('/api/prestamos?estado=activo'), pedir('/api/libros')
      ]);
      if (actual !== solicitud) return false;
      if (!Array.isArray(resultado.data) || !Array.isArray(libros)) {
        throw new Error('Respuesta de datos inválida.');
      }
      dibujar(resultado.data, libros);
      listado.textContent = resultado.data.length ? resultado.data.length + ' préstamo(s) activo(s).'
        : 'No hay préstamos activos pendientes de devolución.';
      return true;
    } catch (error) {
      if (actual !== solicitud) return false;
      dibujar([]);
      listado.textContent = 'No se pudo actualizar el listado y la disponibilidad: ' + error.message;
      return false;
    } finally {
      if (actual === solicitud) {
        cargando = false;
        actualizarBotones();
      }
    }
  }
  async function devolver(registro, boton) {
    if (enviando || cargando) return;
    enviando = true;
    anunciar('');
    boton.textContent = 'Devolviendo…';
    actualizarBotones();
    try {
      const resultado = await pedir('/api/prestamos/' + encodeURIComponent(registro.id) + '/devolucion', {
        method: 'PUT'
      });
      if (resultado.data?.estado !== 'devuelto' || !resultado.data.fecha_devolucion) {
        throw new Error('Respuesta de devolución inválida.');
      }
      const actualizado = await cargar();
      anunciar(actualizado ? 'Devolución registrada para ' + registro.libro_titulo + '.'
        : 'El servidor guardó la devolución, pero no se pudo actualizar la pantalla. Utiliza Actualizar listado.',
      actualizado ? 'exito' : 'error');
    } catch (error) {
      anunciar(error.status ? error.message
        : 'No se pudo confirmar la devolución. Actualiza el listado para comprobar su estado antes de reintentar.', 'error');
    } finally {
      enviando = false;
      boton.textContent = 'Devolver';
      actualizarBotones();
    }
  }
  actualizar.addEventListener('click', () => { anunciar(''); cargar(); });
  cargar();
})();
