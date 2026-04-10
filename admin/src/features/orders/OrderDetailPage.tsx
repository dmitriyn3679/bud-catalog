import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconDeviceFloppy, IconDownload, IconEdit, IconPlus, IconRotateClockwise, IconTrash, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminOrder, useUpdateActualPrices, useUpdateOrderItems, useUpdateOrderPaid, useUpdateOrderStatus } from './useOrders';
import { useAdminProducts } from '../products/useProducts';
import { api } from '../../api/axios';
import { OrderStatusBadge } from './OrderStatusBadge';
import type { AdminOrder, AdminProduct, OrderItem } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Очікує' },
  { value: 'processing', label: 'В обробці' },
  { value: 'delivered',  label: 'Доставлено' },
  { value: 'cancelled',  label: 'Скасовано' },
];

type EditItem = {
  productId: string;
  title: string;
  price: number;
  purchasePrice: number;
  quantity: number;
  changeType?: OrderItem['changeType'];
};

function changeTypeBg(changeType?: OrderItem['changeType']): string | undefined {
  if (changeType === 'added')    return 'var(--mantine-color-green-0)';
  if (changeType === 'modified') return 'var(--mantine-color-yellow-0)';
  if (changeType === 'removed')  return 'var(--mantine-color-red-0)';
  return undefined;
}

function changeTypeColor(changeType?: OrderItem['changeType']): string | undefined {
  if (changeType === 'added')    return 'green';
  if (changeType === 'modified') return 'yellow';
  if (changeType === 'removed')  return 'red';
  return undefined;
}

// ─── AddProductRow ─────────────────────────────────────────────────────────────

function AddProductRow({
  existingProductIds,
  onAdd,
}: {
  existingProductIds: Set<string>;
  onAdd: (product: AdminProduct, quantity: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [qty, setQty] = useState(1);

  const { data } = useAdminProducts({ search: debouncedSearch || undefined, page: 1 });

  const options = (data?.items ?? [])
    .filter((p) => p.isActive && !existingProductIds.has(p._id))
    .map((p) => ({ value: p._id, label: `${p.title}${p.sku ? ` [${p.sku}]` : ''}` }));

  const handleSelect = (value: string | null) => {
    const product = (data?.items ?? []).find((p) => p._id === value) ?? null;
    setSelectedProduct(product);
    if (product) setSearch(product.title);
  };

  const handleAdd = () => {
    if (!selectedProduct) return;
    onAdd(selectedProduct, qty);
    setSelectedProduct(null);
    setSearch('');
    setQty(1);
  };

  return (
    <Group align="flex-end" gap="sm" mt="xs">
      <Select
        flex={1}
        label="Додати товар"
        placeholder="Пошук по назві..."
        searchable
        data={options}
        value={selectedProduct?._id ?? null}
        searchValue={search}
        onSearchChange={setSearch}
        onChange={handleSelect}
        nothingFoundMessage="Товарів не знайдено"
        filter={({ options: opts }) => opts}
      />
      <NumberInput
        label="К-сть"
        value={qty}
        onChange={(v) => setQty(Number(v) || 1)}
        min={1}
        w={80}
      />
      <Button
        leftSection={<IconPlus size={14} />}
        disabled={!selectedProduct}
        onClick={handleAdd}
        mb={1}
      >
        Додати
      </Button>
    </Group>
  );
}

// ─── OrderDetailPage ───────────────────────────────────────────────────────────

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  usePageTitle(id ? `Замовлення #${id.slice(-6).toUpperCase()}` : 'Замовлення');
  const { data: order, isLoading } = useAdminOrder(id!);
  const updateStatus       = useUpdateOrderStatus(id!);
  const updateItems        = useUpdateOrderItems(id!);
  const updateActualPrices = useUpdateActualPrices(id!);
  const updatePaid         = useUpdateOrderPaid(id!);

  // ── Items edit state
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);

  // ── Actual prices state
  const [localPrices, setLocalPrices] = useState<Record<string, number | null>>({});
  const [localClientPrices, setLocalClientPrices] = useState<Record<string, number | null>>({});
  const initialPricesRef = useRef<Record<string, number | null>>({});
  const initialClientPricesRef = useRef<Record<string, number | null>>({});

  const canEdit = order && ['pending', 'processing'].includes(order.status);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const res = await api.get(`/admin/orders/${id}/invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id!.slice(-6).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ color: 'red', message: 'Помилка завантаження накладної' });
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    if (order) {
      setEditItems(
        order.items.map((i) => ({
          productId: i.productId,
          title: i.title,
          price: i.price,
          purchasePrice: i.purchasePrice,
          quantity: i.quantity,
          changeType: i.changeType,
        })),
      );

      const prices: Record<string, number | null> = {};
      const clientPrices: Record<string, number | null> = {};
      for (const item of order.items) {
        prices[item.productId] = item.actualPurchasePrice ?? null;
        clientPrices[item.productId] = null; // client price overrides are not persisted separately
      }
      setLocalPrices(prices);
      setLocalClientPrices(clientPrices);
      initialPricesRef.current = prices;
      initialClientPricesRef.current = clientPrices;
    }
  }, [order]);

  if (isLoading) return <Center h={300}><Loader /></Center>;
  if (!order) return <Text c="red">Замовлення не знайдено</Text>;

  // ── View mode stats
  const activeItems = order.items.filter((i) => i.changeType !== 'removed');

  const effClientPrice = (item: OrderItem) =>
    localClientPrices[item.productId] ?? item.price;

  const effPurchasePrice = (item: OrderItem) =>
    (localPrices[item.productId] ?? item.actualPurchasePrice) ?? item.purchasePrice;

  const _estimatedProfit = activeItems.reduce((sum, i) => sum + (i.price - i.purchasePrice) * i.quantity, 0); void _estimatedProfit;
  const actualProfit    = activeItems.reduce((sum, i) => sum + (effClientPrice(i) - effPurchasePrice(i)) * i.quantity, 0);
  const effectiveCost   = activeItems.reduce((sum, i) => sum + effPurchasePrice(i) * i.quantity, 0);
  const effectiveTotal  = activeItems.reduce((sum, i) => sum + effClientPrice(i) * i.quantity, 0);
  const _hasActualPrices = activeItems.some(
    (i) => (i.actualPurchasePrice ?? null) !== null || localPrices[i.productId] !== null,
  ); void _hasActualPrices;

  const hasClientPriceChanges = Object.values(localClientPrices).some((v) => v !== null);
  const isPricesDirty =
    JSON.stringify(localPrices) !== JSON.stringify(initialPricesRef.current) ||
    hasClientPriceChanges;

  const handleStatusChange = async (status: string | null) => {
    if (!status) return;
    try {
      await updateStatus.mutateAsync(status as AdminOrder['status']);
      notifications.show({ color: 'green', message: 'Статус оновлено' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Помилка оновлення статусу';
      notifications.show({ color: 'red', message: msg });
    }
  };

  const handleSavePrices = async () => {
    const items = order.items.map((i) => ({
      productId: i.productId,
      price: localClientPrices[i.productId] ?? undefined,
      actualPurchasePrice: localPrices[i.productId] ?? null,
    }));
    try {
      const { updatedProducts } = await updateActualPrices.mutateAsync(items);
      const msg = updatedProducts > 0
        ? `Фактичні ціни збережено. Оновлено ${updatedProducts} товар${updatedProducts === 1 ? '' : updatedProducts < 5 ? 'и' : 'ів'} у каталозі`
        : 'Фактичні ціни збережено';
      notifications.show({ color: 'green', message: msg });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження цін' });
    }
  };

  // ── Edit mode helpers
  const activeEditIds = new Set(
    editItems.filter((i) => i.changeType !== 'removed').map((i) => i.productId),
  );

  const handleQtyChange = (productId: string, qty: number) => {
    setEditItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  };

  const handleRemove = (productId: string) => {
    setEditItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, changeType: 'removed' as const } : i,
      ),
    );
  };

  const handleRestore = (productId: string) => {
    setEditItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, changeType: undefined } : i,
      ),
    );
  };

  const handleAddProduct = (product: AdminProduct, quantity: number) => {
    setEditItems((prev) => [
      ...prev,
      {
        productId: product._id,
        title: product.title,
        price: product.price,
        purchasePrice: product.purchasePrice,
        quantity,
        changeType: 'added' as const,
      },
    ]);
  };

  const handleSave = async () => {
    const toSend = editItems
      .filter((i) => i.changeType !== 'removed')
      .map((i) => ({ productId: i.productId, quantity: i.quantity }));

    if (!toSend.length) {
      notifications.show({ color: 'red', message: 'Замовлення не може бути порожнім' });
      return;
    }

    try {
      await updateItems.mutateAsync(toSend);
      notifications.show({ color: 'green', message: 'Замовлення оновлено' });
      setEditMode(false);
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  const handleCancelEdit = () => {
    setEditItems(
      order.items.map((i) => ({
        productId: i.productId,
        title: i.title,
        price: i.price,
        purchasePrice: i.purchasePrice,
        quantity: i.quantity,
        changeType: i.changeType,
      })),
    );
    setEditMode(false);
  };

  const editActiveItems = editItems.filter((i) => i.changeType !== 'removed');
  const editTotal = editActiveItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <Stack maw={960}>
      <Group justify="space-between">
        <Group>
          <Button component={Link} to="/admin/orders" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
            Назад
          </Button>
          <Title order={3}>Замовлення #{order._id.slice(-6).toUpperCase()}</Title>
          <OrderStatusBadge status={order.status} />
        </Group>
        <Group gap="xs">
          <Button
            variant="light"
            color="gray"
            leftSection={<IconDownload size={14} />}
            loading={invoiceLoading}
            onClick={handleDownloadInvoice}
          >
            Накладна
          </Button>
          {canEdit && !editMode && (
            <Button
              variant="light"
              leftSection={<IconEdit size={14} />}
              onClick={() => setEditMode(true)}
            >
              Редагувати позиції
            </Button>
          )}
        </Group>
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
          {order.status !== 'cancelled' && (
            <Checkbox
              mt="sm"
              label="Сплачено"
              checked={order.isPaid}
              onChange={async (e) => {
                try {
                  await updatePaid.mutateAsync(e.currentTarget.checked);
                } catch (err: unknown) {
                  const msg =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    'Помилка оновлення статусу оплати';
                  notifications.show({ color: 'red', message: msg });
                }
              }}
              color="green"
            />
          )}
          <Text size="xs" c="dimmed" mt="xs">
            {new Date(order.createdAt).toLocaleString('uk-UA')}
          </Text>
        </Paper>
      </Group>

      {/* Items — View mode */}
      {!editMode && (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Товар</Table.Th>
                <Table.Th ta="right">К-сть</Table.Th>
                <Table.Th ta="right">Ціна клієнта</Table.Th>
                <Table.Th ta="right">Закуп. ціна</Table.Th>
                <Table.Th ta="right">Прибуток</Table.Th>
                <Table.Th ta="right">Сума</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {order.items.map((item, i) => {
                const isRemoved = item.changeType === 'removed';
                const localVal = localPrices[item.productId];
                const localClientVal = localClientPrices[item.productId];
                const effCP = localClientVal ?? item.price;
                const effPP = localVal ?? item.actualPurchasePrice ?? item.purchasePrice;
                const needsPrice = !isRemoved && (!effCP || !effPP);
                const clientPrice = effClientPrice(item);
                const purchasePrice = effPurchasePrice(item);
                const itemProfit = (clientPrice - purchasePrice) * item.quantity;
                const bg = changeTypeBg(item.changeType);
                const color = changeTypeColor(item.changeType);
                return (
                  <Table.Tr key={i} style={{ background: bg }}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        {item.changeType && (
                          <Badge size="xs" color={color} variant="light">
                            {item.changeType === 'added' ? 'Додано' : item.changeType === 'modified' ? 'Змінено' : 'Видалено'}
                          </Badge>
                        )}
                        {needsPrice && (
                          <Badge size="xs" color="violet" variant="filled">
                            Потрібна ціна
                          </Badge>
                        )}
                        <Text
                          size="sm"
                          td={isRemoved ? 'line-through' : undefined}
                          c={isRemoved ? 'dimmed' : undefined}
                        >
                          {item.title}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right" c={isRemoved ? 'dimmed' : undefined}>
                      {item.changeType === 'modified' && item.originalQuantity != null
                        ? (
                          <>
                            <Text span size="sm" td="line-through" c="dimmed">{item.originalQuantity}</Text>
                            {' → '}{item.quantity}
                          </>
                        )
                        : item.quantity}
                    </Table.Td>
                    <Table.Td ta="right" p={isRemoved ? undefined : 4}>
                      {isRemoved
                        ? <Text c="dimmed">{item.price.toLocaleString('uk-UA')} ₴</Text>
                        : (
                          <NumberInput
                            value={item.hidePrice ? (localClientVal ?? '') : (localClientVal ?? item.price)}
                            onChange={(v) =>
                              setLocalClientPrices((prev) => ({
                                ...prev,
                                [item.productId]: v === '' ? null : Number(v),
                              }))
                            }
                            min={0}
                            step={0.01}
                            decimalScale={2}
                            size="xs"
                            w={110}
                            styles={{ input: { textAlign: 'right' } }}
                          />
                        )}
                    </Table.Td>
                    <Table.Td ta="right" p={isRemoved ? undefined : 4}>
                      {isRemoved
                        ? <Text c="dimmed">{(item.actualPurchasePrice ?? item.purchasePrice).toLocaleString('uk-UA')} ₴</Text>
                        : (
                          <NumberInput
                            value={item.hidePrice ? (localVal ?? '') : (localVal ?? (item.actualPurchasePrice ?? item.purchasePrice))}
                            onChange={(v) =>
                              setLocalPrices((prev) => ({
                                ...prev,
                                [item.productId]: v === '' ? null : Number(v),
                              }))
                            }
                            min={0}
                            step={0.01}
                            decimalScale={2}
                            size="xs"
                            w={110}
                            styles={{ input: { textAlign: 'right' } }}
                          />
                        )}
                    </Table.Td>
                    <Table.Td ta="right" fw={500} c={isRemoved || needsPrice ? 'dimmed' : itemProfit >= 0 ? 'green' : 'red'}>
                      {isRemoved || needsPrice ? '—' : `${itemProfit.toLocaleString('uk-UA')} ₴`}
                    </Table.Td>
                    <Table.Td ta="right" fw={600} c={isRemoved || needsPrice ? 'dimmed' : undefined}>
                      {isRemoved || needsPrice ? '—' : `${(clientPrice * item.quantity).toLocaleString('uk-UA')} ₴`}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {isPricesDirty && (
            <Group p="sm" justify="flex-end" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
              <Button
                size="xs"
                leftSection={<IconDeviceFloppy size={14} />}
                loading={updateActualPrices.isPending}
                onClick={handleSavePrices}
              >
                Зберегти ціни
              </Button>
            </Group>
          )}
        </Paper>
      )}

      {/* Items — Edit mode */}
      {editMode && (
        <Paper withBorder radius="md" p="md">
          <Title order={5} mb="md">Редагування позицій</Title>
          <Stack gap="xs">
            {editItems.map((item) => {
              const isRemoved = item.changeType === 'removed';
              return (
                <Box
                  key={item.productId}
                  p="xs"
                  style={{
                    borderRadius: 6,
                    background: isRemoved
                      ? 'var(--mantine-color-red-0)'
                      : 'var(--mantine-color-gray-0)',
                    border: '1px solid var(--mantine-color-gray-2)',
                    opacity: isRemoved ? 0.65 : 1,
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text
                      size="sm"
                      fw={500}
                      flex={1}
                      lineClamp={1}
                      td={isRemoved ? 'line-through' : undefined}
                      c={isRemoved ? 'dimmed' : undefined}
                    >
                      {item.title}
                    </Text>
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                      {item.price.toLocaleString('uk-UA')} ₴/шт
                    </Text>
                    {!isRemoved ? (
                      <Group gap="xs" wrap="nowrap">
                        <NumberInput
                          value={item.quantity}
                          onChange={(v) => handleQtyChange(item.productId, Number(v))}
                          min={1}
                          w={80}
                          size="xs"
                        />
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => handleRemove(item.productId)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ) : (
                      <ActionIcon
                        size="sm"
                        color="gray"
                        variant="light"
                        onClick={() => handleRestore(item.productId)}
                        title="Відновити"
                      >
                        <IconRotateClockwise size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Box>
              );
            })}

            <Divider my="xs" />

            <AddProductRow
              existingProductIds={activeEditIds}
              onAdd={handleAddProduct}
            />

            <Group mt="md">
              <Text size="sm" c="dimmed">
                Нова сума: <Text span fw={700} c="dark">{editTotal.toLocaleString('uk-UA')} ₴</Text>
              </Text>
            </Group>

            <Group mt="xs">
              <Button
                onClick={handleSave}
                loading={updateItems.isPending}
              >
                Зберегти зміни
              </Button>
              <Button variant="default" leftSection={<IconX size={14} />} onClick={handleCancelEdit}>
                Скасувати
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Totals */}
      {!editMode && (
        <Group justify="flex-end">
          <Stack gap={4} align="flex-end">
            <Group gap="xl">
              <Text c="dimmed">Собівартість:</Text>
              <Text w={130} ta="right">{effectiveCost.toLocaleString('uk-UA')} ₴</Text>
            </Group>
            <Group gap="xl">
              <Text c="dimmed">Виручка:</Text>
              <Text w={130} ta="right" fw={600}>{effectiveTotal.toLocaleString('uk-UA')} ₴</Text>
            </Group>
            <Group gap="xl">
              <Text fw={600}>Прибуток:</Text>
              <Text w={130} ta="right" fw={700} c={actualProfit >= 0 ? 'green' : 'red'}>
                {actualProfit.toLocaleString('uk-UA')} ₴
              </Text>
            </Group>
          </Stack>
        </Group>
      )}
    </Stack>
  );
}
