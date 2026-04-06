import {
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, useParams } from 'react-router-dom';
import { useAdminOrder, useUpdateOrderStatus } from './useOrders';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { AdminOrder } from '../../types';

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Очікує' },
  { value: 'processing', label: 'В обробці' },
  { value: 'delivered',  label: 'Доставлено' },
  { value: 'cancelled',  label: 'Скасовано' },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useAdminOrder(id!);
  const updateStatus = useUpdateOrderStatus(id!);

  if (isLoading) return <Center h={300}><Loader /></Center>;
  if (!order) return <Text c="red">Замовлення не знайдено</Text>;

  const profit = order.items.reduce((sum, i) => sum + (i.price - i.purchasePrice) * i.quantity, 0);
  const cost   = order.items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);

  const handleStatusChange = async (status: string | null) => {
    if (!status) return;
    try {
      await updateStatus.mutateAsync(status as AdminOrder['status']);
      notifications.show({ color: 'green', message: 'Статус оновлено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка оновлення статусу' });
    }
  };

  return (
    <Stack maw={820}>
      <Group>
        <Button component={Link} to="/admin/orders" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
          Назад
        </Button>
        <Title order={3}>Замовлення #{order._id.slice(-6).toUpperCase()}</Title>
        <OrderStatusBadge status={order.status} />
      </Group>

      <Group align="flex-start" gap="xl">
        {/* Customer info */}
        <Paper withBorder p="md" radius="md" flex={1}>
          <Title order={5} mb="sm">Клієнт</Title>
          <Stack gap={4}>
            <Text fw={500}>{order.userId.name}</Text>
            <Text size="sm" c="dimmed">{order.userId.email}</Text>
            {order.userId.phone && <Text size="sm">{order.userId.phone}</Text>}
            <Divider my="xs" />
            <Text size="sm" fw={500}>Адреса доставки:</Text>
            <Text size="sm">{order.deliveryAddress}</Text>
            {order.note && <Text size="sm" c="dimmed">Коментар: {order.note}</Text>}
          </Stack>
        </Paper>

        {/* Status change */}
        <Paper withBorder p="md" radius="md" w={220}>
          <Title order={5} mb="sm">Змінити статус</Title>
          <Select
            data={STATUS_OPTIONS}
            value={order.status}
            onChange={handleStatusChange}
          />
          <Text size="xs" c="dimmed" mt="xs">
            {new Date(order.createdAt).toLocaleString('uk-UA')}
          </Text>
        </Paper>
      </Group>

      {/* Items */}
      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Товар</Table.Th>
              <Table.Th ta="right">К-сть</Table.Th>
              <Table.Th ta="right">Ціна клієнта</Table.Th>
              <Table.Th ta="right">Закупівельна</Table.Th>
              <Table.Th ta="right">Прибуток</Table.Th>
              <Table.Th ta="right">Сума</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {order.items.map((item, i) => {
              const itemProfit = (item.price - item.purchasePrice) * item.quantity;
              return (
                <Table.Tr key={i}>
                  <Table.Td>{item.title}</Table.Td>
                  <Table.Td ta="right">{item.quantity}</Table.Td>
                  <Table.Td ta="right">{item.price.toLocaleString('uk-UA')} ₴</Table.Td>
                  <Table.Td ta="right" c="dimmed">{item.purchasePrice.toLocaleString('uk-UA')} ₴</Table.Td>
                  <Table.Td ta="right" fw={500} c={itemProfit >= 0 ? 'green' : 'red'}>
                    {itemProfit.toLocaleString('uk-UA')} ₴
                  </Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {(item.price * item.quantity).toLocaleString('uk-UA')} ₴
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Totals */}
      <Group justify="flex-end">
        <Stack gap={4} align="flex-end">
          <Group gap="xl">
            <Text c="dimmed">Собівартість:</Text>
            <Text w={120} ta="right">{cost.toLocaleString('uk-UA')} ₴</Text>
          </Group>
          <Group gap="xl">
            <Text c="dimmed">Виручка:</Text>
            <Text w={120} ta="right" fw={600}>{order.total.toLocaleString('uk-UA')} ₴</Text>
          </Group>
          <Group gap="xl">
            <Text fw={600}>Прибуток:</Text>
            <Text w={120} ta="right" fw={700} c={profit >= 0 ? 'green' : 'red'}>
              {profit.toLocaleString('uk-UA')} ₴
            </Text>
          </Group>
        </Stack>
      </Group>
    </Stack>
  );
}
