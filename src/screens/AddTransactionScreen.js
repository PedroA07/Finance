import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  income: '#22C55E',
  expense: '#EF4444',
  invest: '#38BDF8',
  accent: '#6366F1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#334155',
  input: '#243044',
};

const TYPES = [
  { key: 'expense', label: 'Despesa', icon: 'arrow-up-circle', color: COLORS.expense },
  { key: 'income', label: 'Receita', icon: 'arrow-down-circle', color: COLORS.income },
  { key: 'investment', label: 'Investir', icon: 'wallet', color: COLORS.invest },
];

export default function AddTransactionScreen({ navigation, route }) {
  const { addTransaction, editTransaction, categories, paymentMethods } = useFinance();
  const editing = route?.params?.transaction;

  const [type, setType] = useState(editing?.type || 'expense');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [description, setDescription] = useState(editing?.description || '');
  const [category, setCategory] = useState(editing?.category || '');
  const [paymentMethod, setPaymentMethod] = useState(editing?.paymentMethod || '');
  const [date, setDate] = useState(editing?.date || new Date().toISOString().split('T')[0]);

  const availableCategories = categories[type] || [];

  const handleAmountChange = (text) => {
    setAmount(text.replace(/[^0-9,.]/g, '').replace(',', '.'));
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erro', 'Informe uma descrição.');
      return;
    }
    if (!category) {
      Alert.alert('Erro', 'Selecione uma categoria.');
      return;
    }

    const tx = {
      type, amount: parsedAmount, description: description.trim(),
      category, paymentMethod, date,
    };

    if (editing) await editTransaction(editing.id, tx);
    else await addTransaction(tx);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{editing ? 'Editar' : 'Novo'} Lançamento</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tipo */}
        <View style={styles.typeRow}>
          {TYPES.map(t => {
            const active = type === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, active && { backgroundColor: COLORS.input, borderColor: t.color }]}
                onPress={() => { setType(t.key); setCategory(''); }}
              >
                <Ionicons name={t.icon} size={20} color={active ? t.color : COLORS.muted} />
                <Text style={[styles.typeBtnText, active && { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Valor */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Valor (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor={COLORS.muted}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
          />
        </View>

        {/* Descrição */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mercado, Salário..."
            placeholderTextColor={COLORS.muted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Data */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-06-13"
            placeholderTextColor={COLORS.muted}
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Categoria */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.chipGrid}>
            {availableCategories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
            {availableCategories.length === 0 && (
              <Text style={styles.hint}>Adicione categorias na aba Config.</Text>
            )}
          </View>
        </View>

        {/* Forma de pagamento */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Forma de pagamento (opcional)</Text>
          <View style={styles.chipGrid}>
            {paymentMethods.map(pm => (
              <TouchableOpacity
                key={pm}
                style={[styles.chip, paymentMethod === pm && styles.chipActive]}
                onPress={() => setPaymentMethod(paymentMethod === pm ? '' : pm)}
              >
                <Text style={[styles.chipText, paymentMethod === pm && styles.chipTextActive]}>{pm}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{editing ? 'Salvar Alterações' : 'Adicionar'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, marginBottom: 24 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 12, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  fieldCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  label: { fontSize: 12, color: COLORS.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontSize: 16, color: COLORS.text, backgroundColor: COLORS.input,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.input,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { color: COLORS.muted, fontSize: 13, fontStyle: 'italic' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 16, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
