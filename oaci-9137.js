/* ═══════════════════════════════════════════════════════════════════════════
   oaci-9137.js
   Fuente única de verdad — ARFF Colombia
   Norma: OACI Doc 9137-AN/898, Parte 1, Cuarta edición 2015 + RAC 14

   USO: <script src="oaci-9137.js"></script> ANTES del script propio.

   CONTENIDO:
     1. Tablas normativas  (OACI9137.*)
     2. Funciones puras    (OACI9137.detectCat, getK1, calcArea, calcQ)
     3. Helpers UI         (OACI9137.k1Desc, fmtL, fmtCat)
     4. Self-test en consola al cargar

   MANTENIMIENTO:
     Si la OACI actualiza la norma → corregir SOLO este archivo.
     Ningún módulo HTML debe redefinir estas constantes.
═══════════════════════════════════════════════════════════════════════════ */

const OACI9137 = {

  /* ── §2.1.2 Tabla 2-1 ── Categoría ARFF por longitud y anchura ────────────
     col.2 = Lmax  →  límite superior EXCLUSIVO de longitud
     col.3 = Wf_max → anchura máxima del fuselaje para esa categoría

     REGLA §2.1.2 (dos pasos):
       1. Determinar cat. por longitud (col.2) — si L < Lmax → esa categoría.
       2. Si Wf > Wf_max de esa cat. (col.3) → elevar EXACTAMENTE una categoría.

     "exclusive" en la norma significa límite superior excluido:
       Cat 6 cubre [28 m, 39 m) → L=39 m ya es Cat 7.                      */
  CATEGORY_LIMITS: {
    1:  { Lmax: 9,        Wf_max: 2 },
    2:  { Lmax: 12,       Wf_max: 2 },
    3:  { Lmax: 18,       Wf_max: 3 },
    4:  { Lmax: 24,       Wf_max: 4 },
    5:  { Lmax: 28,       Wf_max: 4 },
    6:  { Lmax: 39,       Wf_max: 5 },
    7:  { Lmax: 49,       Wf_max: 5 },
    8:  { Lmax: 61,       Wf_max: 7 },
    9:  { Lmax: 76,       Wf_max: 7 },
    10: { Lmax: Infinity, Wf_max: 8 },
  },

  /* ── §2.4.5 ── k₁ (extensión lateral) por tramos de longitud L ────────────
     AT = L × (Wf + k₁)
     Tramos exactos de la tabla §2.4.5:
       L < 12 m        → k₁ = 12 m  (6 m por lado)
       12 ≤ L < 18 m   → k₁ = 14 m  (7 m por lado)
       18 ≤ L < 24 m   → k₁ = 17 m  (8.5 m por lado)
       L ≥ 24 m        → k₁ = 30 m  (15 m por lado)

     ⚠ El umbral crítico es L ≥ 24 m, NO L ≥ 28 m.
       ATR-72 (L=27.2m): L≥24 → k₁=30 m CORRECTO
       ATR-42 (L=22.7m): L<24 → k₁=17 m CORRECTO                          */
  FACTOR_K1: [
    { Lmax: 12,       k1: 12, lado:  6,   desc: 'L < 12 m'       },
    { Lmax: 18,       k1: 14, lado:  7,   desc: '12 ≤ L < 18 m'  },
    { Lmax: 24,       k1: 17, lado:  8.5, desc: '18 ≤ L < 24 m'  },
    { Lmax: Infinity, k1: 30, lado: 15,   desc: 'L ≥ 24 m'       },
  ],

  /* ── §2.4.10 ── k₂: Q₂ como fracción de Q₁ por categoría ──────────────────
     Q₂ = Q₁ × k₂
     ⚠ NUNCA usar un valor fijo (0.5 ó 1.0) para todas las categorías.     */
  Q2_PCT: {
    1: 0.00,   2: 0.27,   3: 0.30,   4: 0.58,   5: 0.75,
    6: 1.00,   7: 1.29,   8: 1.52,   9: 1.70,   10: 1.90,
  },

  /* ── §2.3.5 ── Tasas de aplicación por nivel de eficacia (L/min/m²) ────────
     PRINCIPIO CLAVE §2.3.5:
       A mayor eficacia de la espuma → MENOR tasa requerida.
       Nivel A (8.2): espuma proteínica — MENOR eficacia → MÁS agua
       Nivel B (5.5): AFFF 3% / AR-AFFF — eficacia MEDIA
       Nivel C (3.75): AFFF/FFFP — MAYOR eficacia → MENOS agua
     Ver ensayos de certificación: §8.1.5 Tabla 8-1.                       */
  RATES: {
    A: 8.2,    // L/min/m² — proteínica / fluoroproteínica convencional
    B: 5.5,    // L/min/m² — AFFF 3% / AR-AFFF
    C: 3.75,   // L/min/m² — AFFF/FFFP alta eficacia / AR-FFFP
  },

  /* ── §2.3.1 Tabla 2-3 col.8 ── Agente complementario PQS (kg) ─────────── */
  PQS_KG: {
    1: 45,  2: 90,  3: 135, 4: 135, 5: 180,
    6: 225, 7: 225, 8: 450, 9: 450, 10: 450,
  },

  /* ── §2.3.1 Tabla 2-3 Nivel B ── Agua y régimen de descarga ────────────────
     ⚠ SON DOS MAGNITUDES FÍSICAS DISTINTAS — nunca comparar una con la otra:

       volAgua (L)      → Q=Q₁+Q₂ mínimo en LITROS — columna "Agua"
                          comparar contra: inventario disponible en litros

       regimen (L/min)  → régimen de descarga — columna "Régimen"
                          = Q₁ para T=1 min de control (§2.5.1)
                          comparar contra: caudal de la flota en L/min       */
  TABLE_2_3_B: {
    1:  { volAgua:   230, regimen:   230 },
    2:  { volAgua:   670, regimen:   550 },
    3:  { volAgua:  1200, regimen:   900 },
    4:  { volAgua:  2400, regimen:  1800 },
    5:  { volAgua:  5400, regimen:  3000 },
    6:  { volAgua:  7900, regimen:  4000 },
    7:  { volAgua: 12100, regimen:  5300 },
    8:  { volAgua: 18200, regimen:  7200 },
    9:  { volAgua: 24300, regimen:  9000 },
    10: { volAgua: 32300, regimen: 11200 },
  },

  /* ── §2.2.5 Tabla 2-5 ── Número mínimo de vehículos RFF ────────────────── */
  MIN_VEHICLES: {
    1:1, 2:1, 3:1, 4:1, 5:1, 6:2, 7:2, 8:3, 9:3, 10:3,
  },

  /* ── §8.1.1 + §8.1.5 Tabla 8-1 ── Niveles de eficacia de espuma ────────── */
  EFF_INFO: {
    A: {
      rate:   8.2,
      agente: 'Espuma proteínica / fluoroproteínica convencional',
      cats:   'Aplicable Cat. 1–10 · mínimo normativo general',
      ensayo: 'Extingue 2.8 m² de keroseno en ≤ 60 s (Tabla 8-1)',
      nota:   'MAYOR consumo de agua por ser el agente de MENOR eficacia extintora por m². '
            + 'Mnemónica: "A de Agua" — necesita MÁS agua porque rinde MENOS.',
      ref:    'OACI Doc 9137 §2.3.5 · §8.1.1a · §8.1.5 Tabla 8-1',
    },
    B: {
      rate:   5.5,
      agente: 'AFFF al 3% / AR-AFFF (formadores de película acuosa)',
      cats:   'Cat. 4–9 · Estándar RAC 14',
      ensayo: 'Extingue 4.5 m² de keroseno en ≤ 60 s (Tabla 8-1)',
      nota:   'Eficacia intermedia. Forma película acuosa sobre el combustible '
            + 'que suprime vapores y reduce la reignición.',
      ref:    'OACI Doc 9137 §2.3.5 · §8.1.1b · §8.1.5 Tabla 8-1',
    },
    C: {
      rate:   3.75,
      agente: 'AFFF/FFFP alta eficacia / AR-FFFP / espumas sin flúor Nivel C',
      cats:   'Cat. 6–10 con agentes de alto rendimiento',
      ensayo: 'Extingue 7.32 m² de keroseno en ≤ 60 s (Tabla 8-1)',
      nota:   'MENOR consumo de agua por ser el agente de MAYOR eficacia extintora por m². '
            + 'Mnemónica: "C de Concentrado" — necesita MENOS agua porque rinde MÁS.',
      ref:    'OACI Doc 9137 §2.3.5 · §8.1.1d · §8.1.5 Tabla 8-1',
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   FUNCIONES PURAS
   Sin efectos secundarios. Sin DOM. Sin localStorage.
   Input → Output. Usables en cualquier módulo.
═══════════════════════════════════════════════════════════════════════════ */

/* detectCat(L, Wf) — §2.1.2 Tabla 2-1
   Devuelve categoría ARFF (número entero 1–10).
   L  : longitud total de la aeronave (m)
   Wf : anchura máxima del fuselaje (m) — opcional, si se omite solo se usa L */
OACI9137.detectCat = function(L, Wf) {
  if (!L || L <= 0) return null;

  // Paso 1: categoría por longitud — límites EXCLUSIVOS (col.2)
  let cat = 10;
  for (let c = 1; c <= 10; c++) {
    if (L < OACI9137.CATEGORY_LIMITS[c].Lmax) { cat = c; break; }
  }

  // Paso 2: elevar si Wf > Wf_max de la categoría obtenida (col.3) — §2.1.2
  if (Wf != null && !isNaN(Wf) && Wf > 0) {
    if (Wf > OACI9137.CATEGORY_LIMITS[cat].Wf_max && cat < 10) cat += 1;
  }

  return cat;
};

/* getK1(L) — §2.4.5
   Devuelve k₁ en metros: 12, 14, 17 ó 30.                                 */
OACI9137.getK1 = function(L) {
  for (const t of OACI9137.FACTOR_K1) {
    if (L < t.Lmax) return t.k1;
  }
  return 30;
};

/* calcArea(L, Wf) — §2.4.5 + §2.4.6
   Devuelve { AT (m²), Ap (m²), k1 (m) }                                   */
OACI9137.calcArea = function(L, Wf) {
  const k1 = OACI9137.getK1(L);
  const AT  = L * (Wf + k1);
  const Ap  = AT * (2 / 3);
  return { AT, Ap, k1 };
};

/* calcQ(Ap, nivel, cat) — §2.4.7 + §2.4.8 + §2.4.9 + §2.4.10
   Devuelve { Q1 (L), Q2 (L), Qt (L), rate (L/min/m²), k2 }

   NOTA SOBRE UNIDADES (§2.4.8 + §2.5.1):
     Q₁ = Ap × R × T  donde T = 1 min (tiempo de control)
     → Q₁ en LITROS = numéricamente igual a L/min porque T = 1
     → Como VOLUMEN (L):    agua necesaria para 1 min de control (§2.4.8)
     → Como CAUDAL (L/min): régimen de descarga mínimo exigido (§2.5.1)
     Ambos usos son válidos con el mismo número — las unidades dependen
     de qué se está comparando.                                              */
OACI9137.calcQ = function(Ap, nivel, cat) {
  if (!Ap || Ap <= 0) return { Q1: 0, Q2: 0, Qt: 0, rate: 0, k2: 0 };
  const rate = OACI9137.RATES[nivel]  ?? OACI9137.RATES['B'];
  const k2   = OACI9137.Q2_PCT[cat]   ?? 0;
  const Q1   = Ap * rate;
  const Q2   = Q1 * k2;
  const Qt   = Q1 + Q2;
  return { Q1, Q2, Qt, rate, k2 };
};

/* k1Desc(L) — texto descriptivo del tramo para badges de UI
   Ej: OACI9137.k1Desc(22) → "18 ≤ L < 24 m — K = 17 m (8.5 m por lado)" */
OACI9137.k1Desc = function(L) {
  for (const t of OACI9137.FACTOR_K1) {
    if (L < t.Lmax)
      return `${t.desc} — K = ${t.k1} m (${t.lado} m por lado) · §2.4.5`;
  }
  return `L ≥ 24 m — K = 30 m (15 m por lado) · §2.4.5`;
};

/* fmtL(n, decimals) — litros con separador es-CO
   Ej: OACI9137.fmtL(7844.3) → "7.844 L"                                   */
OACI9137.fmtL = function(n, decimals) {
  if (n == null || isNaN(n)) return '— L';
  return n.toLocaleString('es-CO', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 1,
  }) + ' L';
};

/* fmtCat(cat) — Ej: OACI9137.fmtCat(6) → "Cat. 6"                        */
OACI9137.fmtCat = function(cat) { return cat ? `Cat. ${cat}` : '—'; };

/* ═══════════════════════════════════════════════════════════════════════════
   SELF-TEST — se ejecuta al cargar, resultado en la consola del navegador.
   Si hay fallos: revisar las tablas o los tests antes de modificar el código.
═══════════════════════════════════════════════════════════════════════════ */
(function _selfTest() {
  const pass = [], fail = [];
  const t = (label, got, exp) =>
    (got === exp ? pass : fail).push({ label, got, exp });
  const near = (label, got, exp, tol) =>
    (Math.abs(got - exp) <= tol ? pass : fail).push({ label, got, exp });

  // §2.1.2 — detectCat: solo longitud
  t('Cat1 L=5m',            OACI9137.detectCat(5),    1);
  t('Cat2 L=9m (límite)',   OACI9137.detectCat(9),    2);  // 9 < Lmax[2]=12 → Cat2
  t('Cat5 L=28m (límite)',  OACI9137.detectCat(28),   6);  // 28 < Lmax[6]=39 → Cat6
  t('Cat6 L=38.9m',         OACI9137.detectCat(38.9), 6);
  t('Cat7 L=39m (exclusivo)',OACI9137.detectCat(39),  7);  // 39 no < 39 → Cat7
  t('Cat7 L=39.5m (B737-800)',OACI9137.detectCat(39.5),7);
  t('Cat9 L=75m',           OACI9137.detectCat(75),   9);
  t('Cat10 L=76m (límite)', OACI9137.detectCat(76),   10); // 76 no < 76 → Cat10
  t('Cat10 L=90m (A380+)',  OACI9137.detectCat(90),   10);

  // §2.1.2 — detectCat: elevación por Wf
  t('A380: L=72.7→Cat9, Wf=7.1>7→Cat10', OACI9137.detectCat(72.7, 7.1), 10);
  t('B747-8: L=76.3→Cat10, Wf=6.5≤8→Cat10', OACI9137.detectCat(76.3, 6.5), 10);
  t('B737: L=38.9→Cat6, Wf=3.76≤5→Cat6', OACI9137.detectCat(38.9, 3.76), 6);
  t('Cat9 sin elevación (Wf=6.3≤7)', OACI9137.detectCat(75, 6.3), 9);
  t('Cat9 con elevación (Wf=7.1>7→Cat10)', OACI9137.detectCat(75, 7.1), 10);

  // §2.4.5 — getK1: 4 tramos con límites exactos
  t('k1 L=8→12',    OACI9137.getK1(8),    12);
  t('k1 L=11.9→12', OACI9137.getK1(11.9), 12);
  t('k1 L=12→14',   OACI9137.getK1(12),   14);  // 12 ≥ Lmax[0]=12 → siguiente tramo
  t('k1 L=15→14',   OACI9137.getK1(15),   14);
  t('k1 L=17.9→14', OACI9137.getK1(17.9), 14);
  t('k1 L=18→17',   OACI9137.getK1(18),   17);
  t('k1 L=22.7→17', OACI9137.getK1(22.7), 17);  // ATR-42
  t('k1 L=23.9→17', OACI9137.getK1(23.9), 17);
  t('k1 L=24→30',   OACI9137.getK1(24),   30);  // umbral crítico §2.4.5
  t('k1 L=27.2→30', OACI9137.getK1(27.2), 30);  // ATR-72 — L≥24 → k1=30
  t('k1 L=39→30',   OACI9137.getK1(39),   30);
  t('k1 L=76→30',   OACI9137.getK1(76),   30);

  // §2.4.5 + §2.4.6 — calcArea
  near('AT B737 L=39,Wf=3.76', OACI9137.calcArea(38.9, 3.76).AT, 1282.9,  1);
  near('AT B737-800 L=39.5,Wf=3.76', OACI9137.calcArea(39.5,3.76).AT, 1314.1, 1);
  t   ('k1 L=39→30',  OACI9137.calcArea(39.5, 3.76).k1, 30);
  near('Ap = 2/3 AT', OACI9137.calcArea(39.5, 3.76).Ap,
       OACI9137.calcArea(39.5, 3.76).AT * 2/3, 0.01);

  // §2.4.7/2.4.8/2.4.10 — calcQ
  t('k2 Cat1=0',   OACI9137.calcQ(100,'B',1).k2,  0.00);
  t('k2 Cat6=1.0', OACI9137.calcQ(100,'B',6).k2,  1.00);
  t('k2 Cat10=1.9',OACI9137.calcQ(100,'B',10).k2, 1.90);
  near('Q1 = Ap×R', OACI9137.calcQ(877.7,'B',6).Q1, 877.7*5.5, 0.5);
  near('Q2 Cat6 = Q1×1.0', OACI9137.calcQ(877.7,'B',6).Q2,
       877.7*5.5*1.0, 0.5);
  near('Qt Cat6 = Q1+Q2',  OACI9137.calcQ(877.7,'B',6).Qt,
       877.7*5.5*2.0, 1);
  near('Qt Cat10 = Q1×2.9',OACI9137.calcQ(100,'B',10).Qt, 100*5.5*2.9, 0.5);

  // §2.3.1 Tabla 2-3 — volAgua vs regimen (unidades distintas)
  t('Cat1 volAgua=230',   OACI9137.TABLE_2_3_B[1].volAgua,  230);
  t('Cat1 regimen=230',   OACI9137.TABLE_2_3_B[1].regimen,  230);
  t('Cat6 volAgua=7900',  OACI9137.TABLE_2_3_B[6].volAgua,  7900);
  t('Cat6 regimen=4000',  OACI9137.TABLE_2_3_B[6].regimen,  4000);
  t('Cat10 volAgua=32300',OACI9137.TABLE_2_3_B[10].volAgua, 32300);
  t('Cat10 regimen=11200',OACI9137.TABLE_2_3_B[10].regimen, 11200);

  // §2.3.1 Tabla 2-3 col.8 — PQS
  t('PQS Cat1=45',  OACI9137.PQS_KG[1],  45);
  t('PQS Cat6=225', OACI9137.PQS_KG[6],  225);
  t('PQS Cat10=450',OACI9137.PQS_KG[10], 450);

  // Output
  const total = pass.length + fail.length;
  if (fail.length === 0) {
    console.info(
      `%c✅ oaci-9137.js — ${total}/${total} tests OK`,
      'color:#69db7c;font-weight:700;font-size:13px'
    );
  } else {
    console.warn(
      `%c⚠ oaci-9137.js — ${fail.length} FALLO(S) de ${total}`,
      'color:#ff6b6b;font-weight:700;font-size:13px'
    );
    fail.forEach(f =>
      console.error(`  ✗ ${f.label} → got=${f.got}  expected=${f.exp}`)
    );
  }
})();
