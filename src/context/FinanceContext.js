import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FinanceContext = createContext(null);

const STORAGE_KEY = '@finance_transactions';
const CATEGORIES_KEY = '@finance_categories';

const DEFAULT_CATEGORIES = {
  expense: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Roupas', 'Outros'],
  income: ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'],
};

export function FinanceProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [txData, catData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(CATEGORIES_KEY),
      ]);
      if (txData) setTransactions(JSON.parse(txData));
      if (catData) setCategories(JSON.parse(catData));
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransactions = async (updated) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTransactions(updated);
  };

  const addTransaction = useCallback(async (transaction) => {
    const newTx = {
      ...transaction,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    const updated = [newTx, ...transactions];
    await saveTransactions(updated);
  }, [transactions]);

  const removeTransaction = useCallback(async (id) => {
    const updated = transactions.filter(t => t.id !== id);
    await saveTransactions(updated);
  }, [transactions]);

  const editTransaction = useCallback(async (id, changes) => {
    const updated = transactions.map(t => t.id === id ? { ...t, ...changes } : t);
    await saveTransactions(updated);
  }, [transactions]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <FinanceContext.Provider value={{
      transactions,
      categories,
      isLoading,
      addTransaction,
      removeTransaction,
      editTransaction,
      totalIncome,
      totalExpense,
      balance,
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
