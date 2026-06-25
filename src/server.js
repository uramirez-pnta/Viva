
const https = require('https');
const fs = require('fs');
//const path = require('path');
const app = require('./app');

const PORT = 3001;


// para servidor en prod
 // const certBasePath = path.join(__dirname, '../certificado');

//const options = {
  //key: fs.readFileSync(path.join(certBasePath, 'STAR.pentafon.com_key.txt')),
  //cert: fs.readFileSync(path.join(certBasePath, 'STAR_pentafon_com.crt')),
  //ca: fs.readFileSync(path.join(certBasePath, 'STAR_pentafon_com.ca-bundle'))
//};

const options = {
  key: fs.readFileSync('/home/uramirez/tablero-genesys/certificado/STAR.pentafon.com_key.txt'),
  cert: fs.readFileSync('/home/uramirez/tablero-genesys/certificado/STAR_pentafon_com.crt'),
  ca: fs.readFileSync('/home/uramirez/tablero-genesys/certificado/STAR_pentafon_com.ca-bundle')
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en https://localhost:${PORT}`);
});
