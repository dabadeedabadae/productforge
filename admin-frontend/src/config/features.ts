export const features = {
  canExport: (process.env.NEXT_PUBLIC_FEATURE_EXPORT ?? "false") === "true",
};
