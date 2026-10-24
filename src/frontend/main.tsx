/** @jsxImportSource react */
import { createRoot } from 'react-dom/client'
import { Providers } from './app/providers'
import './styles.css'

export const Root = Providers

const root = document.getElementById('root')
if (root) createRoot(root).render(<Providers />)
