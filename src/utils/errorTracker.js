import { supabase } from './supabase';

/**
 * Lightweight error tracker that logs uncaught errors and unhandled
 * promise rejections to the Supabase activity_log table.
 * Call initErrorTracking() once at app startup.
 */
export function initErrorTracking() {
  window.addEventListener('error', (event) => {
    logError('uncaught_error', event.error?.message || event.message, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    logError('unhandled_rejection', message, reason?.stack);
  });
}

async function logError(action, message, stack) {
  try {
    const detail = [
      message,
      stack ? `Stack: ${stack.slice(0, 500)}` : '',
      `URL: ${window.location.pathname}`,
      `UA: ${navigator.userAgent.slice(0, 100)}`,
    ].filter(Boolean).join(' | ');

    await supabase.from('activity_log').insert({
      username: 'system',
      action,
      detail: detail.slice(0, 1000),
    });
  } catch {
    // Don't let error logging cause more errors
  }
}
