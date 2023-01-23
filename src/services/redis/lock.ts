import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (redisClient: Client, signal: any) => any) => {
	const retryDelayMs = 100;
	let retries = 20;
	const timeOutMs = 2000;
	//Generate a random value to store as the lock key
	const token = randomBytes(6).toString('hex');
	//Create a lock key
	const lockKey = `lock:${key}`;
	// Set up a while loop to retries
	while (retries >= 0) {
		retries--;
		//Try to do a set NX operation
		const acquired = await client.set(lockKey, token, {
			NX: true,
			PX: timeOutMs
		});
		// if failed brief pause and retry
		if (!acquired) {
			await pause(retryDelayMs);
			continue;
		}
		//else successfully run cb
		//Unset lock key
		try {
			const signal = { expired: false };
			setTimeout(() => {
				signal.expired = true;
			}, timeOutMs);
			const proxy = buildClientProxy(timeOutMs);
			const result = await cb(proxy, signal);
			return result;
		} finally {
			await client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;

const buildClientProxy = (timeOutMs: number) => {
	const startTime = Date.now();
	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() >= startTime + timeOutMs) {
				throw new Error('Lock expired. Cannot write data');
			}
			const value = target[prop];
			return typeof value === 'function' ? value.bind(target) : value;
		}
	};
	return new Proxy(client, handler) as Client;
};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
