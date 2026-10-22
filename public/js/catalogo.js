const catalogo = document.getElementById('catalogo');
const mensaje = document.getElementById('mensaje');
const q = document.getElementById('q');
const categoria = document.getElementById('categoria');

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function cargarLibros() {
  mensaje.textContent = 'Cargando...';
  const params = new URLSearchParams();
  if (q.value.trim()) params.set('q', q.value.trim());
  if (categoria.value) params.set('categoria', categoria.value);
  try {
    const res = await fetch('/api/libros?' + params);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    mensaje.textContent = data.length ? `${data.length} libro(s) encontrado(s)` : 'No se encontraron libros.';
    catalogo.innerHTML = data.map(l => `
      <article class="card">
        <h3>${esc(l.titulo)}</h3>
        <p>${esc(l.autor)} · ${l.anio ?? 's/f'}</p>
        <p>${esc(l.categoria)} · ISBN ${esc(l.isbn)}</p>
        <span class="badge ${l.disponibles > 0 ? 'ok' : 'agotado'}">
          ${l.disponibles > 0 ? `Disponible (${l.disponibles}/${l.copias_total})` : 'No disponible'}
        </span>
      </article>`).join('');
  } catch (e) {
    mensaje.textContent = 'Error: ' + e.message;
  }
}

document.getElementById('filtros').addEventListener('submit', e => { e.preventDefault(); cargarLibros(); });
cargarLibros();