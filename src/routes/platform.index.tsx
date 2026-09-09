import { createFileRoute } from '@tanstack/react-router'
import { PlatformConsole } from '../features/access/platform-console'

export const Route = createFileRoute('/platform/')({ component: PlatformConsole })
