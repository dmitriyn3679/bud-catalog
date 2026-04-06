import { Anchor, Box, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

const schema = z.object({
  email: z.string().email('Невірний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch {
      notifications.show({ color: 'red', message: 'Невірний email або пароль' });
    }
  };

  return (
    <Center h="100vh">
      <Box w={360} w-min={320}>
        <Title ta="center" mb="sm">Вхід</Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Ще немає акаунту?{' '}
          <Anchor component={Link} to="/register">Реєстрація</Anchor>
        </Text>

        <Paper withBorder shadow="md" p="xl" radius="md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="your@email.com"
                {...register('email')}
                error={errors.email?.message}
              />
              <PasswordInput
                label="Пароль"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
              />
              <Button type="submit" loading={isSubmitting} fullWidth mt="sm">
                Увійти
              </Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
