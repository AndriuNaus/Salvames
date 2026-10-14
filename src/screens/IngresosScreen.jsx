import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import {
  CATEGORIAS,
  ORDEN_CATEGORIAS,
  claveMesActual,
  etiquetaDeClaveMes,
  etiquetaMesActual,
  formatoMoneda,
  aNumero,
  nuevoId,
} from '../constants';
import { persistirIngreso, useFinanzas } from '../store';

const animar = () => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export default function IngresosScreen() {
  const {
    paleta,
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
    porcentajes,
  } = useFinanzas();

  const sueldoRef = useRef(null);
  const extraNombreRef = useRef(null);
  const extraMontoRef = useRef(null);
  const [extraNombre, setExtraNombre] = useState('');
  const [extraMonto, setExtraMonto] = useState('');
  const estilos = makeStyles(paleta);

  const guardarIngreso = async () => {
    const ok = await persistirIngreso({
      sueldoTexto,
      repetirCadaMes,
      setSueldo,
      setMesIngreso,
    });
    if (ok) {
      animar();
      // Limpia el campo tras guardar: el monto queda aplicado al mes y se ve en
      // la tarjeta de "Ingreso total", así el campo queda listo para otro dato.
      setSueldoTexto('');
    }
  };

  // Registra el ingreso total del mes en el historial para que quede constancia.
  // Si ya existe un registro de ese mes, actualiza el monto.
  const registrarIngreso = () => {
    if (totalIngreso <= 0) {
      Alert.alert(
        'Falta tu ingreso',
        'Primero guarda tu ingreso con el botón Guardar ingreso.'
      );
      return;
    }
    const mes = mesIngreso || claveMesActual();
    animar();
    setHistorialIngresos((previos) => {
      const existente = previos.find((h) => h.mes === mes);
      if (existente) {
        return previos.map((h) =>
          h.mes === mes ? { ...h, monto: totalIngreso, fecha: new Date().toISOString() } : h
        );
      }
      return [
        {
          id: nuevoId(),
          monto: totalIngreso,
          mes,
          fecha: new Date().toISOString(),
        },
        ...previos,
      ];
    });
  };

  const agregarExtra = () => {
    const monto = aNumero(extraMonto);
    if (!extraNombre.trim()) {
      Alert.alert('Falta el nombre', 'Ej. Freelance, Ventas, Bono.');
      extraNombreRef.current?.focus();
      return;
    }
    if (monto <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
      extraMontoRef.current?.focus();
      return;
    }
    animar();
    setExtras((previos) => [
      {
        id: nuevoId(),
        nombre: extraNombre.trim(),
        monto,
      },
      ...previos,
    ]);
    setExtraNombre('');
    setExtraMonto('');
  };

  const eliminarExtra = (id) => {
    animar();
    setExtras((p) => p.filter((e) => e.id !== id));
  };

  const eliminarIngresoHistorial = (id) => {
    Alert.alert('Quitar registro', '¿Quitar este ingreso del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          animar();
          setHistorialIngresos((p) => p.filter((h) => h.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={estilos.contenedor}>
      <StatusBar style={paleta.barra} />
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={estilos.listaContenido}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={90}
        >
          <Text style={estilos.titulo}>Ingresos</Text>
          <Text style={estilos.subtitulo}>
            Tu sueldo base para el reparto{' '}
            {ORDEN_CATEGORIAS.map((c) =>
              Math.round((porcentajes[c] ?? CATEGORIAS[c].porcentaje) * 100)
            ).join(' / ')}
          </Text>

          <View style={estilos.bloque}>
            <Text style={estilos.etiquetaCampo}>Sueldo o Ingreso Mensual</Text>
            <Text style={estilos.textoMes}>Mes: {etiquetaMesActual()}</Text>
            <TextInput
              ref={sueldoRef}
              style={estilos.input}
              placeholder="Ej. 15000"
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={sueldoTexto}
              onChangeText={setSueldoTexto}
              onSubmitEditing={guardarIngreso}
              placeholderTextColor={paleta.textoTenue}
            />
            <View style={estilos.filaMensual}>
              <Text style={estilos.textoMensual}>Guardar cada mes</Text>
              <Switch value={repetirCadaMes} onValueChange={cambiarRepetir} />
            </View>
            <TouchableOpacity
              style={estilos.botonPrincipal}
              onPress={guardarIngreso}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotonPrincipal}>
                {sueldo > 0 ? 'Cambiar ingreso' : 'Guardar ingreso'}
              </Text>
              <Text style={estilos.subBotonPrincipal}>
                Se aplica a {etiquetaMesActual()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={estilos.botonSecundario}
              onPress={registrarIngreso}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotonSecundario}>
                Registrar en historial
              </Text>
              <Text style={estilos.subBotonSecundario}>
                Guarda una constancia del mes
              </Text>
            </TouchableOpacity>
            {totalIngreso > 0 && (
              <View style={estilos.tarjetaIngreso}>
                <Text style={estilos.tarjetaIngresoEtiqueta}>
                  Ingreso total de{' '}
                  {mesIngreso ? etiquetaDeClaveMes(mesIngreso) : etiquetaMesActual()}
                </Text>
                <Text style={estilos.tarjetaIngresoMonto}>{formatoMoneda(totalIngreso)}</Text>
                <Text style={estilos.tarjetaIngresoNota}>
                  Base {formatoMoneda(sueldo)}
                  {extras.length > 0
                    ? ` + extras ${formatoMoneda(
                        extras.reduce((s, e) => s + (Number(e.monto) || 0), 0)
                      )}`
                    : ''}
                  {' · '}
                  {repetirCadaMes ? 'Se repite cada mes' : 'Solo este mes'}
                </Text>
              </View>
            )}
          </View>

          <View style={estilos.bloque}>
            <Text style={estilos.tituloBloque}>Fuentes de ingreso extra</Text>
            <Text style={estilos.textoAyuda}>
              Suma freelance, bonos u otros ingresos al total del mes.
            </Text>
            <TextInput
              ref={extraNombreRef}
              style={[estilos.input, estilos.inputMargen]}
              placeholder="Ej. Freelance"
              value={extraNombre}
              onChangeText={setExtraNombre}
              placeholderTextColor={paleta.textoTenue}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => extraMontoRef.current?.focus()}
            />
            <TextInput
              ref={extraMontoRef}
              style={[estilos.input, estilos.inputMargen]}
              placeholder="Ej. 2000"
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={extraMonto}
              onChangeText={setExtraMonto}
              onSubmitEditing={agregarExtra}
              placeholderTextColor={paleta.textoTenue}
            />
            <TouchableOpacity
              style={estilos.botonSecundario}
              onPress={agregarExtra}
              activeOpacity={0.85}
            >
              <Text style={estilos.textoBotonSecundario}>Agregar fuente</Text>
              <Text style={estilos.subBotonSecundario}>Se suma al total del mes</Text>
            </TouchableOpacity>
            {extras.map((e) => (
              <View key={e.id} style={estilos.filaHistorial}>
                <View style={estilos.infoFila}>
                  <Text style={estilos.montoFila} numberOfLines={1}>
                    {e.nombre}
                  </Text>
                  <Text style={estilos.subFila}>{formatoMoneda(e.monto)}</Text>
                </View>
                <TouchableOpacity
                  style={estilos.botonQuitar}
                  onPress={() => eliminarExtra(e.id)}
                  activeOpacity={0.8}
                >
                  <Text style={estilos.textoQuitar}>Quitar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={estilos.bloque}>
            <Text style={estilos.tituloBloque}>Historial de ingresos</Text>
            {historialIngresos.length === 0 ? (
              <Text style={estilos.textoAyuda}>
                Aún no hay ingresos registrados. Pulsa Registrar ingreso en historial para
                guardar el actual.
              </Text>
            ) : (
              historialIngresos.map((h) => (
                <View key={h.id} style={estilos.filaHistorial}>
                  <View style={estilos.infoFila}>
                    <Text style={estilos.montoFila} numberOfLines={1}>
                      {formatoMoneda(h.monto)}
                    </Text>
                    <Text style={estilos.subFila}>{etiquetaDeClaveMes(h.mes)}</Text>
                  </View>
                  <TouchableOpacity
                    style={estilos.botonQuitar}
                    onPress={() => eliminarIngresoHistorial(h.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={estilos.textoQuitar}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
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
    textoMes: {
      fontSize: 13,
      color: p.textoSec,
      marginBottom: 8,
      textTransform: 'capitalize',
    },
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
    filaMensual: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    textoMensual: { fontSize: 14, fontWeight: '600', color: p.texto },
    botonPrincipal: {
      backgroundColor: '#2563EB',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 14,
      minHeight: 68,
      justifyContent: 'center',
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    textoBotonPrincipal: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    subBotonPrincipal: {
      color: '#FFFFFF',
      fontSize: 12,
      opacity: 0.85,
      marginTop: 2,
      textTransform: 'capitalize',
    },
    botonSecundario: {
      borderWidth: 2,
      borderColor: p.primario,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginTop: 12,
      minHeight: 64,
      justifyContent: 'center',
      backgroundColor: p.primarioSuave,
    },
    textoBotonSecundario: { color: p.primario, fontSize: 17, fontWeight: '800' },
    subBotonSecundario: { color: p.textoSec, fontSize: 12, marginTop: 2 },
    inputMargen: { marginTop: 8 },
    tarjetaIngreso: {
      marginTop: 14,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
    },
    tarjetaIngresoEtiqueta: {
      fontSize: 13,
      color: p.textoSec,
      textTransform: 'capitalize',
    },
    tarjetaIngresoMonto: {
      fontSize: 30,
      fontWeight: '800',
      color: p.texto,
      marginVertical: 4,
    },
    tarjetaIngresoNota: { fontSize: 12, color: p.textoSec },
    textoAyuda: { fontSize: 14, color: p.textoSec, fontStyle: 'italic' },
    filaHistorial: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.chipFondo,
      borderWidth: 1,
      borderColor: p.borde,
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
      marginBottom: 8,
    },
    infoFila: { flex: 1 },
    montoFila: { fontSize: 15, fontWeight: '600', color: p.texto },
    subFila: { fontSize: 12, color: p.textoSec, marginTop: 2, textTransform: 'capitalize' },
    botonQuitar: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: p.peligroSuave,
    },
    textoQuitar: { color: p.peligroTexto, fontSize: 12, fontWeight: '700' },
  });
