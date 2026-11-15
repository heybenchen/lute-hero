import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { mulberry32 } from '@/engine/rng'
import { defaultLabels, getDieShape, labelsShowing } from './dieShapes'
import { simulateThrow, topOf } from './simulate'
import type { DiceType } from '@/types'

const TYPES: [DiceType, number, number][] = [
  // type, logical faces, vertices
  ['d4', 4, 4],
  ['d8', 8, 6],
  ['d12', 12, 20],
  ['d20', 20, 12],
]

const arena = { minX: -6, maxX: 6, minZ: -3.5, maxZ: 3.5 }

describe('die shapes', () => {
  it.each(TYPES)('%s has the right faces and a full set of labels', (type, faces, vertices) => {
    const shape = getDieShape(type)
    expect(shape.faces).toHaveLength(faces)
    expect(shape.vertices).toHaveLength(vertices)
    const labels = defaultLabels(shape)
    expect([...labels].sort((a, b) => a - b)).toEqual(Array.from({ length: shape.sides }, (_, i) => i + 1))
    if (!shape.readsVertex) {
      labels.forEach((label, i) => expect(label + labels[shape.opposite[i]]).toBe(shape.sides + 1))
    }
  })

  it.each(TYPES)('%s can relabel any landing to show any value', (type) => {
    const shape = getDieShape(type)
    const count = shape.readsVertex ? shape.vertices.length : shape.faces.length
    for (let landed = 0; landed < count; landed++) {
      for (let value = 1; value <= shape.sides; value++) {
        const labels = labelsShowing(shape, landed, value)
        expect(labels[landed]).toBe(value)
        expect(new Set(labels).size).toBe(shape.sides)
      }
    }
  })
})

describe('simulateThrow', () => {
  it.each(TYPES)('%s tumbles and comes to rest flat inside the tray', (type) => {
    const shape = getDieShape(type)
    const rng = mulberry32(42)
    for (let i = 0; i < 4; i++) {
      const result = simulateThrow([shape, shape], [], arena, rng)
      expect(result).not.toBeNull()
      const { tracks, frameCount, landed } = result!
      expect(frameCount).toBeGreaterThan(30)
      tracks.forEach((track, d) => {
        const o = (frameCount - 1) * 7
        const q = new THREE.Quaternion(track[o + 3], track[o + 4], track[o + 5], track[o + 6])
        expect(topOf(shape, q).index).toBe(landed[d])
        expect(track[o + 1]).toBeLessThan(1.5)
      })
    }
  })
})
