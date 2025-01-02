const express = require('express');
const app = express();
const port = process.env.PORT || 3000
// Get the client
const mysql = require('mysql2/promise');
const session = require('express-session');
const md5 = require('md5');
const cors = require('cors');

app.use(cors({
  origin: process.env.URLFRONTEND || 'http://localhost:5173' || 'https://radiant-hummingbird-4a4f1e.netlify.app/',
  credentials: true
}))

app.use(session({
  secret: process.env.SECRETSESSION || 'asdf',
  proxy: true,
  cookie: {
    sameSite: 'none',
    secure: true,
  }
}))
// app.set("trust proxy", 1);

// Create the connection to database
const connection = mysql.createPool({
  host: process.env.HOSTDB || 'localhost' || 'sql10.freemysqlhosting.net',
  user: process.env.USERDB || 'root' || 'sql10755184',
  database: process.env.DB || 'login' || 'sql10755184',
  password: process.env.PASSWORDDB || '' || 'CpUS9vuFpB',
  port: process.env.PORTDB || 3306 || 3306,
});

app.use(express.json()); // Middleware para analizar cuerpos JSON
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/login', async (req, res) => { //req = request, peticion; res = response, respuesta
  const datos = req.query;
  // A simple SELECT query
  try {
    const [results, fields] = await connection.query(
      "SELECT * FROM `usuarios` WHERE `usuario` = ? AND `clave` = ?",
      [datos.usuario, md5(datos.clave)]
    );
    if (results.length > 0) {
      req.session.usuario = datos.usuario;
      if (results[0].rol == 'ADMINISTRADOR') {
        req.session.administrador = true;
        res.status(200).json({ rol: 'ADMINISTRADOR' })
        return
      }
      res.status(200).json({ rol: 'USUARIO' })
    } else {
      res.status(401).send('Datos incorrectos')
    }
    console.log(results); // results contains rows returned by server
    console.log(fields); // fields contains extra meta data about results, if available
  } catch (err) {
    console.log(err);
    res.status(500).send('Error al iniciar sesión')
  }
})

app.get('/validar', (req, res) => {
  if (req.session.usuario) {
    res.status(200).send('Sesión validada')
  } else {
    res.status(401).send('No autorizado')
  }
})

app.post('/registrar', async (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body); // Loguea el cuerpo de la solicitud
  if (!req.body || !req.body.usuario || !req.body.clave) {
    return res.status(400).send('Faltan datos en la solicitud');
  }
  const { usuario, clave } = req.body;  // Ahora se puede acceder a req.body.usuario y req.body.clave
  console.log('Usuario recibido:', usuario); // Verifica los datos que están llegando
  try {
    // Verifica que se reciban los datos correctamente
    console.log('Datos recibidos para registrar:', datos);
    // Inserta el nuevo usuario en la base de datos
    const [results] = await connection.query(
      "INSERT INTO `usuarios` (`id`, `usuario`, `clave`) VALUES (NULL, ?, ?);",
      [datos.usuario, md5(datos.clave)] // MD5 para la clave
    );
    if (results.affectedRows > 0) {
      req.session.usuario = datos.usuario;
      res.status(201).send('Usuario registrado');
    } else {
      res.status(400).send('Error al registrar Usuario');
    }
  } catch (err) {
    console.error('Error en el registro:', err); // Agrega un log más detallado para identificar el error
    res.status(500).send('Error al registrar Usuario');
  }
});

app.get('/usuarios', async function usuarios(req, res) { //request, response 
  if (!req.session.administrador) {
    res.status(401).send('No autorizado')
    return
  }
  try {
    const [results, fields] = await connection.query(
      "SELECT id,usuario,nombre FROM `usuarios`"
    );
    res.status(200).json(results)
  } catch (err) {
    console.log(err);
    res.status(500).send('Error al obtener usuarios')
  }
})

app.delete('/usuarios', async function usuarios(req, res) { //request, response 
  if (!req.session.administrador) {
    res.status(401).send('No autorizado')
    return
  }
  const datos = req.query;
  try {
    const [results, fields] = await connection.query(
      "DELETE FROM usuarios WHERE `usuarios`.`id` = ?",
      [datos.id]
    );
    if (results.affectedRows > 0) {
      res.status(200).send('Usuario eliminado')
    } else {
      res.status(404).send('Usuario no encontrado')
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('Error al eliminar usuario')
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})