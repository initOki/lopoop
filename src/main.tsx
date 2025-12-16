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

// React Mount
const rootElement = document.getElementById('app')
if (!rootElement) {
  throw new Error('Root element #app not found')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
