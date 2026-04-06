import {
  Center,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminOrders } from './useOrders';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { AdminOrder } from '../../types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Всі замовлення' },
  { value: 'pending',    label: 'Очікують' },
  { value: 'processing', label: 'В обробці' },
  { value: 'delivered',  label: 'Доставлені' },
  { value: 'cancelled',  label: 'Скасовані' },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminOrders(status || undefined, page);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Замовлення</Title>
        <Select
          w={200}
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v ?? ''); setPage(1); }}
        />
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
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr><Table.Td colSpan={6}><Center py="xl"><Text c="dimmed">Завантаження...</Text></Center></Table.Td></Table.Tr>
          ) : !data?.items.length ? (
            <Table.Tr><Table.Td colSpan={6}><Center py="xl"><Text c="dimmed">Замовлень немає</Text></Center></Table.Td></Table.Tr>
          ) : data.items.map((order) => {
            const profit = order.items.reduce(
              (sum, i) => sum + (i.price - i.purchasePrice) * i.quantity, 0
            );
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
