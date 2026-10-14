import { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import GraficoPastel from '../components/GraficoPastel';
import {
  CATEGORIAS,
  ICONOS_SUBTIPO,
  ORDEN_CATEGORIAS,
  SIN_DETALLE,
  aNumero,
  claveMesActual,
  claveMesDesdeFecha,
  etiquetaDeClaveMes,
  etiquetaSubtipo,
  fechaEnMes,
  formatoFechaCorta,
  formatoMoneda,
  ingresoDeMes,
  migrarCategoria,
  nuevoId,
  ultimosMeses,
} from '../constants';
import { useFinanzas } from '../store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animar = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

const iconoDe = (gasto) => {
  if (!gasto?.subtipo) return ICONOS_SUBTIPO.General;
  if (gasto.subtipo === 'Otro') return ICONOS_SUBTIPO.Otro;
  return ICONOS_SUBTIPO[gasto.subtipo] ?? ICONOS_SUBTIPO.General;
};

export default function GastosScreen() {
  const {
    paleta,
    totalIngreso,
    gastos,
    setGastos,
    porcentajes,
    setPagina,
    setGastoEnEdicion,
    historialIngresos,
    setHistorialIngresos,
  } = useFinanzas();

  const [seleccionGrafico, setSeleccionGrafico] = useState(null);
  const [mesVista, setMesVista] = useState(claveMesActual());
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [modalMes, setModalMes] = useState(false);
  const [mesCargar, setMesCargar] = useState(ultimosMeses(2)[0]);
  const [ingresoCargar, setIngresoCargar] = useState('');
  const [gastoCargar, setGastoCargar] = useState('');

  const estilos = makeStyles(paleta);
  const estilosGrafico = {
    centroGrafico: estilos.centroGrafico,
    centroMonto: estilos.centroMonto,
    centroEtiqueta: estilos.centroEtiqueta,
    graficoVacio: estilos.graficoVacio,
    colorGraficoVacio: paleta.graficoVacio,
    colorBordeSeleccion: paleta.texto,
  };

  const hayIngreso = totalIngreso > 0;
  const mesActual = claveMesActual();

  // Ingreso del mes que se está viendo: el actual usa base + extras; los meses
  // pasados usan lo registrado al cargarlos.
  const ingresoMesVista = ingresoDeMes(mesVista, mesActual, totalIngreso, historialIngresos);

  // Meses con datos (gastos o ingresos registrados) + mes actual, para el selector.
  const mesesConDatos = (() => {
    const set = new Set([mesActual]);
    gastos.forEach((g) => set.add(claveMesDesdeFecha(g.fecha)));
    historialIngresos.forEach((h) => set.add(h.mes));
    return [...set].sort().reverse().slice(0, 8);
  })();

  const gastosMes = gastos.filter((g) => claveMesDesdeFecha(g.fecha) === mesVista);

  // Límite por categoría según porcentajes configurados y el ingreso de ESE mes.
  const limiteDe = (cat) => ingresoMesVista * (porcentajes[cat] ?? CATEGORIAS[cat].porcentaje);

  const totalDe = (cat) =>
    gastosMes.filter((g) => g.categoria === cat).reduce((suma, g) => suma + g.monto, 0);

  const totalGastadoMes = gastosMes.reduce((suma, g) => suma + g.monto, 0);
  const disponible = ingresoMesVista - totalGastadoMes;
  // Categorías visibles: las 4 del reparto y, si existe, el total sin detalle.
  const categoriasVista =
    totalDe(SIN_DETALLE) > 0 ? [...ORDEN_CATEGORIAS, SIN_DETALLE] : ORDEN_CATEGORIAS;
  const datosGrafico = categoriasVista.map((cat) => ({ cat, valor: totalDe(cat) }));
  const hayAlgoMes = ingresoMesVista > 0 || totalGastadoMes > 0;

  const etiquetaRegla = ORDEN_CATEGORIAS.map((c) =>
    Math.round((porcentajes[c] ?? CATEGORIAS[c].porcentaje) * 100)
  ).join(' / ');

  // Historial filtrado por búsqueda y categoría (dentro del mes visible).
  const gastosFiltrados = gastosMes.filter((g) => {
    if (filtroCat && g.categoria !== filtroCat) return false;
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      g.descripcion.toLowerCase().includes(q) ||
      etiquetaSubtipo(g).toLowerCase().includes(q)
    );
  });

  const eliminarGasto = (id) => {
    Alert.alert('Eliminar gasto', '¿Seguro que quieres borrar este gasto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          animar();
          setGastos((p) => p.filter((g) => g.id !== id));
        },
      },
    ]);
  };

  const editarGasto = (item) => {
    setGastoEnEdicion(item);
    setPagina(1);
  };

  // Carga rápida de un mes pasado: un ingreso y un gasto total, sin detalle.
  const cargarMesAnterior = () => {
    const montoIngreso = aNumero(ingresoCargar);
    const montoGasto = aNumero(gastoCargar);
    if (montoIngreso <= 0 && montoGasto <= 0) {
      Alert.alert('Nada que guardar', 'Escribe al menos el ingreso o el gasto total del mes.');
      return;
    }
    animar();
    if (montoIngreso > 0) {
      setHistorialIngresos((previos) => {
        const existente = previos.find((h) => h.mes === mesCargar);
        if (existente) {
          return previos.map((h) =>
            h.mes === mesCargar ? { ...h, monto: montoIngreso, fecha: new Date().toISOString() } : h
          );
        }
        return [
          { id: nuevoId('ing-'), mes: mesCargar, monto: montoIngreso, fecha: fechaEnMes(mesCargar) },
          ...previos,
        ];
      });
    }
    if (montoGasto > 0) {
      setGastos((previos) => {
        const existente = previos.find(
          (g) => g.resumen && claveMesDesdeFecha(g.fecha) === mesCargar
        );
        if (existente) {
          return previos.map((g) => (g.id === existente.id ? { ...g, monto: montoGasto } : g));
        }
        return [
          {
            id: nuevoId('res-'),
            descripcion: 'Gasto total del mes',
            monto: montoGasto,
            categoria: SIN_DETALLE,
            subtipo: 'Total del mes',
            subtipoLibre: '',
            fecha: fechaEnMes(mesCargar),
            foto: null,
            resumen: true,
          },
          ...previos,
        ];
      });
    }
    setMesVista(mesCargar);
    setModalMes(false);
    setIngresoCargar('');
    setGastoCargar('');
  };

  // Tocar una parte del gráfico o la leyenda muestra el detalle.
  const tocarSegmento = (cat) => {
    setSeleccionGrafico(cat);
  };

  const renderGasto = ({ item }) => {
    const info = CATEGORIAS[migrarCategoria(item.categoria)];
    return (
      <TouchableOpacity
        style={estilos.tarjetaGasto}
        onPress={() => editarGasto(item)}
        onLongPress={() => eliminarGasto(item.id)}
        activeOpacity={0.8}
      >
        <View style={[estilos.iconoGasto, { backgroundColor: `${info.color}1A` }]}>
          <Ionicons name={iconoDe(item)} size={20} color={info.color} />
        </View>
        <View style={estilos.infoGasto}>
          <Text style={estilos.descripcionGasto} numberOfLines={1}>
            {item.descripcion}
          </Text>
          <Text style={[estilos.etiquetaCategoria, { color: info.color }]}>
            {info.etiqueta} · {etiquetaSubtipo(item)}
            {item.fijoId ? ' · fijo' : ''}
          </Text>
        </View>
        {item.foto ? (
          <TouchableOpacity onPress={() => setFotoAmpliada(item.foto)} activeOpacity={0.8}>
            <Image source={{ uri: item.foto }} style={estilos.miniFoto} />
          </TouchableOpacity>
        ) : null}
        <View style={estilos.colMonto}>
          <Text style={estilos.montoGasto}>{formatoMoneda(item.monto)}</Text>
          <Text style={estilos.fechaGasto}>{formatoFechaCorta(item.fecha)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const encabezado = () => (
    <View>
      <Text style={estilos.titulo}>Control de Gastos</Text>
      <Text style={estilos.subtitulo}>Reparto {etiquetaRegla}</Text>

      {!hayIngreso && (
        <TouchableOpacity
          style={estilos.avisoIngreso}
          onPress={() => setPagina(2)}
          activeOpacity={0.85}
        >
          <Text style={estilos.avisoIngresoTexto}>
            Aún no registras tu ingreso. Toca aquí para ir a Ingresos.
          </Text>
        </TouchableOpacity>
      )}

      {/* Balance del mes */}
      {hayAlgoMes && (
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Balance de {etiquetaDeClaveMes(mesVista)}</Text>
          <View style={estilos.filaBalance}>
            <View style={estilos.colBalance}>
              <Text style={estilos.etiquetaBalance}>Ingreso</Text>
              <Text style={estilos.montoBalance}>{formatoMoneda(ingresoMesVista)}</Text>
            </View>
            <View style={estilos.colBalance}>
              <Text style={estilos.etiquetaBalance}>Gastado</Text>
              <Text style={estilos.montoBalance}>{formatoMoneda(totalGastadoMes)}</Text>
            </View>
            <View style={estilos.colBalance}>
              <Text style={estilos.etiquetaBalance}>Disponible</Text>
              <Text style={[estilos.montoBalance, disponible < 0 && estilos.valorExcedido]}>
                {formatoMoneda(disponible)}
              </Text>
            </View>
          </View>
          <View style={estilos.barraFondo}>
            <View
              style={[
                estilos.barraRelleno,
                {
                  width: `${
                    ingresoMesVista > 0
                      ? Math.min(Math.max(totalGastadoMes / ingresoMesVista, 0), 1) * 100
                      : 100
                  }%`,
                  backgroundColor: disponible < 0 ? paleta.peligro : paleta.primario,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Selector de mes */}
      <View style={estilos.contenedorChips}>
        {mesesConDatos.map((m) => (
          <TouchableOpacity
            key={m}
            style={[estilos.chip, mesVista === m && estilos.chipActivo]}
            onPress={() => setMesVista(m)}
            activeOpacity={0.8}
          >
            <Text style={[estilos.textoChip, mesVista === m && estilos.textoChipActivo]}>
              {etiquetaDeClaveMes(m)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={estilos.botonCargarMes}
        onPress={() => setModalMes(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={16} color={paleta.primario} />
        <Text style={estilos.textoBotonCargarMes}>
          Cargar mes anterior (solo ingreso y gasto total)
        </Text>
      </TouchableOpacity>

      {/* Gráfico de pastel interactivo por categoría */}
      <View style={[estilos.bloque, estilos.bloqueMargen]}>
        <Text style={estilos.tituloBloque}>Distribución de gastos</Text>
        {totalGastadoMes > 0 ? (
          <View>
            <View style={estilos.contenedorGrafico}>
              <GraficoPastel
                datos={datosGrafico}
                total={totalGastadoMes}
                seleccionado={seleccionGrafico}
                onSeleccionar={tocarSegmento}
                estilos={estilosGrafico}
              />
            </View>
            <View style={estilos.leyenda}>
              {categoriasVista.map((cat) => {
                const info = CATEGORIAS[cat];
                const gastado = totalDe(cat);
                const pct = totalGastadoMes > 0 ? Math.round((gastado / totalGastadoMes) * 100) : 0;
                const activo = seleccionGrafico === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[estilos.filaLeyenda, activo && estilos.filaLeyendaActiva]}
                    onPress={() => tocarSegmento(activo ? null : cat)}
                    activeOpacity={0.8}
                  >
                    <View style={[estilos.puntoCategoria, { backgroundColor: info.color }]} />
                    <Text style={estilos.textoLeyenda}>
                      {info.etiqueta} · {pct}%
                    </Text>
                    <Text style={estilos.montoLeyenda}>{formatoMoneda(gastado)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={estilos.pistaGrafico}>
              Toca una parte del gráfico o la leyenda para ver el detalle.
            </Text>
          </View>
        ) : (
          <Text style={estilos.textoAyuda}>
            Aún no hay gastos en {etiquetaDeClaveMes(mesVista)}.
          </Text>
        )}
      </View>

      {/* Barras de progreso por categoría */}
      <View style={estilos.bloque}>
        <Text style={estilos.tituloBloque}>Progreso por categoría</Text>
        {ingresoMesVista > 0 ? (
          ORDEN_CATEGORIAS.map((cat) => {
            const info = CATEGORIAS[cat];
            const limite = limiteDe(cat);
            const gastado = totalDe(cat);
            const porcentaje = limite > 0 ? Math.min(gastado / limite, 1) : 0;
            const excedido = gastado > limite;
            return (
              <View key={cat} style={estilos.filaProgreso}>
                <View style={estilos.filaProgresoTexto}>
                  <Text style={estilos.etiquetaProgreso}>{info.etiqueta}</Text>
                  <Text style={[estilos.valorProgreso, excedido && estilos.valorExcedido]}>
                    {formatoMoneda(gastado)} / {formatoMoneda(limite)}
                  </Text>
                </View>
                <View style={estilos.barraFondo}>
                  <View
                    style={[
                      estilos.barraRelleno,
                      {
                        width: `${porcentaje * 100}%`,
                        backgroundColor: excedido ? paleta.peligro : info.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[estilos.porcentajeTexto, excedido && estilos.valorExcedido]}>
                  {limite > 0 ? Math.round((gastado / limite) * 100) : 0}%
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={estilos.textoAyuda}>
            Carga el ingreso de {etiquetaDeClaveMes(mesVista)} para ver tus límites y el progreso de
            cada categoría.
          </Text>
        )}
      </View>

      <Text style={estilos.tituloHistorial}>Historial de gastos</Text>
      <TextInput
        style={[estilos.input, estilos.inputBusqueda]}
        placeholder="Buscar gasto o tipo..."
        value={busqueda}
        onChangeText={setBusqueda}
        placeholderTextColor={paleta.textoTenue}
        returnKeyType="search"
      />
      <View style={[estilos.contenedorChips, estilos.filtrosCat]}>
        <TouchableOpacity
          style={[estilos.chip, !filtroCat && estilos.chipActivo]}
          onPress={() => setFiltroCat(null)}
          activeOpacity={0.8}
        >
          <Text style={[estilos.textoChip, !filtroCat && estilos.textoChipActivo]}>Todas</Text>
        </TouchableOpacity>
        {categoriasVista.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[estilos.chip, filtroCat === cat && estilos.chipActivo]}
            onPress={() => setFiltroCat(filtroCat === cat ? null : cat)}
            activeOpacity={0.8}
          >
            <Text style={[estilos.textoChip, filtroCat === cat && estilos.textoChipActivo]}>
              {CATEGORIAS[cat].etiqueta}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {gastosFiltrados.length === 0 && (
        <Text style={estilos.textoAyuda}>
          {gastosMes.length === 0
            ? 'Todavía no hay gastos en este mes.'
            : 'Ningún gasto coincide con la búsqueda.'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={estilos.contenedor}>
      <StatusBar style={paleta.barra} />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={gastosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={renderGasto}
          ListHeaderComponent={encabezado()}
          contentContainerStyle={estilos.listaContenido}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>
      <Text style={estilos.pista}>Toca un gasto para editarlo, mantén presionado para eliminarlo</Text>

      <Modal visible={!!fotoAmpliada} transparent animationType="fade">
        <View style={estilos.fondoModal}>
          <TouchableOpacity
            style={estilos.botonCerrarModal}
            onPress={() => setFotoAmpliada(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {fotoAmpliada ? (
            <Image source={{ uri: fotoAmpliada }} style={estilos.fotoGrande} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>

      {/* Cargar un mes pasado con solo el ingreso y el gasto total */}
      <Modal
        visible={modalMes}
        transparent
        animationType="fade"
        onRequestClose={() => setModalMes(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.tarjetaModal}>
            <Text style={estilos.tituloModal}>Cargar un mes anterior</Text>
            <Text style={estilos.textoModal}>
              Registra de una sola vez el ingreso y el gasto total de un mes pasado, sin detallar
              cada gasto. El total aparece como «Sin detalle» (no afecta tu reparto).
            </Text>

            <Text style={estilos.etiquetaModal}>Mes</Text>
            <View style={estilos.contenedorChips}>
              {[...ultimosMeses(12)].reverse().map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[estilos.chip, mesCargar === m && estilos.chipActivo]}
                  onPress={() => setMesCargar(m)}
                  activeOpacity={0.8}
                >
                  <Text style={[estilos.textoChip, mesCargar === m && estilos.textoChipActivo]}>
                    {etiquetaDeClaveMes(m)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={estilos.etiquetaModal}>Ingreso de ese mes (opcional)</Text>
            <TextInput
              style={estilos.input}
              placeholder="Ej. 10000"
              keyboardType="decimal-pad"
              value={ingresoCargar}
              onChangeText={setIngresoCargar}
              placeholderTextColor={paleta.textoTenue}
            />

            <Text style={estilos.etiquetaModal}>Gasto total de ese mes (opcional)</Text>
            <TextInput
              style={estilos.input}
              placeholder="Ej. 8500"
              keyboardType="decimal-pad"
              value={gastoCargar}
              onChangeText={setGastoCargar}
              placeholderTextColor={paleta.textoTenue}
            />

            <TouchableOpacity
              style={estilos.botonGuardarMes}
              onPress={cargarMesAnterior}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotonGuardarMes}>Guardar mes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={estilos.botonCancelarModal}
              onPress={() => setModalMes(false)}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoCancelarModal}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (p) =>
  StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: p.fondo },
    flex: { flex: 1 },
    listaContenido: { padding: 16, paddingBottom: 40 },
    titulo: { fontSize: 28, fontWeight: '700', color: p.texto },
    subtitulo: { fontSize: 14, color: p.textoSec, marginBottom: 16 },
    avisoIngreso: {
      backgroundColor: p.primarioSuave,
      borderWidth: 1,
      borderColor: p.primario,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    avisoIngresoTexto: { color: p.primario, fontSize: 14, fontWeight: '600' },
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
    bloqueMargen: { marginTop: 12 },
    tituloBloque: { fontSize: 17, fontWeight: '700', color: p.texto, marginBottom: 12 },
    filaBalance: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    colBalance: { flex: 1, alignItems: 'center' },
    etiquetaBalance: { fontSize: 12, color: p.textoSec },
    montoBalance: { fontSize: 15, fontWeight: '800', color: p.texto, marginTop: 2 },
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
    inputBusqueda: { marginBottom: 8 },
    contenedorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    filtrosCat: { marginBottom: 8 },
    chip: {
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: p.chipFondo,
    },
    chipActivo: { borderColor: p.primario, backgroundColor: p.primarioSuave },
    textoChip: { fontSize: 13, fontWeight: '600', color: p.textoSec, textTransform: 'capitalize' },
    textoChipActivo: { color: p.primario },
    contenedorGrafico: { alignItems: 'center', marginBottom: 12 },
    graficoVacio: { alignItems: 'center' },
    centroGrafico: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centroMonto: { fontSize: 20, fontWeight: '800', color: p.texto },
    centroEtiqueta: {
      fontSize: 12,
      color: p.textoSec,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    leyenda: { gap: 8 },
    filaLeyenda: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 10,
      padding: 10,
    },
    filaLeyendaActiva: { borderColor: p.texto, borderWidth: 2, backgroundColor: p.tarjeta },
    textoLeyenda: { flex: 1, fontSize: 13, fontWeight: '600', color: p.texto, marginLeft: 4 },
    montoLeyenda: { fontSize: 13, fontWeight: '700', color: p.texto },
    pistaGrafico: { fontSize: 12, color: p.textoTenue, marginTop: 10, textAlign: 'center' },
    filaProgreso: { marginBottom: 14 },
    filaProgresoTexto: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    etiquetaProgreso: { fontSize: 14, fontWeight: '600', color: p.texto },
    valorProgreso: { fontSize: 13, color: p.textoSec },
    barraFondo: { height: 12, borderRadius: 6, backgroundColor: p.borde, overflow: 'hidden' },
    barraRelleno: { height: '100%', borderRadius: 6 },
    porcentajeTexto: { fontSize: 12, color: p.textoTenue, marginTop: 4, textAlign: 'right' },
    valorExcedido: { color: p.peligro, fontWeight: '700' },
    textoAyuda: { fontSize: 14, color: p.textoSec, fontStyle: 'italic' },
    tituloHistorial: { fontSize: 18, fontWeight: '700', color: p.texto, marginBottom: 10 },
    tarjetaGasto: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.tarjeta,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    iconoGasto: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    puntoCategoria: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
    infoGasto: { flex: 1 },
    descripcionGasto: { fontSize: 15, fontWeight: '600', color: p.texto },
    etiquetaCategoria: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    miniFoto: { width: 44, height: 44, borderRadius: 8, marginRight: 10 },
    montoGasto: { fontSize: 15, fontWeight: '700', color: p.texto },
    colMonto: { alignItems: 'flex-end' },
    fechaGasto: { fontSize: 11, color: p.textoTenue, marginTop: 2 },
    pista: { textAlign: 'center', fontSize: 11, color: p.textoTenue, paddingBottom: 6 },
    fondoModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    botonCerrarModal: { position: 'absolute', top: 48, right: 24, padding: 8 },
    fotoGrande: { width: '100%', height: '70%' },
    botonCargarMes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: p.primario,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: p.primarioSuave,
      marginTop: 12,
      marginBottom: 4,
    },
    textoBotonCargarMes: { color: p.primario, fontSize: 13, fontWeight: '700' },
    tarjetaModal: {
      width: '100%',
      backgroundColor: p.tarjeta,
      borderRadius: 18,
      padding: 18,
    },
    tituloModal: { fontSize: 19, fontWeight: '800', color: p.texto, marginBottom: 6 },
    textoModal: { fontSize: 13, color: p.textoSec, marginBottom: 8 },
    etiquetaModal: {
      fontSize: 13,
      fontWeight: '600',
      color: p.textoSec,
      marginBottom: 6,
      marginTop: 12,
    },
    botonGuardarMes: {
      backgroundColor: '#111827',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 18,
    },
    textoBotonGuardarMes: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    botonCancelarModal: {
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    textoCancelarModal: { color: p.textoSec, fontSize: 14, fontWeight: '700' },
  });
