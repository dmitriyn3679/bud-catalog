import {
  Card,
  Group,
  Loader,
  Center,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from './statsApi';
import { useAdminCategories } from '../products/useProducts';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import type { Category } from '../../types';

function toIso(d: Date | string | null) {
  if (!d) return undefined;
  return new Date(d).toISOString().split('T')[0];
}

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
  const [dateRange, setDateRange] = useState<[Date | string | null, Date | string | null]>([null, null]);

  const { data: categories = [] } = useAdminCategories();
  const categoryOptions = [{ value: '', label: 'Всі категорії' }, ...flatCategories(categories)];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats', categoryId, dateRange],
    queryFn: () => statsApi.getStats({
      categoryId: categoryId || undefined,
      dateFrom: toIso(dateRange[0]),
      dateTo: toIso(dateRange[1]),
    }),
  });

  const fmt = (n: number) => n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Stack>
      <Title order={3}>Статистика</Title>

      <Group align="flex-end">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <Select
          w={260}
          data={categoryOptions}
          value={categoryId}
          onChange={(v) => setCategoryId(v ?? '')}
          label="Категорія"
          clearable
        />
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
