import { Anchor, Box, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const schema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи'),
  email: z.string().email('Невірний email'),
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
      await registerUser(data.email, data.password, data.name);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ color: 'red', message: msg ?? 'Помилка реєстрації' });
    }
  };

  return (
    <Center h="100vh">
      <Box w={360}>
        <Title ta="center" mb="sm">Реєстрація</Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Вже є акаунт?{' '}
          <Anchor component={Link} to="/login">Увійти</Anchor>
        </Text>

        <Paper withBorder shadow="md" p="xl" radius="md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack>
              <TextInput
                label="Ім'я"
                placeholder="Іван Іваненко"
                {...register('name')}
                error={errors.name?.message}
              />
              <TextInput
                label="Email"
                placeholder="your@email.com"
                {...register('email')}
                error={errors.email?.message}
              />
              <PasswordInput
                label="Пароль"
                placeholder="Мінімум 8 символів"
                {...register('password')}
                error={errors.password?.message}
              />
              <PasswordInput
                label="Підтвердіть пароль"
                placeholder="••••••••"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />
              <Button type="submit" loading={isSubmitting} fullWidth mt="sm">
                Зареєструватися
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
