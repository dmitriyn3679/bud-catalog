import { AppShell, Button, NavLink, Stack, Text, Title } from '@mantine/core';
import {
  IconChartBar,
  IconClipboardList,
  IconLogout,
  IconPackage,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../features/auth/useAdminAuth';

const NAV_ITEMS = [
  { label: 'Товари',     icon: IconPackage,       href: '/admin/products' },
  { label: 'Замовлення', icon: IconClipboardList,  href: '/admin/orders'   },
  { label: 'Статистика', icon: IconChartBar,       href: '/admin/stats'    },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <AppShell navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="sm">
        <Stack h="100%" justify="space-between">
          <Stack gap={4}>
            <Title order={5} px="sm" mb="sm">Адмін панель</Title>
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
              <NavLink
                key={href}
                label={label}
                leftSection={<Icon size={18} />}
                active={location.pathname.startsWith(href)}
                onClick={() => navigate(href)}
                style={{ borderRadius: 8 }}
              />
            ))}
          </Stack>
          <Stack gap={4} pb="xs">
            <Text size="xs" c="dimmed" px="sm">{user?.email}</Text>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
              justify="flex-start"
            >
              Вийти
            </Button>
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
