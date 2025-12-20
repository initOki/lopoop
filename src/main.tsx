import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'

import './styles/globals.css'
import DebtPage from './components/DebtPage.tsx'
import Header from './components/Header.tsx'
import SchedulePage from './components/SchedulePage.tsx'
import App from './App.tsx'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Header />
      <Outlet />
      <Toaster position="top-right" richColors />
      <TanStackRouterDevtools />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  ),
})

// Index Route (/)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
})

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  component: SchedulePage,
})

const debtRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/debts',
  component: DebtPage,
})

const routeTree = rootRoute.addChildren([indexRoute, scheduleRoute, debtRoute])

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

// Router 타입 등록
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    },
  },
})

// React Mount
const rootElement = document.getElementById('app')
if (!rootElement) {
  throw new Error('Root element #app not found')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
