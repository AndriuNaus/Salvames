// Constantes y utilidades compartidas por todas las pantallas.

// Claves de almacenamiento local (los datos se guardan en el teléfono).
export const STORAGE_SUELDO = '@mi-app-gastos/sueldo';
export const STORAGE_GASTOS = '@mi-app-gastos/gastos';
export const STORAGE_REPETIR_MES = '@mi-app-gastos/repetir-mes';
export const STORAGE_MES_INGRESO = '@mi-app-gastos/mes-ingreso';
export const STORAGE_HISTORIAL_INGRESOS = '@mi-app-gastos/historial-ingresos';
export const STORAGE_TEMA = '@mi-app-gastos/tema';
export const STORAGE_EXTRAS = '@mi-app-gastos/extras';
export const STORAGE_PORCENTAJES = '@mi-app-gastos/porcentajes';
export const STORAGE_TOPES = '@mi-app-gastos/topes';
export const STORAGE_META = '@mi-app-gastos/meta';
export const STORAGE_FIJOS = '@mi-app-gastos/fijos';
export const STORAGE_NOTIF = '@mi-app-gastos/notif';
export const STORAGE_BLOQUEO = '@mi-app-gastos/bloqueo';
export const STORAGE_MONEDA = '@mi-app-gastos/moneda';

// Clasificación profesional del presupuesto: gastos fijos, gastos variables,
// ahorro e inversión, y pago de deudas. Cada una trae su porcentaje sugerido
// del ingreso y una descripción para que siempre quede claro qué incluye.
export const CATEGORIAS = {
  fijos: {
    etiqueta: 'Fijos',
    descripcion: 'Pagos obligatorios que se repiten cada mes: renta, servicios, transporte, educación.',
    color: '#2563EB',
    porcentaje: 0.5,
  },
  variables: {
    etiqueta: 'Variables',
    descripcion: 'Gastos necesarios que cambian de monto: comida, salud, gasolina, ropa.',
    color: '#F97316',
    porcentaje: 0.3,
  },
  ahorro: {
    etiqueta: 'Ahorro',
    descripcion: 'Dinero para tu futuro: ahorro e inversión. Págate a ti primero.',
    color: '#16A34A',
    porcentaje: 0.1,
  },
  deudas: {
    etiqueta: 'Deudas',
    descripcion: 'Pagos para salir de deudas: tarjetas, préstamos y créditos.',
    color: '#9333EA',
    porcentaje: 0.1,
  },
  // Categoría especial y NO repartible: se usa cuando se carga el total de un mes
  // pasado sin detalle. Suma al total y al balance, pero no participa del reparto
  // 50/30/10/10 ni de los topes (por eso no está en ORDEN_CATEGORIAS).
  sinDetalle: {
    etiqueta: 'Sin detalle',
    descripcion: 'Total de un mes pasado cargado sin separar por categoría.',
    color: '#6B7280',
    porcentaje: 0,
  },
};

export const ORDEN_CATEGORIAS = ['fijos', 'variables', 'ahorro', 'deudas'];
// Clave de la categoría especial para totales sin detalle.
export const SIN_DETALLE = 'sinDetalle';

// Migración de la clasificación anterior (necesidad/deseo/ahorro) a la actual.
export const MIGRAR_CATEGORIA = { necesidad: 'fijos', deseo: 'variables', ahorro: 'ahorro' };
export const migrarCategoria = (cat) => MIGRAR_CATEGORIA[cat] ?? (CATEGORIAS[cat] ? cat : 'variables');

// Tipos de gasto más comunes. Son el detalle dentro de cada categoría del reparto.
export const SUBTIPOS = [
  'Comida',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Ropa',
  'Mascotas',
  'Viajes',
  'Regalos',
  'Otro',
];

// Degradados e iconos para las tarjetas modernas de categorías.
export const DEGRADADOS = {
  fijos: ['#3B82F6', '#1D4ED8'],
  variables: ['#FB923C', '#EA580C'],
  ahorro: ['#22C55E', '#15803D'],
  deudas: ['#A855F7', '#7E22CE'],
  sinDetalle: ['#9CA3AF', '#6B7280'],
};

export const ICONOS_CATEGORIA = {
  fijos: 'home',
  variables: 'cart',
  ahorro: 'wallet',
  deudas: 'card',
  sinDetalle: 'ellipsis-horizontal',
};
// Iconos (Ionicons) por tipo de gasto. Se usan en chips e historial, sin emojis.
export const ICONOS_SUBTIPO = {
  Comida: 'fast-food',
  Transporte: 'car',
  Vivienda: 'home',
  Servicios: 'bulb',
  Salud: 'heart',
  Educación: 'book',
  Entretenimiento: 'game-controller',
  Ropa: 'shirt',
  Mascotas: 'paw',
  Viajes: 'airplane',
  Regalos: 'gift',
  Otro: 'pricetag',
  General: 'list',
};

// Horas disponibles para el recordatorio diario.
export const HORAS_NOTIF = ['09:00', '13:00', '20:00'];

// Etiqueta visible del tipo de gasto (soporta gastos viejos sin subtipo).
export const etiquetaSubtipo = (gasto) => {
  if (!gasto || !gasto.subtipo) return 'General';
  if (gasto.subtipo === 'Otro') return gasto.subtipoLibre?.trim() || 'Otro';
  return gasto.subtipo;
};

// Monedas disponibles (símbolo + nombre) para el selector de ajustes.
export const MONEDAS = [
  { simbolo: '$', nombre: 'Peso / Dólar ($)' },
  { simbolo: 'Mex$', nombre: 'Peso mexicano (Mex$)' },
  { simbolo: '€', nombre: 'Euro (€)' },
  { simbolo: 'Q', nombre: 'Quetzal (Q)' },
  { simbolo: 'S/', nombre: 'Sol (S/)' },
  { simbolo: 'Bs', nombre: 'Bolívar (Bs)' },
  { simbolo: 'RD$', nombre: 'Peso dominicano (RD$)' },
  { simbolo: '₡', nombre: 'Colón (₡)' },
  { simbolo: '₲', nombre: 'Guaraní (₲)' },
];
export const MONEDA_POR_DEFECTO = '$';

// El símbolo activo vive a nivel de módulo porque `formatoMoneda` se usa en
// muchas pantallas y no conviene pasarlo a mano en cada una. El proveedor lo
// actualiza al cargar o cambiar la moneda; como ese cambio re-renderiza toda la
// app, los montos se refrescan solos.
let simboloMoneda = MONEDA_POR_DEFECTO;
export const definirSimboloMoneda = (simbolo) => {
  simboloMoneda = simbolo || MONEDA_POR_DEFECTO;
};
export const obtenerSimboloMoneda = () => simboloMoneda;

// Formatea un número como moneda con separador de miles.
export const formatoMoneda = (valor) => {
  const numero = Number(valor) || 0;
  const [entero, decimales] = numero.toFixed(2).split('.');
  return simboloMoneda + entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + decimales;
};

// Convierte el texto del input a número (acepta coma o punto decimal).
export const aNumero = (texto) => {
  if (typeof texto !== 'string') return Number(texto) || 0;
  const limpio = texto.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(limpio) || 0;
};

// Devuelve "2026-10" para el mes actual. Sirve para saber de qué mes es el ingreso guardado.
export const claveMesActual = () => {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}`;
};

// Etiqueta legible del mes actual, ej. "octubre de 2026".
export const etiquetaMesActual = () => {
  try {
    return new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' });
  } catch {
    return claveMesActual();
  }
};

// Etiqueta legible de una clave "2026-10" -> "octubre de 2026".
export const etiquetaDeClaveMes = (clave) => {
  if (!clave) return '';
  const [anio, mes] = clave.split('-').map(Number);
  if (!anio || !mes) return clave;
  try {
    return new Date(anio, mes - 1, 1).toLocaleDateString('es', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return clave;
  }
};

// Fecha corta para el historial, ej. "14 oct". Si el locale falla, usa "14/10/26".
export const formatoFechaCorta = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  } catch {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${String(d.getFullYear()).slice(2)}`;
  }
};

// Generador de IDs únicos para gastos, fijos, extras e historial.
let contadorIds = 0;
export const nuevoId = (prefijo = '') => {
  contadorIds += 1;
  return `${prefijo}${Date.now().toString(36)}-${contadorIds}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};
// Clave "2026-10" a partir de una fecha ISO o Date.
export const claveMesDesdeFecha = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return claveMesActual();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}`;
};

// Fecha ISO dentro de una clave de mes "2026-07". Usa el día de hoy si cabe en
// ese mes; si no, el último día. Sirve para registrar gastos de meses pasados.
export const fechaEnMes = (clave) => {
  const [anio, mes] = String(clave || '').split('-').map(Number);
  if (!anio || !mes) return new Date().toISOString();
  const hoy = new Date();
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const dia = Math.min(hoy.getDate(), ultimoDia);
  return new Date(anio, mes - 1, dia, 12, 0, 0).toISOString();
};

// Ingreso de un mes cualquiera. Para el mes en curso manda el ingreso vivo
// (base + extras); para meses pasados, lo registrado en el historial. Si el mes
// actual no tiene base, cae a lo que haya en el historial.
export const ingresoDeMes = (mes, mesActual, totalIngreso, historial) => {
  const registro = (historial || []).find((h) => h.mes === mes);
  const registrado = registro ? Number(registro.monto) || 0 : 0;
  if (mes === mesActual) return totalIngreso > 0 ? totalIngreso : registrado;
  return registrado;
};

// Últimos N meses como claves ["2026-10", ...], del más antiguo al actual.
export const ultimosMeses = (n) => {
  const lista = [];
  const ahora = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    lista.push(`${d.getFullYear()}-${mes}`);
  }
  return lista;
};
// Paletas claro / oscuro.
export const TEMAS = {
  claro: {
    nombre: 'claro',
    fondo: '#F3F4F6',
    tarjeta: '#FFFFFF',
    texto: '#111827',
    textoSec: '#6B7280',
    textoTenue: '#9CA3AF',
    borde: '#E5E7EB',
    inputFondo: '#F9FAFB',
    inputBorde: '#D1D5DB',
    primario: '#2563EB',
    primarioSuave: '#EFF6FF',
    peligro: '#DC2626',
    peligroSuave: '#FEE2E2',
    peligroTexto: '#B91C1C',
    chipFondo: '#F9FAFB',
    graficoVacio: '#E5E7EB',
    tabFondo: '#FFFFFF',
    tabBorde: '#E5E7EB',
    barra: 'dark',
  },
  oscuro: {
    nombre: 'oscuro',
    fondo: '#0F172A',
    tarjeta: '#1E293B',
    texto: '#F8FAFC',
    textoSec: '#94A3B8',
    textoTenue: '#64748B',
    borde: '#334155',
    inputFondo: '#0F172A',
    inputBorde: '#475569',
    primario: '#60A5FA',
    primarioSuave: '#1E3A5F',
    peligro: '#F87171',
    peligroSuave: '#450A0A',
    peligroTexto: '#FCA5A5',
    chipFondo: '#0F172A',
    graficoVacio: '#334155',
    tabFondo: '#1E293B',
    tabBorde: '#334155',
    barra: 'light',
  },
};
