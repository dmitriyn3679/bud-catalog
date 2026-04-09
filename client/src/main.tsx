import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
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
            <Notifications position="top-right" />
            <App />
            <ReactQueryDevtools initialIsOpen={false} />
          </DatesProvider>
        </MantineProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
