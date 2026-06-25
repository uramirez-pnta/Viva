
const express = require('express');
const router = express.Router();
const sql = require('mssql');


router.get('/period-list', async (req, res) => {
  try {
    const pool = await sql.connect();
    const result = await pool.request().query(`
    SELECT Periodo_ID, Fecha_Inicio, Fecha_Fin
    FROM dims.Dim_Period_Facturation_Viva
    WHERE Fecha_Fin <= CAST(GETDATE() AS date)
    OR (CAST(GETDATE() AS date) BETWEEN Fecha_Inicio AND Fecha_Fin)
    ORDER BY Fecha_Fin DESC;
    `);
    res.json(result.recordset);
  } catch (err) {z
    console.error('Error obteniendo periodos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const { periodo } = req.query;
    if (!periodo) return res.status(400).json({ error: 'Debe indicar un periodo' });

    const pool = await sql.connect();


    const periodResult = await pool.request()
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT Fecha_Inicio, Fecha_Fin
        FROM dims.Dim_Period_Facturation_Viva
        WHERE Periodo_ID = @PeriodoID
      `);

    if (periodResult.recordset.length === 0)
      return res.status(404).json({ error: 'Periodo no encontrado' });

    const { Fecha_Fin } = periodResult.recordset[0];
    const hoy = new Date();
    const periodoCerrado = new Date(Fecha_Fin) < hoy;

    const result = await pool.request()
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT Id_Fecha, Minutos_Dia, Acumulado
        FROM viewscloud.vw_dashboard_period_history_Viva
        WHERE Periodo_ID = @PeriodoID
        ORDER BY Id_Fecha
      `);

    let data = result.recordset;

    if (!periodoCerrado && data.length > 1) {
      data = data.slice(0, data.length - 1); 
    }

    res.json(data);

  } catch (err) {
    console.error('Error histórico minutos:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/summary', async (req, res) => {
  try {
    const request = new sql.Request();

    const todayResult = await request.query(`
      SELECT * 
      FROM viewscloud.vw_dashboard_initial_Viva
    `);

    const yesterdayResult = await request.query(`
      SELECT * 
      FROM viewscloud.vw_dashboard_yesterday_Viva
    `);

    if (
      todayResult.recordset.length === 0 ||
      yesterdayResult.recordset.length === 0
    ) {
      return res.status(404).json({
        error: 'No hay datos suficientes para el resumen'
      });
    }

    const today = todayResult.recordset[0];
    const yesterday = yesterdayResult.recordset[0];

    const diferencia = today.total_minutes - yesterday.total_minutes;
    const porcentaje =
      yesterday.total_minutes > 0
        ? (diferencia / yesterday.total_minutes) * 100
        : 0;

    res.json({
      id_fecha: today.Id_Fecha,
      total_hoy: today.total_minutes,
      total_ayer: yesterday.total_minutes,
      diferencia,
      porcentaje
    });

  } catch (err) {
    console.error('Error resumen dashboard:', err);
    res.status(500).json({  
      error: 'Error al obtener resumen del dashboard'
    });
  }
});

router.get('/period-summary', async (req, res) => {
  try {
    const { periodo } = req.query;
    if (!periodo) return res.status(400).json({ error: 'Debe indicar un periodo' });

    const pool = await sql.connect();


    const periodResult = await pool.request()
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT total_minutes_periodo
        FROM viewscloud.vw_dashboard_period_Viva
        WHERE Periodo_ID = @PeriodoID
    `);

    const minutosPeriodo = periodResult.recordset.length > 0
      ? periodResult.recordset[0].total_minutes_periodo
      : 0;

    const licenciasResult = await pool.request()
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT MAX(Licencias_Dia) AS pico_maximo
        FROM viewscloud.vw_license_viva_history
        WHERE Periodo_ID = @PeriodoID
    `);

    const licenses = licenciasResult.recordset.length > 0
      ? licenciasResult.recordset[0].pico_maximo
      : 0;

    const multiplicador = Math.max(240, licenses);
    const bolsaBYOC = multiplicador * 6500;
    const diferenciaBolsa = bolsaBYOC - minutosPeriodo;

    res.json({
      total_minutes_periodo: minutosPeriodo,
      licenses: licenses,
      bolsa_byoc: bolsaBYOC,
      diferencia_bolsa: diferenciaBolsa
    });

  } catch (err) {
    console.error('Error periodo facturable REAL:', err);
    res.status(500).json({
      error: 'Error al obtener periodo facturable',
      detalle: err.message
    });
  }
});
module.exports = router;
