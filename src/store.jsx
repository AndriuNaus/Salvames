import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_BLOQUEO,
  STORAGE_EXTRAS,
  STORAGE_FIJOS,
  STORAGE_GASTOS,
  STORAGE_HISTORIAL_INGRESOS,
  STORAGE_MES_INGRESO,
  STORAGE_META,
  STORAGE_MONEDA,
  STORAGE_NOTIF,
  STORAGE_PORCENTAJES,
  STORAGE_REPETIR_MES,
  STORAGE_SUELDO,
  STORAGE_TEMA,
  STORAGE_TOPES,
  MONEDA_POR_DEFECTO,
  TEMAS,
  aNumero,
  claveMesActual,
  definirSimboloMoneda,
  migrarCategoria,
} from './constants';

const FinanzasContext = createContext(null);

const PORCENTAJES_BASE = { fijos: 0.5, variables: 0.3, ahorro: 0.1, deudas: 0.1 };

// Ajustes de notificaciones: recordatorio diario, recordatorio mensual de gastos
// fijos y alertas de presupuesto como notificación (no solo dentro de la app).
const NOTIF_BASE = {
  activado: false,
  hora: '20:00',
  fijosActivado: false,
  fijosDia: 1,
  fijosHora: '20:00',
  alertas: true,
};

const porcentajesValidos = (p) => {
  if (!p || typeof p !== 'object') return false;
  const vals = ['fijos', 'variables', 'ahorro', 'deudas'].map((k) => Number(p[k]));
  if (vals.some((v) => !(v > 0) || v >= 1)) return false;
  return Math.abs(vals[0] + vals[1] + vals[2] - 1) < 0.001;
};

export function FinanzasProvider({ children }) {
  const [tema, setTema] = useState('claro');
  const [sueldoTexto, setSueldoTexto] = useState('');
  const [sueldo, setSueldo] = useState(0);
  const [extras, setExtras] = useState([]);
  const [repetirCadaMes, setRepetirCadaMes] = useState(true);
  const [mesIngreso, setMesIngreso] = useState('');
  const [historialIngresos, setHistorialIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [porcentajes, setPorcentajes] = useState(PORCENTAJES_BASE);
  const [topes, setTopes] = useState({});
  const [metaAhorro, setMetaAhorro] = useState(0);
  const [fijos, setFijos] = useState([]);
  const [moneda, setMoneda] = useState(MONEDA_POR_DEFECTO);
  const [notif, setNotif] = useState(NOTIF_BASE);
  const [bloqueo, setBloqueo] = useState(false);
  // Navegación por páginas (no se persiste) y gasto en edición.
  const [pagina, setPagina] = useState(0);
  const [gastoEnEdicion, setGastoEnEdicion] = useState(null);
  const [cargado, setCargado] = useState(false);

  // Carga inicial de todo lo guardado.
  useEffect(() => {
    (async () => {
      try {
        const [
          temaGuardado,
          sueldoGuardado,
          extrasGuardados,
          gastosGuardados,
          repetirGuardado,
          mesGuardado,
          historialGuardado,
          porcentajesGuardados,
          topesGuardados,
          metaGuardada,
          fijosGuardados,
          notifGuardada,
          bloqueoGuardado,
          monedaGuardada,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TEMA),
          AsyncStorage.getItem(STORAGE_SUELDO),
          AsyncStorage.getItem(STORAGE_EXTRAS),
          AsyncStorage.getItem(STORAGE_GASTOS),
          AsyncStorage.getItem(STORAGE_REPETIR_MES),
          AsyncStorage.getItem(STORAGE_MES_INGRESO),
          AsyncStorage.getItem(STORAGE_HISTORIAL_INGRESOS),
          AsyncStorage.getItem(STORAGE_PORCENTAJES),
          AsyncStorage.getItem(STORAGE_TOPES),
          AsyncStorage.getItem(STORAGE_META),
          AsyncStorage.getItem(STORAGE_FIJOS),
          AsyncStorage.getItem(STORAGE_NOTIF),
          AsyncStorage.getItem(STORAGE_BLOQUEO),
          AsyncStorage.getItem(STORAGE_MONEDA),
        ]);
        if (temaGuardado === 'oscuro' || temaGuardado === 'claro') setTema(temaGuardado);
        if (monedaGuardada) setMoneda(monedaGuardada);

        const repetir = repetirGuardado === null ? true : repetirGuardado === '1';
        const mesActual = claveMesActual();
        setRepetirCadaMes(repetir);
        if (historialGuardado) setHistorialIngresos(JSON.parse(historialGuardado));
        if (topesGuardados) setTopes(JSON.parse(topesGuardados));
        if (metaGuardada) setMetaAhorro(Number(metaGuardada) || 0);
        if (notifGuardada) {
          const n = JSON.parse(notifGuardada);
          if (n && typeof n === 'object') setNotif((previo) => ({ ...previo, ...n }));
        }
        if (bloqueoGuardado !== null) setBloqueo(bloqueoGuardado === '1');
        if (porcentajesGuardados) {
          const p = JSON.parse(porcentajesGuardados);
          if (porcentajesValidos(p)) setPorcentajes(p);
        }

        // Ingreso base + extras con control de mes.
        const valorGuardado = Number(sueldoGuardado) || 0;
        const mesCambiado = mesGuardado && mesGuardado !== mesActual;
        if (valorGuardado > 0) {
          if (mesCambiado && !repetir) {
            // Era de un mes anterior y no se repite: pedir el nuevo ingreso.
            await AsyncStorage.multiRemove([STORAGE_SUELDO, STORAGE_MES_INGRESO, STORAGE_EXTRAS]);
            setSueldo(0);
            setSueldoTexto('');
            setMesIngreso('');
            setExtras([]);
          } else {
            const mesFinal = mesGuardado || mesActual;
            setSueldo(valorGuardado);
            setSueldoTexto(String(valorGuardado));
            setMesIngreso(mesFinal);
            if (extrasGuardados) setExtras(JSON.parse(extrasGuardados));
            if (!mesGuardado) {
              await AsyncStorage.setItem(STORAGE_MES_INGRESO, mesFinal);
            }
          }
        } else {
          if (extrasGuardados && !(mesCambiado && !repetir)) setExtras(JSON.parse(extrasGuardados));
          if (mesGuardado) setMesIngreso(mesGuardado);
        }

        // Gastos + aplicación automática de gastos fijos del mes.
        // Migra la clasificación anterior a la actual (fijos/variables/ahorro/deudas).
        let listaGastos = gastosGuardados ? JSON.parse(gastosGuardados) : [];
        listaGastos = listaGastos.map((g) => ({ ...g, categoria: migrarCategoria(g.categoria) }));
        let listaFijos = fijosGuardados ? JSON.parse(fijosGuardados) : [];
        listaFijos = listaFijos.map((f) => ({ ...f, categoria: migrarCategoria(f.categoria) }));
        if (listaFijos.length > 0) {
          const nuevos = [];
          const ahora = new Date().toISOString();
          listaFijos = listaFijos.map((f) => {
            if (f.ultimoMes !== mesActual) {
              nuevos.push({
                id: `fijo-${mesActual}-` + f.id,
                descripcion: f.descripcion,
                monto: f.monto,
                categoria: f.categoria,
                subtipo: f.subtipo || 'Otro',
                subtipoLibre: f.subtipoLibre || '',
                fecha: ahora,
                foto: null,
                fijoId: f.id,
              });
              return { ...f, ultimoMes: mesActual };
            }
            return f;
          });
          if (nuevos.length > 0) {
            const ids = new Set(listaGastos.map((g) => g.id));
            listaGastos = [...nuevos.filter((g) => !ids.has(g.id)), ...listaGastos];
            await AsyncStorage.setItem(STORAGE_FIJOS, JSON.stringify(listaFijos));
          }
        }
        setGastos(listaGastos);
        setFijos(listaFijos);
      } catch {
        // Si falla la lectura, seguimos con la app vacía.
      } finally {
        setCargado(true);
      }
    })();
  }, []);

  // Persistencia.
  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_GASTOS, JSON.stringify(gastos)).catch(() => {});
    }
  }, [gastos, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_HISTORIAL_INGRESOS, JSON.stringify(historialIngresos)).catch(
        () => {}
      );
    }
  }, [historialIngresos, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_EXTRAS, JSON.stringify(extras)).catch(() => {});
    }
  }, [extras, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_PORCENTAJES, JSON.stringify(porcentajes)).catch(() => {});
    }
  }, [porcentajes, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_TOPES, JSON.stringify(topes)).catch(() => {});
    }
  }, [topes, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_META, String(metaAhorro)).catch(() => {});
    }
  }, [metaAhorro, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_FIJOS, JSON.stringify(fijos)).catch(() => {});
    }
  }, [fijos, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_NOTIF, JSON.stringify(notif)).catch(() => {});
    }
  }, [notif, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_BLOQUEO, bloqueo ? '1' : '0').catch(() => {});
    }
  }, [bloqueo, cargado]);

  useEffect(() => {
    if (cargado) {
      AsyncStorage.setItem(STORAGE_MONEDA, moneda).catch(() => {});
    }
  }, [moneda, cargado]);

  const alternarTema = useCallback(() => {
    setTema((anterior) => {
      const siguiente = anterior === 'claro' ? 'oscuro' : 'claro';
      AsyncStorage.setItem(STORAGE_TEMA, siguiente).catch(() => {});
      return siguiente;
    });
  }, []);

  const cambiarRepetir = useCallback((valor) => {
    setRepetirCadaMes(valor);
    AsyncStorage.setItem(STORAGE_REPETIR_MES, valor ? '1' : '0').catch(() => {});
  }, []);

  const cambiarMoneda = useCallback((valor) => {
    setMoneda(valor || MONEDA_POR_DEFECTO);
  }, []);

  // Ingreso total = base + extras del mes.
  const totalIngreso = useMemo(
    () => sueldo + extras.reduce((s, e) => s + (Number(e.monto) || 0), 0),
    [sueldo, extras]
  );

  // Respaldo: objeto con todos los datos para exportar a JSON.
  const obtenerRespaldo = useCallback(
    () => ({
      app: 'mi-app-gastos',
      version: 1,
      exportadoEn: new Date().toISOString(),
      tema,
      moneda,
      sueldo,
      mesIngreso,
      repetirCadaMes,
      extras,
      historialIngresos,
      gastos,
      fijos,
      porcentajes,
      topes,
      metaAhorro,
      notif,
      bloqueo,
    }),
    [
      tema,
      moneda,
      sueldo,
      mesIngreso,
      repetirCadaMes,
      extras,
      historialIngresos,
      gastos,
      fijos,
      porcentajes,
      topes,
      metaAhorro,
      notif,
      bloqueo,
    ]
  );

  // Restaura un respaldo: normaliza, actualiza el estado y persiste todo.
  const aplicarRespaldo = useCallback(async (datos) => {
    if (!datos || typeof datos !== 'object') return false;
    const normalizar = (valor) => (Array.isArray(valor) ? valor : []);
    const nuevoTema = datos.tema === 'oscuro' ? 'oscuro' : 'claro';
    const nuevaMoneda =
      typeof datos.moneda === 'string' && datos.moneda ? datos.moneda : MONEDA_POR_DEFECTO;
    const nuevoSueldo = Number(datos.sueldo) || 0;
    const nuevaNotif = { ...NOTIF_BASE, ...(datos.notif || {}) };
    const nuevoMeta = Number(datos.metaAhorro) || 0;
    const nuevoBloqueo = !!datos.bloqueo;
    const nuevosGastos = normalizar(datos.gastos).map((g) => ({
      ...g,
      categoria: migrarCategoria(g.categoria),
    }));
    const nuevosFijos = normalizar(datos.fijos).map((f) => ({
      ...f,
      categoria: migrarCategoria(f.categoria),
    }));
    const nuevosPorcentajes = porcentajesValidos(datos.porcentajes)
      ? datos.porcentajes
      : PORCENTAJES_BASE;
    const nuevosTopes = datos.topes && typeof datos.topes === 'object' ? datos.topes : {};
    const nuevasExtras = normalizar(datos.extras);
    const nuevoHistorial = normalizar(datos.historialIngresos);
    const nuevoMes = typeof datos.mesIngreso === 'string' ? datos.mesIngreso : '';
    const nuevoRepetir = datos.repetirCadaMes !== false;

    setTema(nuevoTema);
    setMoneda(nuevaMoneda);
    setSueldo(nuevoSueldo);
    setSueldoTexto(nuevoSueldo > 0 ? String(nuevoSueldo) : '');
    setMesIngreso(nuevoMes);
    setRepetirCadaMes(nuevoRepetir);
    setExtras(nuevasExtras);
    setHistorialIngresos(nuevoHistorial);
    setGastos(nuevosGastos);
    setFijos(nuevosFijos);
    setPorcentajes(nuevosPorcentajes);
    setTopes(nuevosTopes);
    setMetaAhorro(nuevoMeta);
    setNotif(nuevaNotif);
    setBloqueo(nuevoBloqueo);
    setGastoEnEdicion(null);

    try {
      await AsyncStorage.multiSet([
        [STORAGE_TEMA, nuevoTema],
        [STORAGE_MONEDA, nuevaMoneda],
        [STORAGE_SUELDO, String(nuevoSueldo)],
        [STORAGE_MES_INGRESO, nuevoMes],
        [STORAGE_REPETIR_MES, nuevoRepetir ? '1' : '0'],
        [STORAGE_EXTRAS, JSON.stringify(nuevasExtras)],
        [STORAGE_HISTORIAL_INGRESOS, JSON.stringify(nuevoHistorial)],
        [STORAGE_GASTOS, JSON.stringify(nuevosGastos)],
        [STORAGE_FIJOS, JSON.stringify(nuevosFijos)],
        [STORAGE_PORCENTAJES, JSON.stringify(nuevosPorcentajes)],
        [STORAGE_TOPES, JSON.stringify(nuevosTopes)],
        [STORAGE_META, String(nuevoMeta)],
        [STORAGE_NOTIF, JSON.stringify(nuevaNotif)],
        [STORAGE_BLOQUEO, nuevoBloqueo ? '1' : '0'],
      ]);
    } catch {
      // Los efectos de persistencia volverán a intentarlo.
    }
    return true;
  }, []);

  // Mantiene el símbolo global al día (lo usan los formularios de todas las pantallas).
  definirSimboloMoneda(moneda);

  const valor = useMemo(
    () => ({
      tema,
      paleta: TEMAS[tema],
      alternarTema,
      sueldoTexto,
      setSueldoTexto,
      sueldo,
      setSueldo,
      extras,
      setExtras,
      totalIngreso,
      repetirCadaMes,
      cambiarRepetir,
      mesIngreso,
      setMesIngreso,
      historialIngresos,
      setHistorialIngresos,
      gastos,
      setGastos,
      porcentajes,
      setPorcentajes,
      topes,
      setTopes,
      metaAhorro,
      setMetaAhorro,
      fijos,
      setFijos,
      moneda,
      cambiarMoneda,
      obtenerRespaldo,
      aplicarRespaldo,
      notif,
      setNotif,
      bloqueo,
      setBloqueo,
      pagina,
      setPagina,
      gastoEnEdicion,
      setGastoEnEdicion,
      cargado,
    }),
    [
      tema,
      alternarTema,
      sueldoTexto,
      sueldo,
      extras,
      totalIngreso,
      repetirCadaMes,
      cambiarRepetir,
      mesIngreso,
      historialIngresos,
      gastos,
      cargado,
      porcentajes,
      topes,
      metaAhorro,
      fijos,
      moneda,
      cambiarMoneda,
      obtenerRespaldo,
      aplicarRespaldo,
      notif,
      bloqueo,
      pagina,
      gastoEnEdicion,
    ]
  );

  return <FinanzasContext.Provider value={valor}>{children}</FinanzasContext.Provider>;
}

export function useFinanzas() {
  const ctx = useContext(FinanzasContext);
  if (!ctx) throw new Error('useFinanzas debe usarse dentro de FinanzasProvider');
  return ctx;
}

// Guarda el ingreso base actual (mes en curso). Devuelve false si el monto no es válido.
export async function persistirIngreso({ sueldoTexto, repetirCadaMes, setSueldo, setMesIngreso }) {
  const monto = aNumero(sueldoTexto);
  if (monto <= 0) {
    Alert.alert('Monto inválido', 'Ingresa un sueldo o ingreso mayor a 0.');
    return false;
  }
  const mesActual = claveMesActual();
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_SUELDO, String(monto)),
      AsyncStorage.setItem(STORAGE_REPETIR_MES, repetirCadaMes ? '1' : '0'),
      AsyncStorage.setItem(STORAGE_MES_INGRESO, mesActual),
    ]);
    setSueldo(monto);
    setMesIngreso(mesActual);
    Keyboard.dismiss();
    return true;
  } catch {
    Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
    return false;
  }
}
