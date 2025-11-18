import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
// PAKEISTA: Naudojame ~ (tildę) tiksliam keliui
import type { OurFileRouter } from "~/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();