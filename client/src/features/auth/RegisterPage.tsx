import { Anchor, Box, Button, Center, Divider, PasswordInput, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const schema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи'),
  email: z.string().email('Невірний email').optional().or(z.literal('')),
  phone: z.string().min(10, 'Введіть коректний номер').max(20),
  shopName: z.string().min(2, 'Мінімум 2 символи'),
  city: z.string().min(2, 'Мінімум 2 символи'),
  address: z.string().min(5, 'Мінімум 5 символів'),
  password: z.string().min(8, 'Мінімум 8 символів'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Паролі не співпадають',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(
        data.password,
        data.name,
        data.shopName,
        data.city,
        data.address,
        data.email || undefined,
        data.phone || undefined,
      );
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ color: 'red', message: msg ?? 'Помилка реєстрації' });
    }
  };

  return (
    <Center mih="80vh" py="xl">
      <Box w={{ base: '100%', sm: 480 }}>
        <Text fw={700} size="xl" ta="center" mb={4}>Реєстрація</Text>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Вже є акаунт?{' '}
          <Anchor component={Link} to="/login" c="dark" fw={500}>Увійти</Anchor>
        </Text>

        <Box
          p="xl"
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid var(--mantine-color-gray-2)',
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="sm">
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                Контактна інформація
              </Text>

              <TextInput
                label="Ім'я"
                placeholder="Іван Іваненко"
                {...register('name')}
                error={errors.name?.message}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />

              <SimpleGrid cols={2} spacing="sm">
                <TextInput
                  label="Телефон"
                  placeholder="+380..."
                  {...register('phone')}
                  error={errors.phone?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  {...register('email')}
                  error={errors.email?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
              </SimpleGrid>

              <Divider my={4} />
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                Підприємство
              </Text>

              <TextInput
                label="Назва"
                placeholder="ФОП Іваненко"
                {...register('shopName')}
                error={errors.shopName?.message}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />
              <SimpleGrid cols={2} spacing="sm">
                <TextInput
                  label="Місто"
                  placeholder="Київ"
                  {...register('city')}
                  error={errors.city?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
                <TextInput
                  label="Адреса"
                  placeholder="вул. Хрещатик, 1"
                  {...register('address')}
                  error={errors.address?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
              </SimpleGrid>

              <Divider my={4} />
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                Акаунт
              </Text>

              <SimpleGrid cols={2} spacing="sm">
                <PasswordInput
                  label="Пароль"
                  placeholder="Мінімум 8 символів"
                  {...register('password')}
                  error={errors.password?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
                <PasswordInput
                  label="Підтвердження"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                  styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
                />
              </SimpleGrid>

              <Button type="submit" loading={isSubmitting} fullWidth mt="xs" color="dark">
                Зареєструватися
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Center>
  );
}
