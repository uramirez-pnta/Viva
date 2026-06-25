const sql = require('mssql')

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: false,
        trustServerCertificate: false
    }
}

let pool = null

const getPool = async () => {
    if (pool) {
        return pool
    }

    try {
        pool = await sql.connect(dbConfig)
        console.log('Conectado a DB')
        return pool
    } catch (error) {
        console.error('No se establecio Conexion a DB')
        throw error
    }
}

module.exports = {
    sql,
    getPool
}
