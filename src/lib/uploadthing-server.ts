import { UTApi } from "uploadthing/server";

// Buat instance UTApi sesuai dokumentasi
export const utapi = new UTApi();

/**
 * Menghapus file thumbnail dari UploadThing berdasarkan fileKey
 * @param fileKey Kunci file yang akan dihapus
 * @returns Promise dengan hasil penghapusan
 */
export async function deleteThumbnailFile(
  fileKey: string
): Promise<{ success: boolean }> {
  try {
    // Menggunakan metode deleteFiles sesuai dokumentasi
    return await utapi.deleteFiles(fileKey);
  } catch (error) {
    console.error("Error menghapus file dari UploadThing:", error);
    return { success: false };
  }
}

/**
 * Ekstrak fileKey dari URL UploadThing dan menghapus file
 * @param url URL thumbnail dari UploadThing (format: https://utfs.io/f/[fileKey])
 * @returns Promise dengan hasil penghapusan
 */
export async function deleteThumbnailByUrl(
  url: string
): Promise<{ success: boolean }> {
  if (!url || !url.includes("utfs.io")) {
    return { success: false };
  }

  try {
    // Ekstrak fileKey dari URL
    const urlParts = url.split("/");
    const fileKey = urlParts[urlParts.length - 1];

    if (!fileKey || fileKey.includes("http")) {
      return { success: false };
    }

    // Hapus file menggunakan fileKey
    return await deleteThumbnailFile(fileKey);
  } catch (error) {
    console.error("Error mengekstrak key atau menghapus file:", error);
    return { success: false };
  }
}
