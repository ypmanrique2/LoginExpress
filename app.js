const express = require('express')
const app = express()
const port = process.env.PORT || 3000
// Get the client
const mysql = require('mysql2/promise');
const cors = require('cors')
const session = require('express-session')
const md5 = require('md5');

app.use(cors({
  origin: process.env.URLFRONTEND || 'http://localhost:5173',
  credentials: true
}))
app.use(session({
  secret: process.env.SECRETSESSION || 'asdlfkfso3234o23lsdflasdfasdfasdfoasdf',
  proxy: true,
  cookie: {
    sameSite: 'none',
    secure: true,
  }
}))
// app.set("trust proxy", 1);

// Create the connection to database
const connection = mysql.createPool({
  host: process.env.HOSTDB || 'localhost',
  user: process.env.USERDB || 'root',
  database: process.env.DB || 'login',
  password: process.env.PASSWORDDB || '',
  port: process.env.PORTDB || 3306
});

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

app.get('/registrar', async (req, res) => {
  if (!req.session.usuario) {
    res.status(401).send('No autorizado')
    return
  }
  const datos = req.query;
  // A simple SELECT query
  try {
    const [results, fields] = await connection.query(
      "INSERT INTO `usuarios` (`id`, `usuario`, `clave`) VALUES (NULL, ?, ?);",
      [datos.usuario, md5(datos.clave)]
    );
    if (results.affectedRows > 0) {
      req.session.usuario = datos.usuario;
      res.status(201).send('Usuario registrado')
    } else {
      res.status(401).send('Error al registrar Usuario')
    }

    console.log(results); // results contains rows returned by server
    console.log(fields); // fields contains extra meta data about results, if available
  } catch (err) {
    console.log(err);
    res.status(500).send('Error al registrar Usuario')
  }
})

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