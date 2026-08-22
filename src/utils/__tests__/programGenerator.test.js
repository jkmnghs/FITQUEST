import { describe, it, expect } from 'vitest';
import { reconcileWithCatalog, formatRest } from '../programGenerator';
import { filterCatalogForEquipment, getExerciseGroup } from '../../data/exerciseCatalog';

const bodyweight = filterCatalogForEquipment('bodyweight');
const allowedIds = new Set(bodyweight.map(e => e.id));
const catalogById = Object.fromEntries(bodyweight.map(e => [e.id, e]));

const ex = (id, over = {}) => ({
  id, name: id, sets: 3, reps: 10, restSec: 90, rpe: 8, ...over,
});

/**
 * The generator prompt says "use ONLY these exact IDs" and nothing used to
 * check that it was obeyed. Full-body days ran no split filter at all — and
 * full-body is what bodyweight-only users are always given, so the one group
 * that cannot improvise a substitute got unvalidated equipment.
 */
describe('reconcileWithCatalog', () => {
  it('passes through exercises the user can actually perform', () => {
    const out = reconcileWithCatalog([ex('pushup'), ex('bwsquat')], allowedIds, catalogById);
    expect(out.map(e => e.id)).toEqual(['pushup', 'bwsquat']);
  });

  it('replaces an exercise needing equipment the user does not have', () => {
    const out = reconcileWithCatalog([ex('bench')], allowedIds, catalogById);
    expect(out).toHaveLength(1);
    expect(out[0].id).not.toBe('bench');
    expect(allowedIds.has(out[0].id)).toBe(true);
  });

  it('substitutes within the same muscle group where it can', () => {
    // bench is a push exercise; a bodyweight user should get a push substitute
    const out = reconcileWithCatalog([ex('bench')], allowedIds, catalogById);
    expect(getExerciseGroup(out[0].id)).toBe('push');
  });

  it('still substitutes something for a hallucinated id with no known group', () => {
    const out = reconcileWithCatalog([ex('nordic_hamstring_machine_9000')], allowedIds, catalogById);
    expect(out).toHaveLength(1);
    expect(allowedIds.has(out[0].id)).toBe(true);
  });

  it('carries the original prescription onto the substitute', () => {
    const out = reconcileWithCatalog(
      [ex('bench', { sets: 5, reps: 6, restSec: 180, rpe: 9 })],
      allowedIds, catalogById,
    );
    expect(out[0].sets).toBe(5);
    expect(out[0].reps).toBe(6);
    expect(out[0].restSec).toBe(180);
    expect(out[0].rpe).toBe(9);
  });

  it('gives the substitute its real catalog name, never the rejected id', () => {
    const out = reconcileWithCatalog([ex('bench')], allowedIds, catalogById);
    expect(out[0].name).toBe(catalogById[out[0].id].name);
    expect(out[0].name).not.toBe('bench');
  });

  it('never emits the same exercise twice in one day', () => {
    const out = reconcileWithCatalog(
      [ex('pushup'), ex('pushup'), ex('bwsquat')],
      allowedIds, catalogById,
    );
    expect(out.map(e => e.id)).toEqual(['pushup', 'bwsquat']);
  });

  it('does not reuse an exercise already in the day as a substitute', () => {
    const out = reconcileWithCatalog([ex('pushup'), ex('bench')], allowedIds, catalogById);
    expect(new Set(out.map(e => e.id)).size).toBe(out.length);
  });

  it('returns an empty list rather than inventing exercises from nothing', () => {
    expect(reconcileWithCatalog([], allowedIds, catalogById)).toEqual([]);
    expect(reconcileWithCatalog([ex('bench')], new Set(), {})).toEqual([]);
  });
});

describe('formatRest', () => {
  it('matches the wording used elsewhere in the app', () => {
    expect(formatRest(45)).toBe('45 sec');
    expect(formatRest(90)).toBe('90 sec');
    expect(formatRest(120)).toBe('2 min');
    expect(formatRest(150)).toBe('2.5 min');
  });

  it('shows an em dash rather than a bogus duration', () => {
    expect(formatRest(0)).toBe('—');
    expect(formatRest('nonsense')).toBe('—');
  });
});
