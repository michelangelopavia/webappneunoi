import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster as SonnerToaster } from "sonner"
import { Toaster } from "@/components/ui/toaster"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Pages />
      <Toaster />
      <SonnerToaster richColors position="top-right" />
    </QueryClientProvider>
  )
}

export default App 
