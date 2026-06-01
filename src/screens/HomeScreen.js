import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, getLast6Months } from '../utils/formatters';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  cardAlt: '#243044',
  income: '#22C55E',
  expense: '#EF4444',
  accent: '#6366F1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#334155',
};

export default function HomeScreen({ navigation }) {
  const { balance, totalIncome, totalExpense, transactions } = useFinance();
  const months = useMemo(() => getLast6Months(transactions), [transactions]);

  const chartLabels = months.map(m => m.label);
  const incomeData = months.map(m => m.income || 0);
  const expenseData = months.map(m => m.expense || 0);

  const chartConfig = {
    backgroundColor: COLORS.card,
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.cardAlt,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => COLORS.muted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.accent },
  };

  const recentTxs = transactions.slice(0, 5);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fiance</Text>
        <Text style={styles.headerSub}>Controle Financeiro</Text>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Total</Text>
        <Text style={[styles.balanceValue, { color: balance >= 0 ? COLORS.income : COLORS.expense }]}>
          {formatCurrency(balance)}
        </Text>
        <View style={styles.row}>
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-down-circle" size={18} color={COLORS.income} />
            <Text style={styles.summaryLabel}>Entradas</Text>
            <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Ionicons name="arrow-up-circle" size={18} color={COLORS.expense} />
            <Text style={styles.summaryLabel}>Saídas</Text>
            <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatCurrency(totalExpense)}</Text>
          </View>
        </View>
      </View>

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTransaction')}>
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.addBtnText}>Adicionar Transação</Text>
      </TouchableOpacity>

      {/* Line Chart - últimos 6 meses */}
      {transactions.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Histórico 6 meses</Text>
          <LineChart
            data={{
              labels: chartLabels,
              datasets: [
                { data: incomeData, color: () => COLORS.income, strokeWidth: 2 },
                { data: expenseData, color: () => COLORS.expense, strokeWidth: 2 },
              ],
              legend: ['Entradas', 'Saídas'],
            }}
            width={CHART_WIDTH}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Últimas transações */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.cardTitle}>Últimas Transações</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {recentTxs.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma transação ainda. Adicione uma!</Text>
        ) : (
          recentTxs.map(tx => (
            <View key={tx.id} style={styles.txItem}>
              <View style={[styles.txIcon, { backgroundColor: tx.type === 'income' ? '#16301D' : '#2D1515' }]}>
                <Ionicons
                  name={tx.type === 'income' ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={tx.type === 'income' ? COLORS.income : COLORS.expense}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDescription}>{tx.description}</Text>
                <Text style={styles.txCategory}>{tx.category}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'income' ? COLORS.income : COLORS.expense }]}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  balanceCard: {
    margin: 20, marginTop: 4, padding: 24,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  balanceLabel: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  balanceValue: { fontSize: 36, fontWeight: '800', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.muted },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  divider: { width: 1, height: 40, backgroundColor: COLORS.border },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.accent, gap: 8, marginBottom: 20,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chartCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chart: { borderRadius: 12, marginTop: 8 },
  sectionCard: {
    marginHorizontal: 20, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.accent },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: 20 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDescription: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  txCategory: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
});
