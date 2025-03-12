import React from "react";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Readonly<Props>) => {
  return (
    <div className="min-h-screen flex justify-center items-center">
      {children}
    </div>
  );
};

export default layout;
