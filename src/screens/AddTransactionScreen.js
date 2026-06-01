import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency } from '../utils/formatters';

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  income: '#22C55E',
  expense: '#EF4444',
  accent: '#6366F1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#334155',
  input: '#243044',
};

export default function AddTransactionScreen({ navigation, route }) {
  const { addTransaction, editTransaction, categories } = useFinance();
  const editing = route?.params?.transaction;

  const [type, setType] = useState(editing?.type || 'expense');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [description, setDescription] = useState(editing?.description || '');
  const [category, setCategory] = useState(editing?.category || '');
  const [date, setDate] = useState(editing?.date || new Date().toISOString().split('T')[0]);

  const availableCategories = categories[type] || [];

  const handleAmountChange = (text) => {
    const cleaned = text.replace(/[^0-9,]/g, '').replace(',', '.');
    setAmount(cleaned);
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

    const tx = { type, amount: parsedAmount, description: description.trim(), category, date };

    if (editing) {
      await editTransaction(editing.id, tx);
    } else {
      await addTransaction(tx);
    }
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
          <Text style={styles.title}>{editing ? 'Editar' : 'Nova'} Transação</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tipo */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive, type === 'expense' && { borderColor: COLORS.expense }]}
            onPress={() => { setType('expense'); setCategory(''); }}
          >
            <Ionicons name="arrow-up-circle" size={20} color={type === 'expense' ? COLORS.expense : COLORS.muted} />
            <Text style={[styles.typeBtnText, type === 'expense' && { color: COLORS.expense }]}>Despesa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnActive, type === 'income' && { borderColor: COLORS.income }]}
            onPress={() => { setType('income'); setCategory(''); }}
          >
            <Ionicons name="arrow-down-circle" size={20} color={type === 'income' ? COLORS.income : COLORS.muted} />
            <Text style={[styles.typeBtnText, type === 'income' && { color: COLORS.income }]}>Receita</Text>
          </TouchableOpacity>
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
            placeholder="2025-05-31"
            placeholderTextColor={COLORS.muted}
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Categoria */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryGrid}>
            {availableCategories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, category === cat && styles.catChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                  {cat}
                </Text>
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
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  typeBtnActive: { backgroundColor: COLORS.input },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
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
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.input,
  },
  catChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catChipText: { color: COLORS.muted, fontSize: 13 },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: 14, padding: 16,
    gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
