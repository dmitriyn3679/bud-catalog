import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import 'dayjs/locale/uk';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <DatesProvider settings={{ locale: 'uk', firstDayOfWeek: 1 }}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <App />
          </ModalsProvider>
          </DatesProvider>
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
