import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Linking, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { useUpdates } from '../context/UpdatesContext';
import { formatCurrency } from '../utils/formatters';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RELEASES_URL = 'https://github.com/PedroA07/Finance/releases/latest';

const COLORS = {
  bg: '#0F172A', card: '#1E293B', input: '#243044',
  income: '#22C55E', expense: '#EF4444', invest: '#38BDF8', accent: '#6366F1',
  text: '#F1F5F9', muted: '#94A3B8', border: '#334155', warning: '#F59E0B',
};

const CAT_TYPES = [
  { key: 'expense', label: 'Despesas', color: COLORS.expense },
  { key: 'income', label: 'Receitas', color: COLORS.income },
  { key: 'investment', label: 'Investimentos', color: COLORS.invest },
];

export default function SettingsScreen({ navigation }) {
  const {
    transactions, recurring, installments, categories, paymentMethods,
    addCategory, removeCategory, addPaymentMethod, removePaymentMethod,
    totalIncome, totalExpense, balance,
  } = useFinance();
  const { current, checking, updateAvailable, remote, lastChecked, checkNow, openInstall } = useUpdates();

  const [newCat, setNewCat] = useState({ expense: '', income: '', investment: '' });
  const [newPm, setNewPm] = useState('');

  const openReleases = () => {
    Linking.openURL(RELEASES_URL).catch(() => Alert.alert('Erro', 'Não foi possível abrir o navegador.'));
  };

  const handleAddCat = async (type) => {
    await addCategory(type, newCat[type]);
    setNewCat(c => ({ ...c, [type]: '' }));
  };

  const handleAddPm = async () => {
    await addPaymentMethod(newPm);
    setNewPm('');
  };

  const handleClearData = () => {
    Alert.alert('Limpar todos os dados',
      'Isso removerá TODOS os lançamentos, recorrentes e parcelados. Não pode ser desfeito. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar tudo', style: 'destructive',
          onPress: async () => { await AsyncStorage.clear(); Alert.alert('Pronto', 'Dados limpos. Reinicie o app.'); },
        },
      ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>Config</Text></View>

      {/* Resumo */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo geral (todos os tempos)</Text>
        <Row label="Lançamentos" value={String(transactions.length)} />
        <Row label="Recorrentes" value={String(recurring.length)} />
        <Row label="Parcelados" value={String(installments.length)} />
        <Row label="Total entradas" value={formatCurrency(totalIncome)} color={COLORS.income} />
        <Row label="Total saídas" value={formatCurrency(totalExpense)} color={COLORS.expense} />
        <Row label="Saldo" value={formatCurrency(balance)} color={balance >= 0 ? COLORS.income : COLORS.expense} />
      </View>

      {/* Atalhos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gerenciar</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Recurring')}>
          <Ionicons name="repeat" size={20} color={COLORS.accent} />
          <Text style={styles.linkText}>Recorrentes</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Installments')}>
          <Ionicons name="card" size={20} color={COLORS.accent} />
          <Text style={styles.linkText}>Parcelados</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.linkRow, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('Import')}>
          <Ionicons name="cloud-upload" size={20} color={COLORS.accent} />
          <Text style={styles.linkText}>Importar extrato/fatura</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      {/* Categorias */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Categorias</Text>
        {CAT_TYPES.map(({ key, label, color }) => (
          <View key={key} style={styles.catGroup}>
            <Text style={[styles.catGroupLabel, { color }]}>{label}</Text>
            <View style={styles.chipGrid}>
              {(categories[key] || []).map(c => (
                <View key={c} style={styles.tagChip}>
                  <Text style={styles.tagText}>{c}</Text>
                  <TouchableOpacity onPress={() => removeCategory(key, c)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder={`Nova categoria de ${label.toLowerCase()}`}
                placeholderTextColor={COLORS.muted}
                value={newCat[key]}
                onChangeText={t => setNewCat(c => ({ ...c, [key]: t }))}
                onSubmitEditing={() => handleAddCat(key)}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addMiniBtn} onPress={() => handleAddCat(key)}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Formas de pagamento */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Formas de pagamento</Text>
        <View style={styles.chipGrid}>
          {paymentMethods.map(pm => (
            <View key={pm} style={styles.tagChip}>
              <Text style={styles.tagText}>{pm}</Text>
              <TouchableOpacity onPress={() => removePaymentMethod(pm)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Nova forma de pagamento"
            placeholderTextColor={COLORS.muted}
            value={newPm}
            onChangeText={setNewPm}
            onSubmitEditing={handleAddPm}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addMiniBtn} onPress={handleAddPm}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Atualizações */}
      <View style={[styles.card, updateAvailable && { borderColor: COLORS.accent }]}>
        <Text style={styles.cardTitle}>Atualizações do app</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Versão instalada</Text>
          <Text style={styles.statValue}>v{current?.version} ({current?.sha})</Text>
        </View>
        {checking ? (
          <Text style={styles.cardDesc}>Verificando atualizações…</Text>
        ) : updateAvailable ? (
          <>
            <Text style={[styles.cardDesc, { color: COLORS.accent, marginTop: 12 }]}>
              Nova versão disponível{remote?.version ? ` (v${remote.version})` : ''}! Toque para baixar e instalar.
            </Text>
            <TouchableOpacity style={styles.updateBtn} onPress={openInstall}>
              <Ionicons name="cloud-download" size={20} color="#fff" />
              <Text style={styles.updateBtnText}>Atualizar agora</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.cardDesc, { marginTop: 12 }]}>
              {lastChecked ? 'Você está na versão mais recente. ✓' : 'A cada nova versão publicada, um APK novo fica disponível.'}
            </Text>
            <TouchableOpacity style={styles.updateBtnAlt} onPress={() => checkNow({ silent: false })}>
              <Ionicons name="refresh" size={18} color={COLORS.accent} />
              <Text style={styles.updateBtnAltText}>Verificar atualização</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.releasesLink} onPress={openReleases}>
          <Ionicons name="open-outline" size={16} color={COLORS.muted} />
          <Text style={styles.releasesLinkText}>Abrir página de releases</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, { borderColor: COLORS.expense }]}>
        <Text style={[styles.cardTitle, { color: COLORS.expense }]}>Zona de perigo</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearData}>
          <Ionicons name="trash" size={18} color={COLORS.expense} />
          <Text style={styles.dangerBtnText}>Limpar todos os dados</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.aboutRow}><Text style={styles.aboutText}>Fiance v1.0.0 • Feito com Expo</Text></View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({ label, value, color }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  card: {
    marginHorizontal: 20, marginBottom: 16, padding: 20,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  cardDesc: { fontSize: 13, color: COLORS.muted, marginBottom: 12, lineHeight: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E2940' },
  statLabel: { color: COLORS.muted, fontSize: 14 },
  statValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E2940' },
  linkText: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '600' },
  catGroup: { marginBottom: 16 },
  catGroupLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.input, borderRadius: 20, paddingLeft: 12, paddingRight: 8, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tagText: { color: COLORS.text, fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addInput: {
    flex: 1, backgroundColor: COLORS.input, color: COLORS.text, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  addMiniBtn: { backgroundColor: COLORS.accent, width: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.accent, borderRadius: 12, padding: 12,
  },
  updateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  updateBtnAlt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 12, padding: 11,
  },
  updateBtnAltText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
  releasesLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  releasesLinkText: { color: COLORS.muted, fontSize: 13 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.expense, borderRadius: 12, padding: 12, justifyContent: 'center',
  },
  dangerBtnText: { color: COLORS.expense, fontSize: 15, fontWeight: '600' },
  aboutRow: { alignItems: 'center', paddingVertical: 16 },
  aboutText: { color: COLORS.muted, fontSize: 12 },
});
