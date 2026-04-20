# Firestore Security Specification

## 1. Data Invariants
- Users can only read and write their own backup data in `/backups/{userId}`.
- Chunks for a backup must belong to the user's own backup path.
- The `geminiApiKey` and `inspectorName` are sensitive and should be protected.
- Legacy data in `/users_data` is only readable if identifying as that inspector (though this is less secure, we will focus on the modern UID-based path).

## 2. The "Dirty Dozen" Payloads

1. **Identity Theft (Write)**: Attempt to write to `/backups/other_user_uid` from a different account.
   - Result: `PERMISSION_DENIED`
2. **Identity Theft (Read)**: Attempt to read `/backups/other_user_uid` from a different account.
   - Result: `PERMISSION_DENIED`
3. **Ghost Field Injection**: Attempt to create a backup with an undocumented field `isAdmin: true`.
   - Result: `PERMISSION_DENIED` (Strict schema)
4. **ID Poisoning**: Attempt to create a chunk with an extremely long ID (10KB).
   - Result: `PERMISSION_DENIED` (ID size limit)
5. **Type Mismatch**: Attempt to set `totalChunks` to a string `"lots"`.
   - Result: `PERMISSION_DENIED`
6. **Negative Count**: Attempt to set `totalChunks` to `-1`.
   - Result: `PERMISSION_DENIED`
7. **Giant Chunk**: Attempt to write a chunk with `data` exceeding 1MB (though Firestore already limits to 1MB, we'll enforce a smaller logical bound).
   - Result: `PERMISSION_DENIED`
8. **Invalid Format**: Attempt to set `updatedAt` to an invalid date string.
   - Result: `PERMISSION_DENIED`
9. **Missing Required Field**: Attempt to create a chunk without the `data` field.
   - Result: `PERMISSION_DENIED`
10. **Spoofed User ID**: Attempt to set a `userId` field inside the document that doesn't match the path (not applicable here as the path is the UID).
11. **Legacy Scrape**: Attempt to list all documents in `/users_data`.
    - Result: `PERMISSION_DENIED`
12. **Unauthenticated Write**: Attempt to write to `/backups/my_uid` without being logged in.
    - Result: `PERMISSION_DENIED`

## 3. Test Runner (Draft)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'mon-inspecteur-smart',
  });
});

test('should deny unauthenticated write to backups', async () => {
  const context = testEnv.unauthenticatedContext();
  const doc = context.firestore().doc('backups/user1');
  await assertFails(doc.set({ totalChunks: 1 }));
});

test('should deny writing to another users backup', async () => {
  const context = testEnv.authenticatedContext('user1');
  const doc = context.firestore().doc('backups/user2');
  await assertFails(doc.set({ totalChunks: 1 }));
});
```
