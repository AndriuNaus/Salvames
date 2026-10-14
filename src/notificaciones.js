// Envoltura de expo-notifications con import dinámico: en Expo Go el módulo no
// está incluido para push y un import estático rompería la pantalla. Devuelve
// null cuando no hay soporte, para poder degradar con un aviso al usuario.

export const cargarNotificaciones = async () => {
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    return Notifications;
  } catch {
    return null;
  }
};

const partesHora = (hora) => {
  const [h, m] = String(hora || '20:00').split(':').map(Number);
  return {
    h: Number.isFinite(h) ? h : 20,
    m: Number.isFinite(m) ? m : 0,
  };
};

// Programa el recordatorio diario y el de gastos fijos (mensual). Cancela lo
// programado antes para no acumular avisos. Devuelve false si no hay soporte.
export const programarRecordatorios = async ({ diario, fijos } = {}) => {
  const Notifications = await cargarNotificaciones();
  if (!Notifications) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (diario?.activado) {
    const { h, m } = partesHora(diario.hora);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Registra tus gastos',
        body: 'Tómate un minuto para anotar los gastos de hoy.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }

  if (fijos?.activado) {
    const { h, m } = partesHora(fijos.hora);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Gastos fijos del mes',
        body: '¿Ya registraste tus gastos fijos? Revísalos en la app.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: Number(fijos.dia) || 1,
        hour: h,
        minute: m,
      },
    });
  }

  return true;
};

// Cancela todo lo programado (sin importar si el módulo existe).
export const cancelarRecordatorios = async () => {
  const Notifications = await cargarNotificaciones();
  try {
    await Notifications?.cancelAllScheduledNotificationsAsync();
  } catch {
    // No había nada programado.
  }
};

// Aviso inmediato (alertas de presupuesto). Devuelve false si no hay soporte o
// permisos, para que la pantalla muestre la alerta dentro de la app.
export const avisarPresupuesto = async (titulo, cuerpo) => {
  const Notifications = await cargarNotificaciones();
  if (!Notifications) return false;
  try {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
};
