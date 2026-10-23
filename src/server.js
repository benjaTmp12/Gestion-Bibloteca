require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un número entre 1 y 65535');
}
app.listen(port, () => console.log(`Biblioteca disponible en http://localhost:${port}`));
