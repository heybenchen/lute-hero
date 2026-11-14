import { createBrowserRouter } from 'react-router'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { default: Component } = await import('../App')
      return { Component }
    },
  },
  {
    path: '/map',
    lazy: async () => {
      const { MapView: Component } = await import('../components/game/MapView')
      return { Component }
    },
  },
  {
    path: '/bestiary',
    lazy: async () => {
      const { Bestiary: Component } = await import('../bestiary/Bestiary')
      return { Component }
    },
  },
  {
    path: '*',
    lazy: async () => {
      const { default: Component } = await import('../App')
      return { Component }
    },
  },
])
