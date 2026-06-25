const express = require('express');
const router = express.Router();
const sql = require('mssql');


router.get('/peak', async (req, res) => {
  try {
    const { periodo } = req.query;

    if (!periodo) return res.status(400).json({ error: 'Debe indicar un periodo' });

    const request = new sql.Request();
    const result = await request
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT MAX(Licencias_Dia) as pico_maximo
        FROM viewscloud.vw_license_viva_history
        WHERE Periodo_ID = @PeriodoID
      `);

    res.json({ pico_maximo: result.recordset[0].pico_maximo || 0 });
  } catch (err) {
    console.error('Error al obtener número de licencias:', err);
    res.status(500).json({ error: 'Error al obtener número de licencias' });
  }
});

router.get('/history', async (req, res) => {

  try {

    const { periodo } = req.query;

    if (!periodo) {
      return res.status(400).json({ error: 'Debe indicar un periodo' });
    }

    const request = new sql.Request();

    const result = await request
      .input('PeriodoID', sql.Int, periodo)
      .query(`
        SELECT
          Id_Fecha,
          Licencias_Dia
        FROM viewscloud.vw_license_viva_history
        WHERE Periodo_ID = @PeriodoID
        ORDER BY Id_Fecha
      `);

    const pico = result.recordset.reduce((max, row) =>
      row.Licencias_Dia > max ? row.Licencias_Dia : max, 0
    );

    res.json({
      bolsa: 240,
      pico: pico,
      data: result.recordset
    });

  } catch (err) {

    console.error('Error histórico licencias:', err);

    res.status(500).json({
      error: err.message
    });

  }

});

router.get('/today', async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query(`
      SELECT *
      FROM viewscloud.vw_license_actual_day_viva
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No hay datos de licencias para - hoy' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener número de  licencias para - hoy', err);
    res.status(500).json({ error: 'Error al obtener número de  licencias para - hoy' });
  }
});


router.get('/yesterday', async (req, res) => {

  try {
    const request = new sql.Request();
    const result = await request.query(`
      SELECT *
      FROM viewscloud.vw_license_yesterday_viva
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No hay datos de licencias de dia anterior' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener número de  licencias  de un dia anterior', err);
    res.status(500).json({ error: 'Error al obtener número de licencias de un dia anterior' });
  }
});

module.exports = router;