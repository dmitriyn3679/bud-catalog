import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Pagination,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useOrders, useOrderDetail, useUpdateProfile, useChangePassword, useReorder } from './useProfile';
import { OrderStatusBadge } from './OrderStatusBadge';
import { IconChevronRight, IconChevronLeft, IconX, IconRefresh, IconDownload } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { usePageTitle } from '../../hooks/usePageTitle';

type DateRange = [Date | null, Date | null];

const STATUS_OPTIONS = [
  { value: '', label: 'Всі статуси' },
  { value: 'pending', label: 'Очікує' },
  { value: 'processing', label: 'В обробці' },
  { value: 'delivered', label: 'Доставлено' },
  { value: 'cancelled', label: 'Скасовано' },
];

function toIso(d: Date | string | null) {
  if (!d) return undefined;
  return new Date(d).toISOString().slice(0, 10);
}

// ─── Orders tab ──────────────────────────────────────────────────────────────

function OrdersTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>([null, null]);
  const navigate = useNavigate();

  const resetPage = () => setPage(1);

  const filters = {
    status: status || undefined,
    dateFrom: toIso(dateRange[0]),
    dateTo: toIso(dateRange[1]),
  };

  const { data, isLoading } = useOrders(page, filters);

  const hasFilters = !!status || !!dateRange[0] || !!dateRange[1];

  const clearFilters = () => {
    setStatus('');
    setDateRange([null, null]);
    setPage(1);
  };

  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="sm" align="flex-end" wrap="wrap">
        <Select
          w={160}
          label="Статус"
          data={STATUS_OPTIONS}
          value={status}
          onChange={(v) => { setStatus(v ?? ''); resetPage(); }}
          allowDeselect={false}
          styles={{ input: { background: '#fff' } }}
        />
        <DatePickerInput
          type="range"
          label="Період"
          value={dateRange}
          onChange={(v) => {
            setDateRange(v as DateRange);
            resetPage();
          }}
          clearable
          placeholder="Оберіть діапазон дат"
          valueFormat="DD.MM.YYYY"
          w={240}
          styles={{ input: { background: '#fff' } }}
        />
        {hasFilters && (
          <ActionIcon
            variant="subtle"
            color="gray"
            mb={1}
            onClick={clearFilters}
            title="Скинути фільтри"
          >
            <IconX size={16} />
          </ActionIcon>
        )}
      </Group>

      {isLoading ? (
        <Center h={200}><Loader size="sm" /></Center>
      ) : !data?.items.length ? (
        <Text c="dimmed" size="sm">Замовлень не знайдено</Text>
      ) : (
        <>
          {data.items.map((order) => (
            <Box
              key={order._id}
              onClick={() => navigate(`/profile/orders/${order._id}`)}
              style={{
                background: '#fff',
                border: '1px solid var(--mantine-color-gray-2)',
                borderRadius: 10,
                padding: '14px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--mantine-color-gray-4)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--mantine-color-gray-2)')}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="lg" wrap="nowrap">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Замовлення</Text>
                    <Text size="sm" fw={600}>#{order._id.slice(-6).toUpperCase()}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Дата</Text>
                    <Text size="sm">{new Date(order.createdAt).toLocaleDateString('uk-UA')}</Text>
                  </Stack>
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed">Сума</Text>
                    <Text size="sm" fw={600}>
                      {order.items.some((i) => i.hidePrice)
                        ? 'Уточнюється'
                        : `${order.total.toLocaleString('uk-UA')} ₴`}
                    </Text>
                  </Stack>
                </Group>
                <Group gap="sm" wrap="nowrap">
                  <OrderStatusBadge status={order.status} />
                  {order.status !== 'cancelled' && (
                    <Badge size="sm" variant="light" color={order.isPaid ? 'green' : 'gray'}>
                      {order.isPaid ? 'Сплачено' : 'Не сплачено'}
                    </Badge>
                  )}
                  <IconChevronRight size={16} color="var(--mantine-color-gray-5)" />
                </Group>
              </Group>
            </Box>
          ))}
          {data.totalPages > 1 && (
            <Center>
              <Pagination total={data.totalPages} value={page} onChange={setPage} size="sm" />
            </Center>
          )}
        </>
      )}
    </Stack>
  );
}

// ─── Order detail ─────────────────────────────────────────────────────────────

function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading } = useOrderDetail(orderId!);
  const reorder = useReorder();
  const navigate = useNavigate();
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId!.slice(-6).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', message: 'Помилка завантаження накладної' });
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleReorder = async () => {
    try {
      const { added, clamped, skipped } = await reorder.mutateAsync(orderId!);
      if (added === 0) {
        notifications.show({ color: 'red', message: 'Жоден товар не доступний для повторного замовлення' });
        return;
      }
      if (clamped > 0 && skipped > 0) {
        notifications.show({ color: 'orange', message: `Деякі товари додано з меншою кількістю, ${skipped} — недоступні` });
      } else if (clamped > 0) {
        notifications.show({ color: 'yellow', message: 'Деякі товари додано з меншою кількістю (недостатньо на складі)' });
      } else if (skipped > 0) {
        notifications.show({ color: 'yellow', message: `${skipped} товар(ів) недоступні і не були додані` });
      } else {
        notifications.show({ color: 'green', message: 'Товари додано до кошика' });
      }
      navigate('/cart');
    } catch {
      notifications.show({ color: 'red', message: 'Помилка. Спробуйте ще раз' });
    }
  };

  if (isLoading) return <Center h={200}><Loader size="sm" /></Center>;
  if (!order) return <Text c="red" size="sm">Замовлення не знайдено</Text>;

  return (
    <Stack gap="md">
      <Group>
        <Text
          component={Link}
          to="/profile"
          size="sm"
          c="dimmed"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <IconChevronLeft size={14} />
          Мої замовлення
        </Text>
      </Group>

      <Group justify="space-between">
        <Group gap="sm">
          <Text fw={600}>Замовлення #{order._id.slice(-6).toUpperCase()}</Text>
          <OrderStatusBadge status={order.status} />
          {order.status !== 'cancelled' && (
            <Badge size="sm" variant="light" color={order.isPaid ? 'green' : 'gray'}>
              {order.isPaid ? 'Сплачено' : 'Не сплачено'}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color="gray"
            leftSection={<IconDownload size={14} />}
            loading={invoiceLoading}
            onClick={handleDownloadInvoice}
          >
            Накладна
          </Button>
          <Button
            size="xs"
            variant="light"
            color="dark"
            leftSection={<IconRefresh size={14} />}
            loading={reorder.isPending}
            onClick={handleReorder}
          >
            Повторити замовлення
          </Button>
        </Group>
      </Group>

      <Text size="sm" c="dimmed">
        {new Date(order.createdAt).toLocaleString('uk-UA')} · {order.deliveryAddress}
      </Text>
      {order.note && (
        <Text size="sm" c="dimmed">Коментар: {order.note}</Text>
      )}

      <Divider />

      <Stack gap={4}>
        {order.items.map((item, i) => {
          const isRemoved = item.changeType === 'removed';
          const bg =
            item.changeType === 'added'    ? 'var(--mantine-color-green-0)' :
            item.changeType === 'modified' ? 'var(--mantine-color-yellow-0)' :
            item.changeType === 'removed'  ? 'var(--mantine-color-red-0)' :
            undefined;
          return (
            <Box
              key={i}
              px="xs"
              py={6}
              style={{
                borderRadius: 6,
                background: bg,
                border: bg ? '1px solid' : '1px solid transparent',
                borderColor: bg
                  ? item.changeType === 'added'    ? 'var(--mantine-color-green-2)'
                  : item.changeType === 'modified' ? 'var(--mantine-color-yellow-3)'
                  : 'var(--mantine-color-red-2)'
                  : 'transparent',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Text
                  size="sm"
                  flex={1}
                  lineClamp={1}
                  td={isRemoved ? 'line-through' : undefined}
                  c={isRemoved ? 'dimmed' : undefined}
                >
                  {item.title}
                </Text>
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {isRemoved ? '—' : item.hidePrice ? `${item.quantity} × уточнюється` : item.changeType === 'modified' && item.originalQuantity != null
                    ? (
                      <>
                        <Text span size="sm" td="line-through" c="dimmed">{item.originalQuantity}</Text>
                        {' → '}{item.quantity} × {item.price.toLocaleString('uk-UA')} ₴
                      </>
                    )
                    : `${item.quantity} × ${item.price.toLocaleString('uk-UA')} ₴`}
                </Text>
                <Text size="sm" fw={600} w={80} ta="right" style={{ whiteSpace: 'nowrap' }} c={isRemoved ? 'dimmed' : item.hidePrice ? 'dimmed' : undefined}>
                  {isRemoved ? '—' : item.hidePrice ? 'Уточнюється' : `${(item.quantity * item.price).toLocaleString('uk-UA')} ₴`}
                </Text>
              </Group>
            </Box>
          );
        })}
      </Stack>

      <Divider />
      <Group justify="flex-end">
        <Text c="dimmed" size="sm">Разом:</Text>
        <Text fw={700}>
          {order.items.some((i) => i.hidePrice)
            ? 'Уточнюється менеджером'
            : `${order.total.toLocaleString('uk-UA')} ₴`}
        </Text>
      </Group>
    </Stack>
  );
}

// ─── Personal info tab ────────────────────────────────────────────────────────

const infoSchema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи'),
  phone: z.string().max(20).optional(),
  shopName: z.string().min(2, 'Мінімум 2 символи'),
  city: z.string().min(2, 'Мінімум 2 символи'),
  address: z.string().min(5, 'Мінімум 5 символів'),
});
type InfoForm = z.infer<typeof infoSchema>;

function PersonalInfoTab() {
  const { user, setUser } = useAuth();
  const updateProfile = useUpdateProfile();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      shopName: user?.shopName ?? '',
      city: user?.city ?? '',
      address: user?.address ?? '',
    },
  });

  const onSubmit = async (data: InfoForm) => {
    try {
      const updated = await updateProfile.mutateAsync(data);
      setUser(updated);
      notifications.show({ color: 'green', message: 'Дані збережено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  return (
    <Box maw={480}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
            Контактна інформація
          </Text>
          <SimpleGrid cols={2} spacing="sm">
            <TextInput
              label="Ім'я"
              {...register('name')}
              error={errors.name?.message}
              styles={{ input: { background: '#fff' } }}
            />
            <TextInput
              label="Телефон"
              placeholder="+380..."
              {...register('phone')}
              styles={{ input: { background: '#fff' } }}
            />
          </SimpleGrid>

          <Divider my={4} />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
            Підприємство
          </Text>
          <TextInput
            label="Назва"
            {...register('shopName')}
            error={errors.shopName?.message}
            styles={{ input: { background: '#fff' } }}
          />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput
              label="Місто"
              {...register('city')}
              error={errors.city?.message}
              styles={{ input: { background: '#fff' } }}
            />
            <TextInput
              label="Адреса"
              {...register('address')}
              error={errors.address?.message}
              styles={{ input: { background: '#fff' } }}
            />
          </SimpleGrid>

          <Button type="submit" loading={isSubmitting} w="fit-content" color="dark" mt="xs">
            Зберегти
          </Button>
        </Stack>
      </form>
    </Box>
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
    <Box maw={360}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="sm">
          <PasswordInput
            label="Поточний пароль"
            {...register('oldPassword')}
            error={errors.oldPassword?.message}
            styles={{ input: { background: '#fff' } }}
          />
          <PasswordInput
            label="Новий пароль"
            {...register('newPassword')}
            error={errors.newPassword?.message}
            styles={{ input: { background: '#fff' } }}
          />
          <PasswordInput
            label="Підтвердіть новий пароль"
            {...register('confirm')}
            error={errors.confirm?.message}
            styles={{ input: { background: '#fff' } }}
          />
          <Button type="submit" loading={isSubmitting} w="fit-content" color="dark" mt="xs">
            Змінити пароль
          </Button>
        </Stack>
      </form>
    </Box>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  usePageTitle('Профіль');
  const { orderId } = useParams<{ orderId?: string }>();
  const { user } = useAuth();

  return (
    <Box maw={900} mx="auto">
      <Group mb="lg" gap="sm">
        <Stack gap={2}>
          <Text fw={600} size="xl">Особистий кабінет</Text>
          <Text size="sm" c="dimmed">{user?.email}</Text>
        </Stack>
      </Group>

      <Tabs defaultValue="orders" keepMounted={false}>
        <Tabs.List mb="lg" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Tabs.Tab value="orders" fz="sm">Замовлення</Tabs.Tab>
          <Tabs.Tab value="info" fz="sm">Мої дані</Tabs.Tab>
          <Tabs.Tab value="password" fz="sm">Пароль</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="orders">
          {orderId ? <OrderDetail /> : <OrdersTab />}
        </Tabs.Panel>
        <Tabs.Panel value="info">
          <PersonalInfoTab />
        </Tabs.Panel>
        <Tabs.Panel value="password">
          <ChangePasswordTab />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
