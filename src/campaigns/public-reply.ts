export function publicReplyForComment(
  commentId: string,
  variants: string[],
): string | null {
  const replies = variants.map((variant) => variant.trim()).filter(Boolean)
  if (replies.length === 0) return null

  let hash = 2166136261
  for (let index = 0; index < commentId.length; index += 1) {
    hash = Math.imul(hash ^ commentId.charCodeAt(index), 16777619)
  }
  return replies[(hash >>> 0) % replies.length] ?? null
}
