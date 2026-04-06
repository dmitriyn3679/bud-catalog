import {
  Button,
  Center,
  Divider,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../cart/useCart';
import { checkoutApi } from './checkoutApi';

const schema = z.object({
  deliveryAddress: z.string().min(5, 'Вкажіть адресу доставки'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CheckoutPage() {
  const { data: cart } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const items = cart?.items ?? [];
  const total = items.reduce((sum, i) => sum + i.productId.price * i.quantity, 0);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
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
        <Stack align="center" gap="sm">
          <Text c="dimmed">Кошик порожній</Text>
          <Button component={Link} to="/" variant="light">До каталогу</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Group align="flex-start" maw={960} mx="auto" gap="xl">
      {/* Form */}
      <Paper withBorder p="xl" radius="md" flex={1}>
        <Title order={3} mb="md">Доставка</Title>
        <form onSubmit={handleSubmit((d) => placeOrder.mutate(d))}>
          <Stack>
            <TextInput
              label="Адреса доставки"
              placeholder="м. Київ, вул. Хрещатик, 1"
              {...register('deliveryAddress')}
              error={errors.deliveryAddress?.message}
            />
            <Textarea
              label="Коментар до замовлення"
              placeholder="Необов'язково..."
              rows={3}
              {...register('note')}
            />
            <Button type="submit" loading={placeOrder.isPending} mt="sm">
              Підтвердити замовлення
            </Button>
          </Stack>
        </form>
      </Paper>

      {/* Order summary */}
      <Paper withBorder p="xl" radius="md" w={320}>
        <Title order={4} mb="md">Ваше замовлення</Title>
        <Stack gap="xs">
          {items.map((item) => (
            <Group key={item.productId._id} wrap="nowrap" gap="sm">
              <Image
                src={item.productId.images[0]?.url}
                w={40} h={40} radius="sm" fit="cover"
                fallbackSrc="https://placehold.co/40x40?text=?"
                style={{ flexShrink: 0 }}
              />
              <Text size="sm" flex={1} lineClamp={2}>{item.productId.title}</Text>
              <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>
                {item.quantity} × {item.productId.price.toLocaleString('uk-UA')} ₴
              </Text>
            </Group>
          ))}
        </Stack>
        <Divider my="md" />
        <Group justify="space-between">
          <Text fw={600}>Разом:</Text>
          <Text fw={700} size="lg">{total.toLocaleString('uk-UA')} ₴</Text>
        </Group>
      </Paper>
    </Group>
  );
}
