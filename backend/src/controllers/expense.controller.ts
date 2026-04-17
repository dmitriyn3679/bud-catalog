import { Request, Response } from 'express';
import * as expenseService from '../services/expense.service';

type IdParam = { id: string };

export const listExpenses = async (req: Request, res: Response) => {
  const expenses = await expenseService.listExpenses({
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  });
  res.json(expenses);
};

export const createExpense = async (req: Request, res: Response) => {
  const expense = await expenseService.createExpense(req.body);
  res.status(201).json(expense);
};

export const updateExpense = async (req: Request<IdParam>, res: Response) => {
  const expense = await expenseService.updateExpense(req.params.id, req.body);
  res.json(expense);
};

export const deleteExpense = async (req: Request<IdParam>, res: Response) => {
  await expenseService.deleteExpense(req.params.id);
  res.status(204).end();
};
