import { HomeLayout } from "@/modules/home/ui/layouts/home-layout";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Readonly<Props>) => {
  return <HomeLayout>{children}</HomeLayout>;
};

export default layout;
