import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';
import {
  installmentInfo, installmentsTotalForMonth, currentMonthKey, labelMonth,
} from '../utils/finance';

const COLORS = {
  bg: '#0F172A', card: '#1E293B', input: '#243044',
  expense: '#EF4444', accent: '#6366F1', warning: '#F59E0B', done: '#22C55E',
  text: '#F1F5F9', muted: '#94A3B8', border: '#334155',
};

const STATUS_COLOR = { 'A iniciar': COLORS.warning, 'Em andamento': COLORS.accent, 'Quitada': COLORS.done };

const monthKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function InstallmentsScreen({ navigation }) {
  const {
    installments, categories, paymentMethods,
    addInstallment, editInstallment, removeInstallment,
  } = useFinance();

  const thisMonth = currentMonthKey();
  const emptyForm = {
    description: '', category: '', installmentValue: '',
    firstMonth: thisMonth, totalInstallments: '', paymentMethod: '',
  };

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      description: item.description || '', category: item.category || '',
      installmentValue: String(item.installmentValue ?? ''),
      firstMonth: item.firstMonth || thisMonth,
      totalInstallments: String(item.totalInstallments ?? ''),
      paymentMethod: item.paymentMethod || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    const installmentValue = parseFloat(String(form.installmentValue).replace(',', '.'));
    const totalInstallments = parseInt(form.totalInstallments, 10);
    if (!form.description.trim()) return Alert.alert('Erro', 'Informe uma descrição.');
    if (!form.category) return Alert.alert('Erro', 'Selecione uma categoria.');
    if (!installmentValue || installmentValue <= 0) return Alert.alert('Erro', 'Informe o valor da parcela.');
    if (!monthKeyRegex.test(form.firstMonth)) return Alert.alert('Erro', 'Mês da 1ª parcela inválido. Use AAAA-MM (ex.: 2026-06).');
    if (!totalInstallments || totalInstallments < 1) return Alert.alert('Erro', 'Informe o total de parcelas.');
    const payload = {
      description: form.description.trim(), category: form.category,
      installmentValue, firstMonth: form.firstMonth, totalInstallments,
      paymentMethod: form.paymentMethod,
    };
    if (editingId) await editInstallment(editingId, payload);
    else await addInstallment(payload);
    setShowForm(false);
  };

  const confirmRemove = (item) => {
    Alert.alert('Remover parcelado', `Remover "${item.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeInstallment(item.id) },
    ]);
  };

  const totalThisMonth = installmentsTotalForMonth(installments, thisMonth);
  const availableCategories = categories.expense || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Parcelados</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Informe o mês da 1ª parcela e o total — o app calcula sozinho a parcela atual.</Text>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Em parcelas neste mês ({labelMonth(thisMonth)})</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalThisMonth)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {installments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>Nenhuma compra parcelada. Toque em + para adicionar (ex.: celular em 12x).</Text>
          </View>
        ) : installments.map(item => {
          const info = installmentInfo(item, thisMonth);
          const statusColor = STATUS_COLOR[info.status] || COLORS.muted;
          const statusText = info.status === 'Em andamento'
            ? `Parcela ${info.currentNumber}/${info.total}`
            : info.status;
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemMeta}>{[item.category, item.paymentMethod].filter(Boolean).join(' • ')}</Text>
                <View style={styles.badgesRow}>
                  <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                  {info.status !== 'Quitada' && (
                    <Text style={styles.remaining}>Restam {info.remainingCount}x · {formatCurrency(info.remainingValue)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemValue}>{formatCurrency(item.installmentValue)}</Text>
                <Text style={styles.perMonth}>por mês</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.smallBtn}>
                    <Ionicons name="pencil" size={15} color={COLORS.muted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmRemove(item)} style={styles.smallBtn}>
                    <Ionicons name="trash" size={15} color={COLORS.expense} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Modal de formulário */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'} parcelado</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput style={styles.input} placeholder="Ex: Celular, Geladeira"
                placeholderTextColor={COLORS.muted} value={form.description}
                onChangeText={t => set({ description: t })} />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.chipGrid}>
                {availableCategories.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, form.category === c && styles.chipActive]}
                    onPress={() => set({ category: c })}>
                    <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Valor da parcela (R$)</Text>
                  <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="0,00"
                    placeholderTextColor={COLORS.muted} value={form.installmentValue}
                    onChangeText={t => set({ installmentValue: t.replace(/[^0-9,.]/g, '').replace(',', '.') })} />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.label}>Nº parcelas</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" placeholder="12"
                    placeholderTextColor={COLORS.muted} value={form.totalInstallments}
                    onChangeText={t => set({ totalInstallments: t.replace(/[^0-9]/g, '') })} />
                </View>
              </View>

              <Text style={styles.label}>Mês da 1ª parcela (AAAA-MM)</Text>
              <TextInput style={styles.input} placeholder="2026-06" autoCapitalize="none"
                placeholderTextColor={COLORS.muted} value={form.firstMonth}
                onChangeText={t => set({ firstMonth: t.replace(/[^0-9-]/g, '') })} />

              <Text style={styles.label}>Forma de pagamento (opcional)</Text>
              <View style={styles.chipGrid}>
                {paymentMethods.map(pm => (
                  <TouchableOpacity key={pm} style={[styles.chip, form.paymentMethod === pm && styles.chipActive]}
                    onPress={() => set({ paymentMethod: form.paymentMethod === pm ? '' : pm })}>
                    <Text style={[styles.chipText, form.paymentMethod === pm && styles.chipTextActive]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveText}>{editingId ? 'Salvar' : 'Adicionar'}</Text>
              </TouchableOpacity>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 4,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.accent, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: COLORS.muted, fontSize: 13, paddingHorizontal: 20, marginBottom: 12, lineHeight: 18 },
  totalCard: {
    marginHorizontal: 16, marginBottom: 4, padding: 16, backgroundColor: COLORS.card,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  totalLabel: { color: COLORS.muted, fontSize: 13 },
  totalValue: { color: COLORS.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 50, gap: 14, paddingHorizontal: 30 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  itemCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  itemDesc: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  itemMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  remaining: { color: COLORS.muted, fontSize: 12 },
  itemRight: { alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 10 },
  itemValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  perMonth: { color: COLORS.muted, fontSize: 10 },
  itemActions: { flexDirection: 'row', gap: 4, marginTop: 8 },
  smallBtn: { padding: 4 },
  // modal
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%', borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  label: { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  twoCols: { flexDirection: 'row', gap: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.input },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 15, marginTop: 20,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
