import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DateValue } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { Expense, ExpenseCategory } from '../../types';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from './useExpenses';
import type { ExpenseFormData } from './expensesApi';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Оренда',
  salary: 'Зарплата',
  utilities: 'Комунальні',
  marketing: 'Маркетинг',
  logistics: 'Логістика',
  other: 'Інше',
};

const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => ({
  value: k,
  label: CATEGORY_LABELS[k],
}));

function toIso(d: Date | null) {
  if (!d) return undefined;
  return new Date(d).toISOString().split('T')[0];
}

interface FormState {
  amount: number | string;
  description: string;
  category: ExpenseCategory | '';
  date: Date | null;
}

const EMPTY: FormState = { amount: '', description: '', category: '', date: new Date() };

export function ExpensesPage() {
  usePageTitle('Витрати');

  const [dateRange, setDateRange] = useState<[DateValue, DateValue]>([null, null]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const { data: expenses = [] } = useExpenses({
    dateFrom: toIso(dateRange[0] as Date | null),
    dateTo: toIso(dateRange[1] as Date | null),
  });

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const handleOpen = (expense?: Expense) => {
    if (expense) {
      setEditing(expense);
      setForm({
        amount: expense.amount,
        description: expense.description,
        category: expense.category,
        date: new Date(expense.date),
      });
    } else {
      setEditing(null);
      setForm(EMPTY);
    }
    open();
  };

  const handleClose = () => {
    setEditing(null);
    setForm(EMPTY);
    close();
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.description.trim() || !form.category || !form.date) {
      notifications.show({ color: 'red', message: 'Заповніть усі поля' });
      return;
    }

    const payload: ExpenseFormData = {
      amount: Number(form.amount),
      description: form.description.trim(),
      category: form.category as ExpenseCategory,
      date: toIso(form.date)!,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing._id, data: payload });
        notifications.show({ color: 'green', message: 'Витрату оновлено' });
      } else {
        await createMutation.mutateAsync(payload);
        notifications.show({ color: 'green', message: 'Витрату додано' });
      }
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ color: 'red', message: msg ?? 'Помилка' });
    }
  };

  const handleDelete = (expense: Expense) => {
    modals.openConfirmModal({
      title: 'Видалити витрату?',
      children: (
        <Text size="sm">
          «{expense.description}» на суму {expense.amount.toLocaleString('uk-UA')} ₴ буде видалено.
        </Text>
      ),
      labels: { confirm: 'Видалити', cancel: 'Скасувати' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(expense._id);
          notifications.show({ color: 'green', message: 'Витрату видалено' });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          notifications.show({ color: 'red', message: msg ?? 'Помилка видалення' });
        }
      },
    });
  };

  const filtered = categoryFilter
    ? expenses.filter((e) => e.category === categoryFilter)
    : expenses;

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack>
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Title order={3}>Витрати</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Додати витрату
          </Button>
        </Group>

        <Group align="flex-end" wrap="wrap">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Select
            miw={180}
            label="Категорія"
            data={[{ value: '', label: 'Всі категорії' }, ...CATEGORY_OPTIONS]}
            value={categoryFilter}
            onChange={(v) => setCategoryFilter(v ?? '')}
            clearable
          />
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Дата</Table.Th>
              <Table.Th>Категорія</Table.Th>
              <Table.Th>Опис</Table.Th>
              <Table.Th>Сума (₴)</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="xl">Витрат немає</Text>
                </Table.Td>
              </Table.Tr>
            ) : filtered.map((expense) => (
              <Table.Tr key={expense._id}>
                <Table.Td fz="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(expense.date).toLocaleDateString('uk-UA')}
                </Table.Td>
                <Table.Td fz="sm">{CATEGORY_LABELS[expense.category]}</Table.Td>
                <Table.Td>{expense.description}</Table.Td>
                <Table.Td fw={500} style={{ whiteSpace: 'nowrap' }}>
                  {expense.amount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => handleOpen(expense)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(expense)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal
        opened={opened}
        onClose={handleClose}
        title={editing ? 'Редагувати витрату' : 'Нова витрата'}
        centered
      >
        <Stack>
          <DatePickerInput
            label="Дата"
            placeholder="Оберіть дату"
            value={form.date}
            onChange={(d) => setForm((f) => ({ ...f, date: d as Date | null }))}
            valueFormat="DD.MM.YYYY"
            locale="uk"
            required
          />
          <Select
            label="Категорія"
            placeholder="Оберіть категорію"
            data={CATEGORY_OPTIONS}
            value={form.category || null}
            onChange={(v) => setForm((f) => ({ ...f, category: (v ?? '') as ExpenseCategory | '' }))}
            required
          />
          <TextInput
            label="Опис"
            placeholder="Наприклад: Оренда офісу за квітень"
            value={form.description}
            onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, description: v })); }}
            required
          />
          <NumberInput
            label="Сума (₴)"
            placeholder="0.00"
            value={form.amount}
            onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            min={0}
            decimalScale={2}
            required
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>Скасувати</Button>
            <Button loading={isBusy} onClick={handleSubmit}>
              {editing ? 'Зберегти' : 'Додати'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
