/**
 * SEI PDF Generator v4.6 - FIX INTEGRADO
 * - Elimina la dependencia de archivos CSS externos (evita error 404).
 * - Sincroniza colores de pantalla (Naranja/Rojo) con el PDF.
 */
(function() {
  window.generarReporteSEI = async function(nombreArchivo, idContenedor, opciones = {}) {
    console.log("Iniciando Generador SEI v4.6...");
    
    const elemento = document.getElementById(idContenedor) || document.getElementById('pdf-content');
    if (!elemento) {
      alert("Error: No se encontró el contenedor 'pdf-content'");
      return;
    }

    // 1. INYECTAR ESTILOS INTERNOS (Sustituye al archivo sei-pdf-style.css)
    const styleId = 'sei-internal-pdf-styles';
    if (!document.getElementById(styleId)) {
      const styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.textContent = `
        .sei-pdf-root { background: #fff !important; color: #000 !important; }
        /* Mantiene los colores originales del dashboard en el PDF */
        .pdf-fuselaje { fill: #f76707 !important; stroke: #000 !important; stroke-width: 1.5px; }
        .pdf-area-critica { fill: #e03131 !important; fill-opacity: 0.3 !important; stroke: #000 !important; stroke-dasharray: 5,5; }
        .btn-calc, .fab, .nav-tabs, .btn-sm { display: none !important; }
        #diag-svg rect[fill="url(#grid)"] { display: none !important; }
      `;
      document.head.appendChild(styleTag);
    }

    // 2. CONFIGURACIÓN DE CAPTURA
    const esPaisaje = opciones.orientacion === 'landscape';
    const opt = {
      margin: [10, 5, 10, 5],
      filename: (nombreArchivo || 'reporte_sei') + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        windowWidth: 1200 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: esPaisaje ? 'landscape' : 'portrait' }
    };

    try {
      // Pausa para asegurar que los estilos se apliquen
      await new Promise(r => setTimeout(r, 1000));
      
      if (typeof html2pdf === 'undefined') {
        throw new Error("La librería html2pdf no está cargada en el HTML principal.");
      }
      
      await html2pdf().set(opt).from(elemento).save();
      console.log("✅ PDF Generado con éxito");
    } catch (err) {
      console.error("Error crítico:", err);
      alert("Error al generar: " + err.message);
    }
  };
  console.log("✅ Función generarReporteSEI vinculada a window.");
})();