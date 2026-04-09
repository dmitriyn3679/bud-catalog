import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useAuth } from './useAuth';
import { authApi } from './authApi';

function SuspendedPage() {
  const { logout } = useAuth();
  return (
    <Center mih="100vh">
      <Stack align="center" gap="md" maw={400} ta="center">
        <IconLock size={48} color="var(--mantine-color-red-6)" />
        <Title order={2}>Акаунт призупинено</Title>
        <Text c="dimmed">
          Ваш акаунт було заблоковано адміністратором. Зверніться до підтримки для отримання додаткової інформації.
        </Text>
        <Box>
          <Button variant="default" onClick={async () => { await authApi.logout(); window.location.href = '/login'; }}>
            Вийти
          </Button>
        </Box>
      </Stack>
    </Center>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Center h="100vh"><Loader /></Center>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.isBlocked) return <SuspendedPage />;

  return <>{children}</>;
}
