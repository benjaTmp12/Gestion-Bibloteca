(() => {
  const editor = document.getElementById('editor');
  const form = document.getElementById('form-libro');
  const estado = document.getElementById('estado-editor');
  const operacion = document.getElementById('operacion');
  let idActual = null;
  let ocupado = false;
  form.elements.anio.max = new Date().getFullYear();
  function abrir(libro) {
    if (ocupado) return;
    idActual = libro?.id || null;
    form.reset();
    if (libro) for (const campo of ['titulo', 'autor', 'isbn', 'categoria', 'anio', 'copias_total']) {
      form.elements[campo].value = libro[campo] ?? '';
    }
    estado.textContent = '';
    document.getElementById('titulo-editor').textContent = libro ? 'Editar libro' : 'Nuevo libro';
    editor.hidden = false;
    form.elements.titulo.focus();
  }
  async function refrescar() {
    try { await cargarCategorias(); await cargarLibros(); }
    catch { operacion.textContent += ' No se pudo actualizar el catálogo; recarga la página.'; }
  }
  async function solicitar(url, opciones) {
    const res = await fetch(url, opciones);
    if (res.status === 204) return;
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.mensaje || 'No se pudo completar la operación.');
    return body;
  }
  function bloquear(valor) {
    ocupado = valor;
    form.querySelectorAll('input, button').forEach(el => { el.disabled = valor; });
    document.getElementById('nuevo-libro').disabled = valor;
    catalogo.querySelectorAll('button').forEach(el => { el.disabled = valor; });
  }
  document.getElementById('nuevo-libro').addEventListener('click', () => abrir());
  document.getElementById('cancelar-libro').addEventListener('click', () => {
    editor.hidden = true;
    document.getElementById('nuevo-libro').focus();
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (ocupado) return;
    const datos = {};
    for (const campo of ['titulo', 'autor', 'isbn', 'categoria']) datos[campo] = form.elements[campo].value;
    datos.anio = form.elements.anio.value === '' ? null : Number(form.elements.anio.value);
    datos.copias_total = Number(form.elements.copias_total.value);
    bloquear(true);
    estado.textContent = 'Guardando...';
    try {
      await solicitar('/api/libros' + (idActual ? '/' + encodeURIComponent(idActual) : ''), {
        method: idActual ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos)
      });
      operacion.textContent = idActual ? 'Libro actualizado.' : 'Libro creado.';
      editor.hidden = true;
      await refrescar();
      document.getElementById('nuevo-libro').focus();
    } catch (error) { estado.textContent = error instanceof TypeError
      ? 'No se pudo confirmar el guardado. Consulta el catálogo antes de reintentar.' : error.message; }
    finally { bloquear(false); }
  });
  catalogo.addEventListener('click', async e => {
    const boton = e.target.closest('button');
    if (!boton || ocupado) return;
    const libro = librosVisibles.find(l => l.id === (boton.dataset.editar || boton.dataset.eliminar));
    if (!libro) return;
    if (boton.dataset.editar) return abrir(libro);
    if (!confirm(`¿Eliminar «${libro.titulo}»? Esta acción no se puede deshacer.`)) return;
    bloquear(true);
    operacion.textContent = 'Eliminando...';
    try {
      await solicitar('/api/libros/' + encodeURIComponent(libro.id), { method: 'DELETE' });
      operacion.textContent = 'Libro eliminado.';
      if (idActual === libro.id) editor.hidden = true;
      await refrescar();
    } catch (error) { operacion.textContent = error instanceof TypeError
      ? 'No se pudo confirmar la eliminación. Actualiza el catálogo antes de reintentar.' : error.message; }
    finally { bloquear(false); }
  });
})();
