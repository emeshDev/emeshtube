import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import HelloComponent from "./hello-component";

const HelloPage = async () => {
  prefetch(trpc.hello.queryOptions({ text: "world" }));
  // jika hanya butuh data saja gunakan caller.query(...)
  // const data = await caller.hello({text: "world"})
  //   jika butuh kedua fungsionalitas, prefetch dan pakai di server component dan client
  // const queryClient = getQueryClient()
  // const data = await queryClient.fetchQuery(trpc.hello.queryOptions({text:"world"}))
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">
        Contoh TRPC Prefetch server component
      </h1>
      <HydrateClient>
        <HelloComponent />
      </HydrateClient>
    </div>
  );
};

export default HelloPage;
