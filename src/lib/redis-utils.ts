/* eslint-disable @typescript-eslint/no-unused-vars */
// lib/redis-utils.ts
import { redis } from "./redis";

// Definisi tipe yang benar untuk SetCommandOptions
type RedisSetOptions = {
  ex?: number; // Expire in seconds
  px?: number; // Expire in milliseconds
  nx?: boolean; // Only set if key doesn't exist
  xx?: boolean; // Only set if key exists
  keepttl?: boolean; // Retain the TTL of the existing key
  get?: boolean; // Return the old value
};

/**
 * Safely menyimpan data ke Redis setelah mengkonversi ke JSON string
 * @param key Redis key
 * @param data Data yang akan disimpan
 * @param options Optional Redis options seperti TTL
 * @returns Boolean indicating success
 */
export async function safeRedisSet(
  key: string,
  data: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    // Konversi data ke JSON dengan penanganan error
    const jsonString = JSON.stringify(data);

    // Verifikasi dengan menghindari metode yang sama
    try {
      const parsed = JSON.parse(jsonString);
      console.log(`[REDIS DEBUG] Successfully converted to JSON for ${key}`);
    } catch (parseError) {
      console.error(
        `[REDIS DEBUG] JSON verification failed for ${key}:`,
        parseError
      );
      return false;
    }

    // Simpan ke Redis dengan TTL jika disediakan
    if (ttlSeconds) {
      await redis.set(key, jsonString);
      await redis.expire(key, ttlSeconds);
    } else {
      await redis.set(key, jsonString);
    }

    // Verifikasi lagi setelah penyimpanan (opsional tapi membantu untuk debug)
    const storedValue = await redis.get(key);
    if (typeof storedValue === "string") {
      try {
        JSON.parse(storedValue);
        console.log(`[REDIS DEBUG] Storage verification passed for ${key}`);
      } catch (verifyError) {
        console.error(
          `[REDIS DEBUG] Stored value is not valid JSON for ${key}:`,
          storedValue
        );
        await redis.del(key);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`[REDIS ERROR] Failed to set ${key}:`, error);
    return false;
  }
}

/**
 * Safely mengambil dan mem-parse data dari Redis
 * @param key Redis key
 * @param defaultValue Nilai default jika key tidak ada atau error parsing
 * @returns Parsed data atau default value
 */
export async function safeRedisGet<T>(
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const data = await redis.get(key);

    if (!data) {
      return defaultValue;
    }

    if (typeof data !== "string") {
      console.error(
        `[REDIS ERROR] Unexpected data type for ${key}: ${typeof data}`
      );
      await redis.del(key);
      return defaultValue;
    }

    // Parse data sebagai JSON
    const parsed = JSON.parse(data);
    return parsed as T;
  } catch (error) {
    console.error(`[REDIS ERROR] Failed to get or parse ${key}:`, error);

    // Hapus cache yang rusak
    try {
      await redis.del(key);
      console.log(`[REDIS CLEANUP] Deleted corrupted cache for ${key}`);
    } catch (deleteError) {
      console.error(
        `[REDIS ERROR] Failed to delete corrupted ${key}:`,
        deleteError
      );
    }

    return defaultValue;
  }
}

/**
 * Safely menghapus key dari Redis
 * @param key Redis key or pattern
 * @returns Number of keys deleted
 */
export async function safeRedisDelete(key: string): Promise<number> {
  try {
    // Cek apakah key berisi wildcard
    if (key.includes("*")) {
      const keys = await redis.keys(key);
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(...keys);
      return keys.length;
    } else {
      const result = await redis.del(key);
      return result;
    }
  } catch (error) {
    console.error(`[REDIS ERROR] Failed to delete ${key}:`, error);
    return 0;
  }
}

/**
 * Safely memeriksa apakah key ada di Redis
 * @param key Redis key
 * @returns Boolean
 */
export async function safeRedisExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error(`[REDIS ERROR] Failed to check existence of ${key}:`, error);
    return false;
  }
}

/**
 * Safely menyimpan data ke Redis dengan struktur cache-invalidation-friendly
 * @param key Redis key
 * @param data Data yang akan disimpan
 * @param ttl Cache TTL in seconds
 * @param metaKey Optional meta key untuk invalidasi grup
 * @returns Success boolean
 */
export async function setCacheWithMeta(
  key: string,
  data: unknown,
  ttl: number,
  metaKey?: string
): Promise<boolean> {
  try {
    // Simpan data utama - perbaiki parameter agar menggunakan nilai ttl langsung
    const dataSetSuccess = await safeRedisSet(key, data, ttl);

    // Jika meta key disediakan, tambahkan key ini ke daftar
    if (metaKey && dataSetSuccess) {
      // Dapatkan daftar key yang ada
      const existingSet = await safeRedisGet<string[]>(metaKey, []);

      // Tambahkan key baru jika belum ada
      if (!existingSet.includes(key)) {
        existingSet.push(key);
        await safeRedisSet(metaKey, existingSet, undefined); // tanpa TTL untuk meta keys
      }
    }

    return dataSetSuccess;
  } catch (error) {
    console.error(
      `[REDIS ERROR] Cache set with meta failed for ${key}:`,
      error
    );
    return false;
  }
}

/**
 * Menginvalidasi grup cache dengan meta key
 * @param metaKey Meta key yang berisi daftar key yang akan diinvalidasi
 * @returns Number of keys invalidated
 */
export async function invalidateCacheGroup(metaKey: string): Promise<number> {
  try {
    // Dapatkan daftar key untuk diinvalidasi
    const keys = await safeRedisGet<string[]>(metaKey, []);

    if (keys.length === 0) {
      return 0;
    }

    // Hapus semua key dalam daftar
    await redis.del(...keys);

    // Hapus juga meta key
    await redis.del(metaKey);

    return keys.length;
  } catch (error) {
    console.error(
      `[REDIS ERROR] Failed to invalidate cache group ${metaKey}:`,
      error
    );
    return 0;
  }
}
