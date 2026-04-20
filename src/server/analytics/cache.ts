import { hashParams } from "@/server/analytics/params";
import { redis } from "@/server/redis";

const TTL_SECONDS = 60;

/**
 * Memoize the result of `compute()` under a stable Redis key derived from
 * `proc` + hashed params. TTL is 60 seconds (short, so freshness is
 * acceptable but repeated tile/filter toggles on the UI don't hammer Postgres).
 * On Redis errors or corrupt cache values the compute path is taken — we never
 * want cache to block an analytics read.
 */
export async function memoizeCached<T>(
	proc: string,
	params: unknown,
	compute: () => Promise<T>,
): Promise<T> {
	const key = `analytics:v1:${proc}:${hashParams(params)}`;
	try {
		const hit = await redis.get(key);
		if (hit) {
			try {
				return JSON.parse(hit) as T;
			} catch {
				// fall through on corrupt cache
			}
		}
	} catch {
		// redis unavailable — compute directly
	}
	const value = await compute();
	try {
		await redis.set(key, JSON.stringify(value), "EX", TTL_SECONDS);
	} catch {
		// swallow cache-set errors
	}
	return value;
}
