import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';

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

export default function TransactionsScreen({ navigation }) {
  const { transactions, removeTransaction } = useFinance();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase()) ||
        tx.category.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, search, filterType]);

  const handleDelete = (id, description) => {
    Alert.alert(
      'Remover transação',
      `Deseja remover "${description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => removeTransaction(id) },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.txCard}>
      <View style={[styles.txIconBg, { backgroundColor: item.type === 'income' ? '#16301D' : '#2D1515' }]}>
        <Ionicons
          name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
          size={18}
          color={item.type === 'income' ? COLORS.income : COLORS.expense}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc}>{item.description}</Text>
        <Text style={styles.txMeta}>{item.category} • {formatDate(item.date || item.createdAt)}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: item.type === 'income' ? COLORS.income : COLORS.expense }]}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <View style={styles.txActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction', { transaction: item })}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil" size={14} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.description)}
            style={styles.actionBtn}
          >
            <Ionicons name="trash" size={14} color={COLORS.expense} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transações</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTransaction')}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar transação..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {['all', 'income', 'expense'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filterType === f && styles.filterChipActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.filterChipText, filterType === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'Todas' : f === 'income' ? 'Entradas' : 'Saídas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  addBtn: {
    backgroundColor: COLORS.accent, width: 40, height: 40,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterChipText: { fontSize: 13, color: COLORS.muted },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  txCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  txIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  txActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
