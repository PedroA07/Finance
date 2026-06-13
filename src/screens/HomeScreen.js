import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import {
  getMonthSummary, currentMonthKey, addMonths, labelMonth, shortLabelMonth,
} from '../utils/finance';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;

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

export default function HomeScreen({ navigation }) {
  const { transactions, recurring, installments } = useFinance();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const isCurrentMonth = monthKey === currentMonthKey();

  const summary = useMemo(
    () => getMonthSummary({ transactions, recurring, installments }, monthKey),
    [transactions, recurring, installments, monthKey]
  );

  // Histórico dos últimos 6 meses terminando no mês selecionado
  const history = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const k = addMonths(monthKey, -i);
      const s = getMonthSummary({ transactions, recurring, installments }, k);
      arr.push({ key: k, label: shortLabelMonth(k), income: s.receitas, expense: s.despesas });
    }
    return arr;
  }, [transactions, recurring, installments, monthKey]);

  const categoryRows = Object.entries(summary.byCategory)
    .sort((a, b) => b[1] - a[1]);
  const paymentRows = Object.entries(summary.byPaymentMethod)
    .sort((a, b) => b[1] - a[1]);

  const hasHistory = history.some(h => h.income > 0 || h.expense > 0);

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.cardAlt,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => COLORS.muted,
    propsForDots: { r: '3', strokeWidth: '2', stroke: COLORS.accent },
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Painel</Text>
        <Text style={styles.headerSub}>Fiance · controle mensal</Text>
      </View>

      {/* Seletor de mês */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setMonthKey(addMonths(monthKey, -1))}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{labelMonth(monthKey)}</Text>
          {!isCurrentMonth && (
            <TouchableOpacity onPress={() => setMonthKey(currentMonthKey())}>
              <Text style={styles.todayLink}>voltar para hoje</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setMonthKey(addMonths(monthKey, 1))}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Card principal: sobra do mês + % poupado */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Sobra do mês</Text>
        <Text style={[styles.heroValue, { color: summary.sobra >= 0 ? COLORS.income : COLORS.expense }]}>
          {formatCurrency(summary.sobra)}
        </Text>
        <View style={styles.savedPill}>
          <Ionicons name="trending-up" size={14} color={COLORS.invest} />
          <Text style={styles.savedText}>{formatPercent(summary.percentSaved)} poupado</Text>
        </View>
      </View>

      {/* 3 mini-cards: receitas, despesas, investido */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="arrow-down-circle" size={18} color={COLORS.income} />
          <Text style={styles.statLabel}>Receitas</Text>
          <Text style={[styles.statValue, { color: COLORS.income }]}>{formatCurrency(summary.receitas)}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="arrow-up-circle" size={18} color={COLORS.expense} />
          <Text style={styles.statLabel}>Despesas</Text>
          <Text style={[styles.statValue, { color: COLORS.expense }]}>{formatCurrency(summary.despesas)}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={18} color={COLORS.invest} />
          <Text style={styles.statLabel}>Investido</Text>
          <Text style={[styles.statValue, { color: COLORS.invest }]}>{formatCurrency(summary.investido)}</Text>
        </View>
      </View>

      {/* Atalhos */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.accent }]} onPress={() => navigation.navigate('AddTransaction')}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.actionText}>Lançamento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnAlt} onPress={() => navigation.navigate('Recurring')}>
          <Ionicons name="repeat" size={18} color={COLORS.text} />
          <Text style={styles.actionTextAlt}>Recorrentes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtnAlt} onPress={() => navigation.navigate('Installments')}>
          <Ionicons name="card" size={18} color={COLORS.text} />
          <Text style={styles.actionTextAlt}>Parcelados</Text>
        </TouchableOpacity>
      </View>

      {/* Gastos por categoria */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Gastos por categoria</Text>
        {categoryRows.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma despesa neste mês.</Text>
        ) : (
          categoryRows.map(([cat, val]) => {
            const pct = summary.despesas > 0 ? val / summary.despesas : 0;
            return (
              <View key={cat} style={styles.breakRow}>
                <View style={styles.breakInfo}>
                  <Text style={styles.breakLabel}>{cat}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                </View>
                <View style={styles.breakRight}>
                  <Text style={styles.breakValue}>{formatCurrency(val)}</Text>
                  <Text style={styles.breakPct}>{formatPercent(pct)}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Gastos por forma de pagamento */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Gastos por forma de pagamento</Text>
        {paymentRows.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma despesa neste mês.</Text>
        ) : (
          paymentRows.map(([pm, val]) => (
            <View key={pm} style={styles.pmRow}>
              <Text style={styles.pmLabel}>{pm}</Text>
              <Text style={styles.pmValue}>{formatCurrency(val)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Histórico 6 meses */}
      {hasHistory && (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Receitas x Despesas (6 meses)</Text>
          <LineChart
            data={{
              labels: history.map(h => h.label),
              datasets: [
                { data: history.map(h => h.income), color: () => COLORS.income, strokeWidth: 2 },
                { data: history.map(h => h.expense), color: () => COLORS.expense, strokeWidth: 2 },
              ],
              legend: ['Receitas', 'Despesas'],
            }}
            width={CHART_WIDTH - 32}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 8, marginBottom: 16,
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 8, paddingHorizontal: 8,
  },
  monthArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  todayLink: { fontSize: 11, color: COLORS.accent, marginTop: 2 },
  heroCard: {
    marginHorizontal: 20, padding: 22, backgroundColor: COLORS.card,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'flex-start',
  },
  heroLabel: { fontSize: 14, color: COLORS.muted },
  heroValue: { fontSize: 34, fontWeight: '800', marginTop: 4, marginBottom: 10 },
  savedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.cardAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  savedText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 3,
  },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
  },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnAlt: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  actionTextAlt: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  sectionCard: {
    marginHorizontal: 20, marginTop: 16, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  emptyText: { color: COLORS.muted, fontSize: 13, paddingVertical: 8 },
  breakRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  breakInfo: { flex: 1 },
  breakLabel: { color: COLORS.text, fontSize: 13, marginBottom: 6 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.cardAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  breakRight: { alignItems: 'flex-end' },
  breakValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  breakPct: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  pmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1E2940',
  },
  pmLabel: { color: COLORS.muted, fontSize: 13 },
  pmValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  chart: { borderRadius: 12, marginTop: 4, marginLeft: -8 },
});
