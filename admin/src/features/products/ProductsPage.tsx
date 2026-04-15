import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Group,
  Modal,
  NumberInput,
  Pagination,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconEyeOff,
  IconInfinity,
  IconPercentage,
  IconPlus,
  IconPower,
  IconSearch,
  IconTag,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '../../types';
import type { BulkUpdatePayload } from './productsApi';
import {
  useAdminBrands,
  useAdminCategories,
  useAdminProducts,
  useBulkUpdateProducts,
  useDeleteProduct,
} from './useProducts';
import { usePageTitle } from '../../hooks/usePageTitle';

type BulkActionType = 'markup' | 'hidePrice' | 'unlimitedStock' | 'isPromo' | 'isActive';

const ACTION_LABELS: Record<BulkActionType, string> = {
  markup: 'Задати націнку',
  hidePrice: 'Приховати ціну',
  unlimitedStock: 'Необмежена кількість',
  isPromo: 'Акційний товар',
  isActive: 'Активний товар',
};

const BOOL_OPTIONS = [
  { value: 'true', label: 'Увімк.' },
  { value: 'false', label: 'Вимк.' },
];

function markup(price: number, purchasePrice: number) {
  if (!purchasePrice) return '—';
  return `${(((price - purchasePrice) / purchasePrice) * 100).toFixed(1)}%`;
}

function flattenCategories(categories: Category[], depth = 0): { value: string; label: string }[] {
  return categories.flatMap((cat) => [
    { value: cat._id, label: `${'  '.repeat(depth)}${cat.name}` },
    ...flattenCategories(cat.children ?? [], depth + 1),
  ]);
}

export function ProductsPage() {
  usePageTitle('Товари');
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 400);
  const [brand, setBrand] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action modal state
  const [activeAction, setActiveAction] = useState<BulkActionType | null>(null);
  const [markupValue, setMarkupValue] = useState<number | string>('');
  const [boolValue, setBoolValue] = useState<'true' | 'false' | null>(null);

  const { data, isLoading } = useAdminProducts({
    search: debouncedSearch || undefined,
    page,
    brand: brand ?? undefined,
    category: category ?? undefined,
  });

  const { data: brands } = useAdminBrands();
  const { data: categories } = useAdminCategories();
  const deleteProduct = useDeleteProduct();
  const bulkUpdate = useBulkUpdateProducts();

  const brandOptions = useMemo(
    () => (brands ?? []).map((b) => ({ value: b._id, label: b.name })),
    [brands],
  );

  const categoryOptions = useMemo(
    () => flattenCategories(categories ?? []),
    [categories],
  );

  const resetFilters = (cb: () => void) => {
    cb();
    setPage(1);
    setSelectedIds(new Set());
  };

  const products = data?.items ?? [];
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p._id));
  const someSelected = products.some((p) => selectedIds.has(p._id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.delete(p._id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        products.forEach((p) => next.add(p._id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string, title: string) => {
    modals.openConfirmModal({
      title: 'Видалити товар?',
      children: <Text size="sm">«{title}» буде видалено разом з усіма зображеннями.</Text>,
      labels: { confirm: 'Видалити', cancel: 'Скасувати' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteProduct.mutateAsync(id);
          notifications.show({ color: 'green', message: 'Товар видалено' });
        } catch {
          notifications.show({ color: 'red', message: 'Помилка видалення' });
        }
      },
    });
  };

  const openAction = (action: BulkActionType) => {
    setMarkupValue('');
    setBoolValue(null);
    setActiveAction(action);
  };

  const closeModal = () => setActiveAction(null);

  const canSave = activeAction === 'markup' ? markupValue !== '' : boolValue !== null;

  const handleBulkSave = async () => {
    if (!activeAction || !canSave) return;
    const ids = [...selectedIds];
    const updates: BulkUpdatePayload =
      activeAction === 'markup'
        ? { markupPercent: Number(markupValue) }
        : { [activeAction]: boolValue === 'true' };
    try {
      await bulkUpdate.mutateAsync({ ids, updates });
      notifications.show({ color: 'green', message: 'Оновлено успішно' });
      setSelectedIds(new Set());
      closeModal();
    } catch {
      notifications.show({ color: 'red', message: 'Помилка оновлення' });
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Товари</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/admin/products/new')}>
          Додати товар
        </Button>
      </Group>

      <Group wrap="wrap">
        <TextInput
          miw={200}
          flex={1}
          placeholder="Пошук..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => resetFilters(() => setSearch(e.currentTarget.value))}
        />
        <Select
          miw={160}
          flex={1}
          placeholder="Бренд"
          clearable
          data={brandOptions}
          value={brand}
          onChange={(v) => resetFilters(() => setBrand(v))}
        />
        <Select
          miw={180}
          flex={1}
          placeholder="Категорія"
          clearable
          data={categoryOptions}
          value={category}
          onChange={(v) => resetFilters(() => setCategory(v))}
        />
      </Group>

      {selectedIds.size > 0 && (
        <Group gap="xs" align="center">
          <Text size="sm" c="dimmed" mr={4}>
            Вибрано: {selectedIds.size}
          </Text>
          <Divider orientation="vertical" />
          <Tooltip label="Задати націнку" withArrow>
            <ActionIcon variant="light" onClick={() => openAction('markup')}>
              <IconPercentage size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Приховати ціну" withArrow>
            <ActionIcon variant="light" onClick={() => openAction('hidePrice')}>
              <IconEyeOff size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Необмежена кількість" withArrow>
            <ActionIcon variant="light" onClick={() => openAction('unlimitedStock')}>
              <IconInfinity size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Акційний товар" withArrow>
            <ActionIcon variant="light" onClick={() => openAction('isPromo')}>
              <IconTag size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Активний товар" withArrow>
            <ActionIcon variant="light" onClick={() => openAction('isActive')}>
              <IconPower size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}

      <Box style={{ overflowX: 'auto' }}>
      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={36}>
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
              />
            </Table.Th>
            <Table.Th miw={220}>Назва</Table.Th>
            <Table.Th>Артикул</Table.Th>
            <Table.Th>Ціна клієнта</Table.Th>
            <Table.Th>Закупівельна</Table.Th>
            <Table.Th>Націнка</Table.Th>
            <Table.Th>Склад</Table.Th>
            <Table.Th>Замовлень</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={10}>
                <Center py="xl"><Text c="dimmed">Завантаження...</Text></Center>
              </Table.Td>
            </Table.Tr>
          ) : !products.length ? (
            <Table.Tr>
              <Table.Td colSpan={10}>
                <Center py="xl"><Text c="dimmed">Товарів не знайдено</Text></Center>
              </Table.Td>
            </Table.Tr>
          ) : (
            products.map((p) => (
              <Table.Tr
                key={p._id}
                bg={selectedIds.has(p._id) ? 'var(--mantine-color-blue-light)' : undefined}
              >
                <Table.Td>
                  <Checkbox
                    checked={selectedIds.has(p._id)}
                    onChange={() => toggleOne(p._id)}
                  />
                </Table.Td>
                <Table.Td miw={220}>
                  <Group gap={6} wrap="nowrap" align="center">
                    <Text lineClamp={1} fw={500}>{p.title}</Text>
                    {p.isPromo && (
                      <Badge color="orange" variant="filled" size="xs" style={{ flexShrink: 0 }}>
                        Акція
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">{p.brandId.name}</Text>
                </Table.Td>
                <Table.Td><Text size="sm" c={p.sku ? undefined : 'dimmed'}>{p.sku || '—'}</Text></Table.Td>
                <Table.Td>{p.price.toLocaleString('uk-UA')} ₴</Table.Td>
                <Table.Td>{p.purchasePrice.toLocaleString('uk-UA')} ₴</Table.Td>
                <Table.Td fw={500} c={p.price > p.purchasePrice ? 'green' : 'red'}>
                  {markup(p.price, p.purchasePrice)}
                </Table.Td>
                <Table.Td>{p.unlimitedStock ? '∞' : p.stock}</Table.Td>
                <Table.Td>
                  <Text size="sm">{p.orderCount ?? 0}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={p.isActive ? 'green' : 'gray'} variant="light" styles={{ label: { overflow: 'visible' } }}>
                    {p.isActive ? 'Активний' : 'Прихований'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon variant="subtle" onClick={() => navigate(`/admin/products/${p._id}/edit`)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p._id, p.title)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
      </Box>

      {(data?.totalPages ?? 0) > 1 && (
        <Pagination
          total={data!.totalPages}
          value={page}
          onChange={(v) => { setPage(v); setSelectedIds(new Set()); }}
        />
      )}

      {/* Bulk action modal */}
      <Modal
        opened={activeAction !== null}
        onClose={closeModal}
        title={activeAction ? ACTION_LABELS[activeAction] : ''}
        size="sm"
      >
        <Stack gap="md">
          {activeAction === 'markup' ? (
            <NumberInput
              label="Відсоток націнки"
              placeholder="Наприклад: 30"
              suffix="%"
              min={0}
              value={markupValue}
              onChange={setMarkupValue}
            />
          ) : (
            <div>
              <Text size="sm" fw={500} mb={8}>
                {activeAction ? ACTION_LABELS[activeAction] : ''}
              </Text>
              <SegmentedControl
                fullWidth
                data={BOOL_OPTIONS}
                value={boolValue ?? ''}
                onChange={(v) => setBoolValue(v as 'true' | 'false')}
              />
            </div>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              Скасувати
            </Button>
            <Button
              disabled={!canSave}
              loading={bulkUpdate.isPending}
              onClick={handleBulkSave}
            >
              Зберегти
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
