interface PageProps {
  params: Promise<{ videoId: string }>;
}

const Page = async ({ params }: PageProps) => {
  console.log("Server Component");
  const { videoId } = await params;
  return <div>Video ID : {videoId}</div>;
};

export default Page;
