export const shouldOpenProductTour = ({
  completed,
  devUat,
}: {
  completed: boolean;
  devUat: boolean;
}) => !completed && !devUat;
