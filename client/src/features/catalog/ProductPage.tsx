import {
  ActionIcon,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Center,
  Group,
  Image,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHeart, IconHeartFilled, IconShoppingCart } from '@tabler/icons-react';
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

  if (isLoading) return <Center h={400}><Loader /></Center>;
  if (isError || !product) return <Center h={400}><Text c="red">Товар не знайдено</Text></Center>;

  const handleAddToCart = async () => {
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: qty });
      notifications.show({ color: 'green', message: 'Додано до кошика' });
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
    <Stack>
      <Breadcrumbs>
        <Link to="/" style={{ textDecoration: 'none', color: 'var(--mantine-color-blue-6)' }}>Каталог</Link>
        <Text size="sm">{product.categoryId.name}</Text>
        <Text size="sm" c="dimmed">{product.title}</Text>
      </Breadcrumbs>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        {/* Images */}
        <Stack gap="sm">
          <Image
            src={product.images[activeImage]?.url}
            radius="md"
            h={380}
            fit="contain"
            fallbackSrc="https://placehold.co/400x380?text=No+image"
          />
          {product.images.length > 1 && (
            <Group gap="xs">
              {product.images.map((img, i) => (
                <Box
                  key={img.publicId}
                  style={{
                    border: `2px solid ${i === activeImage ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => setActiveImage(i)}
                >
                  <Image src={img.url} w={64} h={64} fit="cover" />
                </Box>
              ))}
            </Group>
          )}
        </Stack>

        {/* Info */}
        <Stack gap="sm">
          <Text c="dimmed" size="sm">{product.brandId.name}</Text>
          <Title order={2}>{product.title}</Title>

          <Group>
            <Text fw={700} size="2rem">{product.price.toLocaleString('uk-UA')} ₴</Text>
            {product.stock === 0 ? (
              <Badge color="red">Немає в наявності</Badge>
            ) : (
              <Badge color="green">В наявності: {product.stock} шт.</Badge>
            )}
          </Group>

          <Text c="dimmed" size="sm" mt="xs">{product.description}</Text>

          {product.stock > 0 && (
            <Group mt="md" align="flex-end">
              <NumberInput
                label="Кількість"
                value={qty}
                onChange={(v) => setQty(Number(v))}
                min={1}
                max={product.stock}
                w={100}
              />
              <Button
                leftSection={<IconShoppingCart size={16} />}
                onClick={handleAddToCart}
                loading={addToCart.isPending}
                flex={1}
              >
                Додати до кошика
              </Button>
              <ActionIcon
                variant={isFavorite ? 'filled' : 'default'}
                color={isFavorite ? 'red' : undefined}
                size="lg"
                onClick={handleToggleFavorite}
                loading={toggleFavorite.isPending}
              >
                {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
              </ActionIcon>
            </Group>
          )}
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
