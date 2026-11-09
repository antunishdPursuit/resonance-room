export const MAX_CHAT_MESSAGES = 20

// Both the composer and request guard must reserve a user/reply pair.
export function canStartChatExchange(messageCount) {
  return messageCount + 2 <= MAX_CHAT_MESSAGES
}
