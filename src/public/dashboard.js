// Variables globales
let fechaInicioPeriodo = null;
let fechaFinPeriodo = null;

function showLoader() {
  const loader = document.getElementById("chartLoader");
  if (loader) loader.style.display = "block";
}

function hideLoader() {
  const loader = document.getElementById("chartLoader");
  if (loader) loader.style.display = "none";
}

//  FUNCIONES AUXILIARES 

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove('skeleton-box', 'skeleton-fecha');


  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
    return;
  }

  el.textContent = value;
}

function restarUnDia(idFecha) {
  if (!idFecha) return null;

  const f = idFecha.toString();
  const year = Number(f.substring(0,4));
  const month = Number(f.substring(4,6)) - 1;
  const day = Number(f.substring(6,8));

  const fecha = new Date(year, month, day);
  fecha.setDate(fecha.getDate() - 1);
  return fecha;
}

function formatearFecha(idFecha) {
  if (!idFecha) return '';
  let year, month, day;

  if (typeof idFecha === 'string') {
    const soloFecha = idFecha.split('T')[0];
    const partes = soloFecha.split('-');
    if (partes.length === 3) {
      year = Number(partes[0]);
      month = Number(partes[1]) - 1;
      day = Number(partes[2]);
    }
  } else {
    const f = idFecha.toString();
    year = Number(f.substring(0,4));
    month = Number(f.substring(4,6)) - 1;
    day = Number(f.substring(6,8));
  }

  const fecha = new Date(year, month, day);
  if (isNaN(fecha)) return '';

  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function showIVR() {
  const ivr = document.getElementById("ivr");

  if (ivr.style.display === "grid") return;

  hideAll();
  ivr.style.display = "grid";
  limpiarMenu();
  document.querySelector("li[onclick='showIVR()']").classList.add("active");


//  hideAll();
//  document.getElementById("ivr").style.display = "grid";
//  limpiarMenu();
//  document.querySelector("li[onclick='showIVR()']").classList.add("active");

  const select = document.getElementById('selectPeriodoIVR');

  if (!select || select.options.length === 0) {
    cargarPeriodosIVR();
  } else {
    loadIVRMetrics(select.value);
  }
}

async function cargarPeriodosIVR() {
  try {
    const res = await fetch('/ivr/period-list');
    const periodos = await res.json();

    const select = document.getElementById('selectPeriodoIVR');
    select.innerHTML = '';

    periodos.forEach(p => {
      const option = document.createElement('option');
      option.value = p.Periodo_ID;
      option.text = `${formatearFecha(p.Fecha_Inicio)} - ${formatearFecha(p.Fecha_Fin)}`;
      select.appendChild(option);
    });

    if (periodos.length > 0) {
      const primerPeriodo = periodos[0].Periodo_ID;
      select.value = primerPeriodo;
    }

    select.addEventListener('change', (e) => {
      loadIVRMetrics(e.target.value);
    });  
//    const nuevoSelect = select.cloneNode(true);
//    select.parentNode.replaceChild(nuevoSelect, select);

//    nuevoSelect.addEventListener('change', (e) => {
//      loadIVRMetrics(e.target.value);
//    });

  } catch (err) {
    console.error('Error cargando periodos IVR:', err);
  }
}

async function loadIVRMetrics(periodoID) {
  try {
    showLoader();

    const res = await fetch(`/ivr/history?periodo=${periodoID}`);
    const data = await res.json();
    console.log('total elementos:', data.data.length);
    console.log('ultimo elemento:', data.data[data.data.length - 1]);
    console.log('penultimo elemento:', data.data[data.data.length - 2]);

    if (!data || !data.data || data.data.length === 0) {
      document.querySelector("#ivrChartContainer").innerHTML = '<p>No hay datos</p>';
      hideLoader();
      return;
    }

    const totalBolsa = data.bolsa || 0;
    const fechas = data.data.map(x => x.Id_Fecha);
    const minutosDiarios = data.data.map(x => x.Minutos);
    const acumulado = data.data.map(x => Math.round(x.Acumulado || 0));
    const bolsaArray = Array(fechas.length).fill(totalBolsa);

    const totalAcumulado = Math.round(acumulado[acumulado.length - 1] || 0);
    const porcentajeUso = totalBolsa ? (totalAcumulado / totalBolsa) * 100 : 0;

    setValue('ivr-total-bolsa', totalBolsa.toLocaleString('es-MX'));
    setValue('ivr-acumulado', totalAcumulado.toLocaleString('es-MX'));

    const porcentajeEl = document.getElementById('ivr-porcentaje');
    if (porcentajeEl) {
      porcentajeEl.classList.remove("skeleton-box", "skeleton-fecha", "positive", "negative");
      porcentajeEl.textContent = porcentajeUso.toFixed(1) + "%";
      porcentajeEl.classList.add(porcentajeUso > 100 ? "positive" : "negative");
    }

    const acumuladoVis = acumulado.map((val, i) =>
      val > minutosDiarios[i] ? val - minutosDiarios[i] : null
    );

    const options = {
      chart: {
        type: 'bar',
        stacked: true,
        height: 380,
        toolbar: { show: false }
      },

      series: [
        { name: 'Minutos diarios', type: 'column', data: minutosDiarios },
        { name: 'Acumulado', type: 'column', data: acumuladoVis },
        { name: 'Bolsa IVR', type: 'line', data: bolsaArray }
      ],

      plotOptions: {
        bar: { horizontal: false, columnWidth: '60%' }
      },

      stroke: { width: [0, 0, 3], curve: 'smooth' },

      colors: ['#02fa38', '#0198f0', '#e3f032'],

      xaxis: {
        categories: fechas.map(f => formatearFecha(f))
      },

      yaxis: {
        title: { text: 'Minutos IVR' },
        labels: {
          formatter: val => val.toLocaleString('es-MX')
        }
      },

      dataLabels: { enabled: false },

      legend: { position: 'top' },

      tooltip: {
        shared: false,
        intersect: true,
        custom: function({ series, seriesIndex, dataPointIndex, w }) {

          const label = w.globals.seriesNames[seriesIndex];
          const value = series[seriesIndex][dataPointIndex];

          const bolsa = w.globals.series[
            w.globals.seriesNames.indexOf('Bolsa IVR')
          ][dataPointIndex];

          const fecha = w.globals.labels[dataPointIndex];
          const acumuladoReal = acumulado[dataPointIndex];

          return `
            <div style="background:#f3f3f3;padding:4px 8px;font-weight:bold;border-bottom:1px solid #ddd">
              ${fecha}
            </div>
            <div style="padding:6px">
              <span style="color:${w.globals.colors[seriesIndex]};">&#9679;</span>
              <b>${label}:</b> ${seriesIndex === 1 ? acumuladoReal.toLocaleString('es-MX') : value ? value.toLocaleString('es-MX') : 0}<br/>
              <span style="color:${w.globals.colors[2]};">&#9679;</span>
              <b>Bolsa IVR:</b> ${bolsa.toLocaleString('es-MX')}
            </div>
          `;
        }
      }
    };

    const chartContainer = document.querySelector("#ivrChartContainer");
    chartContainer.innerHTML = '';

    const chart = new ApexCharts(chartContainer, options);
    await chart.render();

    hideLoader();

  } catch (err) {
    console.error('Error cargando métricas IVR:', err);
    hideLoader();
  }
}

async function loadAllMetrics() {
  try {
    const selectPeriodo = document.getElementById('selectPeriodo');
    const selectLicenses = document.getElementById('selectPeriodoLicenses');
    const periodoMinutos = selectPeriodo ? selectPeriodo.value : null;
    const periodoLicenses = selectLicenses ? selectLicenses.value : null;

    const [summary, period, peak, licYesterday, licToday] = await Promise.all([
      fetch('/minutes/summary').then(r => r.json()),
      periodoMinutos ? fetch(`/minutes/period-summary?periodo=${periodoMinutos}`).then(r => r.json()) : Promise.resolve({}),
      periodoLicenses ? fetch(`/licenses/peak?periodo=${periodoLicenses}`).then(r => r.json()) : Promise.resolve({}),
      fetch('/licenses/yesterday').then(r => r.json()),
      fetch('/licenses/today').then(r => r.json()),
    ]);

    // MINUTOS BYOC
    if(summary?.total_hoy != null) setValue('minutos-hoy', Number(summary.total_hoy).toLocaleString('es-MX'));
    if(summary?.total_ayer != null) setValue('minutos-ayer', Number(summary.total_ayer).toLocaleString('es-MX'));
    if(summary?.id_fecha) setValue('fecha-hoy', formatearFecha(summary.id_fecha));
    if(summary?.id_fecha) setValue('fecha-ayer', restarUnDia(summary.id_fecha)?.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }));

    // PERIODO
    fechaInicioPeriodo = period?.Fecha_Inicio;
    fechaFinPeriodo = period?.Fecha_Fin;
    if(fechaInicioPeriodo && fechaFinPeriodo) setValue('fecha-periodo', `${formatearFecha(fechaInicioPeriodo)} - ${formatearFecha(fechaFinPeriodo)}`);

    const totalMinutesPeriodo = period?.total_minutes_periodo != null ? period.total_minutes_periodo : 0;
    setValue('minutos-periodo', totalMinutesPeriodo.toLocaleString('es-MX'));

    // LICENCIAS PICO
    const picoLicencias = peak?.pico_maximo != null ? Number(peak.pico_maximo) : 0;
    setValue('licenciasPico', picoLicencias);
    if(fechaInicioPeriodo && fechaFinPeriodo) setValue('fecha-licencias-pico', `${formatearFecha(fechaInicioPeriodo)} - ${formatearFecha(fechaFinPeriodo)}`);

    // BOLSA BYOC
    const multiplicador = Math.max(240, picoLicencias);
    const bolsaBYOC = multiplicador * 6500;
    setValue('metricA', bolsaBYOC.toLocaleString('es-MX'));
    setValue('bolsaByoc', bolsaBYOC.toLocaleString('es-MX'));

    // porcentaje de uso
    let porcentajeUso = (totalMinutesPeriodo && bolsaBYOC) ? (totalMinutesPeriodo / bolsaBYOC) * 100 : null;
    const diffCard = document.getElementById('diferenciaMinutos');
    if(diffCard && porcentajeUso != null){
      diffCard.classList.remove("skeleton-box", "skeleton-fecha", "positive", "negative");
      diffCard.textContent = porcentajeUso.toFixed(1) + "%";
      diffCard.classList.add(porcentajeUso > 100 ? "positive" : "negative");
    }

    if(licYesterday?.usuarios_dia_anterior != null) setValue('licencias-ayer', licYesterday.usuarios_dia_anterior);
    if(licYesterday?.fecha) setValue('fecha-licencias-ayer', formatearFecha(licYesterday.fecha));
    if(licToday?.usuarios_dia_actual != null) setValue('licencias-hoy', licToday.usuarios_dia_actual);
    if(licToday?.fecha) setValue('fecha-licencias-hoy', formatearFecha(licToday.fecha));

  } catch (err) {
    console.error('Error cargando todas las métricas:', err);
  }
}
//  DASHBOARD BYOC 
async function loadDashboard() {
  try {
    const response = await fetch('/minutes/summary');
    const data = await response.json();

    if (!data || !data.total_minutes) {
      setValue('totalMinutes', '0');
      setValue('fecha', 'Sin datos');
      return;
    }

    const idFecha = data.Id_Fecha.toString();
    const year = idFecha.slice(0, 4);
    const month = idFecha.slice(4, 6) - 1;
    const day = idFecha.slice(6, 8);
    const fecha = new Date(year, month, day);

    setValue('totalMinutes', Number(data.total_minutes).toLocaleString('es-MX'));
    setValue('fecha', fecha.toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' }));

  } catch (error) {
    console.error(error);
    setValue('totalMinutes', 'Error');
    setValue('fecha', 'No se pudo cargar');
  }
}

/* Grafica Licencias */
async function cargarPeriodosLicenses() {
  try {
    const res = await fetch('/minutes/period-list'); 
    const periodos = await res.json();

    const select = document.getElementById('selectPeriodoLicenses');
    select.innerHTML = '';

    periodos.forEach(p => {
      const option = document.createElement('option');
      option.value = p.Periodo_ID;
      option.text = `${formatearFecha(p.Fecha_Inicio)} - ${formatearFecha(p.Fecha_Fin)}`;
      select.appendChild(option);
    });

    if (periodos.length > 0) {
      const primerPeriodo = periodos[0].Periodo_ID;
      select.value = primerPeriodo;
      
      setTimeout(() => {
        loadIVRMetrics(primerPeriodo);
      }, 0);
    }

    select.addEventListener('change', (e) => {
      const periodoSeleccionado = e.target.value;
      cargarHistoricoLicencias(periodoSeleccionado);
      loadLicensesMetrics(periodoSeleccionado);
    });

  } catch (err) {
    console.error('Error cargando periodos Licenses:', err);
  }
}

async function cargarHistoricoLicencias(periodoID) {

  const res = await fetch(`/licenses/history?periodo=${periodoID}`);
  const json = await res.json();

  const fechas = json.data.map(d => d.Id_Fecha);
  const licencias = json.data.map(d => d.Licencias_Dia);

  const bolsa = Array(fechas.length).fill(json.bolsa);

  renderLicensesChart(fechas, licencias, bolsa);

}


function renderLicensesChart(fechas, licencias, bolsa){
  try {

    if (!fechas || !licencias || !bolsa) {
      console.warn("Datos incompletos para gráfica de licencias");
      return;
    }

    const maxBolsa = 240;

    const licenciasNormal = licencias.map(val =>
      val <= maxBolsa ? val : null
    );

    const licenciasExceso = licencias.map(val =>
      val > maxBolsa ? val : null
    );

    const options = {

      chart: {
        type: 'bar',
        height: 380,
        stacked: true,
        toolbar: { show: false }
      },

      series: [
        {
          name: "Usadas",
          type: "column",
          data: licenciasNormal
        },
        {
          name: "Bolsa superada",
          type: "column",
          data: licenciasExceso
        },
        {
          name: "Contratadas",
          type: "line",
          data: bolsa
        }
      ],

      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%'
        }
      },

      stroke: {
        width: [0, 0, 3],
        curve: 'smooth'
      },

      colors: ['#0198f0', '#FFA500', '#e3f032'],

      xaxis: {
        categories: fechas.map(f => formatearFecha(f))
      },

      yaxis: {
        title: { text: 'Licencias' },
        labels: {
          formatter: val => val.toLocaleString('es-MX')
        }
      },

      dataLabels: { enabled: false },

      legend: {
        position: 'top'
      }

    };

    const chartContainer = document.querySelector("#licensesChart");

    if (!chartContainer) {
      console.error("No existe el contenedor #licensesChart");
      return;
    }

    chartContainer.innerHTML = '';

    const chart = new ApexCharts(chartContainer, options);
    chart.render();

  } catch (error) {
    console.error("Error renderizando gráfica de licencias:", error);

    const chartContainer = document.querySelector("#licensesChart");
    if (chartContainer) {
      chartContainer.innerHTML = '<p>Error al cargar gráfica</p>';
    }
  }
}

async function loadLicensesMetrics(periodoID) {
  ['licenciasPicoCard', 'licenciasContratadas', 'usoLicencias'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('skeleton-box');
      el.textContent = '';
    }
  });

  try {
    const peak = await fetch(`/licenses/peak?periodo=${periodoID}`).then(r => r.json());

    const pico = Number(peak.pico_maximo);
    const contratadas = 240;
    const usoPorcentaje = (pico / contratadas) * 100;

    setValue('licenciasPicoCard', pico);
    setValue('licenciasContratadas', contratadas);

    const usoEl = document.getElementById('usoLicencias');
    if (usoEl) {
      usoEl.classList.remove('skeleton-box');
      usoEl.textContent = usoPorcentaje.toFixed(1) + "%";
      usoEl.classList.remove("positive","negative");
      usoEl.classList.add(usoPorcentaje > 100 ? "positive" : "negative");
    }
  } catch (err) {
    console.error('Error cargando métricas Licenses:', err);
  }
}
//  CARGAR PERIODOS 
async function cargarPeriodos() {
  try {
    const res = await fetch('/minutes/period-list'); 
    const periodos = await res.json();

    const select = document.getElementById('selectPeriodo');
    select.innerHTML = '';

    periodos.forEach(p => {
      const option = document.createElement('option');
      option.value = p.Periodo_ID;
      option.text = `${formatearFecha(p.Fecha_Inicio)} - ${formatearFecha(p.Fecha_Fin)}`;
      select.appendChild(option);
    });

    if (periodos.length > 0) {

      const primerPeriodo = periodos[0].Periodo_ID;
      select.value = primerPeriodo;

    }


    select.addEventListener('change', (e) => {
      const periodoSeleccionado = e.target.value;
      if (periodoSeleccionado) loadByocChart(periodoSeleccionado);
    });

  } catch (err) {
    console.error('Error cargando periodos:', err);
  }
}

//  CARGAR GRÁFICA BYOC 
async function loadByocChart(periodoId) {
  try {
    showLoader();

    const historyData = await (await fetch(`/minutes/history?periodo=${periodoId}`)).json();
    if (!historyData || historyData.length === 0) {
      document.querySelector("#byocChart").innerHTML = '<p>No hay datos</p>';
      hideLoader();
      return;
    }

    const fechas = historyData.map(x => formatearFecha(x.Id_Fecha));
    const minutosDiarios = historyData.map(x => x.Minutos_Dia);
    const acumulado = historyData.map(x => x.Acumulado || 0);

    const periodResponse = await fetch(`/minutes/period-summary?periodo=${periodoId}`);
    const periodData = await periodResponse.json();

    const totalMinutes = acumulado[acumulado.length - 1] || 0;
    const bolsa = periodData.bolsa_byoc || 1;

    setValue('minutos-periodo', totalMinutes.toLocaleString('es-MX'));
    setValue('minutosAcumulados', totalMinutes.toLocaleString('es-MX'));
    setValue('bolsaByoc', bolsa.toLocaleString('es-MX'));

    const diffCard = document.getElementById('diferenciaMinutos');
    if (diffCard) {
      const porcentajeUso = (totalMinutes / bolsa) * 100;
      diffCard.classList.remove("skeleton-box", "skeleton-fecha", "positive", "negative");
      diffCard.textContent = porcentajeUso.toFixed(1) + "%";
      diffCard.classList.add(porcentajeUso > 100 ? "positive" : "negative");
    }

    const acumuladoVis = acumulado.map((val, i) => val > minutosDiarios[i] ? val : null);
    const bolsaArray = Array(historyData.length).fill(bolsa);

    const series = [
      { name: 'Minutos diarios', type: 'column', data: minutosDiarios },
      { name: 'Acumulado', type: 'column', data: acumuladoVis },
      { name: 'Bolsa BYOC', type: 'line', data: bolsaArray }
    ];

    const options = {
      chart: { type: 'bar', stacked: true, height: 380, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: false, columnWidth: '60%' } },
      stroke: { width: [0, 0, 3], curve: 'smooth' },
      series: series,
      colors: ['#02fa38', '#0198f0', '#e3f032'],
      xaxis: { categories: fechas },
      yaxis: { title: { text: 'Minutos BYOC' }, labels: { formatter: val => val.toLocaleString('es-MX') } },
      legend: { position: 'top' },
      dataLabels: { enabled: false },
      tooltip: {
      shared: false,
      intersect: true,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {

        const label = w.globals.seriesNames[seriesIndex];
        const value = series[seriesIndex][dataPointIndex];
        const bolsa = w.globals.series[w.globals.seriesNames.indexOf('Bolsa BYOC')][dataPointIndex];
        const fecha = w.globals.labels[dataPointIndex];

        return `
          <div style="background:#f3f3f3;padding:4px 8px;font-weight:bold;border-bottom:1px solid #ddd">
            ${fecha}
          </div>
          <div style="padding:6px">
            <span style="color:${w.globals.colors[seriesIndex]};">&#9679;</span>
            <b>${label}:</b> ${value.toLocaleString('es-MX')}<br/>
            <span style="color:${w.globals.colors[2]};">&#9679;</span>
            <b>Bolsa BYOC:</b> ${bolsa.toLocaleString('es-MX')}
          </div>
        `;
      }
    }
    };

    const chartContainer = document.querySelector("#byocChart");
    chartContainer.innerHTML = '';

    const chart = new ApexCharts(chartContainer, options);
    await chart.render();

    hideLoader();

  } catch (err) {
    console.error('Error cargando gráfica BYOC:', err);
    hideLoader();
  }
}
//  FETCHES COMPLEMENTARIOS 

//  NAVEGACIÓN 
function hideAll() {
  document.getElementById("home").style.display="none";
  document.getElementById("byoc").style.display="none";
  document.getElementById("licenses").style.display="none";
  document.getElementById("ivr").style.display="none";
}

function limpiarMenu() {
  document.getElementById("btnHome").classList.remove("active");
  document.getElementById("btnBYOC").classList.remove("active");
  document.getElementById("btnLicenses").classList.remove("active");
  document.getElementById("btnIVR")?.classList.remove("active");
}

function showHome() {
  hideAll();
  document.getElementById("home").style.display="block";
  limpiarMenu();
  document.getElementById("btnHome").classList.add("active");
}

function showBYOC() {
  hideAll();
  document.getElementById("byoc").style.display = "grid";
  limpiarMenu();
  document.getElementById("btnBYOC").classList.add("active");

  // Cargar gráfica y metrics solo al abrir BYOC
  const select = document.getElementById('selectPeriodo');
  if(select.value){
    loadByocChart(select.value);
  }

}

function showLicenses() {
  hideAll();
  document.getElementById("licenses").style.display = "grid";
  limpiarMenu();
  document.getElementById("btnLicenses").classList.add("active");

  const select = document.getElementById("selectPeriodoLicenses");
  if(select && select.value){
    cargarHistoricoLicencias(select.value);
    loadLicensesMetrics(select.value);
  }
}
//  INICIO 
document.addEventListener("DOMContentLoaded", async () => {
  showHome();
  await cargarPeriodos();
  await cargarPeriodosLicenses();
});
