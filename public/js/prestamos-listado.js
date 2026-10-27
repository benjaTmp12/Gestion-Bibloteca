(() => {
  'use strict';
  const form = document.getElementById('filtros-prestamos');
  const estado = document.getElementById('estado-listado');
  const buscar = document.getElementById('buscar-prestamo');
  const consultar = document.getElementById('consultar-prestamos');
  const mensaje = document.getElementById('mensaje-listado');
  const filas = document.getElementById('filas-prestamos');
  const contenedor = document.getElementById('contenedor-tabla');
  let solicitud = 0;

  const normalizar = texto => String(texto || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const calendario = fecha => fecha.split('-').reverse().join('/');
  const diaPrestamo = fecha => new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', dateStyle: 'short'
  }).format(new Date(fecha));

  function celda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
  }
  function dibujar(registros) {
    filas.replaceChildren();
    for (const registro of registros) {
      const tr = document.createElement('tr');
      const libro = celda(registro.libro_titulo);
      const referencia = document.createElement('small');
      referencia.className = 'referencia';
      referencia.textContent = registro.id;
      libro.append(referencia);
      const estadoCelda = celda('');
      const etiqueta = document.createElement('span');
      const tipo = registro.estado === 'devuelto' ? 'devuelto' : registro.vencido ? 'vencido' : 'activo';
      etiqueta.className = 'estado-prestamo ' + tipo;
      etiqueta.textContent = { activo: 'Activo', devuelto: 'Devuelto', vencido: 'Vencido' }[tipo];
      estadoCelda.append(etiqueta);
      tr.append(libro, celda(registro.socio_nombre), celda(diaPrestamo(registro.fecha_prestamo)),
        celda(calendario(registro.fecha_vencimiento)), estadoCelda);
      filas.append(tr);
    }
    contenedor.hidden = registros.length === 0;
  }
  async function cargar() {
    const actual = ++solicitud;
    consultar.disabled = true;
    form.setAttribute('aria-busy', 'true');
    mensaje.textContent = 'Consultando préstamos…';
    try {
      const respuesta = await fetch('/api/prestamos?' + new URLSearchParams({ estado: estado.value }));
      const body = await respuesta.json();
      if (actual !== solicitud) return;
      if (!respuesta.ok) throw new Error(body.error?.mensaje || 'No se pudo consultar el listado.');
      if (!Array.isArray(body.data)) throw new Error('Respuesta de datos inválida.');
      const q = normalizar(buscar.value.trim());
      const registros = body.data.filter(item => !q
        || normalizar(item.libro_titulo).includes(q) || normalizar(item.socio_nombre).includes(q));
      dibujar(registros);
      mensaje.textContent = registros.length ? registros.length + ' préstamo(s) encontrado(s).'
        : 'No hay préstamos que coincidan con los filtros.';
    } catch (error) {
      if (actual !== solicitud) return;
      dibujar([]);
      mensaje.textContent = 'No se pudo cargar el listado: ' + error.message;
    } finally {
      if (actual === solicitud) {
        consultar.disabled = false;
        form.setAttribute('aria-busy', 'false');
      }
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); cargar(); });
  document.addEventListener('prestamo-registrado', () => {
    estado.value = 'activo';
    buscar.value = '';
    cargar();
  });
  cargar();
})();
