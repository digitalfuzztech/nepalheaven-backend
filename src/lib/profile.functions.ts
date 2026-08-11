import { createServerFn } from "@tanstack/react-start";

async function failure(error: unknown) {
  const { isProfileAuthorizationError, isPublicProfileError } =
    await import("@/lib/profile.server");
  if (isProfileAuthorizationError(error))
    return {
      ok: false as const,
      code: "UNAUTHORIZED" as const,
      message: "Please sign in to manage your profile photo.",
    };
  if (isPublicProfileError(error))
    return {
      ok: false as const,
      code: "VALIDATION_ERROR" as const,
      message: error.message,
    };
  console.error("Profile-photo operation failed", error);
  return {
    ok: false as const,
    code: "INTERNAL_ERROR" as const,
    message: "Your profile photo could not be updated right now.",
  };
}

export const getMyProfilePhotoFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getMyProfilePhoto } = await import("@/lib/profile.server");
    try {
      return { ok: true as const, photo: await getMyProfilePhoto() };
    } catch (error) {
      return failure(error);
    }
  },
);

export const uploadMyProfilePhotoFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid photo upload.");
    return data;
  })
  .handler(async ({ data }) => {
    const file = data.get("photo");
    if (!(file instanceof File) || file.size < 1)
      return {
        ok: false as const,
        code: "VALIDATION_ERROR" as const,
        message: "Choose a JPEG, PNG or WEBP photo.",
      };
    const { uploadMyProfilePhoto } = await import("@/lib/profile.server");
    try {
      await uploadMyProfilePhoto(file);
      return { ok: true as const };
    } catch (error) {
      return failure(error);
    }
  });

export const removeMyProfilePhotoFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const { removeMyProfilePhoto } = await import("@/lib/profile.server");
  try {
    await removeMyProfilePhoto();
    return { ok: true as const };
  } catch (error) {
    return failure(error);
  }
});
