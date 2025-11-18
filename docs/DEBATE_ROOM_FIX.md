# Debate Room Fix: Call Creation Issue

## Problem
The debate room was not being created when users tried to join. The Stream video call wasn't being properly initialized.

## Root Causes

1. **Next.js 15 Async Params**: The `params` object needs to be awaited in API routes
2. **Missing Call Creation**: The `useGetCallByID` hook was only querying for existing calls, not creating new ones
3. **CallId Not Propagated**: The `callId` wasn't being passed from the backend to the frontend properly

## Fixes Applied

### 1. API Routes - Await Params

**Files Modified:**
- `src/app/api/debates/[pairingId]/reserve-role/route.ts`
- `src/app/api/debates/[pairingId]/participants/route.ts`

**Change:**
```typescript
// Before
{ params }: { params: { pairingId: string } }
const { pairingId } = params;

// After
{ params }: { params: Promise<{ pairingId: string }> }
const { pairingId } = await params;
```

This fixes the Next.js 15 warning and ensures params are properly resolved.

### 2. Stream Call Creation

**File Modified:** `src/hooks/useGetCallByID.ts`

**Change:**
```typescript
// Before - only queried for existing calls
const { calls } = await client.queryCalls({
  filter_conditions: { id },
});
if (calls.length > 0) setCall(calls[0]);

// After - creates call if it doesn't exist
const { calls } = await client.queryCalls({
  filter_conditions: { id },
});

if (calls.length > 0) {
  setCall(calls[0]);
} else {
  // Call doesn't exist, create it
  const newCall = client.call('default', id as string);
  await newCall.getOrCreate();
  if (mounted) {
    setCall(newCall);
  }
}
```

Now the hook will create the Stream call if it doesn't already exist.

### 3. CallId Propagation

**File Modified:** `src/app/api/debates/[pairingId]/participants/route.ts`

**Change:**
```typescript
// Added callId to the response
return NextResponse.json({
  callId: pairing.callId,  // ← Added this
  propTeam: { ... },
  oppTeam: { ... },
  judges: [ ... ],
});
```

**File Modified:** `src/app/(main)/debate/[id]/page.tsx`

**Changes:**
1. Added `callId` state
2. Use `callId` instead of pairing `id` for the call
3. Extract `callId` from participants API response

```typescript
const [callId, setCallId] = useState<string | undefined>(undefined);
const { call, isCallLoading } = useGetCallByID(callId);

// In fetchDebateInfo:
if (data.callId) {
  setCallId(data.callId);
}
```

## Testing

After these fixes:

1. ✅ Navigate to "Your Next Round"
2. ✅ Click "Enter Debate Room"
3. ✅ Select a role
4. ✅ Room is created automatically
5. ✅ User joins the video call successfully
6. ✅ No warnings in console about async params

## How It Works Now

### Flow:
1. User reserves a role → `callId` is generated/retrieved
2. User navigates to debate room page
3. Page fetches participants (includes `callId`)
4. `useGetCallByID` hook is called with `callId`
5. Hook queries Stream for existing call
6. If call doesn't exist, hook creates it using `getOrCreate()`
7. User can now join the call

### CallId Format:
```
debate_[pairingId]_[timestamp]
```

Example: `debate_rpair_abc123_1700000000000`

## Related Files

- `src/hooks/useGetCallByID.ts` - Stream call creation logic
- `src/app/(main)/debate/[id]/page.tsx` - Debate room page
- `src/app/api/debates/[pairingId]/reserve-role/route.ts` - Role reservation
- `src/app/api/debates/[pairingId]/participants/route.ts` - Participant info

## Next Steps

Test the complete flow:
1. Multiple users joining the same debate
2. Reconnection after refresh
3. Judge joining without role selection
4. 4th debater being blocked

All functionality should now work correctly! 🎉
