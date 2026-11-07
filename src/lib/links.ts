/** Where a post or reflection opens: Global Posts for global content, Home for everything else.
 *  The opened item is shown first in that feed (with its comments), followed by the rest of the feed. */
export const feedHref = (kind: 'p' | 'r', id: string, isGlobal: boolean) => `/${isGlobal ? 'global' : 'home'}?focus=${kind}:${id}`
