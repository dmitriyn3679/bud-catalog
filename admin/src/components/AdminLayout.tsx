import { AppShell, Burger, Button, Group, NavLink, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChartBar,
  IconClipboardList,
  IconFolderOpen,
  IconLogout,
  IconPackage,
  IconReceipt,
  IconTag,
  IconUsers,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../features/auth/useAdminAuth';

const NAV_ITEMS = [
  { label: 'Товари',     icon: IconPackage,      href: '/admin/products'   },
  { label: 'Категорії',  icon: IconFolderOpen,   href: '/admin/categories' },
  { label: 'Бренди',     icon: IconTag,           href: '/admin/brands'     },
  { label: 'Клієнти',    icon: IconUsers,         href: '/admin/users'      },
  { label: 'Замовлення', icon: IconClipboardList,  href: '/admin/orders'     },
  { label: 'Витрати',    icon: IconReceipt,        href: '/admin/expenses'   },
  { label: 'Статистика', icon: IconChartBar,      href: '/admin/stats'      },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [opened, { toggle, close }] = useDisclosure();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const handleNav = (href: string) => {
    navigate(href);
    close();
  };

  return (
    <AppShell
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      header={{ height: 56 }}
      padding="md"
    >
      <AppShell.Header hiddenFrom="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', background: '#fff' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Text
              fw={700}
              size="md"
              style={{ letterSpacing: -0.5, color: 'var(--mantine-color-dark-8)' }}
            >
              BUD-CATALOG-ADMIN
            </Text>
          </Group>
          <Text size="xs" c="dimmed" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </Text>
        </Group>
      </AppShell.Header>
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
                onClick={() => handleNav(href)}
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
