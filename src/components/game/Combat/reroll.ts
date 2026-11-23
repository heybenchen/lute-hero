/**
 * The reroll offered on the most recently rolled dice, shared by fights and the
 * Final Showdown. A free reroll (Nimble Fingers) is offered ahead of the paid one
 * (1 Inspiration), the same way in both.
 */
export interface RerollOption {
  kind: 'free' | 'paid'
  onClick: () => void
  disabled: boolean
  /** Full description, for the tooltip and screen readers. */
  title: string
}

export function makeReroll(opts: {
  /** The bard's free reroll (name and handler), when they have one left for this roll. */
  free?: { name: string; onClick: () => void }
  inspiration: number
  /** False while dice are in the air or it isn't this player's call. */
  enabled: boolean
  /** What is being rerolled: "song" in a fight, "performance" in the Showdown. */
  subject: string
  onPaid: () => void
}): RerollOption {
  const { free, inspiration, enabled, subject, onPaid } = opts
  if (free) {
    return { kind: 'free', onClick: free.onClick, disabled: !enabled, title: `${free.name}: reroll this ${subject} for free and keep the higher` }
  }
  return {
    kind: 'paid',
    onClick: onPaid,
    disabled: !enabled || inspiration <= 0,
    title: inspiration > 0 ? `Reroll this ${subject} for 1 Inspiration (${inspiration} left)` : 'Requires Inspiration',
  }
}
