export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
