import {
  Button,
  CloseButton,
  Combobox,
  Group,
  InputBase,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { productsApi } from '../products/productsApi';
import { useAdminUsers } from '../users/useUsers';
import { useCreateAdminOrder, useRetailUser } from './useOrders';
import type { AdminProduct } from '../../types';

interface Props {
  opened: boolean;
  onClose: () => void;
}

interface ItemRow {
  productId: string;
  title: string;
  price: number;
  purchasePrice: number;
  hidePrice: boolean;
  quantity: number;
}

export function CreateOrderModal({ opened, onClose }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  const { data: retailUser } = useRetailUser();
  const { data: users = [] } = useAdminUsers();
  const { mutateAsync: createOrder, isPending } = useCreateAdminOrder();

  const combobox = useCombobox({
    onDropdownClose: () => setSearch(''),
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['product-search', search],
    queryFn: () => productsApi.getAll({ search, limit: 10 }),
    enabled: search.length > 1,
    staleTime: 30_000,
  });

  const userOptions = [
    retailUser ? { value: retailUser._id, label: `${retailUser.name} (роздрібний)` } : null,
    ...users
      .filter((u) => !u.isSystemRetail && u._id !== retailUser?._id)
      .map((u) => ({ value: u._id, label: `${u.name} — ${u.shopName ?? u.email}` })),
  ].filter((o): o is { value: string; label: string } => o !== null);

  function addProduct(product: AdminProduct) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          title: product.title,
          price: product.price,
          purchasePrice: product.purchasePrice,
          hidePrice: product.hidePrice,
          quantity: 1,
        },
      ];
    });
    setSearch('');
    combobox.closeDropdown();
  }

  function updateQty(productId: string, qty: number) {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i)),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSubmit() {
    if (!userId || !items.length || !deliveryAddress.trim()) return;
    await createOrder({
      userId,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryAddress: deliveryAddress.trim(),
      note: note.trim() || undefined,
    });
    handleClose();
  }

  function handleClose() {
    setUserId(null);
    setItems([]);
    setDeliveryAddress('');
    setNote('');
    setSearch('');
    onClose();
  }

  const canSubmit = !!userId && items.length > 0 && deliveryAddress.trim().length > 0;

  const hasHidePrice = items.some((i) => i.hidePrice);
  const total = items
    .filter((i) => !i.hidePrice)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <Modal opened={opened} onClose={handleClose} title="Нове замовлення" size="xl">
      <Stack gap="md">
        <Select
          label="Клієнт"
          placeholder="Оберіть клієнта"
          data={userOptions}
          value={userId}
          onChange={setUserId}
          searchable
          required
        />

        <div>
          <Text size="sm" fw={500} mb={4}>
            Товари
          </Text>
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              const product = searchResults?.items.find((p) => p._id === val);
              if (product) addProduct(product);
            }}
          >
            <Combobox.Target>
              <InputBase
                placeholder="Пошук товару..."
                value={search}
                onChange={(e) => {
                  setSearch(e.currentTarget.value);
                  if (e.currentTarget.value.length > 1) combobox.openDropdown();
                  else combobox.closeDropdown();
                }}
                onClick={() => {
                  if (search.length > 1) combobox.openDropdown();
                }}
                rightSection={isSearching ? <Loader size="xs" /> : <Combobox.Chevron />}
              />
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                {!searchResults?.items.length ? (
                  <Combobox.Empty>
                    {search.length > 1 ? 'Нічого не знайдено' : 'Введіть назву товару'}
                  </Combobox.Empty>
                ) : (
                  searchResults.items.map((p) => (
                    <Combobox.Option key={p._id} value={p._id}>
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm" lineClamp={1}>
                          {p.title}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                          {p.hidePrice ? 'уточнюється' : `${p.price.toLocaleString('uk-UA')} ₴`}
                        </Text>
                      </Group>
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </div>

        {items.length > 0 && (
          <Table withTableBorder withColumnBorders fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Товар</Table.Th>
                <Table.Th ta="right">Ціна</Table.Th>
                <Table.Th ta="center" w={100}>
                  К-сть
                </Table.Th>
                <Table.Th ta="right">Сума</Table.Th>
                <Table.Th w={36} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((item) => (
                <Table.Tr key={item.productId}>
                  <Table.Td>
                    <Text size="sm">{item.title}</Text>
                    <Text size="xs" c="dimmed">
                      закуп: {item.purchasePrice.toLocaleString('uk-UA')} ₴
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    {item.hidePrice ? (
                      <Text size="sm" c="dimmed" fs="italic">
                        уточнюється
                      </Text>
                    ) : (
                      `${item.price.toLocaleString('uk-UA')} ₴`
                    )}
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      value={item.quantity}
                      onChange={(v) => updateQty(item.productId, Number(v) || 1)}
                      min={1}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    {item.hidePrice
                      ? '—'
                      : `${(item.price * item.quantity).toLocaleString('uk-UA')} ₴`}
                  </Table.Td>
                  <Table.Td>
                    <CloseButton size="sm" onClick={() => removeItem(item.productId)} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {items.length > 0 && (
          <Group justify="flex-end">
            <Text size="sm" fw={600}>
              Разом: {total.toLocaleString('uk-UA')} ₴
              {hasHidePrice && (
                <Text component="span" size="sm" c="dimmed" fw={400}>
                  {' '}
                  + ціна уточнюється
                </Text>
              )}
            </Text>
          </Group>
        )}

        <TextInput
          label="Адреса доставки"
          placeholder="Введіть адресу"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.currentTarget.value)}
          required
        />

        <Textarea
          label="Примітка"
          placeholder="Необов'язково"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          rows={2}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={isPending}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!canSubmit}>
            Створити замовлення
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
