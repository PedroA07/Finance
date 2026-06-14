// Importador de extratos/faturas: entende OFX (padrão de banco) e CSV (variado).
// Tudo roda no celular, sem servidor. Funções puras, fáceis de testar.

const stripAccents = (s) =>
  String(s).toLowerCase()
    .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ç/g, 'c');

// "1.234,56" | "1,234.56" | "-50.00" | "R$ 50" | "(30,00)" -> número (ou null)
export function normalizeAmount(input) {
  if (input == null) return null;
  let str = String(input).trim();
  if (!str) return null;
  let neg = false;
  if (/^\(.*\)$/.test(str)) { neg = true; str = str.slice(1, -1); } // (50,00) = negativo
  if (str.includes('-')) neg = true;
  str = str.replace(/[^\d,.]/g, ''); // remove R$, espaços, sinais, letras
  if (!str) return null;
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  let num;
  if (lastComma > lastDot) num = parseFloat(str.replace(/\./g, '').replace(',', '.')); // vírgula decimal (pt-BR)
  else if (lastDot > lastComma) num = parseFloat(str.replace(/,/g, '')); // ponto decimal (en)
  else num = parseFloat(str);
  if (isNaN(num)) return null;
  return neg ? -Math.abs(num) : num;
}

// Datas variadas -> "YYYY-MM-DD". Ambíguas (dd/mm vs mm/dd) assumem pt-BR (dd/mm).
export function parseAnyDate(input) {
  const s = String(input || '').trim();
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s))) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return s;
}

const getTag = (s, tag) => {
  const m = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(s);
  return m ? m[1].trim() : '';
};

const parseOFXDate = (s) => {
  const m = /(\d{4})(\d{2})(\d{2})/.exec(s || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};

// OFX -> { transactions:[{date,description,amount,fitid}], balance }
export function parseOFX(text) {
  const transactions = [];
  const blocks = String(text).split(/<STMTTRN>/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/STMTTRN>|<STMTTRN>/i)[0];
    const amount = normalizeAmount(getTag(block, 'TRNAMT'));
    if (amount == null) continue;
    const name = getTag(block, 'NAME');
    const memo = getTag(block, 'MEMO');
    const description = (name && memo && name !== memo) ? `${name} - ${memo}` : (name || memo || 'Sem descrição');
    transactions.push({
      date: parseOFXDate(getTag(block, 'DTPOSTED')),
      description: description.trim(),
      amount,
      fitid: getTag(block, 'FITID'),
    });
  }
  const balance = normalizeAmount(getTag(text, 'BALAMT'));
  return { transactions, balance };
}

const countChar = (s, ch) => (s.split(ch).length - 1);

function csvToRows(text, delim) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

// CSV -> { headers, rows, delim }
export function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delim = [';', ',', '\t', '|'].sort((a, b) => countChar(firstLine, b) - countChar(firstLine, a))[0];
  const rows = csvToRows(text, delim);
  const headers = rows.shift() || [];
  return { headers, rows, delim };
}

// Adivinha quais colunas são data / descrição / valor pelos cabeçalhos (pt e en).
export function detectColumns(headers) {
  const norm = headers.map(h => stripAccents(h).trim());
  const find = (keys) => norm.findIndex(h => keys.some(k => h.includes(k)));
  return {
    date: find(['data', 'date', 'dt ']),
    description: find(['descri', 'historico', 'lancamento', 'memo', 'detalhe', 'description', 'title', 'estabelecimento', 'transacao']),
    amount: find(['valor', 'amount', 'value', 'montante', 'quantia', 'brl', 'preco']),
  };
}

// Assinatura para evitar duplicar (usa FITID quando existe).
export function signatureOf(tx) {
  if (tx.fitid) return 'fit:' + tx.fitid;
  const cents = Math.round((Number(tx.amount) || 0) * 100);
  return `${tx.date}|${cents}|${stripAccents(tx.description || '').trim().slice(0, 40)}`;
}

// Remove do lote o que já existe nas transações atuais do app.
export function dedupe(incoming, existing) {
  const seen = new Set();
  for (const t of existing) {
    if (t.fitid) seen.add('fit:' + t.fitid);
    seen.add(signatureOf(t));
  }
  const novos = [], duplicados = [];
  for (const t of incoming) {
    const sig = signatureOf(t);
    if (seen.has(sig)) { duplicados.push(t); continue; }
    seen.add(sig);
    novos.push(t);
  }
  return { novos, duplicados };
}
