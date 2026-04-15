import {
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import { useDebouncedCallback, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconShoppingBag } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, useUpdateCartItem, useRemoveCartItem } from './useCart';
import { usePageTitle } from '../../hooks/usePageTitle';

function CartItem({
  item,
}: {
  item: {
    productId: { _id: string; title: string; price: number; images: { url: string }[]; stock: number; unlimitedStock: boolean; hidePrice?: boolean };
    quantity: number;
  };
}) {
  const product = item.productId;
  const effectiveStock = product.unlimitedStock ? 9999 : product.stock;
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const [qty, setQty] = useState<number>(item.quantity);
  const isMobile = useMediaQuery('(max-width: 600px)');

  const sendUpdate = useDebouncedCallback(async (value: number) => {
    const clamped = value < 1 ? 1 : value;
    if (clamped !== qty) setQty(clamped);
    try {
      await updateItem.mutateAsync({ productId: product._id, quantity: clamped });
    } catch {
      notifications.show({ color: 'red', message: 'Недостатньо на складі' });
    }
  }, 500);

  const handleChange = (value: number | string) => {
    const num = Number(value);
    if (isNaN(num) || num === 0) { sendUpdate(1); setQty(1); return; }
    setQty(num);
    sendUpdate(num);
  };

  const image = (
    <Box
      style={{
        width: 72,
        height: 72,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--mantine-color-gray-0)',
        border: '1px solid var(--mantine-color-gray-2)',
        flexShrink: 0,
        padding: 4,
      }}
    >
      <Image
        src={product.images[0]?.url}
        w="100%"
        h="100%"
        fit="contain"
        fallbackSrc="https://placehold.co/72x72?text=?"
      />
    </Box>
  );

  const deleteBtn = (
    <ActionIcon
      color="gray"
      variant="subtle"
      size="sm"
      onClick={() => removeItem.mutate(product._id)}
      loading={removeItem.isPending}
    >
      <IconTrash size={15} />
    </ActionIcon>
  );

  const qtyInput = (
    <NumberInput
      value={qty}
      onChange={handleChange}
      min={1}
      max={effectiveStock}
      w={76}
      size="sm"
      styles={{ input: { background: '#fff', textAlign: 'center' } }}
    />
  );

  const subtotal = (
    <Text fw={600} w={80} ta="right" size="sm" style={{ whiteSpace: 'nowrap' }} c={product.hidePrice ? 'dimmed' : undefined}>
      {product.hidePrice ? '—' : `${(product.price * qty).toLocaleString('uk-UA')} ₴`}
    </Text>
  );

  if (isMobile) {
    return (
      <Group align="flex-start" wrap="nowrap" gap="md">
        {image}
        <Box flex={1} style={{ overflow: 'hidden', minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
            <Text
              fw={500}
              size="sm"
              lineClamp={2}
              component={Link}
              to={`/product/${product._id}`}
              style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
            >
              {product.title}
            </Text>
            {deleteBtn}
          </Group>
          {product.hidePrice
            ? <Text size="sm" c="dimmed" fs="italic" mt={4}>Ціна уточнюється</Text>
            : <Text size="sm" fw={600} mt={4}>{product.price.toLocaleString('uk-UA')} ₴</Text>
          }
          <Text size="xs" c="dimmed" mt={2}>
            Залишок: {product.unlimitedStock ? '+9999' : product.stock} шт.
          </Text>
          <Group mt="xs" align="center" gap="sm">
            {qtyInput}
            {subtotal}
          </Group>
        </Box>
      </Group>
    );
  }

  return (
    <Group align="flex-start" wrap="nowrap" gap="md">
      {image}
      <Box flex={1} style={{ overflow: 'hidden' }}>
        <Text
          fw={500}
          size="sm"
          lineClamp={2}
          component={Link}
          to={`/product/${product._id}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {product.title}
        </Text>
        {product.hidePrice
          ? <Text size="sm" c="dimmed" fs="italic" mt={4}>Ціна уточнюється</Text>
          : <Text size="sm" fw={600} mt={4}>{product.price.toLocaleString('uk-UA')} ₴</Text>
        }
        <Text size="xs" c="dimmed" mt={2}>
          Залишок: {product.unlimitedStock ? '+9999' : product.stock} шт.
        </Text>
      </Box>
      <Group align="center" wrap="nowrap" gap="sm" style={{ flexShrink: 0 }}>
        {qtyInput}
        {subtotal}
        {deleteBtn}
      </Group>
    </Group>
  );
}

export function CartPage() {
  usePageTitle('Кошик');
  const { data: cart, isLoading } = useCart();
  const navigate = useNavigate();

  if (isLoading) return null;

  const items = cart?.items ?? [];
  const hidePriceCount = items.filter((i) => i.productId.hidePrice).length;
  const total = items.reduce((sum, item) => sum + (item.productId.hidePrice ? 0 : item.productId.price * item.quantity), 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  if (!items.length) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Box style={{ color: 'var(--mantine-color-gray-4)' }}>
            <IconShoppingBag size={48} stroke={1} />
          </Box>
          <Text c="dimmed">Кошик порожній</Text>
          <Button component={Link} to="/" variant="light" color="dark" size="sm">
            Перейти до каталогу
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box maw={760} mx="auto">
      <Text fw={600} size="xl" mb="lg">Кошик</Text>

      <Box
        style={{
          background: '#fff',
          border: '1px solid var(--mantine-color-gray-2)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Stack gap={0} px={{ base: 'sm', sm: 'lg' }} py="md">
          {items.map((item, i) => (
            <Box key={item.productId._id}>
              <CartItem item={item} />
              {i < items.length - 1 && <Divider my="md" />}
            </Box>
          ))}
        </Stack>

        <Divider />

        <Box px={{ base: 'sm', sm: 'lg' }} py="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                {totalQty} товар{totalQty !== 1 ? (totalQty < 5 ? 'и' : 'ів') : ''}
              </Text>
              <Text fw={700} size="lg">
                {hidePriceCount > 0
                  ? total > 0 ? `${total.toLocaleString('uk-UA')} ₴ + ціна уточнюється` : 'Ціна уточнюється'
                  : `${total.toLocaleString('uk-UA')} ₴`}
              </Text>
            </Stack>
            <Button
              size="md"
              color="dark"
              onClick={() => navigate('/checkout')}
              w={{ base: '100%', xs: 'auto' }}
            >
              Оформити замовлення
            </Button>
          </Group>
        </Box>
      </Box>
    </Box>
  );
}
