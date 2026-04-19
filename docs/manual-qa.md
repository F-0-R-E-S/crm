# Manual QA Checklist — GambChamp MVP v0.1

Run through this before claiming v0.1 done. Requires fresh db (`pnpm db:reset`).

## Setup
- [ ] `pnpm db:up`
- [ ] `pnpm db:reset` (prints admin creds + API key — save both)
- [ ] `pnpm dev` (http://localhost:3000)
- [ ] `pnpm worker` in a second terminal
- [ ] Start a local tracker mock: `node -e "require('http').createServer((r,s)=>{console.log(r.url);s.end('ok')}).listen(4001)"`
- [ ] Start a local broker mock: `node -e "require('http').createServer((r,s)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{console.log(b);s.setHeader('content-type','application/json');s.end(JSON.stringify({id:'mock-'+Date.now(),status:'accepted'}))}).listen(4000)"`

## Auth
- [ ] Visit `/` unauthenticated → redirected to `/login`
- [ ] Login with `admin@gambchamp.local` / `changeme` → land on `/dashboard`
- [ ] Sign out button → back to `/login`
- [ ] Create an OPERATOR user via `/dashboard/settings/users`; sign in as them; `/dashboard/settings/users` and `/dashboard/settings/blacklist` should 403

## Intake
- [ ] `curl -X POST http://localhost:3000/api/v1/leads -H "authorization: Bearer <seed api key>" -H "content-type: application/json" -d '{"geo":"XX","ip":"1.1.1.1","email":"manual@test.com","phone":"0671234567","event_ts":"2026-04-19T12:00:00Z"}'` → 202
- [ ] Duplicate the same curl → 202 `status=rejected, reject_reason=duplicate`
- [ ] `/dashboard/leads` shows both rows, most recent first
- [ ] Click into first lead → timeline shows `RECEIVED`, `ROUTING_DECIDED`, `BROKER_PUSH_SUCCESS` (assuming broker mock ran)

## Routing
- [ ] Create a second broker; add rotation rule for `XX` with priority 2
- [ ] Disable first broker (`isActive=false`); send lead → second broker receives

## Postbacks
- [ ] With the broker mock recording lead id, generate an HMAC and POST to `/api/v1/postbacks/<brokerId>` → verify lead state flips to `ACCEPTED` / `FTD`
- [ ] Send with wrong signature → 401

## Outbound postbacks
- [ ] On the affiliate, set postback URL to `http://localhost:4001/?click={sub_id}&s={status}` and check events `lead_pushed`, `ftd`
- [ ] Trigger a lead → tracker mock logs two entries (lead_pushed + ftd)

## Manual actions
- [ ] `/dashboard/leads/[id]` → "Re-push" a `FAILED` lead → state goes back to `NEW` then `PUSHED`
- [ ] "Mark FTD" on an `ACCEPTED` lead → state=FTD, `ftdAt` set, `MANUAL_OVERRIDE` + `STATE_TRANSITION` events added
- [ ] "Resend outbound" on a delivered postback → new row in outbound history

## Blacklist
- [ ] Add IP `1.1.1.1` to `IP_EXACT`; send lead with that IP → reject_reason=ip_blocked

## Audit
- [ ] `/dashboard/settings/audit` shows all admin mutations from above (affiliate create, broker create, rotation create, blacklist add, etc.)

## Health
- [ ] `curl localhost:3000/api/v1/health` → all ok
- [ ] Stop Redis; hit health → status=degraded, redis=down

## Observability
- [ ] Every `console` log in `pnpm dev` includes `trace_id` for intake/postback requests
