import {
  Accordion,
  Badge,
  Box,
  Card,
  Center,
  Grid,
  Group,
  Image,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts, useCategories, useBrands } from './useCatalog';
import type { Category } from '../../types';

function CategoryTree({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Accordion variant="contained" chevronPosition="right">
      {categories.map((cat) =>
        cat.children.length > 0 ? (
          <Accordion.Item key={cat._id} value={cat._id}>
            <Accordion.Control>
              <Text fw={selected === cat._id ? 700 : 400}>{cat.name}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap={4}>
                <UnstyledButton
                  onClick={() => onSelect(cat._id)}
                  p={4}
                  style={{ borderRadius: 4, background: selected === cat._id ? 'var(--mantine-color-blue-0)' : undefined }}
                >
                  <Text size="sm">Всі з розділу</Text>
                </UnstyledButton>
                {cat.children.map((sub) => (
                  <UnstyledButton
                    key={sub._id}
                    onClick={() => onSelect(sub._id)}
                    p={4}
                    style={{ borderRadius: 4, background: selected === sub._id ? 'var(--mantine-color-blue-0)' : undefined }}
                  >
                    <Text size="sm">{sub.name}</Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ) : (
          <Box key={cat._id} px="sm" py={8} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
            <UnstyledButton
              onClick={() => onSelect(cat._id)}
              style={{ width: '100%' }}
            >
              <Text fw={selected === cat._id ? 700 : 400}>{cat.name}</Text>
            </UnstyledButton>
          </Box>
        ),
      )}
    </Accordion>
  );
}

function ProductCard({ product }: { product: { _id: string; title: string; price: number; images: { url: string }[]; stock: number; brandId: { name: string } } }) {
  const navigate = useNavigate();
  return (
    <Card
      shadow="xs"
      radius="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/product/${product._id}`)}
    >
      <Card.Section>
        <Image
          src={product.images[0]?.url}
          height={180}
          alt={product.title}
          fallbackSrc="https://placehold.co/300x180?text=No+image"
        />
      </Card.Section>

      <Stack mt="sm" gap={4}>
        <Text size="xs" c="dimmed">{product.brandId.name}</Text>
        <Text fw={500} lineClamp={2}>{product.title}</Text>
        <Group justify="space-between" mt={4}>
          <Text fw={700} size="lg">{product.price.toLocaleString('uk-UA')} ₴</Text>
          {product.stock === 0 && <Badge color="red" size="sm">Немає в наявності</Badge>}
        </Group>
      </Stack>
    </Card>
  );
}

const PAGE_SIZE = 20;

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [debouncedSearch] = useDebouncedValue(searchInput, 400);

  const category = searchParams.get('category') ?? '';
  const brand = searchParams.get('brand') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: brands } = useBrands();
  const { data, isLoading } = useProducts({
    category: category || undefined,
    brand: brand || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set('search', debouncedSearch);
      else next.delete('search');
      next.set('page', '1');
      return next;
    }, { replace: true });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.set('page', '1');
      return next;
    });
  };

  const brandOptions = [
    { value: '', label: 'Всі бренди' },
    ...(brands ?? []).map((b) => ({ value: b._id, label: b.name })),
  ];

  return (
    <Grid>
      {/* Sidebar */}
      <Grid.Col span={{ base: 12, sm: 3 }}>
        <Stack gap="md">
          <Title order={5}>Категорії</Title>
          {catsLoading ? (
            <Stack gap={8}>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h={36} radius="sm" />)}</Stack>
          ) : (
            <CategoryTree
              categories={categories ?? []}
              selected={category}
              onSelect={(id) => setFilter('category', id === category ? '' : id)}
            />
          )}
        </Stack>
      </Grid.Col>

      {/* Main */}
      <Grid.Col span={{ base: 12, sm: 9 }}>
        <Stack gap="md">
          <Group>
            <TextInput
              flex={1}
              placeholder="Пошук товарів..."
              leftSection={<IconSearch size={16} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.currentTarget.value)}
            />
            <Select
              w={180}
              placeholder="Бренд"
              data={brandOptions}
              value={brand}
              onChange={(v) => setFilter('brand', v ?? '')}
              clearable
            />
          </Group>

          {isLoading ? (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h={280} radius="md" />
              ))}
            </SimpleGrid>
          ) : !data?.items.length ? (
            <Center h={300}>
              <Text c="dimmed">Товарів не знайдено</Text>
            </Center>
          ) : (
            <>
              <Text size="sm" c="dimmed">{data.total} товарів</Text>
              <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
                {data.items.map((p) => <ProductCard key={p._id} product={p} />)}
              </SimpleGrid>
              {data.totalPages > 1 && (
                <Center>
                  <Pagination
                    total={data.totalPages}
                    value={page}
                    onChange={(p) => setFilter('page', String(p))}
                  />
                </Center>
              )}
            </>
          )}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
