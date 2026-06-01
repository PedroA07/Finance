import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RELEASES_URL = 'https://github.com/PedroA07/Finance/releases/latest';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  income: '#22C55E',
  expense: '#EF4444',
  accent: '#6366F1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#334155',
  warning: '#F59E0B',
};

export default function SettingsScreen() {
  const { transactions, totalIncome, totalExpense, balance } = useFinance();

  const openReleases = () => {
    Linking.openURL(RELEASES_URL).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o navegador.')
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpar todos os dados',
      'Isso removerá TODAS as suas transações. Não pode ser desfeito. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo', style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Pronto', 'Dados limpos. Reinicie o app.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      {/* Resumo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo Geral</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total de transações</Text>
          <Text style={styles.statValue}>{transactions.length}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total entradas</Text>
          <Text style={[styles.statValue, { color: COLORS.income }]}>{formatCurrency(totalIncome)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total saídas</Text>
          <Text style={[styles.statValue, { color: COLORS.expense }]}>{formatCurrency(totalExpense)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Saldo atual</Text>
          <Text style={[styles.statValue, { color: balance >= 0 ? COLORS.income : COLORS.expense }]}>
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>

      {/* Atualizações */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Atualizações do App</Text>
        <Text style={styles.cardDesc}>
          A cada nova versão publicada no repositório, um APK novo fica disponível
          no mesmo link. Toque abaixo para baixar a versão mais recente.
        </Text>
        <TouchableOpacity style={styles.updateBtn} onPress={openReleases}>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.updateBtnText}>Baixar última versão</Text>
        </TouchableOpacity>
      </View>

      {/* Repositório */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Repositório</Text>
        <TouchableOpacity style={styles.repoRow} onPress={openReleases}>
          <Ionicons name="logo-github" size={20} color={COLORS.muted} />
          <Text style={styles.repoUrl}>github.com/PedroA07/Finance</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, { borderColor: COLORS.expense }]}>
        <Text style={[styles.cardTitle, { color: COLORS.expense }]}>Zona de Perigo</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
          <Ionicons name="trash" size={18} color={COLORS.expense} />
          <Text style={styles.dangerBtnText}>Limpar Todos os Dados</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.aboutRow}>
        <Text style={styles.aboutText}>Fiance v1.0.0 • Feito com Expo</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  card: {
    marginHorizontal: 20, marginBottom: 16, padding: 20,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardDesc: { fontSize: 13, color: COLORS.muted, marginBottom: 12, lineHeight: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E2940' },
  statLabel: { color: COLORS.muted, fontSize: 14 },
  statValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.accent, borderRadius: 12, padding: 12,
  },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  updateStatus: { marginTop: 10, color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  repoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  repoUrl: { color: COLORS.accent, fontSize: 14 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.expense, borderRadius: 12,
    padding: 12, justifyContent: 'center',
  },
  dangerBtnText: { color: COLORS.expense, fontSize: 15, fontWeight: '600' },
  aboutRow: { alignItems: 'center', paddingVertical: 16 },
  aboutText: { color: COLORS.muted, fontSize: 12 },
});
