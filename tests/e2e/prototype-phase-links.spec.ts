import { expect, test } from '@playwright/test'
import {
  EMPTY_PROTOTYPE_COURT_STATE,
  describeSharedIncomingPhases,
  getPrototypeBasePositions,
  getPrototypePositions,
  getPrototypePrimaryArrows,
  getPrototypeSecondaryArrows,
  hasFirstAttackTargetsForRotation,
  resetPrototypePhase,
  updatePrototypeArrowTarget,
  updatePrototypePosition,
  updatePrototypeSecondaryArrowTarget,
  type PrototypeCourtStateResolver,
} from '../../lib/rebuild/prototypeCourtStateModel'
import {
  PROTOTYPE_PHASE_LINKS,
  getAdvanceTargetPhase,
  getPrototypeIncomingPhases,
  getPrototypeOutgoingPhases,
  isIndependentStartPhase,
  isSharedArrivalPhase,
} from '../../lib/rebuild/prototypeFlow'
import { getWhiteboardPositions } from '../../lib/whiteboard'

const resolver: PrototypeCourtStateResolver = {
  getFallbackPositions(rotation, phase) {
    return getWhiteboardPositions({
      rotation,
      phase: phase === 'SERVE' ? 'PRE_SERVE' : phase === 'RECEIVE' ? 'SERVE_RECEIVE' : phase === 'OFFENSE' ? 'ATTACK_PHASE' : 'DEFENSE_PHASE',
      isReceiving: phase === 'RECEIVE',
    }).home
  },
}

test.describe('Prototype phase links', () => {
  test('defines independent starts, shared arrivals, and correct outgoing links', () => {
    expect(PROTOTYPE_PHASE_LINKS.SERVE.ownership).toBe('independent-start')
    expect(PROTOTYPE_PHASE_LINKS.RECEIVE.ownership).toBe('independent-start')
    expect(isIndependentStartPhase('SERVE')).toBe(true)
    expect(isIndependentStartPhase('RECEIVE')).toBe(true)
    expect(isSharedArrivalPhase('FIRST_ATTACK')).toBe(true)
    expect(isSharedArrivalPhase('OFFENSE')).toBe(true)
    expect(isSharedArrivalPhase('DEFENSE')).toBe(true)
    expect(getPrototypeIncomingPhases('OFFENSE')).toEqual(['RECEIVE', 'DEFENSE'])
    expect(getPrototypeIncomingPhases('DEFENSE')).toEqual(['SERVE', 'FIRST_ATTACK', 'OFFENSE'])
    expect(getPrototypeOutgoingPhases('RECEIVE')).toEqual(['FIRST_ATTACK', 'OFFENSE'])
    expect(describeSharedIncomingPhases('DEFENSE')).toEqual(['SERVE', 'FIRST_ATTACK', 'OFFENSE'])
    expect(getAdvanceTargetPhase('RECEIVE', { hasFirstAttack: false })).toBe('OFFENSE')
    expect(getAdvanceTargetPhase('RECEIVE', { hasFirstAttack: true })).toBe('FIRST_ATTACK')
  })

  test('shared defense arrival syncs every incoming arrow', () => {
    let state = EMPTY_PROTOTYPE_COURT_STATE
    const defenseTarget = { x: 0.31, y: 0.57 }

    state = updatePrototypePosition(state, resolver, 1, 'DEFENSE', 'S', defenseTarget)

    expect(getPrototypePositions(state, resolver, 1, 'DEFENSE').S).toEqual(defenseTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'SERVE').S).toEqual(defenseTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'FIRST_ATTACK').S).toEqual(defenseTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'OFFENSE').S).toEqual(defenseTarget)
  })

  test('shared offense arrival syncs receive fallback and defense loop arrows', () => {
    let state = EMPTY_PROTOTYPE_COURT_STATE
    const offenseTarget = { x: 0.72, y: 0.61 }

    state = updatePrototypePosition(state, resolver, 1, 'OFFENSE', 'OH1', offenseTarget)

    expect(getPrototypePositions(state, resolver, 1, 'OFFENSE').OH1).toEqual(offenseTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'RECEIVE').OH1).toEqual(offenseTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'DEFENSE').OH1).toEqual(offenseTarget)
  })

  test('receive primary and secondary arrows update first attack and regular attack arrivals', () => {
    let state = EMPTY_PROTOTYPE_COURT_STATE
    const firstAttackTarget = { x: 0.22, y: 0.78 }
    const settledAttackTarget = { x: 0.69, y: 0.58 }
    const revisedFirstAttackTarget = { x: 0.14, y: 0.74 }

    state = updatePrototypeArrowTarget(state, resolver, 1, 'RECEIVE', 'OH1', firstAttackTarget)
    state = updatePrototypeSecondaryArrowTarget(state, resolver, 1, 'OH1', settledAttackTarget)

    expect(hasFirstAttackTargetsForRotation(state, 1)).toBe(true)
    expect(getPrototypePositions(state, resolver, 1, 'FIRST_ATTACK').OH1).toEqual(firstAttackTarget)
    expect(getPrototypePositions(state, resolver, 1, 'OFFENSE').OH1).toEqual(settledAttackTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'RECEIVE').OH1).toEqual(firstAttackTarget)
    expect(getPrototypeSecondaryArrows(state, resolver, 1, 'RECEIVE').OH1).toEqual(settledAttackTarget)

    state = updatePrototypeArrowTarget(state, resolver, 1, 'RECEIVE', 'OH1', revisedFirstAttackTarget)

    expect(getPrototypePositions(state, resolver, 1, 'FIRST_ATTACK').OH1).toEqual(revisedFirstAttackTarget)
    expect(getPrototypePositions(state, resolver, 1, 'OFFENSE').OH1).toEqual(settledAttackTarget)
    expect(getPrototypePrimaryArrows(state, resolver, 1, 'RECEIVE').OH1).toEqual(revisedFirstAttackTarget)

    state = updatePrototypeSecondaryArrowTarget(state, resolver, 1, 'OH1', null)

    expect(hasFirstAttackTargetsForRotation(state, 1)).toBe(false)
    expect(getPrototypeSecondaryArrows(state, resolver, 1, 'RECEIVE')).toEqual({})
    expect(getAdvanceTargetPhase('RECEIVE', { hasFirstAttack: hasFirstAttackTargetsForRotation(state, 1) })).toBe('OFFENSE')
    expect(getPrototypePositions(state, resolver, 1, 'OFFENSE').OH1).toEqual(revisedFirstAttackTarget)
  })

  test('resetting receive clears first-attack branch state without leaving stale hidden arrivals', () => {
    let state = EMPTY_PROTOTYPE_COURT_STATE

    state = updatePrototypeArrowTarget(state, resolver, 1, 'RECEIVE', 'OH1', { x: 0.22, y: 0.78 })
    state = updatePrototypeSecondaryArrowTarget(state, resolver, 1, 'OH1', { x: 0.69, y: 0.58 })
    state = resetPrototypePhase(state, 1, 'RECEIVE')

    expect(hasFirstAttackTargetsForRotation(state, 1)).toBe(false)
    expect(getPrototypeSecondaryArrows(state, resolver, 1, 'RECEIVE')).toEqual({})
    expect(getPrototypePositions(state, resolver, 1, 'FIRST_ATTACK').OH1).toEqual(
      getPrototypeBasePositions(resolver, 1, 'FIRST_ATTACK').OH1
    )
  })
})

test.describe('Prototype lab browser flow', () => {
  test('receive advances straight to attack without a special branch and shows 1st Attack only when needed', async ({ page }) => {
    const attackPhaseButton = page.locator('[data-phase-button="OFFENSE"]')

    await page.goto('/rebuild/prototypes')

    await page.getByRole('radio', { name: 'R2' }).click()
    await page.getByRole('button', { name: 'Receive', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Advance play to Attack' })).toBeVisible()
    await page.getByRole('button', { name: 'Advance play to Attack' }).click()
    await expect(page.getByRole('button', { name: 'Advance play to Defense' })).toBeVisible()
    await expect(attackPhaseButton).toContainText('Attack')

    await page.getByRole('radio', { name: 'R1' }).click()
    await page.getByRole('button', { name: 'Receive', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Advance play to 1st Attack' })).toBeVisible()
    await page.getByRole('button', { name: 'Advance play to 1st Attack' }).click()
    await expect(page.getByRole('button', { name: 'Advance play to Defense' })).toBeVisible()
    await expect(attackPhaseButton).toContainText('1st Attack')

    await page.getByRole('button', { name: 'Advance play to Defense' }).click()
    await expect(page.getByRole('button', { name: 'Advance play to Attack' })).toBeVisible()

    await page.getByRole('button', { name: 'Advance play to Attack' }).click()
    await expect(page.getByRole('button', { name: 'Advance play to Defense' })).toBeVisible()
    await expect(attackPhaseButton).toContainText('Attack')
  })
})
