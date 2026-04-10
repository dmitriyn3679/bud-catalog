import { Anchor, Box, Button, Center, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { usePageTitle } from '../../hooks/usePageTitle';

const schema = z.object({
  login: z.string().min(1, 'Введіть email або телефон'),
  password: z.string().min(1, 'Введіть пароль'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  usePageTitle('Вхід');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.login, data.password);
      navigate(from, { replace: true });
    } catch {
      notifications.show({ color: 'red', message: 'Невірний email/телефон або пароль' });
    }
  };

  return (
    <Center mih="80vh">
      <Box w={360}>
        <Text fw={700} size="xl" ta="center" mb={4}>Вхід</Text>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Ще немає акаунту?{' '}
          <Anchor component={Link} to="/register" c="dark" fw={500}>Реєстрація</Anchor>
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
              <TextInput
                label="Email або телефон"
                placeholder="your@email.com або +380..."
                {...register('login')}
                error={errors.login?.message}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />
              <PasswordInput
                label="Пароль"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
                styles={{ input: { background: 'var(--mantine-color-gray-0)' } }}
              />
              <Button type="submit" loading={isSubmitting} fullWidth mt="xs" color="dark">
                Увійти
              </Button>
            </Stack>
          </form>
        </Box>
      </Box>
    </Center>
  );
}
