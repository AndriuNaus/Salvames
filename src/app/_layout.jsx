import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { FinanzasProvider, useFinanzas } from '../store';

function PuertaBloqueo({ children }) {
  const { bloqueo, cargado, paleta } = useFinanzas();
  const [desbloqueado, setDesbloqueado] = useState(false);

  const intentar = async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea tu app de gastos',
      });
      if (res.success) {
        setDesbloqueado(true);
      }
    } catch {
      Alert.alert('No disponible', 'No se pudo verificar en este dispositivo.');
    }
  };

  if (!cargado) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.fondo }]}>
        <StatusBar style={paleta.barra} />
        <Text style={[estilos.texto, { color: paleta.textoSec }]}>Cargando...</Text>
      </View>
    );
  }

  if (bloqueo && !desbloqueado) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.fondo }]}>
        <StatusBar style={paleta.barra} />
        <Text style={[estilos.titulo, { color: paleta.texto }]}>App bloqueada</Text>
        <Text style={[estilos.texto, { color: paleta.textoSec }]}>
          Usa tu huella o rostro para entrar.
        </Text>
        <TouchableOpacity style={estilos.boton} onPress={intentar} activeOpacity={0.85}>
          <Text style={estilos.textoBoton}>Desbloquear</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

export default function RootLayout() {
  return (
    <FinanzasProvider>
      <PuertaBloqueo>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </PuertaBloqueo>
    </FinanzasProvider>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  texto: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  boton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    minHeight: 60,
    justifyContent: 'center',
  },
  textoBoton: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
});
