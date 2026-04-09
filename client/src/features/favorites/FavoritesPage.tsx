import {
  ActionIcon,
  Box,
  Button,
  Card,
  Center,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { IconHeartFilled, IconHeart } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useFavorites, useToggleFavorite } from './useFavorites';

export function FavoritesPage() {
  const { data: products = [], isLoading } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const navigate = useNavigate();

  if (isLoading) return null;

  if (!products.length) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Box style={{ color: 'var(--mantine-color-gray-4)' }}>
            <IconHeart size={48} stroke={1} />
          </Box>
          <Text c="dimmed">Список вибраного порожній</Text>
          <Button component={Link} to="/" variant="light" color="dark" size="sm">
            До каталогу
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Text fw={600} size="xl">Вибране</Text>
      <SimpleGrid cols={{ base: 2, xs: 2, md: 3, lg: 4 }}>
        {products.map((product) => (
          <Card
            key={product._id}
            withBorder
            radius="md"
            padding={0}
            style={{ cursor: 'pointer', overflow: 'hidden', transition: 'box-shadow 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            <Box
              style={{ background: 'var(--mantine-color-gray-0)', padding: 12 }}
              onClick={() => navigate(`/product/${product._id}`)}
            >
              <Image
                src={product.images[0]?.url}
                height={160}
                fit="contain"
                fallbackSrc="https://placehold.co/300x160?text=—"
              />
            </Box>
            <Box px={14} py={12}>
              <Text size="xs" c="dimmed" mb={2}>{product.brandId.name}</Text>
              <Text
                fw={500}
                size="sm"
                lineClamp={2}
                mb={10}
                style={{ lineHeight: 1.4 }}
                onClick={() => navigate(`/product/${product._id}`)}
              >
                {product.title}
              </Text>
              <Group justify="space-between" align="center">
                <Text fw={700} size="md">{product.price.toLocaleString('uk-UA')} ₴</Text>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  onClick={() => toggleFavorite.mutate({ productId: product._id, isFavorite: true })}
                  loading={toggleFavorite.isPending}
                >
                  <IconHeartFilled size={16} />
                </ActionIcon>
              </Group>
            </Box>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
