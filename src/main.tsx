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
import MenuRouter from './components/MenuRouter.tsx'
import { MenuManager } from './components/MenuManager.tsx'
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

// Custom menu route with dynamic menuId parameter
const customMenuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/menu/$menuId',
  component: () => {
    // For now, we'll use a placeholder userId. In a real app, this would come from auth context
    const userId = 'current-user' // TODO: Replace with actual user ID from auth context
    return <MenuRouter userId={userId} />
  },
})

// Menu management route
const menuManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/menus',
  component: () => {
    // For now, we'll use a placeholder userId. In a real app, this would come from auth context
    const userId = 'current-user' // TODO: Replace with actual user ID from auth context
    return <MenuManager userId={userId} />
  },
})

const routeTree = rootRoute.addChildren([indexRoute, scheduleRoute, debtRoute, customMenuRoute, menuManagementRoute])

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
