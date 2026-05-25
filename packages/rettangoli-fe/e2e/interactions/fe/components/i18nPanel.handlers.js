export const handleSetEnglish = async ({ locale }) => {
  await locale.set("en");
};

export const handleSetVietnamese = async ({ locale }) => {
  await locale.set("vi");
};
