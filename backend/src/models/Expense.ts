import mongoose, { Schema, Document } from 'mongoose';

export const EXPENSE_CATEGORIES = ['rent', 'salary', 'utilities', 'marketing', 'logistics', 'other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense extends Document {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: EXPENSE_CATEGORIES },
    date: { type: Date, required: true },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
