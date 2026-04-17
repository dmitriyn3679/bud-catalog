import { Expense, ExpenseCategory } from '../models/Expense';
import { AppError } from '../middlewares/errorHandler';

interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
}

interface ExpenseData {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string;
}

function buildDateMatch(dateFrom?: string, dateTo?: string): Record<string, Date> | undefined {
  if (!dateFrom && !dateTo) return undefined;
  const range: Record<string, Date> = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    range.$lte = to;
  }
  return range;
}

export async function listExpenses(filters: ExpenseFilters = {}) {
  const match: Record<string, unknown> = {};
  const dateRange = buildDateMatch(filters.dateFrom, filters.dateTo);
  if (dateRange) match.date = dateRange;

  return Expense.find(match).sort({ date: -1 }).lean();
}

export async function createExpense(data: ExpenseData) {
  return new Expense({ ...data, date: new Date(data.date) }).save();
}

export async function updateExpense(id: string, data: Partial<ExpenseData>) {
  const update: Record<string, unknown> = { ...data };
  if (data.date) update.date = new Date(data.date);

  const expense = await Expense.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!expense) throw new AppError('Expense not found', 404);
  return expense;
}

export async function deleteExpense(id: string) {
  const expense = await Expense.findByIdAndDelete(id);
  if (!expense) throw new AppError('Expense not found', 404);
}

export async function sumExpenses(dateFrom?: string, dateTo?: string): Promise<number> {
  const match: Record<string, unknown> = {};
  const dateRange = buildDateMatch(dateFrom, dateTo);
  if (dateRange) match.date = dateRange;

  const [result] = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return result?.total ?? 0;
}
