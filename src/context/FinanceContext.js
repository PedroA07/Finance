import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FinanceContext = createContext(null);

const KEYS = {
  transactions: '@finance_transactions',
  categories: '@finance_categories',
  recurring: '@finance_recurring',
  installments: '@finance_installments',
  paymentMethods: '@finance_payment_methods',
};

// Categorias padrão do app (mantidas). O usuário pode adicionar/remover na tela Config.
const DEFAULT_CATEGORIES = {
  expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Roupas', 'Outros'],
  income: ['Salário', 'Freelance', 'Presente', 'Outros'],
  investment: ['Reserva', 'Ações', 'Fundos', 'Cripto', 'Outros'],
};

const DEFAULT_PAYMENT_METHODS = [
  'Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência',
];

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function FinanceProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tx, cat, rec, inst, pm] = await Promise.all([
        AsyncStorage.getItem(KEYS.transactions),
        AsyncStorage.getItem(KEYS.categories),
        AsyncStorage.getItem(KEYS.recurring),
        AsyncStorage.getItem(KEYS.installments),
        AsyncStorage.getItem(KEYS.paymentMethods),
      ]);
      if (tx) setTransactions(JSON.parse(tx));
      if (rec) setRecurring(JSON.parse(rec));
      if (inst) setInstallments(JSON.parse(inst));
      if (pm) setPaymentMethods(JSON.parse(pm));
      if (cat) {
        // Mescla com os defaults para garantir que a chave 'investment'
        // exista mesmo em dados salvos por versões antigas do app.
        const parsed = JSON.parse(cat);
        setCategories({ ...DEFAULT_CATEGORIES, ...parsed });
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Persistência genérica ----
  const persist = async (key, value, setter) => {
    setter(value);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Erro ao salvar', key, e);
    }
  };

  // ---- Lançamentos (transações avulsas) ----
  const addTransaction = useCallback(async (tx) => {
    const newTx = { id: genId(), createdAt: new Date().toISOString(), type: 'expense', ...tx };
    await persist(KEYS.transactions, [newTx, ...transactions], setTransactions);
  }, [transactions]);

  const editTransaction = useCallback(async (id, changes) => {
    const updated = transactions.map(t => (t.id === id ? { ...t, ...changes } : t));
    await persist(KEYS.transactions, updated, setTransactions);
  }, [transactions]);

  const removeTransaction = useCallback(async (id) => {
    await persist(KEYS.transactions, transactions.filter(t => t.id !== id), setTransactions);
  }, [transactions]);

  // Importação em lote (extratos OFX/CSV) — salva tudo de uma vez.
  const addManyTransactions = useCallback(async (list) => {
    if (!list || !list.length) return 0;
    const stamped = list.map(t => ({
      id: genId(), createdAt: new Date().toISOString(), type: 'expense', ...t,
    }));
    await persist(KEYS.transactions, [...stamped, ...transactions], setTransactions);
    return stamped.length;
  }, [transactions]);

  // ---- Recorrentes ----
  const addRecurring = useCallback(async (item) => {
    const newItem = { id: genId(), active: true, type: 'expense', ...item };
    await persist(KEYS.recurring, [newItem, ...recurring], setRecurring);
  }, [recurring]);

  const editRecurring = useCallback(async (id, changes) => {
    const updated = recurring.map(r => (r.id === id ? { ...r, ...changes } : r));
    await persist(KEYS.recurring, updated, setRecurring);
  }, [recurring]);

  const removeRecurring = useCallback(async (id) => {
    await persist(KEYS.recurring, recurring.filter(r => r.id !== id), setRecurring);
  }, [recurring]);

  const toggleRecurring = useCallback(async (id) => {
    const updated = recurring.map(r => (r.id === id ? { ...r, active: !r.active } : r));
    await persist(KEYS.recurring, updated, setRecurring);
  }, [recurring]);

  // ---- Parcelados ----
  const addInstallment = useCallback(async (item) => {
    const newItem = { id: genId(), ...item };
    await persist(KEYS.installments, [newItem, ...installments], setInstallments);
  }, [installments]);

  const editInstallment = useCallback(async (id, changes) => {
    const updated = installments.map(i => (i.id === id ? { ...i, ...changes } : i));
    await persist(KEYS.installments, updated, setInstallments);
  }, [installments]);

  const removeInstallment = useCallback(async (id) => {
    await persist(KEYS.installments, installments.filter(i => i.id !== id), setInstallments);
  }, [installments]);

  // ---- Categorias ----
  const addCategory = useCallback(async (type, name) => {
    const clean = (name || '').trim();
    if (!clean) return;
    const list = categories[type] || [];
    if (list.some(c => c.toLowerCase() === clean.toLowerCase())) return;
    const updated = { ...categories, [type]: [...list, clean] };
    await persist(KEYS.categories, updated, setCategories);
  }, [categories]);

  const removeCategory = useCallback(async (type, name) => {
    const updated = { ...categories, [type]: (categories[type] || []).filter(c => c !== name) };
    await persist(KEYS.categories, updated, setCategories);
  }, [categories]);

  // ---- Formas de pagamento ----
  const addPaymentMethod = useCallback(async (name) => {
    const clean = (name || '').trim();
    if (!clean) return;
    if (paymentMethods.some(p => p.toLowerCase() === clean.toLowerCase())) return;
    await persist(KEYS.paymentMethods, [...paymentMethods, clean], setPaymentMethods);
  }, [paymentMethods]);

  const removePaymentMethod = useCallback(async (name) => {
    await persist(KEYS.paymentMethods, paymentMethods.filter(p => p !== name), setPaymentMethods);
  }, [paymentMethods]);

  // ---- Totais "de todos os tempos" (compatibilidade) ----
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  return (
    <FinanceContext.Provider value={{
      // dados
      transactions, recurring, installments, categories, paymentMethods, isLoading,
      // lançamentos
      addTransaction, editTransaction, removeTransaction, addManyTransactions,
      // recorrentes
      addRecurring, editRecurring, removeRecurring, toggleRecurring,
      // parcelados
      addInstallment, editInstallment, removeInstallment,
      // config
      addCategory, removeCategory, addPaymentMethod, removePaymentMethod,
      // totais
      totalIncome, totalExpense, balance,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
