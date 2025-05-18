import * as migration_20241127_140952_migration from './20241127_140952_migration';

export const migrations = [
  {
    up: migration_20241127_140952_migration.up,
    down: migration_20241127_140952_migration.down,
    name: '20241127_140952_migration'
  },
];
