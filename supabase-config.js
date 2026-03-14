/**
 * supabase-config.js — Sistema SEI · UAEAC Colombia
 * ─────────────────────────────────────────────────────────────
 * ORDEN DE CARGA en cada pagina interna:
 *   1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. <script src="supabase-config.js"></script>
 *   3. <script src="auth-guard.js"></script>
 *
 * ESTRUCTURA REAL DE perfiles_usuarios:
 *   user_id         uuid  NOT NULL  (user_id de Supabase Auth)
 *   email           text  NOT NULL
 *   rol             text  NULL      ('admin','jefe_nacional','comandante')
 *   estacion_id     uuid  NULL      (UUID de estaciones_sei — NO codigo OACI)
 *   nombre_completo text  NULL      (agregado via ALTER TABLE)
 *
 * UUIDS CONFIRMADOS:
 *   Tu user_id  (admin)        : c2557ab1-b6ed-4056-8656-26c60fd0366f
 *   Estacion Yopal en BD       : e235151b-0df4-44f4-8201-dcf6d63da5c4 → 'SKYP'
 */

/* ── Credenciales ────────────────────────────────────────────── */
const SUPABASE_URL = 'https://mctrdchacgwtqimsdpvn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jdHJkY2hhY2d3dHFpbXNkcHZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjY4MDYsImV4cCI6MjA4ODU0MjgwNn0.RypOxjmrjrGXMM2ujRAwxanAkOKLzH4qZEKE4IQTFsQ';

/* ── Cliente global ──────────────────────────────────────────── */
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  }
});
window.supabaseClient = supabaseClient;

/* ── Mapa UUID de estacion → codigo OACI ────────────────────────
 * IMPORTANTE: estacion_id en perfiles_usuarios es de tipo UUID.
 * Este mapa es OBLIGATORIO para que auth-guard pueda convertir
 * el UUID al codigo OACI que usa maquinas_sei.aeropuerto_id.
 *
 * Para completarlo: SELECT id, oaci FROM estaciones_sei ORDER BY oaci;
 * y agrega una linea por cada estacion.
 * ─────────────────────────────────────────────────────────────── */
window.SEI_ESTACIONES_OACI = {
  'e235151b-0df4-44f4-8201-dcf6d63da5c4': 'SKYP',  /* Yopal — El Alcaravan    */
  /* Agrega las 37 estaciones restantes aqui                                    */
};

/* ── seiUuidToOaci(uuid) ─────────────────────────────────────────
 * Convierte UUID de estaciones_sei → codigo OACI.
 * Usado por auth-guard.js y arff_volumen_espuma.html.
 * Si el UUID no esta en el mapa devuelve el valor original
 * para no romper el flujo mientras se completa el mapa.
 * ─────────────────────────────────────────────────────────────── */
window.seiUuidToOaci = function(uuid) {
  if (!uuid) return null;
  return window.SEI_ESTACIONES_OACI[uuid] || uuid;
};
