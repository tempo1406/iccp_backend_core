export const getDefaultAvatarUrl = (): string => {
  return (
    process.env.DEFAULT_AVATAR_URL ||
    'https://ik.imagekit.io/sscpv5k3bl/iccp/uploads/avatars/default-avatar_Ja57_IPvp.png'
  );
};
