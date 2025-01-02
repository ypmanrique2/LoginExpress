const express = require('express');
const app = express();
const port = process.env.PORT || 3000 || 10000;
// Get the client
const mysql = require('mysql2/promise');
const session = require('express-session');
const md5 = require('md5');
const cors = require('cors');

app.use(cors({
  origin: process.env.URLFRONTEND || 'http://localhost:5173' || 'https://radiant-hummingbird-4a4f1e.netlify.app/',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],  // Métodos permitidos
  allowedHeaders: ['Content-Type'],  // Cabeceras permitidas
  credentials: true
}));

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

app.use((err, req, res, next) => {
  console.error('Error interno:', err);
  res.status(500).send('Error interno del servidor');
});

app.use(express.json()); // Middleware para analizar cuerpos JSON

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/login', async (req, res) => {  // Cambiar de GET a POST
  const { usuario, clave } = req.body;  // Obtener los datos del cuerpo

  try {
    const [results, fields] = await connection.query(
      "SELECT * FROM `usuarios` WHERE `usuario` = ? AND `clave` = ?",
      [usuario, md5(clave)]  // Aquí utilizas MD5 para encriptar la contraseña
    );
    
    if (results.length > 0) {
      req.session.usuario = usuario;  // Guardamos el usuario en la sesión

      // Verificamos el rol del usuario
      if (results[0].rol === 'ADMINISTRADOR') {
        req.session.administrador = true;
        return res.status(200).json({ rol: 'ADMINISTRADOR' });
      }
      
      return res.status(200).json({ rol: 'USUARIO' });
    } else {
      res.status(401).send('Datos incorrectos');
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('Error al iniciar sesión');
  }
});

app.get('/validar', (req, res) => {
  if (req.session.usuario) {
    res.status(200).send('Sesión validada')
  } else {
    res.status(401).send('No autorizado')
  }
})

app.post('/registrar', (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body); // Verifica qué datos están llegando

  // Verifica que los datos estén en el cuerpo de la solicitud
  const { usuario, clave } = req.body;
  if (!usuario || !clave) {
    return res.status(400).send('Faltan datos en la solicitud');
  }

  console.log('Usuario recibido:', usuario);
  
  // Inserta el nuevo usuario en la base de datos
  connection.query('INSERT INTO usuarios (usuario, clave) VALUES (?, ?)', [usuario, clave], (err, result) => {
    if (err) {
      console.log('Error en el registro:', err);
      return res.status(500).send('Error en el registro');
    }

    // Si todo va bien, responde con éxito
    res.status(200).send('Usuario registrado');
  });
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