import {
  Card,
  Group,
  Loader,
  Center,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from './statsApi';
import { useAdminCategories } from '../products/useProducts';
import type { Category } from '../../types';

function flatCategories(cats: Category[]): { value: string; label: string }[] {
  return cats.flatMap((cat) => [
    { value: cat._id, label: cat.name },
    ...cat.children.map((sub) => ({ value: sub._id, label: `${cat.name} → ${sub.name}` })),
  ]);
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card withBorder radius="md" p="lg">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
      <Text fw={700} fz="1.6rem" c={color}>{value}</Text>
      {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
    </Card>
  );
}

export function StatsPage() {
  const [categoryId, setCategoryId] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(productSearch, 400);
  const [productId, setProductId] = useState<string>('');

  const { data: categories = [] } = useAdminCategories();
  const categoryOptions = [{ value: '', label: 'Всі категорії' }, ...flatCategories(categories)];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', categoryId, productId],
    queryFn: () => statsApi.getStats({
      categoryId: categoryId || undefined,
      productId: productId || undefined,
    }),
  });

  // Search products for filter
  const { data: productResults } = useQuery({
    queryKey: ['products-search-stats', debouncedSearch],
    queryFn: () => import('../../api/axios').then(({ api }) =>
      api.get('/products/admin/list', { params: { search: debouncedSearch, limit: 10 } }).then((r) => r.data.items)
    ),
    enabled: debouncedSearch.length >= 2,
  });

  const productOptions = productResults
    ? [{ value: '', label: 'Скасувати фільтр' }, ...productResults.map((p: { _id: string; title: string }) => ({ value: p._id, label: p.title }))]
    : [];

  const fmt = (n: number) => n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Stack>
      <Title order={3}>Статистика</Title>

      <Group>
        <Select
          w={260}
          data={categoryOptions}
          value={categoryId}
          onChange={(v) => { setCategoryId(v ?? ''); setProductId(''); }}
          label="Фільтр по категорії"
          clearable
        />
        <Stack gap={4} flex={1} maw={340}>
          <TextInput
            label="Пошук товару для фільтру"
            placeholder="Введіть назву..."
            leftSection={<IconSearch size={16} />}
            value={productSearch}
            onChange={(e) => setProductSearch(e.currentTarget.value)}
          />
          {productOptions.length > 0 && (
            <Select
              data={productOptions}
              value={productId}
              onChange={(v) => setProductId(v ?? '')}
              placeholder="Оберіть товар"
            />
          )}
        </Stack>
      </Group>

      {isLoading ? (
        <Center h={200}><Loader /></Center>
      ) : !stats ? null : (
        <SimpleGrid cols={{ base: 2, md: 3 }} mt="md">
          <StatCard
            label="Замовлень (доставлено)"
            value={String(stats.totalOrders)}
          />
          <StatCard
            label="Одиниць продано"
            value={String(stats.totalUnitsSold)}
          />
          <StatCard
            label="Виручка"
            value={`${fmt(stats.totalRevenue)} ₴`}
          />
          <StatCard
            label="Собівартість"
            value={`${fmt(stats.totalCost)} ₴`}
            color="dimmed"
          />
          <StatCard
            label="Прибуток"
            value={`${fmt(stats.totalProfit)} ₴`}
            color={stats.totalProfit >= 0 ? 'green' : 'red'}
            sub={`${fmt(stats.avgMarkupPercent)}% середня націнка`}
          />
          <StatCard
            label="Середня націнка"
            value={`${fmt(stats.avgMarkupPercent)}%`}
            color={stats.avgMarkupPercent >= 0 ? 'green' : 'red'}
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}
