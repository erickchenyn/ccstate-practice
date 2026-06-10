import type { ESLint } from 'eslint'
import { abortSignalReason } from './abort-signal-reason.ts'
import { noCatchAbort } from './no-catch-abort.ts'
import { noExportState } from './no-export-state.ts'
import { noGetSignal } from './no-get-signal.ts'
import { noStoreInParams } from './no-store-in-params.ts'
import { signalCheckAwait } from './signal-check-await.ts'
import { noModuleLevelSignal } from './no-module-level-signal.ts'
import { signalDollarSuffix } from './signal-dollar-suffix.ts'

export const ccstatePlugin: ESLint.Plugin = {
  rules: {
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'abort-signal-reason': abortSignalReason,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-dollar-suffix': signalDollarSuffix,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-export-state': noExportState,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-check-await': signalCheckAwait,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-catch-abort': noCatchAbort,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-get-signal': noGetSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-store-in-params': noStoreInParams,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-module-level-signal': noModuleLevelSignal,
  },
  configs: {
    recommended: {
      rules: {
        'ccstate/abort-signal-reason': 'error',
        'ccstate/signal-dollar-suffix': 'error',
        'ccstate/no-export-state': 'error',
        'ccstate/signal-check-await': 'error',
        'ccstate/no-catch-abort': 'error',
        'ccstate/no-get-signal': 'warn',
        'ccstate/no-store-in-params': 'error',
      },
    },
  },
}
