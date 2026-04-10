import {
  Button,
  Center,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconCircleCheckFilled, IconCircleDashed, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOrders } from './useOrders';
import { OrderStatusBadge } from './OrderStatusBadge';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import type { AdminOrder } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Всі замовлення' },
  { value: 'pending',    label: 'Очікують' },
  { value: 'processing', label: 'В обробці' },
  { value: 'delivered',  label: 'Доставлені' },
  { value: 'cancelled',  label: 'Скасовані' },
];

function toIso(d: Date | string | null) {
  if (!d) return undefined;
  return new Date(d).toISOString().split('T')[0];
}

export function OrdersPage() {
  usePageTitle('Замовлення');
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [isPaidFilter, setIsPaidFilter] = useState<'paid' | 'unpaid' | ''>('');

  const isPaid = isPaidFilter === 'paid' ? true : isPaidFilter === 'unpaid' ? false : undefined;

  const { data, isLoading } = useAdminOrders(
    status || undefined,
    page,
    toIso(dateRange[0]),
    toIso(dateRange[1]),
    isPaid,
  );

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Title order={3}>Замовлення</Title>
        <Group align="flex-end">
          <DateRangeFilter
            value={dateRange}
            onChange={(v) => { setDateRange(v); setPage(1); }}
          />
          <Select
            w={200}
            label="Статус"
            data={STATUS_OPTIONS}
            value={status}
            onChange={(v) => { setStatus(v ?? ''); setPage(1); }}
          />
          <Select
            w={160}
            label="Оплата"
            data={[
              { value: '',       label: 'Всі' },
              { value: 'paid',   label: 'Сплачені' },
              { value: 'unpaid', label: 'Не сплачені' },
            ]}
            value={isPaidFilter}
            onChange={(v) => { setIsPaidFilter((v ?? '') as 'paid' | 'unpaid' | ''); setPage(1); }}
            allowDeselect={false}
          />
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/admin/orders/new')}>
            Нове замовлення
          </Button>
        </Group>
      </Group>

      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>№</Table.Th>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Клієнт</Table.Th>
            <Table.Th>Сума</Table.Th>
            <Table.Th>Прибуток</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th ta="center">Оплата</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">Завантаження...</Text></Center></Table.Td></Table.Tr>
          ) : !data?.items.length ? (
            <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">Замовлень немає</Text></Center></Table.Td></Table.Tr>
          ) : data.items.map((order) => {
            const profit = order.items
              .filter((i) => i.changeType !== 'removed')
              .reduce((sum, i) => sum + (i.price - (i.actualPurchasePrice ?? i.purchasePrice)) * i.quantity, 0);
            return (
              <Table.Tr key={order._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/orders/${order._id}`)}>
                <Table.Td c="dimmed" fz="sm">{order._id.slice(-6).toUpperCase()}</Table.Td>
                <Table.Td>{new Date(order.createdAt).toLocaleDateString('uk-UA')}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>{order.userId.name}</Text>
                  <Text size="xs" c="dimmed">{order.userId.email}</Text>
                </Table.Td>
                <Table.Td fw={600}>{order.total.toLocaleString('uk-UA')} ₴</Table.Td>
                <Table.Td fw={600} c={profit >= 0 ? 'green' : 'red'}>
                  {profit.toLocaleString('uk-UA')} ₴
                </Table.Td>
                <Table.Td><OrderStatusBadge status={order.status as AdminOrder['status']} /></Table.Td>
                <Table.Td ta="center">
                  {order.status !== 'cancelled' && (
                    <Tooltip label={order.isPaid ? 'Сплачено' : 'Не сплачено'} withArrow>
                      {order.isPaid
                        ? <IconCircleCheckFilled size={18} color="var(--mantine-color-green-6)" />
                        : <IconCircleDashed size={18} color="var(--mantine-color-gray-4)" />
                      }
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      {(data?.totalPages ?? 0) > 1 && (
        <Pagination total={data!.totalPages} value={page} onChange={setPage} />
      )}
    </Stack>
  );
}
