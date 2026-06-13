import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, groupByCategory, getLast6Months } from '../utils/formatters';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  cardAlt: '#243044',
  income: '#22C55E',
  expense: '#EF4444',
  invest: '#38BDF8',
  accent: '#6366F1',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#334155',
};

const PIE_COLORS_EXPENSE = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#06B6D4', '#8B5CF6', '#EC4899', '#F43F5E'];
const PIE_COLORS_INCOME = ['#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6'];
const PIE_COLORS_INVEST = ['#38BDF8', '#0EA5E9', '#6366F1', '#8B5CF6', '#A855F7'];

export default function ChartsScreen() {
  const { transactions } = useFinance();
  const [period, setPeriod] = useState('all');

  const filteredTxs = useMemo(() => {
    if (period === 'all') return transactions;
    const now = new Date();
    const cutoff = period === '1m'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return transactions.filter(tx => new Date(tx.date || tx.createdAt) >= cutoff);
  }, [transactions, period]);

  const expenseByCategory = useMemo(() => groupByCategory(filteredTxs, 'expense'), [filteredTxs]);
  const incomeByCategory = useMemo(() => groupByCategory(filteredTxs, 'income'), [filteredTxs]);
  const investmentByCategory = useMemo(() => groupByCategory(filteredTxs, 'investment'), [filteredTxs]);

  const months = useMemo(() => getLast6Months(transactions), [transactions]);

  const makePieData = (catObj, colors) =>
    Object.entries(catObj).map(([name, value], i) => ({
      name, population: value, color: colors[i % colors.length],
      legendFontColor: COLORS.muted, legendFontSize: 12,
    }));

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.cardAlt,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => COLORS.muted,
  };

  const barData = {
    labels: months.map(m => m.label),
    datasets: [{ data: months.map(m => m.expense), color: () => COLORS.expense }],
  };

  const isEmpty = transactions.length === 0;

  const PieSection = ({ title, catObj, colors }) => {
    const data = makePieData(catObj, colors);
    if (data.length === 0) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <PieChart
          data={data} width={CHART_W} height={200} chartConfig={chartConfig}
          accessor="population" backgroundColor="transparent" paddingLeft="15" style={styles.chart}
        />
        {Object.entries(catObj).map(([cat, val], i) => (
          <View key={cat} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors[i % colors.length] }]} />
            <Text style={styles.legendLabel}>{cat}</Text>
            <Text style={styles.legendValue}>{formatCurrency(val)}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>Gráficos</Text></View>

      <View style={styles.filterRow}>
        {[['all', 'Tudo'], ['3m', '3 meses'], ['1m', 'Este mês']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.chip, period === val && styles.chipActive]} onPress={() => setPeriod(val)}>
            <Text style={[styles.chipText, period === val && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>Adicione lançamentos para ver os gráficos</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Despesas por mês</Text>
            <BarChart
              data={barData} width={CHART_W} height={200}
              chartConfig={{ ...chartConfig, color: (op) => `rgba(239,68,68,${op})` }}
              style={styles.chart} showValuesOnTopOfBars
            />
          </View>
          <PieSection title="Despesas por categoria" catObj={expenseByCategory} colors={PIE_COLORS_EXPENSE} />
          <PieSection title="Receitas por categoria" catObj={incomeByCategory} colors={PIE_COLORS_INCOME} />
          <PieSection title="Investimentos por categoria" catObj={investmentByCategory} colors={PIE_COLORS_INVEST} />
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card: {
    marginHorizontal: 20, marginBottom: 20, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  chart: { borderRadius: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#1E2940' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendLabel: { flex: 1, color: COLORS.muted, fontSize: 13 },
  legendValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { color: COLORS.muted, fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
});
