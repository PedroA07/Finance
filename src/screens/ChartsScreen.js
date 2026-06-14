import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import Svg, { G, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { getMonthSummary, currentMonthKey, addMonths, shortLabelMonth } from '../utils/finance';

const { width } = Dimensions.get('window');
const CHART_W = width - 72; // dentro do card (margem 20 + padding 16 cada lado)

const COLORS = {
  bg: '#0F172A', card: '#1E293B', cardAlt: '#243044',
  income: '#22C55E', expense: '#EF4444', invest: '#38BDF8', accent: '#6366F1',
  text: '#F1F5F9', muted: '#94A3B8', border: '#334155',
};

const CAT_COLORS = ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#06B6D4', '#8B5CF6', '#EC4899', '#F43F5E'];

// Donut simples com react-native-svg (segmentos proporcionais).
function Donut({ segments, size = 150, stroke = 22 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.cardAlt} strokeWidth={stroke} fill="none" />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * c;
          const el = (
            <Circle
              key={i} cx={size / 2} cy={size / 2} r={r}
              stroke={seg.color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return el;
        })}
      </G>
    </Svg>
  );
}

export default function ChartsScreen() {
  const { transactions, recurring, installments } = useFinance();
  const [range, setRange] = useState(6);

  const months = useMemo(() => {
    const base = currentMonthKey();
    const arr = [];
    for (let i = range - 1; i >= 0; i--) {
      const key = addMonths(base, -i);
      arr.push({ key, label: shortLabelMonth(key), ...getMonthSummary({ transactions, recurring, installments }, key) });
    }
    return arr;
  }, [transactions, recurring, installments, range]);

  const totals = useMemo(() => months.reduce((a, m) => ({
    receitas: a.receitas + m.receitas, despesas: a.despesas + m.despesas,
    investido: a.investido + m.investido, sobra: a.sobra + m.sobra,
  }), { receitas: 0, despesas: 0, investido: 0, sobra: 0 }), [months]);

  const catTotals = useMemo(() => {
    const acc = {};
    months.forEach(m => { for (const [k, v] of Object.entries(m.byCategory || {})) acc[k] = (acc[k] || 0) + v; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [months]);

  const current = months[months.length - 1] || {};
  const hasData = months.some(m => m.receitas || m.despesas || m.investido);
  const maxCat = catTotals.length ? catTotals[0][1] : 0;
  const labels = months.map((m, i) => (range >= 12 && i % 2 !== 0) ? '' : m.label);

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.cardAlt,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(99,102,241,${o})`,
    labelColor: () => COLORS.muted,
    propsForDots: { r: '3', strokeWidth: '1' },
    propsForBackgroundLines: { stroke: '#26344a' },
  };

  const donutSegments = [
    { label: 'Despesas', value: current.despesas || 0, color: COLORS.expense },
    { label: 'Investido', value: current.investido || 0, color: COLORS.invest },
    { label: 'Sobra', value: Math.max(0, current.sobra || 0), color: COLORS.income },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Text style={styles.title}>Gráficos</Text></View>

      {/* Toggle de período */}
      <View style={styles.filterRow}>
        {[[6, '6 meses'], [12, '12 meses']].map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.chip, range === val && styles.chipActive]} onPress={() => setRange(val)}>
            <Text style={[styles.chipText, range === val && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasData ? (
        <View style={styles.empty}>
          <Ionicons name="bar-chart-outline" size={64} color={COLORS.muted} />
          <Text style={styles.emptyText}>Adicione lançamentos, recorrentes ou parcelados para ver os gráficos</Text>
        </View>
      ) : (
        <>
          {/* Resumo do período */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>No período</Text>
            <View style={styles.statsGrid}>
              <Stat label="Receitas" value={totals.receitas} color={COLORS.income} />
              <Stat label="Despesas" value={totals.despesas} color={COLORS.expense} />
              <Stat label="Investido" value={totals.investido} color={COLORS.invest} />
              <Stat label="Sobra" value={totals.sobra} color={totals.sobra >= 0 ? COLORS.income : COLORS.expense} />
            </View>
          </View>

          {/* Linha multi-série */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Receitas × Despesas × Investido</Text>
            <LineChart
              data={{
                labels,
                datasets: [
                  { data: months.map(m => m.receitas), color: () => COLORS.income, strokeWidth: 2 },
                  { data: months.map(m => m.despesas), color: () => COLORS.expense, strokeWidth: 2 },
                  { data: months.map(m => m.investido), color: () => COLORS.invest, strokeWidth: 2 },
                ],
                legend: ['Receitas', 'Despesas', 'Investido'],
              }}
              width={CHART_W} height={210} chartConfig={chartConfig} bezier fromZero style={styles.chart}
            />
          </View>

          {/* Sobra por mês */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sobra por mês</Text>
            <BarChart
              data={{ labels, datasets: [{ data: months.map(m => Math.round(m.sobra)) }] }}
              width={CHART_W} height={200} fromZero withInnerLines
              chartConfig={{ ...chartConfig, color: (o = 1) => `rgba(99,102,241,${o})` }}
              style={styles.chart} showValuesOnTopOfBars
            />
          </View>

          {/* Ranking de categorias */}
          {catTotals.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Maiores despesas por categoria</Text>
              {catTotals.slice(0, 8).map(([cat, val], i) => (
                <View key={cat} style={styles.barRow}>
                  <View style={styles.barTop}>
                    <Text style={styles.barLabel} numberOfLines={1}>{cat}</Text>
                    <Text style={styles.barValue}>{formatCurrency(val)}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${maxCat ? Math.max(3, (val / maxCat) * 100) : 0}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Donut do mês atual */}
          {(current.receitas > 0 || current.despesas > 0) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Para onde foi no mês atual</Text>
              <View style={styles.donutWrap}>
                <View style={styles.donutBox}>
                  <Donut segments={donutSegments} />
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutPct}>{formatPercent(current.percentSaved || 0)}</Text>
                    <Text style={styles.donutPctLabel}>poupado</Text>
                  </View>
                </View>
                <View style={styles.donutLegend}>
                  {donutSegments.map(s => (
                    <View key={s.label} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                      <Text style={styles.legendLabel}>{s.label}</Text>
                      <Text style={styles.legendValue}>{formatCurrency(s.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Stat({ label, value, color }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { fontSize: 13, color: COLORS.muted },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  summaryCard: {
    marginHorizontal: 20, marginTop: 8, marginBottom: 16, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { width: '50%', paddingVertical: 8 },
  statLabel: { color: COLORS.muted, fontSize: 12 },
  statValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  card: {
    marginHorizontal: 20, marginBottom: 16, padding: 16,
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -8 },
  barRow: { marginBottom: 12 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { color: COLORS.text, fontSize: 13, flex: 1, marginRight: 8 },
  barValue: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, backgroundColor: COLORS.cardAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutBox: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutPct: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  donutPctLabel: { color: COLORS.muted, fontSize: 11 },
  donutLegend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, color: COLORS.muted, fontSize: 13 },
  legendValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 40 },
  emptyText: { color: COLORS.muted, fontSize: 15, textAlign: 'center' },
});
