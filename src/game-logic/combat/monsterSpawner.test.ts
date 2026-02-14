import { describe, it, expect } from 'vitest'
import {
  countTagsByGenre,
  createMonsterFromTemplate,
  getHPMultiplier,
  spawnMonstersFromTags,
} from './monsterSpawner'
import { Genre, MonsterTemplate } from '@/types'

describe('Monster Spawner', () => {
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

    it('should preserve boss flag', () => {
      const bossTemplate: MonsterTemplate = {
        id: 'boss-template',
        name: 'Boss Monster',
        baseHP: 150,
        vulnerability: null,
        resistance: null,
        description: 'A boss monster',
        isBoss: true,
      }

      const boss = createMonsterFromTemplate(bossTemplate, 1, 0)

      expect(boss.isBoss).toBe(true)
    })

    it('should scale HP by level using 0.75 curve', () => {
      const template: MonsterTemplate = {
        id: 'test-template',
        name: 'Test Monster',
        baseHP: 20,
        vulnerability: null,
        resistance: null,
        description: 'A test monster',
      }

      const lv1 = createMonsterFromTemplate(template, 1, 0, 1)
      const lv2 = createMonsterFromTemplate(template, 1, 0, 2)
      const lv3 = createMonsterFromTemplate(template, 1, 0, 3)
      const lv4 = createMonsterFromTemplate(template, 1, 0, 4)

      expect(lv1.maxHP).toBe(20)  // 20 * 1.0
      expect(lv2.maxHP).toBe(35)  // 20 * 1.75
      expect(lv3.maxHP).toBe(50)  // 20 * 2.5
      expect(lv4.maxHP).toBe(65)  // 20 * 3.25
    })

    it('should prefix name based on level', () => {
      const template: MonsterTemplate = {
        id: 'test',
        name: 'Goblin',
        baseHP: 10,
        vulnerability: null,
        resistance: null,
        description: 'test',
      }

      expect(createMonsterFromTemplate(template, 1, 0, 1).name).toBe('Goblin')
      expect(createMonsterFromTemplate(template, 1, 0, 2).name).toBe('Strong Goblin')
      expect(createMonsterFromTemplate(template, 1, 0, 3).name).toBe('Veteran Goblin')
      expect(createMonsterFromTemplate(template, 1, 0, 4).name).toBe('Legendary Goblin')
    })
  })

  describe('getHPMultiplier', () => {
    it('should use 0.75 curve', () => {
      expect(getHPMultiplier(1)).toBe(1)
      expect(getHPMultiplier(2)).toBe(1.75)
      expect(getHPMultiplier(3)).toBe(2.5)
      expect(getHPMultiplier(4)).toBe(3.25)
    })
  })

  describe('spawnMonstersFromTags', () => {
    it('should return empty array for no tags', () => {
      expect(spawnMonstersFromTags([], 1)).toEqual([])
    })

    it('should spawn one monster per unique genre', () => {
      const tags: Genre[] = ['Pop', 'Rock']
      const monsters = spawnMonstersFromTags(tags, 1)

      expect(monsters).toHaveLength(2)
      expect(monsters[0].level).toBe(1)
      expect(monsters[1].level).toBe(1)
    })

    it('should increase level for duplicate genre tags', () => {
      const tags: Genre[] = ['Pop', 'Pop', 'Rock']
      const monsters = spawnMonstersFromTags(tags, 1)

      expect(monsters).toHaveLength(2)
      // Pop has 2 tags -> level 2
      const popMonster = monsters.find(m => m.level === 2)
      const rockMonster = monsters.find(m => m.level === 1)
      expect(popMonster).toBeDefined()
      expect(rockMonster).toBeDefined()
    })

    it('should spawn single high-level monster for one genre with many tags', () => {
      const tags: Genre[] = ['Electronic', 'Electronic', 'Electronic']
      const monsters = spawnMonstersFromTags(tags, 1)

      expect(monsters).toHaveLength(1)
      expect(monsters[0].level).toBe(3)
    })
  })

  describe('countTagsByGenre', () => {
    it('should count each genre occurrence', () => {
      const tags: Genre[] = ['Pop', 'Pop', 'Rock', 'Electronic', 'Rock']
      const counts = countTagsByGenre(tags)

      expect(counts.get('Pop')).toBe(2)
      expect(counts.get('Rock')).toBe(2)
      expect(counts.get('Electronic')).toBe(1)
      expect(counts.has('Classical')).toBe(false)
    })
  })
})
