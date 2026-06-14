import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, maskCurrencyInput, unmaskCurrency, maskCurrencyFromNumber } from '../utils/formatters';

const COLORS = {
  bg: '#0F172A', card: '#1E293B', input: '#243044',
  income: '#22C55E', expense: '#EF4444', invest: '#38BDF8', accent: '#6366F1',
  text: '#F1F5F9', muted: '#94A3B8', border: '#334155',
};

const TYPES = [
  { key: 'expense', label: 'Despesa', icon: 'arrow-up-circle', color: COLORS.expense },
  { key: 'income', label: 'Receita', icon: 'arrow-down-circle', color: COLORS.income },
  { key: 'investment', label: 'Investir', icon: 'wallet', color: COLORS.invest },
];
const typeColor = (t) => (TYPES.find(x => x.key === t) || TYPES[0]).color;

const emptyForm = { type: 'expense', amount: '', description: '', category: '', paymentMethod: '', active: true };

export default function RecurringScreen({ navigation }) {
  const {
    recurring, categories, paymentMethods,
    addRecurring, editRecurring, removeRecurring, toggleRecurring,
  } = useFinance();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      type: item.type || 'expense', amount: maskCurrencyFromNumber(item.amount),
      description: item.description || '', category: item.category || '',
      paymentMethod: item.paymentMethod || '', active: item.active !== false,
    });
    setShowForm(true);
  };

  const save = async () => {
    const amount = unmaskCurrency(form.amount);
    if (!amount || amount <= 0) return Alert.alert('Erro', 'Informe um valor válido.');
    if (!form.description.trim()) return Alert.alert('Erro', 'Informe uma descrição.');
    if (!form.category) return Alert.alert('Erro', 'Selecione uma categoria.');
    const payload = {
      type: form.type, amount, description: form.description.trim(),
      category: form.category, paymentMethod: form.paymentMethod, active: form.active,
    };
    if (editingId) await editRecurring(editingId, payload);
    else await addRecurring(payload);
    setShowForm(false);
  };

  const confirmRemove = (item) => {
    Alert.alert('Remover recorrente', `Remover "${item.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeRecurring(item.id) },
    ]);
  };

  const monthlyByType = (type) => recurring
    .filter(r => r.active !== false && r.type === type)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const availableCategories = categories[form.type] || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Recorrentes</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Entram automaticamente em todo mês.</Text>

      {/* Resumo mensal */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Receitas/mês</Text>
          <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatCurrency(monthlyByType('income'))}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Despesas/mês</Text>
          <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatCurrency(monthlyByType('expense'))}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Investir/mês</Text>
          <Text style={[styles.summaryValue, { color: COLORS.invest }]}>{formatCurrency(monthlyByType('investment'))}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {recurring.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="repeat" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>Nenhum recorrente. Toque em + para adicionar contas fixas (aluguel, assinaturas, salário...).</Text>
          </View>
        ) : recurring.map(item => (
          <View key={item.id} style={[styles.itemCard, item.active === false && { opacity: 0.55 }]}>
            <View style={[styles.dot, { backgroundColor: typeColor(item.type) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={styles.itemMeta}>
                {[item.category, item.paymentMethod].filter(Boolean).join(' • ')}
              </Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.itemValue, { color: typeColor(item.type) }]}>{formatCurrency(item.amount)}</Text>
              <View style={styles.itemActions}>
                <Switch
                  value={item.active !== false}
                  onValueChange={() => toggleRecurring(item.id)}
                  trackColor={{ true: COLORS.accent, false: COLORS.border }}
                  thumbColor="#fff"
                />
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.smallBtn}>
                  <Ionicons name="pencil" size={15} color={COLORS.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmRemove(item)} style={styles.smallBtn}>
                  <Ionicons name="trash" size={15} color={COLORS.expense} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal de formulário */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Novo'} recorrente</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeRow}>
                {TYPES.map(t => {
                  const active = form.type === t.key;
                  return (
                    <TouchableOpacity key={t.key}
                      style={[styles.typeBtn, active && { backgroundColor: COLORS.input, borderColor: t.color }]}
                      onPress={() => set({ type: t.key, category: '' })}>
                      <Ionicons name={t.icon} size={18} color={active ? t.color : COLORS.muted} />
                      <Text style={[styles.typeText, active && { color: t.color }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Valor por mês (R$)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="0,00"
                placeholderTextColor={COLORS.muted} value={form.amount}
                onChangeText={t => set({ amount: maskCurrencyInput(t) })} />

              <Text style={styles.label}>Descrição</Text>
              <TextInput style={styles.input} placeholder="Ex: Aluguel, Netflix, Salário"
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

              <Text style={styles.label}>Forma de pagamento (opcional)</Text>
              <View style={styles.chipGrid}>
                {paymentMethods.map(pm => (
                  <TouchableOpacity key={pm} style={[styles.chip, form.paymentMethod === pm && styles.chipActive]}
                    onPress={() => set({ paymentMethod: form.paymentMethod === pm ? '' : pm })}>
                    <Text style={[styles.chipText, form.paymentMethod === pm && styles.chipTextActive]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.activeRow}>
                <Text style={styles.label}>Ativo (entra todo mês)</Text>
                <Switch value={form.active} onValueChange={v => set({ active: v })}
                  trackColor={{ true: COLORS.accent, false: COLORS.border }} thumbColor="#fff" />
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
  subtitle: { color: COLORS.muted, fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  summaryCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  summaryLabel: { color: COLORS.muted, fontSize: 11 },
  summaryValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 50, gap: 14, paddingHorizontal: 30 },
  emptyText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  itemDesc: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  itemMeta: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemValue: { fontSize: 14, fontWeight: '700' },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  smallBtn: { padding: 4 },
  // modal
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '90%', borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10,
    borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  typeText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  label: { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.input },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 15, marginTop: 20,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
