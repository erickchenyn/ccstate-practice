import { type ReactNode } from 'react'
import type { Command } from 'ccstate'

export type RouteCommand = Command<ReactNode, [AbortSignal]>
