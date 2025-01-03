const express = require('express');
const app = express();
const port = 10000 || process.env.PORT || 3000;
// Get the client
const mysql = require('mysql2/promise');
const session = require('express-session');
const md5 = require('md5');
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://radiant-hummingbird-4a4f1e.netlify.app', // producción
    'http://localhost:5173',                         // desarrollo
    process.env.URLFRONTEND,                         // url desde env (si existe)
  ],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SECRETSESSION || 'asdf',
  resave: false,  // No guardar la sesión si no ha cambiado
  saveUninitialized: false,  // No guardar sesiones no inicializadas
  proxy: true,
  cookie: {
    sameSite: 'none',
    secure: true,
  }
}));
// app.set("trust proxy", 1);

// Create the connection to database
const connection = mysql.createPool({
  host: process.env.HOSTDB || 'localhost' || 'sql10.freemysqlhosting.net',
  user: process.env.USERDB || 'root' || 'sql10755184',
  database: process.env.DB || 'login' || 'sql10755184',
  password: process.env.PASSWORDDB || '' || 'CpUS9vuFpB',
  port: process.env.PORTDB || 3306 || 3000,
});

app.use((err, req, res, next) => {
  console.error('Error interno:', err);
  res.status(500).send('Error interno del servidor');
});

app.use(express.json()); // Middleware para analizar cuerpos JSON

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/login', async (req, res) => {  
  const { usuario, clave } = req.body;  

  try {
    const [results, fields] = await connection.query(
      "SELECT * FROM `usuarios` WHERE `usuario` = ? AND `clave` = ?",
      [usuario, md5(clave)]  
    );
    
    if (results.length > 0) {
      req.session.usuario = usuario;

      if (results[0].rol === 'ADMINISTRADOR') {
        req.session.administrador = true;
        return res.status(200).json({ rol: 'ADMINISTRADOR' });
      }
      
      return res.status(200).json({ rol: 'USUARIO' });
    } else {
      return res.status(401).send('Datos incorrectos');
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send('Error al iniciar sesión');
  }
});

app.get('/validar', (req, res) => {
  if (req.session.usuario) {
    res.status(200).send('Sesión validada')
  } else {
    res.status(401).send('No autorizado')
  }
  res.json({ valid: true });
})

app.post('/registrar', async (req, res) => {
  // Obtener los datos del body de la solicitud
  const { usuario, clave } = req.body;

  // Verificar que ambos campos estén presentes
  if (!usuario || !clave) {
    return res.status(400).send('Faltan datos en la solicitud');
  }

  try {
    // Inserta el nuevo usuario en la base de datos
    const [result] = await connection.query(
      'INSERT INTO usuarios (usuario, clave) VALUES (?, ?)',
      [usuario, md5(clave)] // Usar md5 para la clave si es necesario
    );

    // Si todo va bien, responde con éxito
    res.status(200).send('Usuario registrado');
  } catch (err) {
    console.error('Error en el registro:', err);
    return res.status(500).send('Error en el registro');
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
  console.log(`Servidor corriendo en el puerto ${port}`)
})