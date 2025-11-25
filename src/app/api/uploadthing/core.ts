import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "~/server/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Leidžiame kelti daug nuotraukų vienu metu ir didelius failus.
  imageUploader: f({ image: { maxFileSize: "512MB", maxFileCount: 100 } })
    .middleware(async ({ req }) => {
      const session = await auth();
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
