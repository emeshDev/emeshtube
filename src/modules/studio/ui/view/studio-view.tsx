import { VideosSection } from "../sections/videos-section";

type Props = {
  categoryId?: string | undefined;
};

export const StudioView = ({ categoryId }: Props) => {
  return (
    <>
      <VideosSection categoryId={categoryId} />
    </>
  );
};
