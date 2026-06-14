export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
};

// Recebe uma fração (0..1) e devolve "12,3%".
export const formatPercent = (fraction, decimals = 1) => {
  return `${((Number(fraction) || 0) * 100).toFixed(decimals).replace('.', ',')}%`;
};

// ----- Máscara de moeda (digita-se da direita para a esquerda, centavos primeiro) -----
// "12345" -> "123,45" ; "1234567" -> "12.345,67"
export const maskCurrencyInput = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const value = parseInt(digits, 10) / 100;
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte o texto mascarado de volta para número (123,45 -> 123.45).
export const unmaskCurrency = (masked) => {
  const digits = String(masked).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) / 100 : 0;
};

// Número -> texto mascarado, para preencher o campo ao editar.
export const maskCurrencyFromNumber = (n) => {
  const cents = Math.round((Number(n) || 0) * 100);
  return cents ? maskCurrencyInput(String(cents)) : '';
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatMonthYear = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export const groupByMonth = (transactions) => {
  const groups = {};
  transactions.forEach(tx => {
    const date = new Date(tx.date || tx.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return groups;
};

export const groupByCategory = (transactions, type) => {
  const filtered = transactions.filter(t => t.type === type);
  const groups = {};
  filtered.forEach(tx => {
    if (!groups[tx.category]) groups[tx.category] = 0;
    groups[tx.category] += tx.amount;
  });
  return groups;
};

export const getLast6Months = (transactions) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short' });
    const monthTxs = transactions.filter(tx => {
      const txDate = new Date(tx.date || tx.createdAt);
      return txDate.getFullYear() === d.getFullYear() && txDate.getMonth() === d.getMonth();
    });
    months.push({
      key,
      label,
      income: monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    });
  }
  return months;
};
