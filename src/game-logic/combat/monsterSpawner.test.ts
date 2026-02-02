import { describe, it, expect } from 'vitest'
import {
  calculateMonsterSpawnCount,
  createMonsterFromTemplate,
  shouldSpawnExtraMonsters,
} from './monsterSpawner'
import { Genre, MonsterTemplate } from '@/types'

describe('Monster Spawner', () => {
  describe('calculateMonsterSpawnCount', () => {
    it('should return 0 for 0-1 tags', () => {
      expect(calculateMonsterSpawnCount([])).toBe(0)
      expect(calculateMonsterSpawnCount(['Pop'])).toBe(0)
    })

    it('should return 1 for 2-3 tags', () => {
      expect(calculateMonsterSpawnCount(['Pop', 'Rock'])).toBe(1)
      expect(calculateMonsterSpawnCount(['Pop', 'Rock', 'Electronic'])).toBe(1)
    })

    it('should return 2 for 4-5 tags', () => {
      expect(calculateMonsterSpawnCount(['Pop', 'Rock', 'Electronic', 'Classical'])).toBe(2)
      expect(calculateMonsterSpawnCount(['Pop', 'Rock', 'Electronic', 'Classical', 'HipHop'])).toBe(2)
    })

    it('should return 3 for 6-7 tags', () => {
      const tags: Genre[] = ['Pop', 'Rock', 'Electronic', 'Classical', 'HipHop', 'Pop']
      expect(calculateMonsterSpawnCount(tags)).toBe(3)
    })
  })

  describe('createMonsterFromTemplate', () => {
    it('should create a monster with correct properties', () => {
      const template: MonsterTemplate = {
        id: 'test-template',
        name: 'Test Monster',
        baseHP: 30,
        vulnerability: 'Rock',
        resistance: 'Classical',
        description: 'A test monster',
      }

      const monster = createMonsterFromTemplate(template, 5, 0)

      expect(monster.templateId).toBe('test-template')
      expect(monster.name).toBe('Test Monster')
      expect(monster.currentHP).toBe(30)
      expect(monster.maxHP).toBe(30)
      expect(monster.vulnerability).toBe('Rock')
      expect(monster.resistance).toBe('Classical')
      expect(monster.isElite).toBe(false)
      expect(monster.isBoss).toBe(false)
    })

    it('should create unique IDs for each monster', () => {
      const template: MonsterTemplate = {
        id: 'test-template',
        name: 'Test Monster',
        baseHP: 30,
        vulnerability: null,
        resistance: null,
        description: 'A test monster',
      }

      const monster1 = createMonsterFromTemplate(template, 1, 0)
      const monster2 = createMonsterFromTemplate(template, 1, 1)

      expect(monster1.id).not.toBe(monster2.id)
    })

    it('should preserve elite and boss flags', () => {
      const eliteTemplate: MonsterTemplate = {
        id: 'elite-template',
        name: 'Elite Monster',
        baseHP: 50,
        vulnerability: 'Rock',
        resistance: 'Pop',
        description: 'An elite monster',
        isElite: true,
      }

      const bossTemplate: MonsterTemplate = {
        id: 'boss-template',
        name: 'Boss Monster',
        baseHP: 150,
        vulnerability: null,
        resistance: null,
        description: 'A boss monster',
        isBoss: true,
      }

      const elite = createMonsterFromTemplate(eliteTemplate, 1, 0)
      const boss = createMonsterFromTemplate(bossTemplate, 1, 0)

      expect(elite.isElite).toBe(true)
      expect(boss.isBoss).toBe(true)
    })
  })

  describe('shouldSpawnExtraMonsters', () => {
    it('should return false for less than 4 tags', () => {
      expect(shouldSpawnExtraMonsters([])).toBe(false)
      expect(shouldSpawnExtraMonsters(['Pop'])).toBe(false)
      expect(shouldSpawnExtraMonsters(['Pop', 'Rock'])).toBe(false)
      expect(shouldSpawnExtraMonsters(['Pop', 'Rock', 'Electronic'])).toBe(false)
    })

    it('should return true for 4 or more tags', () => {
      expect(shouldSpawnExtraMonsters(['Pop', 'Rock', 'Electronic', 'Classical'])).toBe(true)
      expect(shouldSpawnExtraMonsters(['Pop', 'Rock', 'Electronic', 'Classical', 'HipHop'])).toBe(true)
    })
  })
})
