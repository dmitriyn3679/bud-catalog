import {
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordersApi } from './ordersApi';
import { useCreateAdminOrder, useRetailUser } from './useOrders';
import { useAdminCategories, useAdminProducts } from '../products/useProducts';
import { useAdminUsers, useUserMarkups } from '../users/useUsers';
import type { AdminProduct, Category, UserMarkup } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildParentMap(categories: Category[]): Map<string, string | null> {
  const map = new Map<string, string | null>();
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      map.set(cat._id, cat.parentId);
      traverse(cat.children);
    }
  }
  traverse(categories);
  return map;
}

function computeUserPrice(
  product: AdminProduct,
  markups: UserMarkup[],
  globalMarkupPercent: number | null | undefined,
  parentMap: Map<string, string | null>,
): number {
  const catId = product.categoryId._id;
  const direct = markups.find((m) => m.categoryId._id === catId);
  if (direct) return round2(product.purchasePrice * (1 + direct.markupPercent / 100));
  const parentId = parentMap.get(catId);
  if (parentId) {
    const parentMarkup = markups.find((m) => m.categoryId._id === parentId);
    if (parentMarkup) return round2(product.purchasePrice * (1 + parentMarkup.markupPercent / 100));
  }
  if (globalMarkupPercent != null) return round2(product.purchasePrice * (1 + globalMarkupPercent / 100));
  return product.price;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemRow {
  productId: string;
  title: string;
  purchasePrice: number | '';
  price: number | '';
  quantity: number;
  hidePrice: boolean;
  initialPurchasePrice: number;
  initialPrice: number;
}

// ─── AddProductRow ─────────────────────────────────────────────────────────────

function AddProductRow({
  existingProductIds,
  onAdd,
}: {
  existingProductIds: Set<string>;
  onAdd: (product: AdminProduct) => void;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const { data } = useAdminProducts({ search: debouncedSearch || undefined, page: 1 });

  const options = (data?.items ?? [])
    .filter((p) => p.isActive && !existingProductIds.has(p._id))
    .map((p) => ({ value: p._id, label: `${p.title}${p.sku ? ` [${p.sku}]` : ''}` }));

  const handleSelect = (value: string | null) => {
    const product = (data?.items ?? []).find((p) => p._id === value);
    if (product) {
      onAdd(product);
      setSearch('');
    }
  };

  return (
    <Select
      label="Додати товар"
      placeholder="Пошук по назві..."
      searchable
      data={options}
      value={null}
      searchValue={search}
      onSearchChange={setSearch}
      onChange={handleSelect}
      nothingFoundMessage="Товарів не знайдено"
      filter={({ options: opts }) => opts}
    />
  );
}

// ─── CreateOrderPage ───────────────────────────────────────────────────────────

export function CreateOrderPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: retailUser } = useRetailUser();
  const { data: users = [] } = useAdminUsers();
  const { data: markups = [] } = useUserMarkups(userId ?? '');
  const { data: categories = [] } = useAdminCategories();
  const { mutateAsync: createOrder } = useCreateAdminOrder();

  const parentMap = useMemo(() => buildParentMap(categories), [categories]);

  const selectedUser = users.find((u) => u._id === userId);
  const globalMarkupPercent = selectedUser?.globalMarkupPercent;

  const userOptions = [
    retailUser ? { value: retailUser._id, label: `${retailUser.name} (роздрібний)` } : null,
    ...users
      .filter((u) => !u.isSystemRetail && u._id !== retailUser?._id)
      .map((u) => ({ value: u._id, label: `${u.name} — ${u.shopName ?? u.email}` })),
  ].filter((o): o is { value: string; label: string } => o !== null);

  const isRealUser = !!userId && userId !== retailUser?._id;

  const handleUserChange = (newUserId: string | null) => {
    setUserId(newUserId);
    setItems([]);
    const realUser = users.find((u) => u._id === newUserId);
    setDeliveryAddress(realUser ? (realUser.address ?? '') : '');
  };

  const handleAddProduct = (product: AdminProduct) => {
    const initPurchasePrice = product.hidePrice ? '' : product.purchasePrice;
    const computedPrice = product.hidePrice ? '' : computeUserPrice(product, markups, globalMarkupPercent, parentMap);
    setItems((prev) => [
      ...prev,
      {
        productId: product._id,
        title: product.title,
        purchasePrice: initPurchasePrice,
        price: computedPrice,
        quantity: 1,
        hidePrice: product.hidePrice,
        initialPurchasePrice: typeof initPurchasePrice === 'number' ? initPurchasePrice : 0,
        initialPrice: typeof computedPrice === 'number' ? computedPrice : 0,
      },
    ]);
  };

  const handlePurchasePriceChange = (productId: string, v: number | string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (v === '') return { ...item, purchasePrice: '' };
        const newPurchasePrice = v as number;
        let newPrice: number | '' = item.price;
        if (item.initialPurchasePrice > 0) {
          const factor = (item.initialPrice - item.initialPurchasePrice) / item.initialPurchasePrice;
          newPrice = Math.max(0, round2(newPurchasePrice * (1 + factor)));
        }
        return { ...item, purchasePrice: newPurchasePrice, price: newPrice };
      }),
    );
  };

  const handlePriceChange = (productId: string, v: number | string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, price: v === '' ? '' : (v as number) } : item,
      ),
    );
  };

  const handleQtyChange = (productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, qty) } : item,
      ),
    );
  };

  const handleRemove = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSubmit = async () => {
    if (!userId || !items.length || !deliveryAddress.trim()) return;
    setIsSubmitting(true);
    try {
      const order = await createOrder({
        userId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryAddress: deliveryAddress.trim(),
        note: note.trim() || undefined,
      });
      await ordersApi.updateActualPrices(
        order._id,
        items.map((i) => ({
          productId: i.productId,
          actualPurchasePrice: typeof i.purchasePrice === 'number' ? i.purchasePrice : null,
          price: typeof i.price === 'number' ? i.price : undefined,
        })),
      );
      notifications.show({ color: 'green', message: 'Замовлення створено' });
      navigate(`/admin/orders/${order._id}`);
    } catch {
      notifications.show({ color: 'red', message: 'Помилка створення замовлення' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const n = (v: number | '') => (typeof v === 'number' ? v : 0);
  const total = items.reduce((sum, i) => sum + n(i.price) * i.quantity, 0);
  const profit = items.reduce((sum, i) => sum + (n(i.price) - n(i.purchasePrice)) * i.quantity, 0);
  const canSubmit = !!userId && items.length > 0 && deliveryAddress.trim().length > 0;

  return (
    <Stack maw={960}>
      <Group justify="space-between">
        <Group>
          <Button
            component={Link}
            to="/admin/orders"
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
          >
            Назад
          </Button>
          <Title order={3}>Нове замовлення</Title>
        </Group>
        <Button onClick={handleSubmit} loading={isSubmitting} disabled={!canSubmit}>
          Створити замовлення
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="sm">
          Клієнт та доставка
        </Title>
        <Group align="flex-start" gap="md" grow>
          <Select
            label="Клієнт"
            placeholder="Оберіть клієнта"
            data={userOptions}
            value={userId}
            onChange={handleUserChange}
            searchable
            required
          />
          <TextInput
            label="Адреса доставки"
            placeholder="Введіть адресу"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.currentTarget.value)}
            disabled={isRealUser}
            required
          />
          <Textarea
            label="Примітка"
            placeholder="Необов'язково"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={1}
            autosize
            maxRows={3}
          />
        </Group>
        {selectedUser?.globalMarkupPercent != null && (
          <Text size="xs" c="dimmed" mt="xs">
            Глобальна націнка клієнта: {selectedUser.globalMarkupPercent}%
          </Text>
        )}
      </Paper>

      {userId && (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Table withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Товар</Table.Th>
                <Table.Th ta="center" w={90}>
                  К-сть
                </Table.Th>
                <Table.Th ta="right" w={130}>
                  Ціна клієнта
                </Table.Th>
                <Table.Th ta="right" w={130}>
                  Закуп. ціна
                </Table.Th>
                <Table.Th ta="right" w={110}>
                  Прибуток
                </Table.Th>
                <Table.Th ta="right" w={110}>
                  Сума
                </Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Center py="md">
                      <Text c="dimmed" size="sm">
                        Додайте товари до замовлення
                      </Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              ) : (
                items.map((item) => {
                  const itemProfit = (n(item.price) - n(item.purchasePrice)) * item.quantity;
                  return (
                    <Table.Tr key={item.productId}>
                      <Table.Td>
                        <Text size="sm">{item.title}</Text>
                        {item.hidePrice && (
                          <Text size="xs" c="violet">
                            ціна уточнюється
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td p={4}>
                        <NumberInput
                          value={item.quantity}
                          onChange={(v) => handleQtyChange(item.productId, Number(v) || 1)}
                          min={1}
                          size="xs"
                          styles={{ input: { textAlign: 'right' } }}
                        />
                      </Table.Td>
                      <Table.Td p={4}>
                        <NumberInput
                          value={item.price}
                          onChange={(v) => handlePriceChange(item.productId, v)}
                          min={0}
                          step={0.01}
                          decimalScale={2}
                          size="xs"
                          w={110}
                          styles={{ input: { textAlign: 'right' } }}
                        />
                      </Table.Td>
                      <Table.Td p={4}>
                        <NumberInput
                          value={item.purchasePrice}
                          onChange={(v) => handlePurchasePriceChange(item.productId, v)}
                          min={0}
                          step={0.01}
                          decimalScale={2}
                          size="xs"
                          w={110}
                          styles={{ input: { textAlign: 'right' } }}
                        />
                      </Table.Td>
                      <Table.Td ta="right" fw={500} c={itemProfit >= 0 ? 'green' : 'red'}>
                        {itemProfit.toLocaleString('uk-UA')} ₴
                      </Table.Td>
                      <Table.Td ta="right" fw={600}>
                        {(n(item.price) * item.quantity).toLocaleString('uk-UA')} ₴
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => handleRemove(item.productId)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>

          <Box p="sm">
            <AddProductRow
              existingProductIds={new Set(items.map((i) => i.productId))}
              onAdd={handleAddProduct}
            />
          </Box>

          {items.length > 0 && (
            <>
              <Divider />
              <Group p="sm" justify="flex-end" gap="xl">
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Прибуток:
                  </Text>
                  <Text size="sm" fw={600} c={profit >= 0 ? 'green' : 'red'}>
                    {profit.toLocaleString('uk-UA')} ₴
                  </Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Разом:
                  </Text>
                  <Text size="sm" fw={700}>
                    {total.toLocaleString('uk-UA')} ₴
                  </Text>
                </Group>
              </Group>
            </>
          )}
        </Paper>
      )}
    </Stack>
  );
}
