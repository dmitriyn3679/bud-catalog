import {
  ActionIcon,
  Button,
  Card,
  Center,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconHeart } from '@tabler/icons-react';
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
        <Stack align="center" gap="sm">
          <Text c="dimmed" size="lg">Список вибраного порожній</Text>
          <Button component={Link} to="/" variant="light">До каталогу</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack>
      <Title order={2}>Вибране</Title>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
        {products.map((product) => (
          <Card key={product._id} withBorder shadow="xs" radius="md" style={{ cursor: 'pointer' }}>
            <Card.Section onClick={() => navigate(`/product/${product._id}`)}>
              <Image
                src={product.images[0]?.url}
                height={160}
                fit="cover"
                fallbackSrc="https://placehold.co/300x160?text=No+image"
              />
            </Card.Section>
            <Stack mt="sm" gap={4}>
              <Text size="xs" c="dimmed">{product.brandId.name}</Text>
              <Text fw={500} lineClamp={2} onClick={() => navigate(`/product/${product._id}`)}>
                {product.title}
              </Text>
              <Group justify="space-between" mt={4}>
                <Text fw={700}>{product.price.toLocaleString('uk-UA')} ₴</Text>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => toggleFavorite.mutate({ productId: product._id, isFavorite: true })}
                  loading={toggleFavorite.isPending}
                >
                  <IconHeart size={16} />
                </ActionIcon>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
