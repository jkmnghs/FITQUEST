import { describe, it, expect } from 'vitest';
import {
  EX_CATALOG,
  EX_CATALOG_MAP,
  lookupExName,
  getExerciseGroup,
  getPickerCategories,
  filterCatalogForEquipment,
  buildPrescription,
} from '../../data/exerciseCatalog';
import { PROGRAMS } from '../../data/programs';
import { EXERCISES } from '../../data/gameData';
import { substitutionExerciseIds } from '../exerciseSubstitutions';

// These invariants are the whole point of consolidating the catalog: anything
// referenced anywhere must resolve to a real entry with a real group, or it
// silently degrades (raw-id PR toasts, exercises dropped by split filtering).

describe('catalog integrity', () => {
  it('has no duplicate ids', () => {
    const ids = EX_CATALOG.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every entry a group, equipment class and category', () => {
    const groups = ['push', 'pull', 'legs', 'core'];
    const equipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'];
    for (const e of EX_CATALOG) {
      expect(groups, `${e.id} group`).toContain(e.group);
      expect(equipment, `${e.id} equipment`).toContain(e.equipment);
      expect(e.category, `${e.id} category`).toBeTruthy();
      expect(e.name, `${e.id} name`).toBeTruthy();
    }
  });

  it('gives every entry a usable default prescription', () => {
    for (const e of EX_CATALOG) {
      expect(e.defaults.sets, `${e.id} sets`).toBeGreaterThan(0);
      expect(e.defaults.restSec, `${e.id} restSec`).toBeGreaterThan(0);
      expect(typeof e.defaults.rest, `${e.id} rest label`).toBe('string');
      expect(Number.isFinite(e.startKg), `${e.id} startKg`).toBe(true);
    }
  });

  it('marks every plank as bodyweight', () => {
    for (const e of EX_CATALOG.filter(x => x.isPlank)) {
      expect(e.isBodyweight, `${e.id}`).toBe(true);
      expect(e.startKg).toBe(0);
    }
  });
});

describe('every referenced exercise id exists in the catalog', () => {
  it('covers gameData.EXERCISES', () => {
    for (const e of EXERCISES) {
      expect(EX_CATALOG_MAP[e.id], `missing: ${e.id}`).toBeDefined();
    }
  });

  it('covers every program exercise', () => {
    for (const program of PROGRAMS) {
      const lists = program.templates
        ? program.templates.map(t => t.exercises || [])
        : [program.exercises || []];
      for (const list of lists) {
        for (const e of list) {
          expect(EX_CATALOG_MAP[e.id], `${program.id} → missing: ${e.id}`).toBeDefined();
        }
      }
    }
  });

  it('covers every substitution target and replacement', () => {
    for (const id of substitutionExerciseIds()) {
      expect(EX_CATALOG_MAP[id], `missing: ${id}`).toBeDefined();
    }
  });

  it('resolves a display name for every catalog id', () => {
    for (const e of EX_CATALOG) expect(lookupExName(e.id)).toBe(e.name);
  });

  it('falls back to a humanised id for unknown exercises', () => {
    expect(lookupExName('some_custom_move')).toBe('Some Custom Move');
  });

  it('assigns a split group to every id the AI can return', () => {
    for (const e of EX_CATALOG) expect(getExerciseGroup(e.id)).toBeTruthy();
  });
});

describe('equipment filtering', () => {
  it('offers a bodyweight-only user nothing that needs equipment', () => {
    const available = filterCatalogForEquipment('bodyweight');
    expect(available.length).toBeGreaterThan(0);
    for (const e of available) expect(e.equipment, e.id).toBe('bodyweight');
    // The specific regression: the picker used to list a 45 kg barbell squat.
    expect(available.find(e => e.id === 'squat')).toBeUndefined();
  });

  it('excludes barbells, cables and machines for dumbbells_only', () => {
    for (const e of filterCatalogForEquipment('dumbbells_only')) {
      expect(['dumbbell', 'bodyweight'], e.id).toContain(e.equipment);
    }
  });

  it('excludes cables and machines for a barbell home gym', () => {
    for (const e of filterCatalogForEquipment('barbell_home')) {
      expect(['barbell', 'dumbbell', 'bodyweight'], e.id).toContain(e.equipment);
    }
  });

  it('gives a full gym everything', () => {
    expect(filterCatalogForEquipment('full_gym').length).toBe(EX_CATALOG.length);
  });

  it('builds picker categories with no empty groups', () => {
    for (const equipment of ['full_gym', 'dumbbells', 'dumbbells_only', 'barbell_home', 'bodyweight']) {
      for (const cat of getPickerCategories(equipment)) {
        expect(cat.exercises.length, `${equipment}/${cat.category}`).toBeGreaterThan(0);
        for (const e of cat.exercises) expect(e.category).toBe(cat.category);
      }
    }
  });
});

describe('buildPrescription', () => {
  it('returns the target exercise’s own prescription, not the previous one', () => {
    const squat = buildPrescription('squat');
    expect(squat.reps).toBeGreaterThan(0);
    expect(squat.startKg).toBe(EX_CATALOG_MAP.squat.startKg);
    expect(squat.isPlank).toBe(false);
  });

  it('does not carry a plank’s set count onto a weighted lift', () => {
    // Plank -> Squat used to keep reps: 0 and the plank's note.
    const swapped = buildPrescription('squat', { preserveSets: undefined });
    expect(swapped.reps).toBe(EX_CATALOG_MAP.squat.defaults.reps);
    expect(swapped.note).toBe(EX_CATALOG_MAP.squat.note);
  });

  it('preserves the user’s set count when asked', () => {
    expect(buildPrescription('bench', { preserveSets: 5 }).sets).toBe(5);
    expect(buildPrescription('bench', { preserveSets: 0 }).sets)
      .toBe(EX_CATALOG_MAP.bench.defaults.sets);
  });

  it('returns safe generic values for an unknown (AI/custom) exercise', () => {
    const p = buildPrescription('not_in_catalog');
    expect(p.sets).toBeGreaterThan(0);
    expect(p.restSec).toBeGreaterThan(0);
    expect(Number.isFinite(p.startKg)).toBe(true);
  });
});
