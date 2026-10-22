## API de catálogo

- `GET /api/libros?q=&categoria=` → lista y busca libros (título, autor, ISBN, categoría)
- `GET /api/libros/categorias` → categorías disponibles
- `GET /api/libros/:id` → detalle de un libro (400 si el id es inválido, 404 si no existe)