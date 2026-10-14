import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  LayoutAnimation,
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
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import {
  CATEGORIAS,
  DEGRADADOS,
  ICONOS_CATEGORIA,
  ICONOS_SUBTIPO,
  ORDEN_CATEGORIAS,
  SUBTIPOS,
  aNumero,
  claveMesActual,
  claveMesDesdeFecha,
  etiquetaSubtipo,
  formatoMoneda,
  ingresoDeMes,
  migrarCategoria,
  nuevoId,
} from '../constants';
import { avisarPresupuesto } from '../notificaciones';
import { useFinanzas } from '../store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animar = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export default function AgregarScreen() {
  const {
    paleta,
    totalIngreso,
    gastos,
    setGastos,
    porcentajes,
    topes,
    fijos,
    setFijos,
    notif,
    gastoEnEdicion,
    setGastoEnEdicion,
    setPagina,
    historialIngresos,
  } = useFinanzas();

  const [descripcion, setDescripcion] = useState('');
  const [montoTexto, setMontoTexto] = useState('');
  const [categoria, setCategoria] = useState('variables');
  const [subtipo, setSubtipo] = useState('Comida');
  const [subtipoLibre, setSubtipoLibre] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [fijoDesc, setFijoDesc] = useState('');
  const [fijoMonto, setFijoMonto] = useState('');
  const [fijoCat, setFijoCat] = useState('fijos');
  const [fijoSubtipo, setFijoSubtipo] = useState('Vivienda');

  const descripcionRef = useRef(null);
  const montoRef = useRef(null);
  const subtipoLibreRef = useRef(null);

  const estilos = makeStyles(paleta);
  const editandoId = gastoEnEdicion?.id ?? null;

  // Sincroniza el formulario cuando se elige un gasto para editar (o se limpia).
  useEffect(() => {
    const t = setTimeout(() => {
      if (gastoEnEdicion) {
        setDescripcion(gastoEnEdicion.descripcion ?? '');
        setMontoTexto(String(gastoEnEdicion.monto ?? ''));
        setCategoria(migrarCategoria(gastoEnEdicion.categoria));
        setSubtipo(gastoEnEdicion.subtipo || 'Comida');
        setSubtipoLibre(gastoEnEdicion.subtipoLibre || '');
        setFotoUri(gastoEnEdicion.foto || null);
      } else {
        setDescripcion('');
        setMontoTexto('');
        setCategoria('variables');
        setSubtipo('Comida');
        setSubtipoLibre('');
        setFotoUri(null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [gastoEnEdicion]);

  const etiquetaRegla = ORDEN_CATEGORIAS.map((c) =>
    Math.round((porcentajes[c] ?? CATEGORIAS[c].porcentaje) * 100)
  ).join(' / ');

  const limpiarYVolver = () => {
    setGastoEnEdicion(null);
    setDescripcion('');
    setMontoTexto('');
    setSubtipoLibre('');
    setFotoUri(null);
    setPagina(0);
  };

  const elegirFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Sin permiso', 'Permite el acceso a tus fotos para adjuntar el ticket.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setFotoUri(res.assets[0].uri);
    }
  };

  const guardarGasto = async () => {
    const monto = aNumero(montoTexto);
    const tipoFinal = subtipo === 'Otro' ? subtipoLibre.trim() : subtipo;

    if (subtipo === 'Otro' && !tipoFinal) {
      Alert.alert('Falta el tipo de gasto', 'Escribe qué tipo de gasto es (ej. Veterinario).');
      subtipoLibreRef.current?.focus();
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Falta la descripción', 'Escribe qué compraste o pagaste.');
      descripcionRef.current?.focus();
      return;
    }
    if (monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      montoRef.current?.focus();
      return;
    }
    const mesActual = claveMesActual();
    const mesObjetivo = editandoId ? claveMesDesdeFecha(gastoEnEdicion.fecha) : mesActual;
    const ingresoObjetivo = ingresoDeMes(mesObjetivo, mesActual, totalIngreso, historialIngresos);
    if (mesObjetivo === mesActual && ingresoObjetivo <= 0) {
      Alert.alert(
        'Falta tu ingreso',
        'Primero registra tu ingreso en la página Ingresos para calcular tus límites.'
      );
      return;
    }

    if (!editandoId) {
      // Tope por tipo de gasto, dentro del mes en el que se está cargando.
      const sumaTipo = gastos
        .filter(
          (g) =>
            claveMesDesdeFecha(g.fecha) === mesObjetivo &&
            etiquetaSubtipo(g).toLowerCase() === tipoFinal.toLowerCase()
        )
        .reduce((s, g) => s + g.monto, 0);
      const tope = topes[tipoFinal];
      if (tope > 0 && sumaTipo + monto > tope) {
        Alert.alert(
          'Tope superado',
          `En ${tipoFinal} llevarías ${formatoMoneda(sumaTipo + monto)} de ${formatoMoneda(
            tope
          )}.`
        );
      }
    }

    const limite = ingresoObjetivo * (porcentajes[categoria] ?? CATEGORIAS[categoria].porcentaje);
    const totalActual = gastos
      .filter(
        (g) =>
          claveMesDesdeFecha(g.fecha) === mesObjetivo &&
          g.categoria === categoria &&
          g.id !== editandoId
      )
      .reduce((s, g) => s + g.monto, 0);
    const totalNuevo = totalActual + monto;
    const info = CATEGORIAS[categoria];

    animar();
    if (editandoId) {
      setGastos((previos) =>
        previos.map((g) =>
          g.id === editandoId
            ? {
                ...g,
                descripcion: descripcion.trim(),
                monto,
                categoria,
                subtipo: subtipo === 'Otro' ? 'Otro' : subtipo,
                subtipoLibre: subtipo === 'Otro' ? tipoFinal : '',
                foto: fotoUri,
              }
            : g
        )
      );
    } else {
      setGastos((previos) => [
        {
          id: nuevoId(),
          descripcion: descripcion.trim(),
          monto,
          categoria,
          subtipo: subtipo === 'Otro' ? 'Otro' : subtipo,
          subtipoLibre: subtipo === 'Otro' ? tipoFinal : '',
          fecha: new Date().toISOString(),
          foto: fotoUri,
        },
        ...previos,
      ]);
    }
    setGastoEnEdicion(null);
    setDescripcion('');
    setMontoTexto('');
    setSubtipoLibre('');
    setFotoUri(null);
    Keyboard.dismiss();
    setPagina(0);

    // Alertas del reparto: cerca del 90% o límite sobrepasado. Si las alertas de
    // presupuesto están activas se intenta una notificación del sistema; si no hay
    // soporte o permiso, se muestra la alerta dentro de la app.
    let aviso = null;
    if (limite > 0 && totalNuevo > limite) {
      aviso = {
        titulo: 'Límite superado',
        cuerpo: `En ${info.etiqueta} llevarías ${formatoMoneda(totalNuevo)} de ${formatoMoneda(
          limite
        )}. Te recomendamos ajustar tus gastos.`,
        destructivo: true,
      };
    } else if (limite > 0 && totalNuevo >= limite * 0.9) {
      aviso = {
        titulo: 'Estás cerca del límite',
        cuerpo: `En ${info.etiqueta} llevarías ${formatoMoneda(totalNuevo)} de ${formatoMoneda(
          limite
        )} (${Math.round((totalNuevo / limite) * 100)}%). Ve con cuidado.`,
        destructivo: false,
      };
    }
    if (aviso) {
      const enviado = notif?.alertas
        ? await avisarPresupuesto(aviso.titulo, aviso.cuerpo)
        : false;
      if (!enviado) {
        Alert.alert(aviso.titulo, aviso.cuerpo, [
          {
            text: aviso.destructivo ? 'Entendido' : 'Ok',
            style: aviso.destructivo ? 'destructive' : 'default',
          },
        ]);
      }
    }
  };

  // Entrada rápida: rellena el formulario con el último gasto registrado.
  const repetirUltimo = () => {
    const ultimo = gastos[0];
    if (!ultimo) return;
    animar();
    setDescripcion(ultimo.descripcion ?? '');
    setMontoTexto(String(ultimo.monto ?? ''));
    setCategoria(migrarCategoria(ultimo.categoria));
    setSubtipo(ultimo.subtipo || 'Comida');
    setSubtipoLibre(ultimo.subtipoLibre || '');
    setFotoUri(ultimo.foto || null);
  };

  const agregarFijo = () => {
    const monto = aNumero(fijoMonto);
    if (!fijoDesc.trim()) {
      Alert.alert('Falta la descripción', 'Ej. Renta, Netflix, Luz.');
      return;
    }
    if (monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      return;
    }
    animar();
    const mesActual = claveMesActual();
    const idFijo = nuevoId();
    const descripcionFijo = fijoDesc.trim();
    setFijos((previos) => [
      {
        id: idFijo,
        descripcion: descripcionFijo,
        monto,
        categoria: fijoCat,
        subtipo: fijoSubtipo,
        subtipoLibre: '',
        // Se marca el mes actual porque abajo se agrega de una; así no se duplica al abrir.
        ultimoMes: mesActual,
      },
      ...previos,
    ]);
    // También se agrega al mes en curso de inmediato.
    setGastos((previos) => [
      {
        id: `fijo-${mesActual}-${idFijo}`,
        descripcion: descripcionFijo,
        monto,
        categoria: fijoCat,
        subtipo: fijoSubtipo,
        subtipoLibre: '',
        fecha: new Date().toISOString(),
        foto: null,
        fijoId: idFijo,
      },
      ...previos,
    ]);
    setFijoDesc('');
    setFijoMonto('');
  };

  const eliminarFijo = (id) => {
    Alert.alert('Quitar gasto fijo', 'Ya no se agregará automáticamente cada mes.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          animar();
          setFijos((p) => p.filter((f) => f.id !== id));
        },
      },
    ]);
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
        <Text style={estilos.titulo}>{editandoId ? 'Editar gasto' : 'Agregar gasto'}</Text>
        <Text style={estilos.subtitulo}>Reparto {etiquetaRegla}</Text>

        {!editandoId && gastos.length > 0 ? (
          <TouchableOpacity
            style={estilos.botonRepetir}
            onPress={repetirUltimo}
            activeOpacity={0.85}
          >
            <Ionicons name="repeat" size={18} color={paleta.primario} />
            <Text style={estilos.textoBotonRepetir} numberOfLines={1}>
              Repetir último: {gastos[0].descripcion} · {formatoMoneda(gastos[0].monto)}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={estilos.bloque}>
          <Text style={estilos.etiquetaCampo}>Categoría</Text>
          <Text style={estilos.descripcionCategoria}>
            {CATEGORIAS[categoria]?.descripcion ?? ''}
          </Text>
          <View style={estilos.cuadriculaCategorias}>
            {ORDEN_CATEGORIAS.map((cat) => {
              const info = CATEGORIAS[cat];
              const activa = categoria === cat;
              const pct = Math.round(
                (porcentajes[cat] ?? info.porcentaje) * 100
              );
              return (
                <TouchableOpacity
                  key={cat}
                  style={estilos.tarjetaCategoria}
                  onPress={() => setCategoria(cat)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={DEGRADADOS[cat]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[estilos.degradadoCategoria, !activa && estilos.degradadoApagado]}
                  >
                    <View style={estilos.filaTarjetaCategoria}>
                      <Ionicons name={ICONOS_CATEGORIA[cat]} size={18} color="#FFFFFF" />
                      {activa && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={estilos.textoTarjetaCategoria}>{info.etiqueta}</Text>
                    <Text style={estilos.pctTarjetaCategoria}>{pct}% del ingreso</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={estilos.etiquetaCampo}>Tipo de gasto</Text>
          <View style={estilos.contenedorChips}>
            {SUBTIPOS.map((t) => {
              const activo = subtipo === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[estilos.chip, activo && estilos.chipActivo]}
                  onPress={() => {
                    setSubtipo(t);
                    if (t === 'Otro') {
                      setTimeout(() => subtipoLibreRef.current?.focus(), 100);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={ICONOS_SUBTIPO[t] ?? 'list'}
                    size={14}
                    color={activo ? paleta.primario : paleta.textoSec}
                  />
                  <Text style={[estilos.textoChip, activo && estilos.textoChipActivo]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {subtipo === 'Otro' && (
            <TextInput
              ref={subtipoLibreRef}
              style={[estilos.input, estilos.inputMargen]}
              placeholder="Ej. Veterinario, Regalo..."
              value={subtipoLibre}
              onChangeText={setSubtipoLibre}
              placeholderTextColor={paleta.textoTenue}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => descripcionRef.current?.focus()}
            />
          )}

          <Text style={estilos.etiquetaCampo}>Descripción del gasto</Text>
          <TextInput
            ref={descripcionRef}
            style={estilos.input}
            placeholder="Ej. Mercado de la semana"
            value={descripcion}
            onChangeText={setDescripcion}
            placeholderTextColor={paleta.textoTenue}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => montoRef.current?.focus()}
          />

          <Text style={estilos.etiquetaCampo}>Monto</Text>
          <TextInput
            ref={montoRef}
            style={estilos.input}
            placeholder="Ej. 350.50"
            keyboardType="decimal-pad"
            returnKeyType="done"
            value={montoTexto}
            onChangeText={setMontoTexto}
            onSubmitEditing={guardarGasto}
            placeholderTextColor={paleta.textoTenue}
          />

          <TouchableOpacity style={estilos.botonFoto} onPress={elegirFoto} activeOpacity={0.85}>
            <Ionicons name="camera" size={18} color={paleta.primario} />
            <Text style={estilos.textoBotonFoto}>
              {fotoUri ? 'Cambiar foto del ticket' : 'Agregar foto del ticket (opcional)'}
            </Text>
          </TouchableOpacity>
          {fotoUri ? (
            <View style={estilos.filaFoto}>
              <Image source={{ uri: fotoUri }} style={estilos.previewFoto} />
              <TouchableOpacity onPress={() => setFotoUri(null)} activeOpacity={0.8}>
                <Text style={estilos.textoQuitarFoto}>Quitar foto</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={estilos.botonAgregar} onPress={guardarGasto} activeOpacity={0.85}>
            <Text style={estilos.textoBotonAgregar}>
              {editandoId ? 'Guardar cambios' : '+ Agregar gasto'}
            </Text>
          </TouchableOpacity>
          {editandoId ? (
            <TouchableOpacity
              style={estilos.botonCancelar}
              onPress={limpiarYVolver}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotonCancelar}>Cancelar edición</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Gastos fijos mensuales */}
        <View style={estilos.bloque}>
          <Text style={estilos.tituloBloque}>Gastos fijos de cada mes</Text>
          <Text style={estilos.textoAyuda}>
            Se agregan solos al abrir la app cada mes (renta, suscripciones, etc.).
          </Text>
          <TextInput
            style={[estilos.input, estilos.inputMargen]}
            placeholder="Ej. Renta"
            value={fijoDesc}
            onChangeText={setFijoDesc}
            placeholderTextColor={paleta.textoTenue}
            returnKeyType="next"
          />
          <TextInput
            style={[estilos.input, estilos.inputMargen]}
            placeholder="Ej. 5000"
            keyboardType="decimal-pad"
            returnKeyType="done"
            value={fijoMonto}
            onChangeText={setFijoMonto}
            onSubmitEditing={agregarFijo}
            placeholderTextColor={paleta.textoTenue}
          />
          <Text style={estilos.etiquetaCampo}>Categoría del fijo</Text>
          <View style={estilos.filaCategorias}>
            {ORDEN_CATEGORIAS.map((cat) => {
              const info = CATEGORIAS[cat];
              const activa = fijoCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    estilos.botonCategoria,
                    { borderColor: info.color },
                    activa && { backgroundColor: info.color },
                  ]}
                  onPress={() => setFijoCat(cat)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={ICONOS_CATEGORIA[cat]}
                    size={14}
                    color={activa ? '#FFFFFF' : info.color}
                  />
                  <Text
                    style={[estilos.textoBotonCategoria, { color: activa ? '#FFFFFF' : info.color }]}
                  >
                    {info.etiqueta}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={estilos.contenedorChips}>
            {SUBTIPOS.filter((t) => t !== 'Otro').map((t) => {
              const activo = fijoSubtipo === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[estilos.chipMini, activo && estilos.chipActivo]}
                  onPress={() => setFijoSubtipo(t)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={ICONOS_SUBTIPO[t] ?? 'list'}
                    size={12}
                    color={activo ? paleta.primario : paleta.textoSec}
                  />
                  <Text style={[estilos.textoChipMini, activo && estilos.textoChipActivo]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={estilos.botonAgregarFijo}
            onPress={agregarFijo}
            activeOpacity={0.85}
          >
            <Text style={estilos.textoBotonAgregarFijo}>+ Agregar gasto fijo</Text>
          </TouchableOpacity>
          {fijos.map((f) => {
            const infoFijo = CATEGORIAS[migrarCategoria(f.categoria)];
            return (
              <View key={f.id} style={estilos.filaFijo}>
                <View style={[estilos.iconoGasto, { backgroundColor: `${infoFijo.color}1A` }]}>
                  <Ionicons
                    name={
                      f.subtipo === 'Otro'
                        ? ICONOS_SUBTIPO.Otro
                        : ICONOS_SUBTIPO[f.subtipo] ?? ICONOS_SUBTIPO.General
                    }
                    size={18}
                    color={infoFijo.color}
                  />
                </View>
                <View style={estilos.infoGasto}>
                  <Text style={estilos.descripcionGasto} numberOfLines={1}>
                    {f.descripcion}
                  </Text>
                  <Text style={estilos.subFijo}>
                    {formatoMoneda(f.monto)} · {infoFijo.etiqueta} · {f.subtipo}
                  </Text>
                </View>
                <TouchableOpacity
                  style={estilos.botonQuitar}
                  onPress={() => eliminarFijo(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={estilos.textoQuitar}>Quitar</Text>
                </TouchableOpacity>
              </View>
            );
          })}
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
    botonRepetir: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: p.primario,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: p.primarioSuave,
      marginBottom: 12,
    },
    textoBotonRepetir: { flex: 1, color: p.primario, fontSize: 13, fontWeight: '700' },
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
    etiquetaCampo: {
      fontSize: 13,
      fontWeight: '600',
      color: p.textoSec,
      marginBottom: 6,
      marginTop: 8,
    },
    descripcionCategoria: { fontSize: 12, color: p.textoSec, fontStyle: 'italic', marginBottom: 8 },
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
    inputMargen: { marginTop: 8 },
    contenedorChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: p.chipFondo,
    },
    textoChipMini: { fontSize: 12, fontWeight: '600', color: p.textoSec },
    cuadriculaCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    tarjetaCategoria: { width: '48%', borderRadius: 14 },
    degradadoCategoria: { borderRadius: 14, padding: 10, borderWidth: 2, borderColor: '#FFFFFF' },
    degradadoApagado: { opacity: 0.55, borderColor: 'transparent' },
    filaTarjetaCategoria: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    textoTarjetaCategoria: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 6 },
    pctTarjetaCategoria: { color: '#FFFFFF', fontSize: 10, opacity: 0.9, marginTop: 1 },
    filaCategorias: { flexDirection: 'row', gap: 6, marginTop: 8 },
    botonCategoria: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
      borderWidth: 2,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textoBotonCategoria: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    botonFoto: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: p.primario,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 14,
      backgroundColor: p.primarioSuave,
    },
    textoBotonFoto: { color: p.primario, fontSize: 14, fontWeight: '700' },
    filaFoto: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
    previewFoto: { width: 64, height: 64, borderRadius: 10 },
    textoQuitarFoto: { color: p.peligroTexto, fontSize: 13, fontWeight: '700' },
    botonAgregar: {
      backgroundColor: '#111827',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 18,
    },
    textoBotonAgregar: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    botonCancelar: {
      borderWidth: 1.5,
      borderColor: p.borde,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    textoBotonCancelar: { color: p.textoSec, fontSize: 14, fontWeight: '700' },
    botonAgregarFijo: {
      backgroundColor: p.primarioSuave,
      borderWidth: 1.5,
      borderColor: p.primario,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    textoBotonAgregarFijo: { color: p.primario, fontSize: 14, fontWeight: '700' },
    filaFijo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
    },
    iconoGasto: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    infoGasto: { flex: 1 },
    descripcionGasto: { fontSize: 15, fontWeight: '600', color: p.texto },
    subFijo: { fontSize: 12, color: p.textoSec, marginTop: 2 },
    botonQuitar: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: p.peligroSuave,
    },
    textoQuitar: { color: p.peligroTexto, fontSize: 12, fontWeight: '700' },
    textoAyuda: { fontSize: 14, color: p.textoSec, fontStyle: 'italic' },
  });
