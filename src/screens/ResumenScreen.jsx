import { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import {
  CATEGORIAS,
  HORAS_NOTIF,
  ICONOS_SUBTIPO,
  MONEDAS,
  ORDEN_CATEGORIAS,
  SUBTIPOS,
  aNumero,
  claveMesActual,
  claveMesDesdeFecha,
  etiquetaDeClaveMes,
  etiquetaSubtipo,
  formatoMoneda,
  ingresoDeMes,
  ultimosMeses,
} from '../constants';
import { compartirTexto, construirCsvGastos } from '../exportar';
import {
  cancelarRecordatorios,
  cargarNotificaciones,
  programarRecordatorios,
} from '../notificaciones';
import { useFinanzas } from '../store';

const animar = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

const sinSoporteNotif = () => {
  Alert.alert(
    'Solo en la app instalada',
    'El recordatorio funciona en el APK instalado, no en Expo Go.'
  );
};

const PRESETS = [
  { nombre: '50 / 30 / 10 / 10', valores: { fijos: 0.5, variables: 0.3, ahorro: 0.1, deudas: 0.1 } },
  { nombre: '60 / 20 / 10 / 10', valores: { fijos: 0.6, variables: 0.2, ahorro: 0.1, deudas: 0.1 } },
  { nombre: '40 / 30 / 20 / 10', valores: { fijos: 0.4, variables: 0.3, ahorro: 0.2, deudas: 0.1 } },
];

// Días sugeridos para el recordatorio mensual de gastos fijos.
const DIAS_FIJOS = [1, 5, 10, 15, 20, 25];

const presetActivo = (porcentajes, valores) =>
  ORDEN_CATEGORIAS.every((c) => Math.abs((porcentajes[c] ?? 0) - valores[c]) < 0.001);

export default function ResumenScreen() {
  const {
    paleta,
    totalIngreso,
    gastos,
    historialIngresos,
    porcentajes,
    setPorcentajes,
    topes,
    setTopes,
    metaAhorro,
    setMetaAhorro,
    moneda,
    cambiarMoneda,
    obtenerRespaldo,
    aplicarRespaldo,
    notif,
    setNotif,
    bloqueo,
    setBloqueo,
  } = useFinanzas();

  const [pF, setPF] = useState(String(Math.round((porcentajes.fijos ?? 0.5) * 100)));
  const [pV, setPV] = useState(String(Math.round((porcentajes.variables ?? 0.3) * 100)));
  const [pA, setPA] = useState(String(Math.round((porcentajes.ahorro ?? 0.1) * 100)));
  const [pD, setPD] = useState(String(Math.round((porcentajes.deudas ?? 0.1) * 100)));
  const [topeTipo, setTopeTipo] = useState('Comida');
  const [topeMonto, setTopeMonto] = useState('');
  const [metaTexto, setMetaTexto] = useState(metaAhorro > 0 ? String(metaAhorro) : '');

  const estilos = makeStyles(paleta);
  const mesActual = claveMesActual();
  const meses = ultimosMeses(6);

  const gastoPorMes = (m) =>
    gastos
      .filter((g) => claveMesDesdeFecha(g.fecha) === m)
      .reduce((s, g) => s + g.monto, 0);

  // Ingreso por mes: el mes en curso usa base + extras; los pasados, lo
  // registrado en el historial (o el total cargado con "Cargar mes anterior").
  const ingresoMes = (m) => ingresoDeMes(m, mesActual, totalIngreso, historialIngresos);

  const datosMes = meses.map((m) => ({ mes: m, gasto: gastoPorMes(m), ingreso: ingresoMes(m) }));
  const maxVal = Math.max(1, ...datosMes.flatMap((d) => [d.gasto, d.ingreso]));

  const gastosMesActual = gastos.filter((g) => claveMesDesdeFecha(g.fecha) === mesActual);
  const totalMesActual = gastosMesActual.reduce((s, g) => s + g.monto, 0);
  const disponible = totalIngreso - totalMesActual;

  // Top tipos de gasto del mes actual.
  const porTipo = {};
  gastosMesActual.forEach((g) => {
    const k = etiquetaSubtipo(g);
    porTipo[k] = (porTipo[k] || 0) + g.monto;
  });
  const topTipos = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Estadísticas del mes actual.
  const diaActual = new Date().getDate();
  const promedioDiario = totalMesActual / Math.max(1, diaActual);
  const promedioSemanal = totalMesActual / Math.max(1, diaActual / 7);
  const gastoTotalDia = (dia) => {
    const suma = {};
    dia.forEach((g) => {
      const d = new Date(g.fecha).getDate();
      if (!Number.isNaN(d)) suma[d] = (suma[d] || 0) + g.monto;
    });
    return Object.entries(suma).sort((a, b) => b[1] - a[1])[0];
  };
  const diaTop = gastoTotalDia(gastosMesActual);
  const frecuenciaTipo = {};
  gastosMesActual.forEach((g) => {
    const k = etiquetaSubtipo(g);
    frecuenciaTipo[k] = (frecuenciaTipo[k] || 0) + 1;
  });
  const tipoMasRepetido = Object.entries(frecuenciaTipo).sort((a, b) => b[1] - a[1])[0];

  const aplicarPorcentajes = () => {
    const f = Number(pF) || 0;
    const v = Number(pV) || 0;
    const a = Number(pA) || 0;
    const d = Number(pD) || 0;
    if (f <= 0 || v <= 0 || a <= 0 || d <= 0 || f + v + a + d !== 100) {
      Alert.alert('Valores inválidos', 'Usa cuatro porcentajes positivos que sumen 100.');
      return;
    }
    animar();
    setPorcentajes({ fijos: f / 100, variables: v / 100, ahorro: a / 100, deudas: d / 100 });
  };

  const usarPreset = (valores) => {
    animar();
    setPorcentajes(valores);
    setPF(String(Math.round(valores.fijos * 100)));
    setPV(String(Math.round(valores.variables * 100)));
    setPA(String(Math.round(valores.ahorro * 100)));
    setPD(String(Math.round(valores.deudas * 100)));
  };

  const agregarTope = () => {
    const monto = aNumero(topeMonto);
    if (monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un tope mayor a 0.');
      return;
    }
    animar();
    setTopes((p) => ({ ...p, [topeTipo]: monto }));
    setTopeMonto('');
  };

  const quitarTope = (tipo) => {
    animar();
    setTopes((p) => {
      const copia = { ...p };
      delete copia[tipo];
      return copia;
    });
  };

  const guardarMeta = () => {
    const monto = aNumero(metaTexto);
    if (monto < 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido.');
      return;
    }
    animar();
    setMetaAhorro(monto);
  };

  // Aplica un cambio en los recordatorios y reprograma lo que corresponda.
  const aplicarNotif = async (parcial) => {
    const siguiente = { ...notif, ...parcial };
    const hayRecordatorio = siguiente.activado || siguiente.fijosActivado;
    if (!hayRecordatorio) {
      await cancelarRecordatorios();
      setNotif(siguiente);
      return true;
    }
    try {
      const Notifications = await cargarNotificaciones();
      if (!Notifications) {
        sinSoporteNotif();
        return false;
      }
      const permiso = await Notifications.requestPermissionsAsync();
      if (!permiso.granted) {
        Alert.alert(
          'Sin permiso',
          'Activa las notificaciones en los ajustes del teléfono para recibir los avisos.'
        );
        return false;
      }
      const ok = await programarRecordatorios({
        diario: siguiente.activado ? { activado: true, hora: siguiente.hora } : undefined,
        fijos: siguiente.fijosActivado
          ? { activado: true, dia: siguiente.fijosDia, hora: siguiente.fijosHora }
          : undefined,
      });
      if (!ok) {
        sinSoporteNotif();
        return false;
      }
      setNotif(siguiente);
      return true;
    } catch {
      sinSoporteNotif();
      return false;
    }
  };

  const cambiarNotif = (valor) => aplicarNotif({ activado: valor });
  const cambiarHora = (hora) => aplicarNotif({ hora });
  const cambiarFijos = (valor) => aplicarNotif({ fijosActivado: valor });
  const cambiarFijosDia = (dia) => aplicarNotif({ fijosDia: dia });
  const cambiarFijosHora = (hora) => aplicarNotif({ fijosHora: hora });
  const cambiarAlertas = (valor) => setNotif((n) => ({ ...n, alertas: valor }));

  // Exportar a CSV / respaldar en JSON / restaurar respaldo.
  const exportarCsv = async () => {
    if (gastos.length === 0) {
      Alert.alert('Sin datos', 'Todavía no hay gastos para exportar.');
      return;
    }
    try {
      const csv = construirCsvGastos(gastos);
      const ok = await compartirTexto(`gastos-${claveMesActual()}.csv`, csv, {
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
      });
      if (!ok) {
        Alert.alert('No disponible', 'Compartir archivos no está disponible en este dispositivo.');
      }
    } catch {
      Alert.alert('No se pudo exportar', 'Intenta de nuevo.');
    }
  };

  const respaldar = async () => {
    try {
      const json = JSON.stringify(obtenerRespaldo(), null, 2);
      const ok = await compartirTexto(`respaldo-gastos-${claveMesActual()}.json`, json, {
        mimeType: 'application/json',
        uti: 'public.json',
      });
      if (!ok) {
        Alert.alert('No disponible', 'Compartir archivos no está disponible en este dispositivo.');
      }
    } catch {
      Alert.alert('No se pudo respaldar', 'Intenta de nuevo.');
    }
  };

  const restaurar = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const archivo = new File(res.assets[0].uri);
      const datos = JSON.parse(await archivo.text());
      if (!datos || !Array.isArray(datos.gastos)) {
        Alert.alert('Respaldo inválido', 'El archivo no parece un respaldo de esta app.');
        return;
      }
      Alert.alert('Restaurar respaldo', 'Se reemplazarán todos tus datos actuales. ¿Continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            const ok = await aplicarRespaldo(datos);
            Alert.alert(
              ok ? 'Listo' : 'Error',
              ok ? 'Tus datos se restauraron.' : 'No se pudo restaurar el respaldo.'
            );
          },
        },
      ]);
    } catch {
      Alert.alert('No se pudo leer', 'El archivo no es un respaldo válido.');
    }
  };

  const cambiarBloqueo = async (valor) => {
    if (!valor) {
      setBloqueo(false);
      return;
    }
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const registrado = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !registrado) {
        Alert.alert(
          'No disponible',
          'Este dispositivo no tiene biometría configurada (huella o rostro).'
        );
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirma para activar el bloqueo',
      });
      if (res.success) {
        setBloqueo(true);
      }
    } catch {
      Alert.alert('No disponible', 'No se pudo activar el bloqueo en este dispositivo.');
    }
  };

  return (
    <View style={estilos.contenedor}>
      <StatusBar style={paleta.barra} />
      <KeyboardAwareScrollView
        contentContainerStyle={estilos.listaContenido}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={90}
      >
        <Text style={estilos.titulo}>Resumen</Text>
        <Text style={estilos.subtitulo}>Balance, evolución y ajustes</Text>

        {/* Evolución últimos 6 meses */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Evolución (6 meses)</Text>
          {datosMes.every((d) => d.gasto === 0 && d.ingreso === 0) ? (
            <Text style={estilos.textoAyuda}>Aún no hay datos para graficar.</Text>
          ) : (
            <View>
              <View style={estilos.graficoBarras}>
                {datosMes.map((d) => (
                  <View key={d.mes} style={estilos.colMes}>
                    <View style={estilos.barrasPar}>
                      <View
                        style={[
                          estilos.barraMes,
                          {
                            height: Math.max(4, (d.ingreso / maxVal) * 110),
                            backgroundColor: paleta.primario,
                          },
                        ]}
                      />
                      <View
                        style={[
                          estilos.barraMes,
                          {
                            height: Math.max(4, (d.gasto / maxVal) * 110),
                            backgroundColor: paleta.peligro,
                          },
                        ]}
                      />
                    </View>
                    <Text style={estilos.etiquetaMes} numberOfLines={1}>
                      {etiquetaDeClaveMes(d.mes).slice(0, 3)}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={estilos.filaLeyendaSimple}>
                <View style={[estilos.punto, { backgroundColor: paleta.primario }]} />
                <Text style={estilos.textoLeyendaSimple}>Ingreso</Text>
                <View style={[estilos.punto, { backgroundColor: paleta.peligro }]} />
                <Text style={estilos.textoLeyendaSimple}>Gasto</Text>
              </View>
              {datosMes.map((d) => (
                <View key={d.mes} style={estilos.filaMesDato}>
                  <Text style={estilos.textoMesDato}>{etiquetaDeClaveMes(d.mes)}</Text>
                  <Text style={estilos.textoMesDato}>
                    {formatoMoneda(d.ingreso)} / {formatoMoneda(d.gasto)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Top tipos de gasto */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Top tipos de gasto (mes actual)</Text>
          {topTipos.length === 0 ? (
            <Text style={estilos.textoAyuda}>Sin gastos este mes.</Text>
          ) : (
            topTipos.map(([tipo, monto]) => (
              <View key={tipo} style={estilos.filaTop}>
                <Ionicons
                  name={ICONOS_SUBTIPO[tipo] ?? ICONOS_SUBTIPO.General}
                  size={18}
                  color={paleta.primario}
                />
                <Text style={estilos.textoTop} numberOfLines={1}>
                  {tipo} · {totalMesActual > 0 ? Math.round((monto / totalMesActual) * 100) : 0}%
                </Text>
                <Text style={estilos.montoTop}>{formatoMoneda(monto)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Estadísticas del mes */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Estadísticas del mes</Text>
          {gastosMesActual.length === 0 ? (
            <Text style={estilos.textoAyuda}>Sin gastos este mes.</Text>
          ) : (
            <View style={estilos.cuadriculaStats}>
              <View style={estilos.tarjetaStat}>
                <Text style={estilos.etiquetaStat}>Promedio diario</Text>
                <Text style={estilos.valorStat}>{formatoMoneda(promedioDiario)}</Text>
              </View>
              <View style={estilos.tarjetaStat}>
                <Text style={estilos.etiquetaStat}>Promedio semanal</Text>
                <Text style={estilos.valorStat}>{formatoMoneda(promedioSemanal)}</Text>
              </View>
              <View style={estilos.tarjetaStat}>
                <Text style={estilos.etiquetaStat}>N.º de gastos</Text>
                <Text style={estilos.valorStat}>{gastosMesActual.length}</Text>
              </View>
              <View style={estilos.tarjetaStat}>
                <Text style={estilos.etiquetaStat}>Día con más gasto</Text>
                <Text style={estilos.valorStat} numberOfLines={1}>
                  {diaTop ? `Día ${diaTop[0]} · ${formatoMoneda(diaTop[1])}` : '—'}
                </Text>
              </View>
            </View>
          )}
          {tipoMasRepetido ? (
            <View style={estilos.filaStatDestacada}>
              <Ionicons name="repeat" size={16} color={paleta.primario} />
              <Text style={estilos.textoStatDestacada}>
                El tipo que más repites: {tipoMasRepetido[0]} ({tipoMasRepetido[1]}{' '}
                {tipoMasRepetido[1] === 1 ? 'vez' : 'veces'})
              </Text>
            </View>
          ) : null}
        </View>

        {/* Comparativa contra límites */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Comparativa contra límites</Text>
          {totalIngreso <= 0 ? (
            <Text style={estilos.textoAyuda}>
              Registra tu ingreso en la pestaña Ingresos para comparar.
            </Text>
          ) : (
            ORDEN_CATEGORIAS.map((cat) => {
              const info = CATEGORIAS[cat];
              const pct = porcentajes[cat] ?? info.porcentaje;
              const limite = totalIngreso * pct;
              const gastado = gastosMesActual
                .filter((g) => g.categoria === cat)
                .reduce((s, g) => s + g.monto, 0);
              const excedido = gastado > limite;
              return (
                <View key={cat} style={estilos.filaProgreso}>
                  <View style={estilos.filaProgresoTexto}>
                    <Text style={estilos.etiquetaProgreso}>
                      {info.etiqueta} ({Math.round(pct * 100)}%)
                    </Text>
                    <Text style={[estilos.valorProgreso, excedido && estilos.valorExcedido]}>
                      {formatoMoneda(gastado)} / {formatoMoneda(limite)}
                    </Text>
                  </View>
                  <View style={estilos.barraFondo}>
                    <View
                      style={[
                        estilos.barraRelleno,
                        {
                          width: `${limite > 0 ? Math.min(gastado / limite, 1) * 100 : 0}%`,
                          backgroundColor: excedido ? paleta.peligro : info.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Meta de ahorro */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Meta de ahorro del mes</Text>
          <View style={estilos.filaDoble}>
            <TextInput
              style={[estilos.input, estilos.inputFlex]}
              placeholder="Ej. 3000"
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={metaTexto}
              onChangeText={setMetaTexto}
              onSubmitEditing={guardarMeta}
              placeholderTextColor={paleta.textoTenue}
            />
            <TouchableOpacity style={estilos.botonMini} onPress={guardarMeta} activeOpacity={0.85}>
              <Text style={estilos.textoBotonMini}>Guardar</Text>
            </TouchableOpacity>
          </View>
          {metaAhorro > 0 && (
            <View>
              <View style={estilos.filaProgresoTexto}>
                <Text style={estilos.etiquetaProgreso}>Disponible para ahorrar</Text>
                <Text style={estilos.valorProgreso}>
                  {formatoMoneda(Math.max(disponible, 0))} / {formatoMoneda(metaAhorro)}
                </Text>
              </View>
              <View style={estilos.barraFondo}>
                <View
                  style={[
                    estilos.barraRelleno,
                    {
                      width: `${Math.min(Math.max(disponible / metaAhorro, 0), 1) * 100}%`,
                      backgroundColor: '#16A34A',
                    },
                  ]}
                />
              </View>
              <Text style={estilos.porcentajeTexto}>
                {Math.round(Math.min(Math.max(disponible / metaAhorro, 0), 1) * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Porcentajes personalizados */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Reparto del ingreso (%)</Text>
          <View style={estilos.contenedorChips}>
            {PRESETS.map((preset) => {
              const activo = presetActivo(porcentajes, preset.valores);
              return (
                <TouchableOpacity
                  key={preset.nombre}
                  style={[estilos.chipPreset, activo && estilos.chipActivoGrande]}
                  onPress={() => usarPreset(preset.valores)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={activo ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={activo ? '#FFFFFF' : paleta.primario}
                  />
                  <Text style={[estilos.textoChip, activo && estilos.textoPresetActivo]}>
                    {preset.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={estilos.filaCuadruple}>
            {[
              { etiqueta: 'Fijos', valor: pF, setter: setPF },
              { etiqueta: 'Var.', valor: pV, setter: setPV },
              { etiqueta: 'Ahorro', valor: pA, setter: setPA },
              { etiqueta: 'Deudas', valor: pD, setter: setPD },
            ].map((c) => (
              <View key={c.etiqueta} style={estilos.colPct}>
                <Text style={estilos.etiquetaCampo}>{c.etiqueta}</Text>
                <TextInput
                  style={estilos.input}
                  keyboardType="numeric"
                  returnKeyType="done"
                  value={c.valor}
                  onChangeText={c.setter}
                  placeholderTextColor={paleta.textoTenue}
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={estilos.botonMiniAncho}
            onPress={aplicarPorcentajes}
            activeOpacity={0.85}
          >
            <Text style={estilos.textoBotonMini}>Aplicar (debe sumar 100)</Text>
          </TouchableOpacity>
        </View>

        {/* Topes por tipo */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Topes mensuales por tipo</Text>
          <Text style={estilos.etiquetaCampo}>Tipo de gasto</Text>
          <View style={estilos.contenedorChips}>
            {SUBTIPOS.filter((t) => t !== 'Otro').map((t) => (
              <TouchableOpacity
                key={t}
                style={[estilos.chipMini, topeTipo === t && estilos.chipActivo]}
                onPress={() => setTopeTipo(t)}
                activeOpacity={0.8}
              >
                <Text style={[estilos.textoChipMini, topeTipo === t && estilos.textoChipActivo]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={estilos.filaDoble}>
            <TextInput
              style={[estilos.input, estilos.inputFlex]}
              placeholder="Tope mensual"
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={topeMonto}
              onChangeText={setTopeMonto}
              onSubmitEditing={agregarTope}
              placeholderTextColor={paleta.textoTenue}
            />
            <TouchableOpacity style={estilos.botonMini} onPress={agregarTope} activeOpacity={0.85}>
              <Text style={estilos.textoBotonMini}>Añadir</Text>
            </TouchableOpacity>
          </View>
          {Object.entries(topes).map(([tipo, monto]) => (
            <View key={tipo} style={estilos.filaHistorial}>
              <View style={estilos.infoFila}>
                <Text style={estilos.montoFila} numberOfLines={1}>
                  {tipo}
                </Text>
                <Text style={estilos.subFila}>{formatoMoneda(monto)} al mes</Text>
              </View>
              <TouchableOpacity
                style={estilos.botonQuitar}
                onPress={() => quitarTope(tipo)}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoQuitar}>Quitar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Moneda */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Moneda</Text>
          <View style={estilos.contenedorChips}>
            {MONEDAS.map((m) => (
              <TouchableOpacity
                key={m.simbolo}
                style={[estilos.chip, moneda === m.simbolo && estilos.chipActivo]}
                onPress={() => cambiarMoneda(m.simbolo)}
                activeOpacity={0.8}
              >
                <Text style={[estilos.textoChip, moneda === m.simbolo && estilos.textoChipActivo]}>
                  {m.simbolo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={estilos.textoAyuda}>Ejemplo: {formatoMoneda(1234.5)}</Text>
        </View>

        {/* Exportar y respaldar */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Exportar y respaldar</Text>
          <Text style={estilos.textoAyuda}>
            El CSV abre en Excel o Google Sheets. El respaldo guarda todo para cambiar de teléfono.
          </Text>
          <TouchableOpacity
            style={estilos.botonMiniAncho}
            onPress={exportarCsv}
            activeOpacity={0.85}
          >
            <Text style={estilos.textoBotonMini}>Exportar gastos a CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonAccion} onPress={respaldar} activeOpacity={0.85}>
            <Text style={estilos.textoBotonAccion}>Crear respaldo (JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.botonAccion} onPress={restaurar} activeOpacity={0.85}>
            <Text style={estilos.textoBotonAccion}>Restaurar respaldo</Text>
          </TouchableOpacity>
        </View>

        {/* Ajustes */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Ajustes</Text>
          <View style={estilos.filaAjuste}>
            <Text style={estilos.textoAjuste}>Recordatorio diario</Text>
            <Switch value={notif.activado} onValueChange={cambiarNotif} />
          </View>
          {notif.activado && (
            <View style={estilos.contenedorChips}>
              {HORAS_NOTIF.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[estilos.chip, notif.hora === h && estilos.chipActivo]}
                  onPress={() => cambiarHora(h)}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.textoChip, notif.hora === h && estilos.textoChipActivo]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={estilos.filaAjuste}>
            <Text style={estilos.textoAjuste}>Recordatorio de gastos fijos</Text>
            <Switch value={notif.fijosActivado} onValueChange={cambiarFijos} />
          </View>
          {notif.fijosActivado && (
            <View>
              <Text style={estilos.etiquetaCampo}>Día del mes</Text>
              <View style={estilos.contenedorChips}>
                {DIAS_FIJOS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[estilos.chipMini, notif.fijosDia === d && estilos.chipActivo]}
                    onPress={() => cambiarFijosDia(d)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        estilos.textoChipMini,
                        notif.fijosDia === d && estilos.textoChipActivo,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={estilos.etiquetaCampo}>Hora</Text>
              <View style={estilos.contenedorChips}>
                {HORAS_NOTIF.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[estilos.chip, notif.fijosHora === h && estilos.chipActivo]}
                    onPress={() => cambiarFijosHora(h)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[estilos.textoChip, notif.fijosHora === h && estilos.textoChipActivo]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={estilos.filaAjuste}>
            <Text style={estilos.textoAjuste}>Alertas de presupuesto</Text>
            <Switch value={notif.alertas} onValueChange={cambiarAlertas} />
          </View>
          <View style={estilos.filaAjuste}>
            <Text style={estilos.textoAjuste}>Bloqueo con huella o rostro</Text>
            <Switch value={bloqueo} onValueChange={cambiarBloqueo} />
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const makeStyles = (p) =>
  StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: p.fondo },
    listaContenido: { padding: 16, paddingBottom: 40 },
    titulo: { fontSize: 28, fontWeight: '700', color: p.texto },
    subtitulo: { fontSize: 14, color: p.textoSec, marginBottom: 16 },
    bloque: {
      backgroundColor: p.tarjeta,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    tituloBloque: { fontSize: 17, fontWeight: '700', color: p.texto, marginBottom: 12 },
    textoAyuda: { fontSize: 14, color: p.textoSec, fontStyle: 'italic' },
    graficoBarras: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6 },
    colMes: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barrasPar: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 120 },
    barraMes: { width: 12, borderRadius: 4 },
    etiquetaMes: { fontSize: 10, color: p.textoSec, marginTop: 4, textTransform: 'capitalize' },
    filaLeyendaSimple: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    punto: { width: 10, height: 10, borderRadius: 5 },
    textoLeyendaSimple: { fontSize: 12, color: p.textoSec, marginRight: 10 },
    filaMesDato: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    textoMesDato: { fontSize: 12, color: p.textoSec, textTransform: 'capitalize' },
    filaTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    textoTop: { flex: 1, fontSize: 14, fontWeight: '600', color: p.texto },
    montoTop: { fontSize: 14, fontWeight: '700', color: p.texto },
    filaProgreso: { marginBottom: 14 },
    filaProgresoTexto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    etiquetaProgreso: { fontSize: 14, fontWeight: '600', color: p.texto },
    valorProgreso: { fontSize: 13, color: p.textoSec },
    barraFondo: { height: 12, borderRadius: 6, backgroundColor: p.borde, overflow: 'hidden' },
    barraRelleno: { height: '100%', borderRadius: 6 },
    porcentajeTexto: { fontSize: 12, color: p.textoTenue, marginTop: 4, textAlign: 'right' },
    valorExcedido: { color: p.peligro, fontWeight: '700' },
    etiquetaCampo: { fontSize: 13, fontWeight: '600', color: p.textoSec, marginBottom: 6, marginTop: 8 },
    input: {
      borderWidth: 1,
      borderColor: p.inputBorde,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: p.texto,
      backgroundColor: p.inputFondo,
    },
    inputFlex: { flex: 1 },
    filaDoble: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8 },
    filaCuadruple: { flexDirection: 'row', gap: 6, marginTop: 4 },
    chipPreset: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 2,
      borderColor: p.borde,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: p.chipFondo,
    },
    chipActivoGrande: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
    textoPresetActivo: { color: '#FFFFFF' },
    colPct: { flex: 1 },
    botonMini: {
      backgroundColor: '#2563EB',
      borderRadius: 10,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    botonMiniAncho: {
      backgroundColor: '#2563EB',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    textoBotonMini: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    contenedorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: p.chipFondo,
    },
    chipActivo: { borderColor: p.primario, backgroundColor: p.primarioSuave },
    textoChip: { fontSize: 13, fontWeight: '600', color: p.textoSec },
    textoChipActivo: { color: p.primario },
    chipMini: {
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: p.chipFondo,
    },
    textoChipMini: { fontSize: 12, fontWeight: '600', color: p.textoSec },
    filaHistorial: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
    },
    infoFila: { flex: 1 },
    montoFila: { fontSize: 15, fontWeight: '600', color: p.texto },
    subFila: { fontSize: 12, color: p.textoSec, marginTop: 2 },
    botonQuitar: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: p.peligroSuave,
    },
    textoQuitar: { color: p.peligroTexto, fontSize: 12, fontWeight: '700' },
    filaAjuste: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    textoAjuste: { fontSize: 14, fontWeight: '600', color: p.texto },
    cuadriculaStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tarjetaStat: {
      width: '48%',
      flexGrow: 1,
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 12,
      padding: 12,
    },
    etiquetaStat: { fontSize: 12, color: p.textoSec },
    valorStat: { fontSize: 16, fontWeight: '800', color: p.texto, marginTop: 4 },
    filaStatDestacada: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      backgroundColor: p.primarioSuave,
      borderWidth: 1,
      borderColor: p.primario,
      borderRadius: 10,
      padding: 10,
    },
    textoStatDestacada: { flex: 1, fontSize: 13, fontWeight: '600', color: p.primario },
    botonAccion: {
      borderWidth: 1.5,
      borderColor: p.primario,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: p.primarioSuave,
    },
    textoBotonAccion: { color: p.primario, fontSize: 14, fontWeight: '700' },
  });
