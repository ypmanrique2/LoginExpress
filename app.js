const express = require('express');
const app = express();
const port = process.env.PORT || 12655 || 3306;
// Get the client
const mysql = require('mysql2/promise');
const session = require('express-session');
const md5 = require('md5');
const cors = require('cors');

const corsOptions = {
  origin: [
    'https://vermillion-babka-8fa83b.netlify.app', // frontend desplegado
    'http://localhost:5173',                         // para desarrollo local
  ],
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type'],
  credentials: true, // Importante para manejar cookies de sesión
  preflightContinue: false,
  sameSite: 'none',
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SECRETSESSION || 'asdf',
  resave: false,  // No guardar la sesión si no ha cambiado
  saveUninitialized: false,  // No guardar sesiones no inicializadas
  proxy: true,
  cookie: {
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
  }
}));
app.set("trust proxy", 1);

// Create the connection to database
const connection = mysql.createPool({
  host: process.env.HOSTDB || 'mysql-conversor-soy-7596.i.aivencloud.com' || 'localhost' ,
  user: process.env.USERDB || 'avnadmin' || 'root' ,
  database: process.env.DB || 'defaultdb' || 'login' ,
  password: process.env.PASSWORDDB || 'AVNS_QbjHj-vGWZmBnhv3u0L' || '' ,
  port: process.env.PORTDB || 12655 || 3306 ,
});

app.use((err, req, res, next) => {
/*   console.error('Error interno:', err);
  res.status(500).send('Error interno del servidor'); */
  console.log('CORS headers:', req.headers);
  next();
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
      req.session.administrador = results[0].rol === 'ADMINISTRADOR'; // el rol
      return res.status(200).json({ rol: results[0].rol }); // Devuelve el rol al frontend
/*       if (results[0].rol === 'ADMINISTRADOR') {
        req.session.administrador = true;
        return res.status(200).json({ rol: 'ADMINISTRADOR' });
      }
      
      return res.status(200).json({ rol: 'USUARIO' }); */
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
    res.status(200).json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

app.post('/registrar', async (req, res) => {
  const { usuario, clave } = req.body;

  if (!usuario || !clave) {
    return res.status(400).send('Faltan datos en la solicitud');
  }

  try {
    const [result] = await connection.query(
      'INSERT INTO usuarios (usuario, clave, rol) VALUES (?, ?, "USUARIO")',  // Establece "USUARIO" como valor por defecto
      [usuario, md5(clave)]
    );

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