import {
  ActionIcon,
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
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconHeart,
  IconHeartFilled,
  IconSearch,
  IconShoppingBag,
  IconCheck,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts, useCategories, useBrands } from './useCatalog';
import { useToggleFavorite, useIsFavorite } from '../favorites/useFavorites';
import { useAddToCart, useIsInCart, useRemoveCartItem } from '../cart/useCart';
import type { Category } from '../../types';
import type { SortOption } from './catalogApi';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recommended', label: 'Рекомендовані' },
  { value: 'price_asc',   label: 'Від дешевих' },
  { value: 'price_desc',  label: 'Від дорогих' },
];

function CategoryTree({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>(() => {
    const active = categories.find(
      (c) => c._id === selected || c.children.some((s) => s._id === selected),
    );
    return active ? [active._id] : [];
  });

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    padding: '7px 10px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--mantine-color-dark-8)' : 'var(--mantine-color-dark-5)',
    background: active ? 'var(--mantine-color-gray-1)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.12s',
  });

  return (
    <Stack gap={2}>
      <UnstyledButton style={itemStyle(selected === '')} onClick={() => onSelect('')}>
        Всі товари
      </UnstyledButton>
      {categories.map((cat) => (
        <Box key={cat._id}>
          <UnstyledButton
            style={{ ...itemStyle(selected === cat._id), display: 'flex', justifyContent: 'space-between' }}
            onClick={() => {
              if (cat.children.length > 0) toggle(cat._id);
              onSelect(cat._id);
            }}
          >
            <span>{cat.name}</span>
            {cat.children.length > 0 && (
              <Text size="xs" c="dimmed" style={{ lineHeight: '20px' }}>
                {expanded.includes(cat._id) ? '−' : '+'}
              </Text>
            )}
          </UnstyledButton>
          {cat.children.length > 0 && expanded.includes(cat._id) && (
            <Stack gap={1} pl="xs">
              {cat.children.map((sub) => (
                <UnstyledButton
                  key={sub._id}
                  style={itemStyle(selected === sub._id)}
                  onClick={() => onSelect(sub._id)}
                >
                  {sub.name}
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}

type ProductType = {
  _id: string;
  title: string;
  price: number;
  images: { url: string }[];
  stock: number;
  isPromo: boolean;
  unlimitedStock: boolean;
  hidePrice: boolean;
  brandId: { name: string };
};

function ProductCard({ product }: { product: ProductType }) {
  const navigate = useNavigate();
  const isFavorite = useIsFavorite(product._id);
  const inCart = useIsInCart(product._id);
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();
  const removeFromCart = useRemoveCartItem();

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ productId: product._id, isFavorite });
  };

  const effectiveStock = product.unlimitedStock ? 9999 : product.stock;

  const handleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (effectiveStock === 0) return;
    if (inCart) {
      removeFromCart.mutate(product._id);
    } else {
      addToCart.mutate({ productId: product._id, quantity: 1 });
    }
  };

  return (
    <Card
      radius="md"
      withBorder
      padding={0}
      style={{ cursor: 'pointer', transition: 'box-shadow 0.15s', overflow: 'hidden' }}
      onClick={() => navigate(`/product/${product._id}`)}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <Box style={{ position: 'relative', background: 'var(--mantine-color-gray-0)', padding: 12 }}>
        <Image
          src={product.images[0]?.url}
          height={180}
          alt={product.title}
          fit="contain"
          fallbackSrc="https://placehold.co/300x180?text=—"
        />
        <ActionIcon
          variant="white"
          size="sm"
          radius="xl"
          color={isFavorite ? 'red' : 'gray'}
          style={{ position: 'absolute', top: 10, right: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}
          loading={toggleFavorite.isPending}
          onClick={handleFavorite}
        >
          {isFavorite ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
        </ActionIcon>
        {product.isPromo && (
          <Badge
            color="orange"
            variant="filled"
            size="xs"
            style={{ position: 'absolute', bottom: 10, left: 10, fontWeight: 700 }}
          >
            Акція
          </Badge>
        )}
        {effectiveStock === 0 && (
          <Badge
            color="gray"
            variant="light"
            size="xs"
            style={{ position: 'absolute', bottom: 10, right: 10 }}
          >
            Немає
          </Badge>
        )}
      </Box>

      <Box px={14} py={12}>
        <Text size="xs" c="dimmed" mb={2}>{product.brandId.name}</Text>
        <Text fw={500} size="sm" lineClamp={2} mb={10} style={{ lineHeight: 1.4 }}>
          {product.title}
        </Text>
        <Group justify="space-between" align="center" wrap="nowrap">
          {product.hidePrice ? (
            <Text size="sm" c="dimmed" fs="italic">Ціна уточнюється</Text>
          ) : (
            <Text fw={700} size="md">{product.price.toLocaleString('uk-UA')} ₴</Text>
          )}
          {effectiveStock > 0 && (
            <Tooltip label={inCart ? 'В кошику' : 'До кошика'} withArrow position="top">
              <ActionIcon
                size="sm"
                radius="md"
                variant={inCart ? 'filled' : 'light'}
                color={inCart ? 'dark' : 'gray'}
                loading={addToCart.isPending || removeFromCart.isPending}
                onClick={handleCart}
              >
                {inCart ? <IconCheck size={14} /> : <IconShoppingBag size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Box>
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
  const sort = (searchParams.get('sort') as SortOption) || 'recommended';
  const page = Number(searchParams.get('page') ?? '1');

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: brands } = useBrands();
  const { data, isLoading } = useProducts({
    category: category || undefined,
    brand: brand || undefined,
    search: debouncedSearch || undefined,
    sort,
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
      if (key !== 'page') next.set('page', '1');
      return next;
    });
  };

  const brandOptions = [
    { value: '', label: 'Всі бренди' },
    ...(brands ?? []).map((b) => ({ value: b._id, label: b.name })),
  ];

  return (
    <Grid gutter="lg">
      {/* Sidebar */}
      <Grid.Col span={{ base: 12, sm: 3, md: 2 }}>
        <Box
          p="md"
          style={{
            background: '#fff',
            borderRadius: 10,
            border: '1px solid var(--mantine-color-gray-2)',
            position: 'sticky',
            top: 72,
          }}
        >
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm" style={{ letterSpacing: 0.5 }}>
            Категорії
          </Text>
          {catsLoading ? (
            <Stack gap={6}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h={28} radius="sm" />
              ))}
            </Stack>
          ) : (
            <CategoryTree
              categories={categories ?? []}
              selected={category}
              onSelect={(id) => setFilter('category', id === category ? '' : id)}
            />
          )}
        </Box>
      </Grid.Col>

      {/* Main */}
      <Grid.Col span={{ base: 12, sm: 9, md: 10 }}>
        <Stack gap="md">
          {/* Filters */}
          <Group wrap="nowrap">
            <TextInput
              flex={1}
              placeholder="Пошук товарів..."
              leftSection={<IconSearch size={15} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.currentTarget.value)}
              styles={{
                input: { background: '#fff', borderColor: 'var(--mantine-color-gray-3)' },
              }}
            />
            <Select
              w={160}
              placeholder="Бренд"
              data={brandOptions}
              value={brand}
              onChange={(v) => setFilter('brand', v ?? '')}
              clearable
              styles={{
                input: { background: '#fff', borderColor: 'var(--mantine-color-gray-3)' },
              }}
            />
            <Select
              w={180}
              data={SORT_OPTIONS}
              value={sort}
              onChange={(v) => setFilter('sort', v ?? 'recommended')}
              allowDeselect={false}
              styles={{
                input: { background: '#fff', borderColor: 'var(--mantine-color-gray-3)' },
              }}
            />
          </Group>

          {isLoading ? (
            <SimpleGrid cols={{ base: 2, xs: 2, md: 3, lg: 4 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} h={280} radius="md" />
              ))}
            </SimpleGrid>
          ) : !data?.items.length ? (
            <Center h={300}>
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="lg">Товарів не знайдено</Text>
                <Text c="dimmed" size="sm">Спробуйте змінити фільтри</Text>
              </Stack>
            </Center>
          ) : (
            <>
              <Text size="xs" c="dimmed">{data.total} товарів</Text>
              <SimpleGrid cols={{ base: 2, xs: 2, md: 3, lg: 4 }}>
                {data.items.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </SimpleGrid>
              {data.totalPages > 1 && (
                <Center mt="sm">
                  <Pagination
                    total={data.totalPages}
                    value={page}
                    onChange={(p) => setFilter('page', String(p))}
                    size="sm"
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
