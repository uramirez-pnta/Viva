
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
  } catch (err) {
    console.error('Error obteniendo periodos IVR:', err);
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
        FROM viewscloud.vw_dashboard_ivr_period_history_viva
        WHERE Periodo_ID = @PeriodoID
        ORDER BY Id_Fecha
      `);

    let data = result.recordset;
    if (!periodoCerrado && data.length > 1) {
      data = data.slice(0, data.length -1);
    }

    const peakResult = await pool.request()
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT MAX(Licencias_Dia) AS picoLicencias
        FROM viewscloud.vw_license_viva_history
        WHERE Periodo_ID = @PeriodoID
      `);

    const picoLicencias = peakResult.recordset[0]?.picoLicencias || 0;

    const baseLicencias = Math.max(picoLicencias, 240);

    const bolsa = baseLicencias * 2275 + 1200000;

    const mappedData = data.map(d => ({
      Id_Fecha: d.Id_Fecha,
      Minutos: d.Minutos_Dia,
      Acumulado: d.Acumulado
    }));

    res.json({
      bolsa,
      data: mappedData
    });

  } catch (err) {
    console.error('Error histórico IVR:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/summary', async (req, res) => {
  try {
    const pool = await sql.connect();

    const periodos = await pool.request().query(`
      SELECT Periodo_ID, Fecha_Inicio, Fecha_Fin
      FROM dims.Dim_Period_Facturation_Viva
      ORDER BY Fecha_Inicio DESC
    `);

    const ultimoPeriodo = periodos.recordset[0];

    const summaryResult = await pool.request()
      .input('PeriodoID', sql.Int, ultimoPeriodo.Periodo_ID)
      .query(`
        SELECT SUM(Minutos_Dia) AS acumulado
        FROM viewscloud.vw_dashboard_ivr_period_history_viva
        WHERE Periodo_ID = @PeriodoID
      `);

    const acumulado = summaryResult.recordset[0]?.acumulado || 0;

    const multiplicador = 240;
    const bolsaIVR = multiplicador * 2275;
    const porcentaje = bolsaIVR ? (acumulado / bolsaIVR) * 100 : 0;

    res.json({
      periodo: ultimoPeriodo.Periodo_ID,
      acumulado,
      bolsa: bolsaIVR,
      porcentaje
    });

  } catch (err) {
    console.error('Error resumen IVR:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;