// Monthly cash planning, kept separate from the account's confirmed balance.
export function summarizeDashboard(summary, data, month) {
  const withdrawals = data.jars.reduce((total, jar) => total + jar.movements
    .filter(movement => movement.month === month && movement.amount < 0)
    .reduce((sum, movement) => sum - movement.amount, 0), 0);
  // Existing contributions are net of withdrawals. Show deposits separately so
  // a withdrawal never hides a planned deposit or appears as a negative expense.
  const plannedContributions = summary.contributions + withdrawals;
  const registeredExpenses = summary.cashExpenses;
  const remainingBudgets = summary.cashReserve;
  const plannedExpenses = registeredExpenses + remainingBudgets;
  const plannedOutflow = plannedExpenses + plannedContributions;
  return {
    income: summary.income,
    registeredExpenses,
    remainingBudgets,
    plannedExpenses,
    plannedContributions,
    withdrawals,
    plannedOutflow,
    projectedResult: summary.income + withdrawals - plannedOutflow,
  };
}
const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
export function MonthlyPlanBreakdown({ React, plan }) {
  const el = React.createElement;
  return el('section', { className: 'panel monthly-plan', 'aria-label': 'Previsão das entradas e saídas' },
    el('div', { className: 'monthly-plan-result' },
      el('div', null, el('strong', null, 'Resultado previsto do mês'),
        el('p', null, 'Entradas menos contas, orçamentos e aportes', plan.withdrawals > 0 ? ', mais retiradas das caixinhas.' : '.')),
      el('strong', { className: `monthly-plan-value ${plan.projectedResult < 0 ? 'negative' : 'positive'}` }, currency(plan.projectedResult))),
    el('details', null,
      el('summary', null, 'Ver composição da previsão'),
      el('dl', { className: 'monthly-plan-breakdown' },
        ...[
          ['Entradas em dinheiro', plan.income],
          ['Contas e gastos lançados', -plan.registeredExpenses],
          ['Orçamento ainda não utilizado', -plan.remainingBudgets],
          ['Aportes previstos nas caixinhas', -plan.plannedContributions],
          ...(plan.withdrawals > 0 ? [['Retiradas das caixinhas', plan.withdrawals]] : []),
        ].map(([label, amount]) => el('div', { key: label }, el('dt', null, label), el('dd', null, currency(amount))))),
      el('p', { className: 'monthly-plan-note' }, 'Os gastos lançados já consomem o orçamento da categoria; somamos apenas o limite restante. Benefícios e saldo inicial não entram neste resultado. O saldo acumulado das reservas continua na página Caixinhas.')));
}
