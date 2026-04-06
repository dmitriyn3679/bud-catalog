import {
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  NumberInput,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, useUpdateCartItem, useRemoveCartItem } from './useCart';

export function CartPage() {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const navigate = useNavigate();

  if (isLoading) return null;

  const items = cart?.items ?? [];
  const total = items.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  if (!items.length) {
    return (
      <Center h={400}>
        <Stack align="center" gap="sm">
          <Text c="dimmed" size="lg">Кошик порожній</Text>
          <Button component={Link} to="/" variant="light">До каталогу</Button>
        </Stack>
      </Center>
    );
  }

  const handleQtyChange = async (productId: string, qty: number) => {
    try {
      await updateItem.mutateAsync({ productId, quantity: qty });
    } catch {
      notifications.show({ color: 'red', message: 'Недостатньо на складі' });
    }
  };

  const handleRemove = async (productId: string) => {
    await removeItem.mutateAsync(productId);
  };

  return (
    <Stack maw={800} mx="auto">
      <Title order={2}>Кошик</Title>

      <Stack gap="sm">
        {items.map((item) => {
          const product = item.productId;
          return (
            <Paper key={product._id} withBorder p="md" radius="md">
              <Group align="flex-start" wrap="nowrap">
                <Image
                  src={product.images[0]?.url}
                  w={80}
                  h={80}
                  radius="sm"
                  fit="cover"
                  fallbackSrc="https://placehold.co/80x80?text=?"
                  style={{ flexShrink: 0 }}
                />
                <Box flex={1}>
                  <Text fw={500} lineClamp={2} component={Link} to={`/product/${product._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {product.title}
                  </Text>
                  <Text fw={700} mt={4}>{product.price.toLocaleString('uk-UA')} ₴</Text>
                </Box>
                <Group align="center" wrap="nowrap">
                  <NumberInput
                    value={item.quantity}
                    onChange={(v) => handleQtyChange(product._id, Number(v))}
                    min={1}
                    max={product.stock}
                    w={80}
                    size="sm"
                  />
                  <Text fw={600} w={90} ta="right">
                    {(product.price * item.quantity).toLocaleString('uk-UA')} ₴
                  </Text>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemove(product._id)}
                    loading={removeItem.isPending}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          );
        })}
      </Stack>

      <Divider />

      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Text c="dimmed" size="sm">Разом ({items.length} товар{items.length > 1 ? 'и' : ''}):</Text>
          <Text fw={700} size="xl">{total.toLocaleString('uk-UA')} ₴</Text>
        </Stack>
        <Button size="md" onClick={() => navigate('/checkout')}>
          Оформити замовлення
        </Button>
      </Group>
    </Stack>
  );
}
