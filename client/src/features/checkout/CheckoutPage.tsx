import {
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../cart/useCart';
import { checkoutApi } from './checkoutApi';
import { useAuth } from '../auth/useAuth';
import { IconShoppingBag } from '@tabler/icons-react';
import { usePageTitle } from '../../hooks/usePageTitle';

const schema = z.object({
  deliveryAddress: z.string().min(5, 'Вкажіть адресу доставки'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CheckoutPage() {
  usePageTitle('Оформлення замовлення');
  const { user } = useAuth();
  const { data: cart } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const items = cart?.items ?? [];
  const hidePriceCount = items.filter((i) => (i.productId as { hidePrice?: boolean }).hidePrice).length;
  const total = items.reduce((sum, i) => sum + ((i.productId as { hidePrice?: boolean }).hidePrice ? 0 : i.productId.price * i.quantity), 0);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      deliveryAddress: [user?.city, user?.address].filter(Boolean).join(', '),
    },
  });

  const placeOrder = useMutation({
    mutationFn: checkoutApi.placeOrder,
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      notifications.show({ color: 'green', message: 'Замовлення оформлено!' });
      navigate(`/profile/orders/${order._id}`);
    },
    onError: () => {
      notifications.show({ color: 'red', message: 'Помилка при оформленні замовлення' });
    },
  });

  if (!items.length) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Box style={{ color: 'var(--mantine-color-gray-4)' }}>
            <IconShoppingBag size={48} stroke={1} />
          </Box>
          <Text c="dimmed">Кошик порожній</Text>
          <Button component={Link} to="/" variant="light" color="dark" size="sm">
            До каталогу
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Box maw={920} mx="auto">
      <Text fw={600} size="xl" mb="lg">Оформлення замовлення</Text>

      <Group align="flex-start" gap="lg" wrap="wrap">
        {/* Form */}
        <Box
          flex={1}
          p="xl"
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          <Text fw={600} mb="md">Доставка</Text>
          <form onSubmit={handleSubmit((d) => placeOrder.mutate(d))}>
            <Stack gap="sm">
              <TextInput
                label="Адреса доставки"
                placeholder="м. Київ, вул. Хрещатик, 1"
                {...register('deliveryAddress')}
                error={errors.deliveryAddress?.message}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />
              <Textarea
                label="Коментар"
                placeholder="Необов'язково..."
                rows={3}
                {...register('note')}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />
              <Button type="submit" loading={placeOrder.isPending} mt="xs" color="dark" fullWidth>
                Підтвердити замовлення
              </Button>
            </Stack>
          </form>
        </Box>

        {/* Summary */}
        <Box
          w={{ base: '100%', sm: 300 }}
          p="xl"
          style={{
            flexShrink: 0,
            background: '#fff',
            borderRadius: 12,
            border: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          <Text fw={600} mb="md">Ваше замовлення</Text>
          <Stack gap="sm">
            {items.map((item) => (
              <Group key={item.productId._id} wrap="nowrap" gap="sm" align="flex-start">
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    background: 'var(--mantine-color-gray-0)',
                    border: '1px solid var(--mantine-color-gray-2)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    padding: 3,
                  }}
                >
                  <Image
                    src={item.productId.images[0]?.url}
                    w="100%"
                    h="100%"
                    fit="contain"
                    fallbackSrc="https://placehold.co/40x40?text=?"
                  />
                </Box>
                <Text size="xs" flex={1} lineClamp={2} style={{ lineHeight: 1.4 }}>
                  {item.productId.title}
                </Text>
                <Text size="xs" fw={500} style={{ whiteSpace: 'nowrap', flexShrink: 0 }} c={(item.productId as { hidePrice?: boolean }).hidePrice ? 'dimmed' : undefined}>
                  {(item.productId as { hidePrice?: boolean }).hidePrice
                    ? `${item.quantity} × уточнюється`
                    : `${item.quantity} × ${item.productId.price.toLocaleString('uk-UA')} ₴`}
                </Text>
              </Group>
            ))}
          </Stack>
          <Divider my="md" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Разом:</Text>
            <Text fw={700}>
              {hidePriceCount > 0
                ? total > 0 ? `${total.toLocaleString('uk-UA')} ₴ + уточнюється` : 'Уточнюється'
                : `${total.toLocaleString('uk-UA')} ₴`}
            </Text>
          </Group>
        </Box>
      </Group>
    </Box>
  );
}
