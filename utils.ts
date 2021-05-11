//generate random game number
export const getGameName = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};
