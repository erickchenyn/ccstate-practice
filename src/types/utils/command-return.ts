import type { Command } from 'ccstate'

export type CommandReturn<C extends Command<unknown, unknown[]>> =
  C extends Command<infer T, unknown[]> ? T : never
