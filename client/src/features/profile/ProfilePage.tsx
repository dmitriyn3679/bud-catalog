import {
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Pagination,
  Paper,
  PasswordInput,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useOrders, useOrderDetail, useUpdateProfile, useChangePassword } from './useProfile';
import { OrderStatusBadge } from './OrderStatusBadge';

// ─── Orders tab ──────────────────────────────────────────────────────────────

function OrdersTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrders(page);
  const navigate = useNavigate();

  if (isLoading) return <Center h={200}><Loader size="sm" /></Center>;
  if (!data?.items.length) return <Text c="dimmed">Замовлень ще немає</Text>;

  return (
    <Stack>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>№</Table.Th>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Сума</Table.Th>
            <Table.Th>Статус</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.items.map((order) => (
            <Table.Tr
              key={order._id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/profile/orders/${order._id}`)}
            >
              <Table.Td c="dimmed" fz="sm">{order._id.slice(-6).toUpperCase()}</Table.Td>
              <Table.Td>{new Date(order.createdAt).toLocaleDateString('uk-UA')}</Table.Td>
              <Table.Td fw={600}>{order.total.toLocaleString('uk-UA')} ₴</Table.Td>
              <Table.Td><OrderStatusBadge status={order.status} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {data.totalPages > 1 && (
        <Pagination total={data.totalPages} value={page} onChange={setPage} />
      )}
    </Stack>
  );
}

// ─── Order detail ─────────────────────────────────────────────────────────────

function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrderDetail(orderId!);

  if (isLoading) return <Center h={200}><Loader size="sm" /></Center>;
  if (!order) return <Text c="red">Замовлення не знайдено</Text>;

  return (
    <Stack>
      <Group>
        <Text component={Link} to="/profile" c="blue" style={{ textDecoration: 'none' }}>← Мої замовлення</Text>
      </Group>
      <Group justify="space-between">
        <Title order={4}>Замовлення #{order._id.slice(-6).toUpperCase()}</Title>
        <OrderStatusBadge status={order.status} />
      </Group>
      <Text size="sm" c="dimmed">
        {new Date(order.createdAt).toLocaleString('uk-UA')} · {order.deliveryAddress}
      </Text>
      {order.note && <Text size="sm">Коментар: {order.note}</Text>}

      <Divider />

      <Stack gap="xs">
        {order.items.map((item, i) => (
          <Group key={i} justify="space-between">
            <Text size="sm" flex={1}>{item.title}</Text>
            <Text size="sm" c="dimmed">{item.quantity} шт. × {item.price.toLocaleString('uk-UA')} ₴</Text>
            <Text size="sm" fw={600} w={80} ta="right">
              {(item.quantity * item.price).toLocaleString('uk-UA')} ₴
            </Text>
          </Group>
        ))}
      </Stack>

      <Divider />
      <Group justify="flex-end">
        <Text fw={700} size="lg">Разом: {order.total.toLocaleString('uk-UA')} ₴</Text>
      </Group>
    </Stack>
  );
}

// ─── Personal info tab ────────────────────────────────────────────────────────

const infoSchema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи'),
  phone: z.string().max(20).optional(),
  address: z.string().max(300).optional(),
});
type InfoForm = z.infer<typeof infoSchema>;

function PersonalInfoTab() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: { name: user?.name, phone: user?.phone, address: user?.address },
  });

  const onSubmit = async (data: InfoForm) => {
    try {
      await updateProfile.mutateAsync(data);
      notifications.show({ color: 'green', message: 'Дані збережено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" maw={480}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <TextInput label="Ім'я" {...register('name')} error={errors.name?.message} />
          <TextInput label="Телефон" placeholder="+380..." {...register('phone')} />
          <TextInput label="Адреса" placeholder="м. Київ..." {...register('address')} />
          <Button type="submit" loading={isSubmitting} w="fit-content">Зберегти</Button>
        </Stack>
      </form>
    </Paper>
  );
}

// ─── Change password tab ──────────────────────────────────────────────────────

const pwSchema = z.object({
  oldPassword: z.string().min(1, 'Введіть поточний пароль'),
  newPassword: z.string().min(8, 'Мінімум 8 символів'),
  confirm: z.string(),
}).refine((d) => d.newPassword === d.confirm, {
  message: 'Паролі не співпадають',
  path: ['confirm'],
});
type PwForm = z.infer<typeof pwSchema>;

function ChangePasswordTab() {
  const changePassword = useChangePassword();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const onSubmit = async (data: PwForm) => {
    try {
      await changePassword.mutateAsync({ oldPassword: data.oldPassword, newPassword: data.newPassword });
      notifications.show({ color: 'green', message: 'Пароль змінено. Увійдіть знову.' });
      reset();
      await logout();
      navigate('/login');
    } catch {
      notifications.show({ color: 'red', message: 'Поточний пароль невірний' });
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" maw={480}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack>
          <PasswordInput label="Поточний пароль" {...register('oldPassword')} error={errors.oldPassword?.message} />
          <PasswordInput label="Новий пароль" {...register('newPassword')} error={errors.newPassword?.message} />
          <PasswordInput label="Підтвердіть новий пароль" {...register('confirm')} error={errors.confirm?.message} />
          <Button type="submit" loading={isSubmitting} w="fit-content">Змінити пароль</Button>
        </Stack>
      </form>
    </Paper>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { orderId } = useParams<{ orderId?: string }>();
  const { user } = useAuth();

  return (
    <Stack maw={900} mx="auto">
      <Group>
        <Title order={2}>Особистий кабінет</Title>
        <Text c="dimmed">({user?.email})</Text>
      </Group>

      <Tabs defaultValue={orderId ? 'orders' : 'orders'} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="orders">Замовлення</Tabs.Tab>
          <Tabs.Tab value="info">Мої дані</Tabs.Tab>
          <Tabs.Tab value="password">Пароль</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="orders" pt="md">
          {orderId ? <OrderDetail /> : <OrdersTab />}
        </Tabs.Panel>
        <Tabs.Panel value="info" pt="md">
          <PersonalInfoTab />
        </Tabs.Panel>
        <Tabs.Panel value="password" pt="md">
          <ChangePasswordTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
