// Editable source for the column filters added to the recovered frontend.
export const columns = [
  ['name', 'Lançamento'], ['day', 'Dia'], ['type', 'Tipo'], ['bank', 'Banco'],
  ['plannedAmount', 'Planejado'], ['actualAmount', 'Real'],
  ['difference', 'Diferença'], ['status', 'Situação'],
];
const moneyColumns = new Set(['plannedAmount', 'actualAmount', 'difference']);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
export function columnValue(item, key, banks) {
  if (key === 'bank') return banks.find(bank => bank.id === item.bankId)?.name || 'Sem banco informado';
  if (key === 'status') return item.done ? item.type === 'income' ? 'Recebido' : 'Pago' : 'Pendente';
  if (key === 'type') return item.type === 'income' ? 'Entrada' : item.type === 'jarContribution' ? 'Aporte Caixinha' : item.kind === 'installment' ? `${item.installment}/${item.installments} parcelas` : item.kind === 'recurring' ? 'Mensal' : 'Avulsa';
  if (key === 'difference') return item.actualAmount == null ? null : item.plannedAmount - item.actualAmount;
  return item[key];
}
export function matchesFilters(item, filters, banks = [], jars = []) {
  return columns.every(([key]) => {
    const filter = filters[key];
    if (!filter) return true;
    const value = columnValue(item, key, banks);
    if (key === 'name') {
      const text = [item.name, item.category, item.person,
        item.type === 'jarContribution' ? jars.find(jar => jar.id === item.jarId)?.name : '',
        item.benefit || item.paymentSource === 'benefit' ? 'Benefício' : ''].join(' ');
      return normalize(text).includes(normalize(filter));
    }
    if (key === 'day' || moneyColumns.has(key)) {
      const hasMin = filter.min !== '' && filter.min != null;
      const hasMax = filter.max !== '' && filter.max != null;
      if (filter.presence === 'missing') return value == null && !hasMin && !hasMax;
      if (value == null) return !hasMin && !hasMax && filter.presence !== 'present';
      const scale = moneyColumns.has(key) ? 100 : 1;
      const bound = input => Math.round(Number(String(input).replace(',', '.')) * scale);
      return (!hasMin || value >= bound(filter.min)) && (!hasMax || value <= bound(filter.max));
    }
    return !filter || value === filter;
  });
}
function FilterPopover({ React: h, label, filter, children }) {
  const el = h.createElement;
  const id = h.useId();
  const [open, setOpen] = h.useState(false);
  const active = typeof filter === 'string' ? !!filter.trim() : !!filter && Object.values(filter).some(value => value !== '' && value != null);
  const summary = !active ? 'Filtrar' : typeof filter === 'string' ? filter : [
    filter.min !== '' && filter.min != null ? `De ${filter.min}` : '',
    filter.max !== '' && filter.max != null ? `Até ${filter.max}` : '',
    filter.presence === 'missing' ? 'Sem valor' : filter.presence === 'present' ? 'Com valor' : '',
  ].filter(Boolean).join(' · ');
  return el(h.Fragment, null,
    el('button', {
      type: 'button', className: `column-filter-trigger${active ? ' is-active' : ''}`,
      'aria-label': `Abrir filtro de ${label}`, 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-controls': id,
      title: active ? `${label}: ${summary}` : `Filtrar ${label}`,
      onClick: event => {
        const panel = document.getElementById(id);
        if (panel.matches(':popover-open')) { panel.hidePopover(); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        const width = Math.min(260, window.innerWidth - 24);
        panel.style.width = `${width}px`;
        panel.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
        panel.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 285))}px`;
        panel.showPopover();
        panel.querySelector('input, select')?.focus({ preventScroll: true });
      },
    }, el('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true },
      el('path', { d: 'M4 5h16l-6 7v6l-4 2v-8z' })), el('span', null, summary)),
    el('div', { id, popover: 'auto', role: 'dialog', 'aria-label': `Filtro de ${label}`, className: 'column-filter-popover',
      onToggle: event => setOpen(event.currentTarget.matches(':popover-open')),
    }, el('div', { className: 'column-filter-popover-heading' }, el('strong', null, label),
      el('button', { type: 'button', className: 'column-filter-close', 'aria-label': `Fechar filtro de ${label}`, onClick: () => document.getElementById(id).hidePopover() }, '×')),
    children,
    el('button', { type: 'button', className: 'column-filter-done', onClick: () => document.getElementById(id).hidePopover() }, 'Concluir')));
}
export function ColumnFilterRow({ React: h, items, banks, filters, onChange, onClear }) {
  const el = h.createElement;
  const updateRange = (key, field, value) => onChange(key, { ...(filters[key] || {}), [field]: value });
  return el('tr', { className: 'column-filters' },
    ...columns.map(([key, label]) => {
      let control;
      if (key === 'name') {
        control = el('input', { type: 'search', value: filters[key] || '', placeholder: 'Nome, categoria, pessoa…',
          'aria-label': `Filtrar ${label}`, onChange: event => onChange(key, event.target.value) });
      } else if (key === 'day' || moneyColumns.has(key)) {
        const money = moneyColumns.has(key);
        control = el('div', { className: 'column-filter-range' },
          ...[['min', 'De', 'mínimo'], ['max', 'Até', 'máximo']].map(([field, placeholder, word]) => el('input', {
            key: field, type: 'number', step: money ? '0.01' : '1',
            ...(key === 'day' ? { min: 1, max: 31 } : key !== 'difference' ? { min: 0 } : {}),
            value: filters[key]?.[field] ?? '', placeholder: money ? `${placeholder} R$` : placeholder,
            'aria-label': `Filtrar ${label}: ${word}`, onChange: event => updateRange(key, field, event.target.value),
          })),
          (key === 'actualAmount' || key === 'difference') && el('select', {
            value: filters[key]?.presence || '', 'aria-label': `Filtrar ${label}: preenchimento`,
            onChange: event => updateRange(key, 'presence', event.target.value),
          }, el('option', { value: '' }, 'Todos'), el('option', { value: 'present' }, 'Com valor'), el('option', { value: 'missing' }, 'Sem valor')));
      } else {
        const options = [...new Set(items.map(item => columnValue(item, key, banks)))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
        if (filters[key] && !options.includes(filters[key])) options.push(filters[key]);
        control = el('select', { value: filters[key] || '', 'aria-label': `Filtrar ${label}`,
          onChange: event => onChange(key, event.target.value) },
        el('option', { value: '' }, 'Todos'), ...options.map(value => el('option', { key: value, value }, value)));
      }
      return el('td', { key, className: 'column-filter-cell' }, el(FilterPopover, { React: h, label, filter: filters[key] }, control));
    }),
    el('td', null, el('button', { type: 'button', className: 'text-button', onClick: onClear }, 'Limpar filtros')));
}
