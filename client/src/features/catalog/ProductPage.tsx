import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHeart, IconHeartFilled, IconShoppingBag, IconChevronLeft } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProduct } from './useCatalog';
import { useAddToCart } from '../cart/useCart';
import { useToggleFavorite, useIsFavorite } from '../favorites/useFavorites';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading, isError } = useProduct(id!);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const addToCart = useAddToCart();
  const toggleFavorite = useToggleFavorite();
  const isFavorite = useIsFavorite(id!);

  if (isLoading) return <Center h={400}><Loader size="sm" /></Center>;
  if (isError || !product) return <Center h={400}><Text c="dimmed">Товар не знайдено</Text></Center>;

  const effectiveStock = product.unlimitedStock ? 9999 : product.stock;

  const handleAddToCart = async () => {
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: qty });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка. Можливо, недостатньо на складі' });
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite.mutateAsync({ productId: product._id, isFavorite });
    } catch {
      notifications.show({ color: 'red', message: 'Потрібно увійти в акаунт' });
    }
  };

  return (
    <Stack gap="lg">
      {/* Breadcrumb */}
      <Group gap={6}>
        <Text
          component={Link}
          to="/"
          size="sm"
          c="dimmed"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <IconChevronLeft size={14} />
          Каталог
        </Text>
        <Text size="sm" c="dimmed">·</Text>
        <Text size="sm" c="dimmed">{product.categoryId.name}</Text>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        {/* Gallery */}
        <Stack gap="sm">
          <Box
            style={{
              background: 'var(--mantine-color-gray-0)',
              borderRadius: 12,
              border: '1px solid var(--mantine-color-gray-2)',
              overflow: 'hidden',
              padding: 16,
            }}
          >
            <Image
              src={product.images[activeImage]?.url}
              h={360}
              fit="contain"
              fallbackSrc="https://placehold.co/400x360?text=—"
            />
          </Box>
          {product.images.length > 1 && (
            <Group gap="xs">
              {product.images.map((img, i) => (
                <Box
                  key={img.publicId}
                  onClick={() => setActiveImage(i)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    border: `2px solid ${i === activeImage ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    padding: 4,
                    background: 'var(--mantine-color-gray-0)',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Image src={img.url} w="100%" h="100%" fit="contain" />
                </Box>
              ))}
            </Group>
          )}
        </Stack>

        {/* Info */}
        <Stack gap="md">
          <Box>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4} style={{ letterSpacing: 0.5 }}>
              {product.brandId.name}
            </Text>
            <Text fw={600} size="xl" style={{ lineHeight: 1.3 }}>{product.title}</Text>
          </Box>

          <Group align="center" gap="sm">
            {product.hidePrice ? (
              <Text size="xl" c="dimmed" fs="italic" fw={500}>Ціна уточнюється</Text>
            ) : (
              <Text fw={700} size="2rem" style={{ lineHeight: 1 }}>
                {product.price.toLocaleString('uk-UA')} ₴
              </Text>
            )}
            {!product.hidePrice && (
              effectiveStock === 0 ? (
                <Badge color="red" variant="light" size="sm">Немає в наявності</Badge>
              ) : (
                <Badge color="green" variant="light" size="sm">В наявності</Badge>
              )
            )}
          </Group>

          {product.description && (
            <>
              <Divider />
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{product.description}</Text>
            </>
          )}

          {product.hidePrice ? (
            <>
              <Divider />
              <Group align="flex-end" gap="sm">
                <NumberInput
                  label="Кількість"
                  value={qty}
                  onChange={(v) => setQty(Number(v))}
                  min={1}
                  max={effectiveStock || 9999}
                  w={100}
                  size="sm"
                  styles={{ input: { background: '#fff' } }}
                />
                <Text size="xs" c="dimmed" mb={6}>
                  {product.unlimitedStock ? '+9999 шт.' : `max ${product.stock} шт.`}
                </Text>
              </Group>
              <Group gap="sm">
                <Button
                  leftSection={<IconShoppingBag size={16} />}
                  onClick={handleAddToCart}
                  loading={addToCart.isPending}
                  flex={1}
                  color="dark"
                  disabled={effectiveStock === 0}
                >
                  Додати до кошика (ціна уточнюється)
                </Button>
                <ActionIcon
                  variant={isFavorite ? 'filled' : 'light'}
                  color={isFavorite ? 'red' : 'gray'}
                  size="lg"
                  onClick={handleToggleFavorite}
                  loading={toggleFavorite.isPending}
                >
                  {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                </ActionIcon>
              </Group>
            </>
          ) : effectiveStock > 0 ? (
            <>
              <Divider />
              <Group align="flex-end" gap="sm">
                <NumberInput
                  label="Кількість"
                  value={qty}
                  onChange={(v) => setQty(Number(v))}
                  min={1}
                  max={effectiveStock}
                  w={100}
                  size="sm"
                  styles={{ input: { background: '#fff' } }}
                />
                <Text size="xs" c="dimmed" mb={6}>
                  {product.unlimitedStock ? '+9999 шт.' : `max ${product.stock} шт.`}
                </Text>
              </Group>
              <Group gap="sm">
                <Button
                  leftSection={<IconShoppingBag size={16} />}
                  onClick={handleAddToCart}
                  loading={addToCart.isPending}
                  flex={1}
                  color="dark"
                >
                  Додати до кошика
                </Button>
                <ActionIcon
                  variant={isFavorite ? 'filled' : 'light'}
                  color={isFavorite ? 'red' : 'gray'}
                  size="lg"
                  onClick={handleToggleFavorite}
                  loading={toggleFavorite.isPending}
                >
                  {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                </ActionIcon>
              </Group>
            </>
          ) : (
            <Group gap="sm">
              <Button variant="light" color="gray" flex={1} disabled>
                Немає в наявності
              </Button>
              <ActionIcon
                variant={isFavorite ? 'filled' : 'light'}
                color={isFavorite ? 'red' : 'gray'}
                size="lg"
                onClick={handleToggleFavorite}
                loading={toggleFavorite.isPending}
              >
                {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
              </ActionIcon>
            </Group>
          )}

          <Box
            p="sm"
            style={{
              background: 'var(--mantine-color-gray-0)',
              borderRadius: 8,
              border: '1px solid var(--mantine-color-gray-2)',
            }}
          >
            {product.sku && (
              <Text size="xs" c="dimmed">Артикул: <Text span size="xs" fw={500}>{product.sku}</Text></Text>
            )}
          </Box>
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
