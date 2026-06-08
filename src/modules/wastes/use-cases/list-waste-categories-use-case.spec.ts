import { describe, expect, it, beforeEach } from 'vitest'
import { InMemoryWasteCategoriesRepository } from '@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js'
import { ListWasteCategoriesUseCase } from './list-waste-categories-use-case.js'
import type { WasteCategory } from '@/modules/wastes/dtos/wastes-dto.js'

function makeCategory(overrides: Partial<WasteCategory> = {}): WasteCategory {
	return {
		id: '11111111-1111-1111-1111-111111111111',
		name: 'Papel / Papelão',
		description: 'Materiais celulósicos',
		observations: 'Aceito quando limpo e seco',
		hazard_levels: ['LOW'],
		created_at: new Date('2024-01-01'),
		updated_at: new Date('2024-01-01'),
		subcategories: [],
		...overrides,
	}
}

describe('list-waste-categories-use-case', () => {
	let repository: InMemoryWasteCategoriesRepository
	let sut: ListWasteCategoriesUseCase

	beforeEach(() => {
		repository = new InMemoryWasteCategoriesRepository()
		sut = new ListWasteCategoriesUseCase(repository)
	})

	it('returns empty array when no categories exist', async () => {
		const result = await sut.execute()

		expect(result).toStrictEqual([])
	})

	it('returns all categories ordered by name', async () => {
		repository.items = [
			makeCategory({ id: '22222222-2222-2222-2222-222222222222', name: 'Vidro' }),
			makeCategory({ id: '11111111-1111-1111-1111-111111111111', name: 'Papel / Papelão' }),
			makeCategory({ id: '33333333-3333-3333-3333-333333333333', name: 'Metal / Alumínio' }),
		]

		const result = await sut.execute()

		expect(result).toHaveLength(3)
		expect(result[0].name).toBe('Metal / Alumínio')
		expect(result[1].name).toBe('Papel / Papelão')
		expect(result[2].name).toBe('Vidro')
	})

	it('returns category with subcategories', async () => {
		repository.items = [
			makeCategory({
				subcategories: [
					{
						id: 'aaaa0000-0000-0000-0000-000000000000',
						name: 'Caixas de papelão',
						description: null,
						observations: null,
						hazard_level: 'LOW',
						type: 'INCLUDE',
						created_at: new Date('2024-01-01'),
						category_id: '11111111-1111-1111-1111-111111111111',
					},
				],
			}),
		]

		const result = await sut.execute()

		expect(result[0].subcategories).toHaveLength(1)
		expect(result[0].subcategories[0].name).toBe('Caixas de papelão')
		expect(result[0].subcategories[0].type).toBe('INCLUDE')
	})
})
