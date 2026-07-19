# TODO - Admin Settings Restore (Destructive)

- [ ] Add backend controller methods
  - [ ] listBackups()
  - [ ] restoreBackup(backupId)
- [ ] Add DB restore safety checks
  - [ ] in-memory restore lock
  - [ ] typed confirmation is enforced in frontend (RESTORE)
  - [ ] validate backup file exists in backend/backups
  - [ ] validate backup JSON has { tables: { orders, users, menu_items, inventory, shifts } }
  - [ ] restore runs in single DB transaction and overwrites only the 5 tables
- [ ] Ensure routes compile
  - [ ] backend/src/routes/admin.routes.js imports new controller methods
- [ ] Ensure frontend compiles
  - [ ] Settings modal uses listBackups/restores and shows confirmation + success message
- [ ] Smoke test
  - [ ] Restore against a non-critical backup JSON only

