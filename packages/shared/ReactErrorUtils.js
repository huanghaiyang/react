/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import invariant from 'shared/invariant';
import invokeGuardedCallbackImpl from './invokeGuardedCallbackImpl';

// Used by Fiber to simulate a try-catch.
let hasError: boolean = false;
let caughtError: mixed = null;

// Used by event system to capture/rethrow the first error.
let hasRethrowError: boolean = false;
let rethrowError: mixed = null;

const reporter = {
  onError(error: mixed) {
    hasError = true;
    caughtError = error;
  },
};

/**
 * Call a function while guarding against errors that happens within it.
 * Returns an error if it throws, otherwise null.
 *
 * In production, this is implemented using a try-catch. The reason we don't
 * use a try-catch directly is so that we can swap out a different
 * implementation in DEV mode.
 * 
 * 调用一个函数，同时捕获函数抛出的错误，如果有错误发生则将错误作为返回值返回，否则返回值为null
 * 
 * 在生产环境下，这部分逻辑使用了try-catch实现，在dev环境，由于我们不能直接使用try-catch，因此需要采取其他的方式
 *
 * @param {String} name of the guard to use for logging or debugging
 * @param {Function} func The function to invoke
 * @param {*} context The context to use when calling the function
 * @param {...*} args Arguments for function
 */
export function invokeGuardedCallback<A, B, C, D, E, F, Context>(
  name: string | null,
  func: (a: A, b: B, c: C, d: D, e: E, f: F) => mixed,
  context: Context,
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
): void {
  /**
   * 默认没有错误发生
   */
  hasError = false;
  /**
   * 捕获的错误
   */
  caughtError = null;
  /**
   * 代理执行函数
   */
  invokeGuardedCallbackImpl.apply(reporter, arguments);
}

/**
 * Same as invokeGuardedCallback, but instead of returning an error, it stores
 * it in a global so it can be rethrown by `rethrowCaughtError` later.
 * TODO: See if caughtError and rethrowError can be unified.
 *
 * @param {String} name of the guard to use for logging or debugging
 * @param {Function} func The function to invoke
 * @param {*} context The context to use when calling the function
 * @param {...*} args Arguments for function
 */
export function invokeGuardedCallbackAndCatchFirstError<
  A,
  B,
  C,
  D,
  E,
  F,
  Context,
>(
  name: string | null,
  func: (a: A, b: B, c: C, d: D, e: E, f: F) => void,
  context: Context,
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
): void {
  invokeGuardedCallback.apply(this, arguments);
  if (hasError) {
    const error = clearCaughtError();
    if (!hasRethrowError) {
      hasRethrowError = true;
      rethrowError = error;
    }
  }
}

/**
 * During execution of guarded functions we will capture the first error which
 * we will rethrow to be handled by the top level error handler.
 */
export function rethrowCaughtError() {
  if (hasRethrowError) {
    const error = rethrowError;
    hasRethrowError = false;
    rethrowError = null;
    throw error;
  }
}

export function hasCaughtError() {
  return hasError;
}

/**
 * 清除捕获的effect执行过程中抛出的错误
 */
export function clearCaughtError() {
  if (hasError) {
    const error = caughtError;
    hasError = false;
    caughtError = null;
    return error;
  } else {
    /**
     * 如果没有错误发生则提示一下（不得不说这代码写的很健壮，考虑的很全面，指的学习）
     */
    invariant(
      false,
      'clearCaughtError was called but no error was captured. This error ' +
        'is likely caused by a bug in React. Please file an issue.',
    );
  }
}
