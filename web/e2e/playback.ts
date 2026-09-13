/**
 * How long an assertion waits on an answer the replay build is still playing.
 *
 * A recorded pick plays the recording's steps at a fifth of its `duration_ms`
 * before the answer renders, which runs to about 17 seconds on the longest
 * recording. The suite keeps Playwright's 5-second expect default, so only an
 * assertion waiting on that playback passes this, which marks the slow waits
 * where they are written. A click already waits up to the test timeout.
 */
export const PLAYBACK_TIMEOUT = 20_000
