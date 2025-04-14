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

  export function generateReactHelpers<T extends FileRouter>(): {
    useUploadThing: (
      fileRoute: keyof T,
      options?: {
        onClientUploadComplete?: (res: any[]) => void;
        onUploadError?: (error: Error) => void;
        onUploadBegin?: () => void;
        headers?: Record<string, string>;
      }
    ) => {
      startUpload: (files: File[]) => Promise<any>;
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
    ) => Promise<any>;
  };
}
