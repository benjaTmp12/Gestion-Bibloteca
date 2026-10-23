(() => {
  'use strict';
  const form = document.getElementById('form-prestamo');
  const libro = document.getElementById('libro');
  const socio = document.getElementById('socio');
  const fecha = document.getElementById('fecha-vencimiento');
  const registrar = document.getElementById('registrar');
  const actualizar = document.getElementById('actualizar-opciones');
  const mensaje = document.getElementById('mensaje-prestamo');
  const disponibilidad = document.getElementById('disponibilidad');
  let libros = [];
  let cargando = false;
  let enviando = false;
  let opcionesListas = false;

  function anunciar(texto, tipo = '') {
    mensaje.textContent = texto;
    mensaje.dataset.tipo = tipo;
  }
  function fechaSantiagoMas(dias) {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valor = tipo => partes.find(p => p.type === tipo).value;
    const base = new Date(valor('year') + '-' + valor('month') + '-' + valor('day') + 'T12:00:00Z');
    base.setUTCDate(base.getUTCDate() + dias);
    return base.toISOString().slice(0, 10);
  }
  function actualizarBotones() {
    const ocupado = cargando || enviando;
    libro.disabled = ocupado || !opcionesListas;
    socio.disabled = ocupado || !opcionesListas;
    fecha.disabled = ocupado;
    registrar.disabled = ocupado || !opcionesListas || !libro.value || !socio.value;
    actualizar.disabled = ocupado;
    registrar.textContent = enviando ? 'Registrando…' : 'Registrar préstamo';
    form.setAttribute('aria-busy', String(ocupado));
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
  function mostrarDisponibilidad() {
    const seleccionado = libros.find(item => item.id === libro.value);
    disponibilidad.textContent = seleccionado
      ? 'Disponibles: ' + seleccionado.copias_disponibles + ' de ' + seleccionado.copias_total + ' copias.'
      : 'Selecciona un libro para consultar sus copias.';
    actualizarBotones();
  }
  async function cargarOpciones() {
    cargando = true;
    opcionesListas = false;
    actualizarBotones();
    const libroAnterior = libro.value;
    const socioAnterior = socio.value;
    try {
      const [catalogo, resultadoSocios] = await Promise.all([
        pedir('/api/libros'), pedir('/api/socios?activo=true')
      ]);
      libros = Array.isArray(catalogo) ? catalogo : catalogo.data;
      const socios = resultadoSocios.data;
      if (!Array.isArray(libros) || !Array.isArray(socios)) throw new Error('Respuesta de datos inválida.');
      libro.replaceChildren(new Option('Selecciona un libro', ''));
      for (const item of libros) {
        const disponibles = item.copias_disponibles ?? item.disponibles;
        item.copias_disponibles = disponibles;
        const opcion = new Option(item.titulo + ' · ' + item.autor
          + (disponibles > 0 ? ' (' + disponibles + ' disponibles)' : ' (sin copias)'), item.id);
        opcion.disabled = !(disponibles > 0);
        libro.add(opcion);
      }
      socio.replaceChildren(new Option('Selecciona un socio', ''));
      for (const item of socios) socio.add(new Option(item.nombre + ' · ' + item.email, item.id));
      if (libros.some(item => item.id === libroAnterior && item.copias_disponibles > 0)) libro.value = libroAnterior;
      if (socios.some(item => item.id === socioAnterior)) socio.value = socioAnterior;
      opcionesListas = true;
      if (!libros.some(item => item.copias_disponibles > 0)) {
        anunciar('No hay libros disponibles para prestar. Puedes actualizar las opciones.', 'error');
      } else if (!socios.length) {
        anunciar('No hay socios activos para registrar un préstamo.', 'error');
      }
      return true;
    } catch (error) {
      anunciar('No se pudieron cargar las opciones: ' + error.message, 'error');
      return false;
    } finally {
      cargando = false;
      mostrarDisponibilidad();
    }
  }

  fecha.min = fechaSantiagoMas(1);
  fecha.value = fechaSantiagoMas(14);
  libro.addEventListener('change', mostrarDisponibilidad);
  socio.addEventListener('change', actualizarBotones);
  actualizar.addEventListener('click', async () => {
    anunciar('');
    await cargarOpciones();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (enviando || cargando || !opcionesListas || !form.reportValidity()) return;
    const body = { libro_id: libro.value, socio_id: socio.value, fecha_vencimiento: fecha.value };
    enviando = true;
    anunciar('');
    actualizarBotones();
    try {
      const resultado = await pedir('/api/prestamos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      form.reset();
      fecha.min = fechaSantiagoMas(1);
      fecha.value = fechaSantiagoMas(14);
      const actualizado = await cargarOpciones();
      anunciar('Préstamo registrado para ' + resultado.data.socio_nombre + '.'
        + (actualizado ? '' : ' No se pudieron actualizar las opciones; utiliza Actualizar opciones.'),
      actualizado ? 'exito' : 'error');
      document.dispatchEvent(new CustomEvent('prestamo-registrado', { detail: resultado.data }));
    } catch (error) {
      anunciar(error.status ? error.message
        : 'No se pudo confirmar el registro. Consulta el listado antes de volver a intentarlo.', 'error');
    } finally {
      enviando = false;
      actualizarBotones();
    }
  });
  cargarOpciones();
})();
