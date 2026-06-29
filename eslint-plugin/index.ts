import type { ESLint } from 'eslint'
import { abortSignalReason } from './abort-signal-reason.ts'
import { layerBoundaries } from './layer-boundaries.ts'
import { commandAsyncSignal } from './command-async-signal.ts'
import { noAbortSwallower } from './no-abort-swallower.ts'
import { noCatchAbort } from './no-catch-abort.ts'
import { noDetachInSignals } from './no-detach-in-signals.ts'
import { noEmptyPromiseCatch } from './no-empty-promise-catch.ts'
import { noAccessorEscape } from './no-accessor-escape.ts'
import { noExportState } from './no-export-state.ts'
import { noGetSignal } from './no-get-signal.ts'
import { noGetterSetterParams } from './no-getter-setter-params.ts'
import { noModuleLevelSignal } from './no-module-level-signal.ts'
import { noNewAbortController } from './no-new-abort-controller.ts'
import { noNewPromise } from './no-new-promise.ts'
import { noSideEffectInRender } from './no-side-effect-in-render.ts'
import { noStoreInParams } from './no-store-in-params.ts'
import { noVoidStatement } from './no-void-statement.ts'
import { requireAccept } from './require-accept.ts'
import { requireClientSignal } from './require-client-signal.ts'
import { signalCheckAwait } from './signal-check-await.ts'
import { signalDollarSuffix } from './signal-dollar-suffix.ts'
import { testFilesInTestsDir } from './test-files-in-tests-dir.ts'

export const ccstatePlugin: ESLint.Plugin = {
  rules: {
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'abort-signal-reason': abortSignalReason,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-dollar-suffix': signalDollarSuffix,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-accessor-escape': noAccessorEscape,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-export-state': noExportState,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'signal-check-await': signalCheckAwait,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-abort-swallower': noAbortSwallower,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-catch-abort': noCatchAbort,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-get-signal': noGetSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-store-in-params': noStoreInParams,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-module-level-signal': noModuleLevelSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'command-async-signal': commandAsyncSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-empty-promise-catch': noEmptyPromiseCatch,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-void-statement': noVoidStatement,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-getter-setter-params': noGetterSetterParams,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-detach-in-signals': noDetachInSignals,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-new-abort-controller': noNewAbortController,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-new-promise': noNewPromise,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'no-side-effect-in-render': noSideEffectInRender,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'require-accept': requireAccept,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'require-client-signal': requireClientSignal,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'layer-boundaries': layerBoundaries,
    // @ts-expect-error RuleModule type mismatch with ESLint flat config
    'test-files-in-tests-dir': testFilesInTestsDir,
  },
  configs: {
    recommended: {
      rules: {
        'ccstate/abort-signal-reason': 'error',
        'ccstate/signal-dollar-suffix': 'error',
        'ccstate/no-export-state': 'error',
        'ccstate/signal-check-await': 'error',
        'ccstate/no-catch-abort': 'error',
        'ccstate/no-abort-swallower': 'error',
        'ccstate/no-accessor-escape': 'error',
        'ccstate/no-get-signal': 'warn',
        'ccstate/no-store-in-params': 'error',
        'ccstate/no-side-effect-in-render': 'error',
        'ccstate/require-accept': 'error',
        'ccstate/require-client-signal': 'error',
        'ccstate/test-files-in-tests-dir': 'error',
      },
    },
  },
}
