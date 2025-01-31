import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import moment from "moment-timezone";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import os from "os";

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
    session({
        secret: "P4-SBC#SesionesHTTP-VariablesDeSesion",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 5 * 60 * 1000 } 
    })
)

// Sesiones almacenadas en memoria
const sessions = {};

// Función de utilidad para obtener la IP del cliente
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress
  );
};

//Funcion de utiladad que nos permitira acceder a la informacion de la interfaz de red 
const getServerNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    for(const name in interfaces){
        for(const iface of interfaces[name]){
            if(iface.family === 'IPv4' && !iface.internal){
                return { serverIp: iface.address, serverMAc: iface.mac};
            }
        }
    }
}

// Login Endpoint
app.post("/login", (req, res) => {
  console.log(req.body);
  const { email, nickname, macAddress } = req.body;

  if (!email || !nickname || !macAddress) {
    return res.status(400).json({ message: "Falta algún campo." });
  }

  const sessionId = uuidv4();
  const now = moment().tz('America/Mexico_City'); // Obtener la hora actual 

  sessions[sessionId] = {
    sessionId,
    email,
    nickname,
    macAddress,
    ip:getServerNetworkInfo(),
    createAt: now.format('YYYY-MM-DD HH:mm:ss'), 
    lastAccessed: now.format('YYYY-MM-DD HH:mm:ss'), 
  };

  res.status(200).json({
    message: "Inicio de sesión exitoso.",
    sessionId,
  });
});

// Logout Endpoint
app.post("/logout", (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(404).json({ message: "No se ha encontrado una sesión activa." });
  }

  delete sessions[sessionId];
  req.session?.destroy((err) => {
      if (err) {
          return res.status(500).send("Error al cerrar la sesión.");
      }
  })
  res.status(200).json({ message: "Logout exitoso." });
});

// Actualización de la sesión
app.put("/update", (req, res) => {
  const { sessionId, email, nickname } = req.body;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(404).json({ message: "No existe una sesión activa." });
  }

  if (email) sessions[sessionId].email = email;
  if (nickname) sessions[sessionId].nickname = nickname;
  sessions[sessionId].lastAccessedAt = new Date();

    res.status(200).json({
        message: "Sesión actualizada correctamente.",
        session: {
            sessionId,
            email: sessions[sessionId].email,
            nickname: sessions[sessionId].nickname,
            lastAccessedAt: sessions[sessionId].lastAccessedAt,
        },
    });
});

// Estatus de la sesión
app.get("/status", (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId || !sessions[sessionId]) {
    return res.status(404).json({ message: "No hay sesión activa." });
  }
    const nowCDMX = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
//agregar el status de la sesion 
  res.status(200).json({
    message: "Sesión activa.",
    session: sessions[sessionId],
    horaActualCDMX:nowCDMX
  });
});


app.get("/hola",(req,res)=>{
  return res.status(200).json({
    message:"Bienvenido a la API de control de sesiones",
    author:"Sayurid Bautista Cruz"
  });
});
app.get('/sesion', (req, res) => {
  res.status(200).json({
      message: 'Sesiones activas',
      sessions: Object.values(sessions), // Retornar todas las sesiones activas
  });
});
// Inicia el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
