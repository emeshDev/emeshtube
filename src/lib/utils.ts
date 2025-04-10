import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (durationInSeconds?: number | null) => {
  if (!durationInSeconds) return "00:00";

  // Konversi ke bilangan bulat
  const totalSeconds = Math.floor(durationInSeconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format dengan leading zero
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  // Tampilkan dengan atau tanpa jam tergantung nilai
  if (hours > 0) {
    const formattedHours = hours.toString().padStart(2, "0");
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${formattedMinutes}:${formattedSeconds}`;
  }
};

/**
 * Mengubah string menjadi format snake_case
 *
 * @param text String yang akan dikonversi
 * @returns String dalam format snake_case
 *
 * @example
 * toSnakeCase("Hello World") // => "hello_world"
 * toSnakeCase("This is a TEST") // => "this_is_a_test"
 * toSnakeCase("camelCaseText") // => "camel_case_text"
 */
export const toSnakeCase = (text: string): string => {
  if (!text) return "";

  return (
    text
      // Ganti spasi dengan underscore
      .replace(/\s+/g, "_")
      // Sisipkan underscore sebelum huruf kapital, dan ubah ke huruf kecil
      .replace(/([A-Z])/g, "_$1")
      // Gantikan beberapa underscore berturut-turut dengan satu underscore
      .replace(/_+/g, "_")
      // Hapus underscore di awal string jika ada
      .replace(/^_/, "")
      // Ubah semua karakter menjadi huruf kecil
      .toLowerCase()
  );
};

/**
 * Mengubah string menjadi format Title Case (huruf awal setiap kata kapital)
 *
 * @param text String yang akan dikonversi
 * @returns String dalam format Title Case
 *
 * @example
 * toTitleCase("hello world") // => "Hello World"
 * toTitleCase("THIS_IS_A_TEST") // => "This Is A Test"
 */
export const toTitleCase = (text: string): string => {
  if (!text) return "";

  // Ganti underscore dan dash dengan spasi terlebih dahulu
  const spacedText = text.replace(/[_-]/g, " ");

  // Pisahkan string menjadi kata-kata
  return spacedText
    .toLowerCase()
    .split(" ")
    .map((word) => {
      // Kapitalkan huruf pertama setiap kata
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

/**
 * Mengubah string menjadi format camelCase
 *
 * @param text String yang akan dikonversi
 * @returns String dalam format camelCase
 *
 * @example
 * toCamelCase("hello world") // => "helloWorld"
 * toCamelCase("snake_case_text") // => "snakeCaseText"
 */
export const toCamelCase = (text: string): string => {
  if (!text) return "";

  // Ganti underscore dan dash dengan spasi terlebih dahulu
  const spacedText = text.replace(/[_-]/g, " ");

  // Pisahkan string menjadi kata-kata
  return spacedText
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      // Huruf pertama tetap kecil, sisanya kapital huruf pertamanya
      return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
};

/**
 * Mengubah string menjadi format PascalCase (UpperCamelCase)
 *
 * @param text String yang akan dikonversi
 * @returns String dalam format PascalCase
 *
 * @example
 * toPascalCase("hello world") // => "HelloWorld"
 * toPascalCase("snake_case_text") // => "SnakeCaseText"
 */
export const toPascalCase = (text: string): string => {
  if (!text) return "";

  // Konversi ke camelCase terlebih dahulu
  const camelCase = toCamelCase(text);

  // Kapitalkan huruf pertama
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

/**
 * Memotong teks menjadi panjang tertentu dan menambahkan elipsis
 *
 * @param text String yang akan dipotong
 * @param maxLength Panjang maksimum string
 * @returns String yang telah dipotong dengan elipsis jika melebihi panjang maksimum
 *
 * @example
 * truncateText("This is a very long text", 10) // => "This is a..."
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + "...";
};
