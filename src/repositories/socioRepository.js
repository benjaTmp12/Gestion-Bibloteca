const { getDb } = require('../db/connection');
const AppError = require('../utils/appError');

async function listar() {
  const snapshot = await getDb().collection('socios').limit(101).get();
  if (snapshot.size > 100) {
    throw new AppError(409, 'LIMITE_MVP', 'El listado supera el límite de 100 socios del MVP.');
  }
  return snapshot.docs.map(doc => {
    const socio = doc.data();
    return { id: doc.id, nombre: socio.nombre, email: socio.email, activo: socio.activo === true };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id));
}
module.exports = { listar };
