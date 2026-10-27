const catalogo = document.getElementById('catalogo');
const mensaje = document.getElementById('mensaje');
const q = document.getElementById('q');
const categoria = document.getElementById('categoria');
let librosVisibles = [];
let consulta = 0;

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function cargarCategorias() {
  const respuesta = await fetch('/api/libros/categorias');
  const cats = await respuesta.json();
  if (!respuesta.ok) throw new Error('No se pudieron cargar las categorías.');
  const anterior = categoria.value;
  categoria.replaceChildren(new Option('Todas las categorías', ''));
  cats.forEach(c => categoria.add(new Option(c, c)));
  if (cats.includes(anterior)) categoria.value = anterior;
}
async function cargarLibros() {
  const turno = ++consulta;
  mensaje.textContent = 'Cargando...';
  const params = new URLSearchParams();
  if (q.value.trim()) params.set('q', q.value.trim());
  if (categoria.value) params.set('categoria', categoria.value);
  try {
    const res = await fetch('/api/libros?' + params);
    const data = await res.json();
    if (turno !== consulta) return;
    if (!res.ok) throw new Error(data.error?.mensaje || data.error || 'No se pudo consultar el catálogo.');
    librosVisibles = data;
    mensaje.textContent = data.length ? `${data.length} libro(s) encontrado(s)` : 'No se encontraron libros.';
    catalogo.innerHTML = data.map(l => `
      <article class="card">
        <h3>${esc(l.titulo)}</h3>
        <p>${esc(l.autor)} · ${l.anio ?? 's/f'}</p>
        <p>${esc(l.categoria)} · ISBN ${esc(l.isbn)}</p>
        <span class="badge ${l.disponibles > 0 ? 'ok' : 'agotado'}">
          ${l.disponibles > 0 ? `Disponible (${l.disponibles}/${l.copias_total})` : 'No disponible'}
        </span>
        <div class="acciones"><button type="button" class="secundario" data-editar="${esc(l.id)}" aria-label="Editar ${esc(l.titulo)}">Editar</button><button type="button" class="peligro" data-eliminar="${esc(l.id)}" aria-label="Eliminar ${esc(l.titulo)}">Eliminar</button></div>
      </article>`).join('');
  } catch (e) {
    if (turno !== consulta) return;
    catalogo.replaceChildren();
    librosVisibles = [];
    mensaje.textContent = 'Error: ' + e.message;
  }
}

document.getElementById('filtros').addEventListener('submit', e => { e.preventDefault(); cargarLibros(); });
cargarCategorias().catch(e => { mensaje.textContent = e.message; }).finally(cargarLibros);
