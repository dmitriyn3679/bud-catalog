import { Box, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';

const schema = z.object({
  email: z.string().email('Невірний email'),
  password: z.string().min(1, 'Введіть пароль'),
});
type FormData = z.infer<typeof schema>;

export function AdminLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      navigate('/admin');
    } catch {
      notifications.show({ color: 'red', message: 'Невірні дані або недостатньо прав' });
    }
  };

  return (
    <Center h="100vh" bg="gray.0">
      <Box w={360}>
        <Title ta="center" mb={4}>Адмін панель</Title>
        <Text c="dimmed" ta="center" size="sm" mb="xl">Вхід для адміністраторів</Text>
        <Paper withBorder shadow="md" p="xl" radius="md">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack>
              <TextInput label="Email" placeholder="admin@example.com" {...register('email')} error={errors.email?.message} />
              <PasswordInput label="Пароль" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
              <Button type="submit" loading={isSubmitting} fullWidth mt="sm">Увійти</Button>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
