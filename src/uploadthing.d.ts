/* eslint-disable @typescript-eslint/no-explicit-any */
// Add this file to your project if you need type definitions

declare module "uploadthing/client" {
  import { ExpandedRouteConfig } from "@uploadthing/shared";

  // Add missing types
  export const isValidFileType: (
    file: File,
    routeConfig: ExpandedRouteConfig
  ) => boolean;
  export const isValidFileSize: (
    file: File,
    routeConfig: ExpandedRouteConfig
  ) => boolean;
  export const generateClientDropzoneAccept: (
    fileTypes: string[]
  ) => Record<string, string[]>;
}

declare module "@uploadthing/react" {
  import type { FileRouter } from "uploadthing/next";

  // Define the response type for uploaded files
  export interface UploadFileResponse {
    url: string;
    key: string;
    name: string;
    size: number;
    type: string;
  }

  export function generateReactHelpers<T extends FileRouter>(): {
    useUploadThing: (
      fileRoute: keyof T,
      options?: {
        onClientUploadComplete?: (res: UploadFileResponse[]) => void;
        onUploadError?: (error: Error) => void;
        onUploadBegin?: () => void;
        headers?: Record<string, string>;
      }
    ) => {
      startUpload: (files: File[]) => Promise<UploadFileResponse[]>;
      isUploading: boolean;
      permittedFileInfo?: any;
    };
    uploadFiles: (
      fileRoute: keyof T,
      files: File[],
      options?: {
        onBeforeUploadBegin?: (files: File[]) => File[];
        onUploadProgress?: (progress: number) => void;
        onUploadError?: (error: Error) => void;
        headers?: Record<string, string>;
      }
    ) => Promise<UploadFileResponse[]>;
  };
}

// Add types for UploadThing server-side SDK
declare module "uploadthing/server" {
  export class UTApi {
    constructor(config?: { apiKey?: string });

    // Delete files
    deleteFiles: (keys: string | string[]) => Promise<{ success: boolean }>;

    // Other methods as needed
    getFileUrls: (keys: string | string[]) => Promise<Record<string, string>>;
    getFileUrl: (key: string) => Promise<string>;
  }

  // Note: UploadThingError might be defined elsewhere in newer versions
  // This is just a fallback if it's needed for type checking
  export class HTTPError extends Error {
    constructor(message: string, status?: number);
    status: number;
  }
}
