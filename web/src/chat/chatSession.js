export const MAX_CHAT_MESSAGES = 20

// Both the composer and request guard must reserve a user/reply pair.
export function canStartChatExchange(messageCount) {
  return messageCount + 2 <= MAX_CHAT_MESSAGES
}

export function canAppendTasteSummary(messageCount) {
  return messageCount + 1 <= MAX_CHAT_MESSAGES
}

export function createChatExchangeGuard() {
  let busy = false
  return {
    isBusy: () => busy,
    tryStart(messageCount) {
      if (busy || !canStartChatExchange(messageCount)) return false
      busy = true
      return true
    },
    finish() {
      busy = false
    },
  }
}
