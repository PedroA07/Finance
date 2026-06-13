// Motor de cálculo mensal — espelha as fórmulas (SUMIFS) da planilha "Controle de Gastos".
// Tudo aqui é função pura, fácil de testar e reaproveitar nas telas.

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_PT_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const num = (v) => Number(v) || 0;

// 'YYYY-MM' a partir de uma data ('YYYY-MM-DD', ISO, Date...).
export function monthKeyOf(dateStr) {
  if (!dateStr) return '';
  const s = String(dateStr);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(s);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Índice absoluto do mês (ano*12 + mês) — usado para comparar/ordenar meses.
export function monthIndex(key) {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return NaN;
  return y * 12 + (m - 1);
}

export function keyFromIndex(idx) {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function addMonths(key, n) {
  return keyFromIndex(monthIndex(key) + n);
}

export function labelMonth(key) {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTHS_PT[m - 1]} ${y}`;
}

export function shortLabelMonth(key) {
  const [y, m] = String(key).split('-').map(Number);
  if (!y || !m) return '';
  return `${MONTHS_PT_SHORT[m - 1]}/${String(y).slice(2)}`;
}

// Informações de uma compra parcelada em relação a um mês.
// item: { installmentValue, totalInstallments, firstMonth:'YYYY-MM' }
export function installmentInfo(item, monthKey) {
  const total = Math.max(0, Math.floor(num(item.totalInstallments)));
  const value = num(item.installmentValue);
  const iniIdx = monthIndex(item.firstMonth);
  const curIdx = monthIndex(monthKey);
  const fimIdx = iniIdx + total - 1;

  if (isNaN(iniIdx) || isNaN(curIdx) || total <= 0) {
    return { total, value, status: 'A iniciar', currentNumber: 0, remainingCount: total,
      remainingValue: value * total, activeInMonth: false, amountThisMonth: 0, lastMonthKey: '' };
  }

  let status;
  if (curIdx < iniIdx) status = 'A iniciar';
  else if (curIdx > fimIdx) status = 'Quitada';
  else status = 'Em andamento';

  const activeInMonth = curIdx >= iniIdx && curIdx <= fimIdx;
  const currentNumber = activeInMonth ? curIdx - iniIdx + 1 : (curIdx < iniIdx ? 0 : total);
  // Parcelas restantes (incluindo a do mês atual), como na planilha: MAX(0, MIN(total, fim - atual + 1))
  const remainingCount = Math.max(0, Math.min(total, fimIdx - curIdx + 1));
  const remainingValue = value * remainingCount;

  return {
    total, value, status, currentNumber, remainingCount, remainingValue,
    activeInMonth, amountThisMonth: activeInMonth ? value : 0,
    lastMonthKey: keyFromIndex(fimIdx),
  };
}

const isActive = (r) => r.active !== false; // recorrente ativo por padrão

// Resumo mensal consolidado (Painel + Extrato da planilha).
export function getMonthSummary({ transactions = [], recurring = [], installments = [] }, monthKey) {
  // Lançamentos avulsos do mês
  const monthTx = transactions.filter(t => monthKeyOf(t.date || t.createdAt) === monthKey);
  const activeRec = recurring.filter(isActive);

  let receitas = 0, despesas = 0, investido = 0;
  const byCategory = {};      // despesas por categoria
  const byPaymentMethod = {}; // despesas por forma de pagamento

  const addExpense = (category, method, amount) => {
    despesas += amount;
    const cat = category || 'Sem categoria';
    byCategory[cat] = (byCategory[cat] || 0) + amount;
    const pm = method || 'Não informado';
    byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + amount;
  };

  // Lançamentos avulsos
  for (const t of monthTx) {
    const amount = num(t.amount);
    if (t.type === 'income') receitas += amount;
    else if (t.type === 'investment') investido += amount;
    else addExpense(t.category, t.paymentMethod, amount); // expense (default)
  }

  // Recorrentes ativos (entram todo mês)
  for (const r of activeRec) {
    const amount = num(r.amount);
    if (r.type === 'income') receitas += amount;
    else if (r.type === 'investment') investido += amount;
    else addExpense(r.category, r.paymentMethod, amount);
  }

  // Parcelas ativas neste mês (sempre despesa)
  const parcelasDoMes = [];
  for (const i of installments) {
    const info = installmentInfo(i, monthKey);
    if (info.activeInMonth) {
      addExpense(i.category, i.paymentMethod, info.amountThisMonth);
      parcelasDoMes.push({ ...i, ...info });
    }
  }

  const sobra = receitas - despesas - investido;
  const percentSaved = receitas > 0 ? (investido + sobra) / receitas : 0;

  return {
    monthKey,
    receitas, despesas, investido, sobra, percentSaved,
    byCategory, byPaymentMethod,
    // listas para o "extrato" do mês
    recorrentesAtivos: activeRec,
    parcelasDoMes,
    lancamentosDoMes: monthTx,
  };
}

// Soma das parcelas que caem num determinado mês (para projeções simples).
export function installmentsTotalForMonth(installments, monthKey) {
  return installments.reduce((sum, i) => sum + installmentInfo(i, monthKey).amountThisMonth, 0);
}
