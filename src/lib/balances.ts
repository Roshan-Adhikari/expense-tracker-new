export interface Split {
  expense_id: string;
  user_id: string;
  amount_owed: number;
  is_settled: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  paid_by: string;
  group_id: string | null;
}

/** Net balance for a user in a group: positive = owed money, negative = owes money */
export function netBalanceForUser(
  userId: string,
  expenses: Expense[],
  splits: Split[]
): number {
  const expenseIds = new Set(expenses.map((e) => e.id));
  const relevant = splits.filter(
    (s) => expenseIds.has(s.expense_id) && !s.is_settled
  );

  const paid = expenses
    .filter((e) => e.paid_by === userId)
    .reduce((sum, e) => sum + e.amount, 0);

  const share = relevant
    .filter((s) => s.user_id === userId)
    .reduce((sum, s) => sum + s.amount_owed, 0);

  const othersOweMe = relevant
    .filter((s) => {
      const exp = expenses.find((e) => e.id === s.expense_id);
      return exp && exp.paid_by === userId && s.user_id !== userId;
    })
    .reduce((sum, s) => sum + s.amount_owed, 0);

  const iOweOthers = relevant
    .filter((s) => {
      const exp = expenses.find((e) => e.id === s.expense_id);
      return s.user_id === userId && exp && exp.paid_by !== userId;
    })
    .reduce((sum, s) => sum + s.amount_owed, 0);

  return othersOweMe - iOweOthers;
}

/** Pairwise balance between me and another member (positive = they owe me) */
export function balanceWithMember(
  meId: string,
  memberId: string,
  expenses: Expense[],
  splits: Split[]
): number {
  const expenseIds = new Set(expenses.map((e) => e.id));
  const relevant = splits.filter(
    (s) => expenseIds.has(s.expense_id) && !s.is_settled
  );

  let balance = 0;

  for (const exp of expenses) {
    const expSplits = relevant.filter((s) => s.expense_id === exp.id);
    const mySplit = expSplits.find((s) => s.user_id === meId);
    const theirSplit = expSplits.find((s) => s.user_id === memberId);

    if (exp.paid_by === meId && theirSplit) {
      balance += theirSplit.amount_owed;
    } else if (exp.paid_by === memberId && mySplit) {
      balance -= mySplit.amount_owed;
    }
  }

  return balance;
}
