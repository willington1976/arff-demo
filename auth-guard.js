/**
 * auth-guard.js — Sistema SEI · UAEAC Colombia
 * Guardia de autenticacion compartida para todas las paginas internas.
 *
 * USO: Incluir DESPUES de supabase-config.js, ANTES del script de la pagina.
 *   <script src="supabase-config.js"></script>
 *   <script src="auth-guard.js"></script>
 *
 * Expone globalmente:
 *   window.SEI_USER      -> objeto user de Supabase Auth
 *   window.SEI_ROL       -> 'admin' | 'jefe_nacional' | 'comandante'
 *   window.SEI_NOMBRE    -> nombre completo del usuario
 *   window.SEI_ESTACION  -> codigo OACI asignado (ej: 'SKBO') - solo comandantes, null para jefe/admin
 *   window.seiLogout()   -> cierra sesion y redirige a index.html
 *   window.onSEIReady(user, rol, nombre, estacion) -> callback de la pagina
 */

(async function () {

  /* Paginas exclusivas por rol */
  const ROL_REQUERIDO = {
    'sei_dashboard_nacional.html': ['admin', 'jefe_nacional'],
    // gestion_flota_sei.html: accesible para TODOS los roles autenticados
  };

  /* Labels de rol */
  window.ROL_LABELS = {
    admin:         { label: 'Administrador',  emoji: '🛡️', color: '#f59f00', bg: 'rgba(245,159,0,.1)',   border: 'rgba(245,159,0,.3)'  },
    jefe_nacional: { label: 'Jefe Nacional',  emoji: '🎖️', color: '#f59f00', bg: 'rgba(245,159,0,.1)',   border: 'rgba(245,159,0,.3)'  },
    comandante:    { label: 'Comandante SEI', emoji: '🚒', color: '#0bc5a0', bg: 'rgba(11,197,160,.1)', border: 'rgba(11,197,160,.3)' },
  };

  const paginaActual = window.location.pathname.split('/').pop() || 'index.html';

  /* 1. Verificar sesion activa */
  let user = null;
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data.user) throw new Error('Sin sesion');
    user = data.user;
  } catch {
    sessionStorage.removeItem('sei_rol');
    sessionStorage.removeItem('sei_nombre');
    sessionStorage.removeItem('sei_estacion');
    window.location.href = 'index.html';
    return;
  }

  /* 2. Obtener rol + estacion (cache en sessionStorage) */
  let rol      = sessionStorage.getItem('sei_rol');
  let nombre   = sessionStorage.getItem('sei_nombre');
  let estacion = sessionStorage.getItem('sei_estacion');

  if (!rol) {
    try {
      const { data: perfil, error: perfilError } = await supabaseClient
        .from('perfiles_usuarios')
        .select('rol, nombre_completo, estacion_id')
        .eq('user_id', user.id)
        .single();

      if (perfilError || !perfil) throw new Error('Sin perfil');

      rol      = perfil.rol;
      nombre   = perfil.nombre_completo || user.email;
      estacion = perfil.estacion_id || null;

      sessionStorage.setItem('sei_rol',    rol);
      sessionStorage.setItem('sei_nombre', nombre);
      if (estacion) sessionStorage.setItem('sei_estacion', estacion);

    } catch {
      rol      = 'comandante';
      nombre   = user.email;
      estacion = null;
    }
  }

  /* 3. Verificar permiso de rol para esta pagina */
  const rolesPermitidos = ROL_REQUERIDO[paginaActual];
  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    window.location.href = 'dashboard_principal.html';
    return;
  }

  /* 4. Exponer globalmente */
  window.SEI_USER     = user;
  window.SEI_ROL      = rol;
  window.SEI_NOMBRE   = nombre || user.email;
  window.SEI_ESTACION = estacion;

  /* 5. Cierre de sesion global */
  window.seiLogout = async function () {
    sessionStorage.removeItem('sei_rol');
    sessionStorage.removeItem('sei_nombre');
    sessionStorage.removeItem('sei_estacion');
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  };

  /* 6. Callback de la pagina */
  if (typeof window.onSEIReady === 'function') {
    window.onSEIReady(user, rol, window.SEI_NOMBRE, window.SEI_ESTACION);
  }

})();
