import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useFinance } from '../context/FinanceContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parseOFX, parseCSV, detectColumns, normalizeAmount, parseAnyDate, dedupe } from '../utils/importer';

const COLORS = {
  bg: '#0F172A', card: '#1E293B', input: '#243044',
  income: '#22C55E', expense: '#EF4444', accent: '#6366F1',
  text: '#F1F5F9', muted: '#94A3B8', border: '#334155',
};

const SIGN_MODES = [
  ['auto', 'Automático'], ['expense', 'Tudo despesa'], ['income', 'Tudo receita'],
];

export default function ImportScreen({ navigation }) {
  const { transactions, categories, addManyTransactions } = useFinance();

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [kind, setKind] = useState(null);          // 'ofx' | 'csv'
  const [ofx, setOfx] = useState(null);            // { transactions, balance }
  const [csv, setCsv] = useState(null);            // { headers, rows, delim }
  const [mapping, setMapping] = useState({ date: -1, description: -1, amount: -1 });
  const [signMode, setSignMode] = useState('auto');
  const [category, setCategory] = useState('Outros');
  const [result, setResult] = useState(null);      // { added, skipped }

  const reset = () => {
    setFileName(''); setKind(null); setOfx(null); setCsv(null);
    setMapping({ date: -1, description: -1, amount: -1 }); setResult(null);
  };

  const pick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets[0];
      setLoading(true);
      const content = await new File(asset.uri).text();
      const isOFX = /\.ofx$/i.test(asset.name) || /<OFX>|<STMTTRN>/i.test(content);
      reset();
      setFileName(asset.name);
      if (isOFX) {
        setKind('ofx');
        setOfx(parseOFX(content));
      } else {
        const parsed = parseCSV(content);
        setKind('csv');
        setCsv(parsed);
        setMapping(detectColumns(parsed.headers));
      }
    } catch (e) {
      Alert.alert('Erro ao ler arquivo', String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  // Constrói os lançamentos a partir do arquivo + opções escolhidas.
  const built = useMemo(() => {
    let raw = [];
    if (kind === 'ofx' && ofx) raw = ofx.transactions;
    else if (kind === 'csv' && csv && mapping.date >= 0 && mapping.amount >= 0) {
      raw = csv.rows.map(r => ({
        date: parseAnyDate(r[mapping.date]),
        description: String(mapping.description >= 0 ? (r[mapping.description] ?? '') : '').trim() || 'Sem descrição',
        amount: normalizeAmount(r[mapping.amount]),
      })).filter(t => t.amount != null && t.date);
    }
    return raw.map(t => {
      let type, amt = Number(t.amount) || 0;
      if (signMode === 'expense') type = 'expense';
      else if (signMode === 'income') type = 'income';
      else type = amt < 0 ? 'expense' : 'income';
      return {
        date: t.date, description: t.description, amount: Math.abs(amt),
        type, category: category || 'Outros', paymentMethod: '', source: 'import',
        ...(t.fitid ? { fitid: t.fitid } : {}),
      };
    });
  }, [kind, ofx, csv, mapping, signMode, category]);

  const preview = useMemo(() => dedupe(built, transactions), [built, transactions]);

  const doImport = async () => {
    if (!preview.novos.length) { Alert.alert('Nada a importar', 'Não há lançamentos novos neste arquivo.'); return; }
    const n = await addManyTransactions(preview.novos);
    setResult({ added: n, skipped: preview.duplicados.length });
  };

  const expenseCats = categories.expense || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Importar extrato</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Sucesso */}
        {result ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.income} />
            <Text style={styles.successTitle}>Importado!</Text>
            <Text style={styles.successText}>
              {result.added} lançamento(s) adicionado(s).{'\n'}
              {result.skipped > 0 ? `${result.skipped} já existiam e foram ignorados.` : 'Nenhum duplicado.'}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Main', { screen: 'Transactions' })}>
              <Text style={styles.primaryBtnText}>Ver lançamentos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={reset}>
              <Text style={styles.linkBtnText}>Importar outro arquivo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Instruções + escolher arquivo */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>1. Escolha o arquivo</Text>
              <Text style={styles.help}>
                No app do seu banco, exporte o extrato ou a fatura em <Text style={styles.b}>OFX</Text> (recomendado) ou{' '}
                <Text style={styles.b}>CSV</Text>. Depois toque abaixo para selecioná-lo.
              </Text>
              <TouchableOpacity style={styles.pickBtn} onPress={pick} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="document-attach" size={20} color="#fff" />}
                <Text style={styles.pickBtnText}>{fileName ? 'Trocar arquivo' : 'Escolher arquivo (OFX/CSV)'}</Text>
              </TouchableOpacity>
              {!!fileName && (
                <Text style={styles.fileInfo}>
                  📄 {fileName} · {kind === 'ofx' ? 'OFX' : 'CSV'}
                  {kind === 'ofx' && ofx?.balance != null ? ` · saldo ${formatCurrency(ofx.balance)}` : ''}
                </Text>
              )}
            </View>

            {/* Mapeamento de colunas (CSV) */}
            {kind === 'csv' && csv && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>2. Quais colunas?</Text>
                <Text style={styles.help}>Confirme qual coluna é a data, a descrição e o valor.</Text>
                {[['date', 'Data'], ['description', 'Descrição'], ['amount', 'Valor']].map(([key, label]) => (
                  <View key={key} style={{ marginTop: 12 }}>
                    <Text style={styles.mapLabel}>{label}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.chipRow}>
                        {csv.headers.map((h, i) => (
                          <TouchableOpacity key={i}
                            style={[styles.chip, mapping[key] === i && styles.chipActive]}
                            onPress={() => setMapping(m => ({ ...m, [key]: i }))}>
                            <Text style={[styles.chipText, mapping[key] === i && styles.chipTextActive]}>
                              {String(h).trim() || `coluna ${i + 1}`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}
              </View>
            )}

            {/* Opções */}
            {!!kind && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{kind === 'csv' ? '3.' : '2.'} Opções</Text>
                <Text style={styles.mapLabel}>Tratar valores como</Text>
                <View style={styles.chipRow}>
                  {SIGN_MODES.map(([val, label]) => (
                    <TouchableOpacity key={val} style={[styles.chip, signMode === val && styles.chipActive]} onPress={() => setSignMode(val)}>
                      <Text style={[styles.chipText, signMode === val && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.mapLabel, { marginTop: 12 }]}>Categoria padrão</Text>
                <View style={styles.chipRow}>
                  {expenseCats.map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                      <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Prévia + importar */}
            {!!kind && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Prévia</Text>
                <Text style={styles.help}>
                  {built.length} no arquivo · <Text style={{ color: COLORS.income }}>{preview.novos.length} novos</Text> ·{' '}
                  {preview.duplicados.length} já existem
                </Text>
                {preview.novos.slice(0, 15).map((t, i) => (
                  <View key={i} style={styles.prevRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prevDesc} numberOfLines={1}>{t.description}</Text>
                      <Text style={styles.prevDate}>{formatDate(t.date)}</Text>
                    </View>
                    <Text style={[styles.prevAmount, { color: t.type === 'income' ? COLORS.income : COLORS.expense }]}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                  </View>
                ))}
                {preview.novos.length > 15 && <Text style={styles.more}>+{preview.novos.length - 15} lançamentos…</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, !preview.novos.length && { opacity: 0.5 }]}
                  onPress={doImport} disabled={!preview.novos.length}>
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Importar {preview.novos.length} lançamento(s)</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  help: { color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  b: { color: COLORS.text, fontWeight: '700' },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 12, padding: 13, marginTop: 14,
  },
  pickBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fileInfo: { color: COLORS.text, fontSize: 13, marginTop: 12 },
  mapLabel: { color: COLORS.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.input },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.muted, fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  prevRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#1E2940', gap: 10 },
  prevDesc: { color: COLORS.text, fontSize: 13 },
  prevDate: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  prevAmount: { fontSize: 13, fontWeight: '700' },
  more: { color: COLORS.muted, fontSize: 12, paddingVertical: 8, fontStyle: 'italic' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 12, padding: 14, marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkBtn: { padding: 12, alignItems: 'center' },
  linkBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  successCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  successTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  successText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
